/**
 * conductorLive.js
 * ──────────────────────────────────────────────────────────────────────────
 * Live telemetry, seats tracking, and Leaflet mapping controller for 
 * ByaHero Conductor Live Panel.
 * Extracted from public/conductor/conductorLive.php
 * ──────────────────────────────────────────────────────────────────────────
 */

// Load Config from window scope
const config = window.BYAHERO_CONDUCTOR_CONFIG || {};
const busId = config.busId;
const busCode = config.busCode;
const busRoute = config.busRoute;
const seatsTotal = config.seatsTotal;

// Seat tracking state
let seats = config.seatsAvailable;

// Map & Network tracking variables
let map = null;
let marker = null;
let watchId = null;
let lastNetworkSync = 0;
let lastLocationUpdateAt = 0;
let lastKnownLocation = null;
let heartbeatInterval = null;
const SYNC_INTERVAL = 1000;
const el = id => document.getElementById(id);
const alertBox = el('alertBox');
const netStatus = el('netStatus');
let bgWatcherId = null;
let _appStateListener = null;

let lastMoveCheck = { time: 0, lat: null, lng: null };
let lastResolvedLocation = { lat: null, lng: null, name: null };
let lastComputedStatus = 'available';
const MOVE_THRESHOLD_METERS = 3;
const RESOLVE_THRESHOLD_METERS = 10;
const STOP_TIME_MS = 5000;

// Analytics variables
let operationId = config.operationId;
const isNewSession = config.isNewSession;
const preDepartureCount = config.preDepartureCount;

// Debounce-cancel synchronization states
let pendingBoards = 0;
let pendingDeparts = 0;
let syncTimer = null;
let lastActionTime = 0;
const SYNC_DEBOUNCE_MS = 3000;

/**
 * Triggers modal alert banners.
 */
function showAlert(message, type = 'info') {
    const bsType = (type === 'danger') ? 'danger' : 'primary';
    if (alertBox) {
        alertBox.innerHTML = `<div class="alert alert-${bsType} border-0 text-center fw-bold shadow-sm" style="border-radius: 12px; padding: 10px;">${message}</div>`;
    }
    setTimeout(() => { if (alertBox) alertBox.innerHTML = ''; }, 3000);
}

/**
 * Initializes Leaflet Map.
 */
function initMap() {
    if (map) return;
    map = L.map('mainMap', { zoomControl: false, attributionControl: false }).setView([14.0905, 121.0550], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
}

/**
 * Synchronizes marker layer positioning on map.
 */
function updateMarker(lat, lng) {
    const latlng = [lat, lng];
    if (!marker) {
        marker = L.marker(latlng).addTo(map);
    } else {
        marker.setLatLng(latlng);
    }
    try { map.panTo(latlng); } catch(e){}
}

/**
 * Automatically calculates bus movement status to update API flags.
 */
function autoComputeStatus(currentLat, currentLng) {
    const now = Date.now();
    if (seats <= 0) return 'full';

    if (lastMoveCheck.lat === null || lastMoveCheck.lng === null) {
        lastMoveCheck = { time: now, lat: currentLat, lng: currentLng };
        return 'available';
    }

    const dist = distanceMeters(lastMoveCheck.lat, lastMoveCheck.lng, currentLat, currentLng);
    if (dist > MOVE_THRESHOLD_METERS) {
        lastMoveCheck = { time: now, lat: currentLat, lng: currentLng };
        return 'available';
    }

    if (now - lastMoveCheck.time >= STOP_TIME_MS) return 'on_stop';
    return 'available';
}

/**
 * Submits geofenced coordinates, status, and seat metrics to server.
 */
async function sendDataToServer(lat, lng, locName) {
    if (netStatus) {
        netStatus.textContent = 'Saving...';
        netStatus.className = 'badge bg-warning text-dark';
    }

    const statusSelect = el('statusSelect');
    const status = autoComputeStatus(lat, lng) || (statusSelect?.value || 'available');
    if (statusSelect) statusSelect.value = status;
    lastComputedStatus = status;

    const payload = {
        bus_id: busId,
        geojson: {
            type: "Feature",
            geometry: { type: "Point", coordinates: [lng, lat] },
            properties: {
                bus_id: busId,
                code: busCode,
                route: busRoute,
                seats_available: seats,
                status: status,
                timestamp: new Date().toISOString(),
                current_location_name: locName || `${lat.toFixed(5)},${lng.toFixed(5)}`
            }
        },
        route: busRoute,
        seats_available: seats,
        status: status,
        current_location_name: locName || `${lat.toFixed(5)},${lng.toFixed(5)}`
    };

    try {
        await safePost('../update_geo_location.php', payload);
        if (netStatus) {
            netStatus.textContent = 'Live';
            netStatus.className = 'badge bg-success text-white';
        }
        
        const timeSinceAction = Date.now() - lastActionTime;
        if (!syncTimer || timeSinceAction > (SYNC_DEBOUNCE_MS + 2000)) {
            flushPendingEvents();
        }
    } catch (e) {
        if (netStatus) {
            netStatus.textContent = 'Offline';
            netStatus.className = 'badge bg-danger text-white';
        }
    }
}

/**
 * Handles geolocator coordinates callback, throttling server uploads.
 */
function onLocationUpdate(pos) {
    const now = Date.now();
    if (now - lastLocationUpdateAt < 1500) return;
    lastLocationUpdateAt = now;

    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    
    let locName = lastKnownLocation?.locName || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    
    // Throttle boundary checking geofence resolution
    const distSinceResolve = lastResolvedLocation.lat ? distanceMeters(lastResolvedLocation.lat, lastResolvedLocation.lng, lat, lng) : 999;
    if (distSinceResolve > RESOLVE_THRESHOLD_METERS || !lastResolvedLocation.name) {
        const resolved = resolveLocationName(lat, lng);
        if (resolved) {
            locName = resolved;
            lastResolvedLocation = { lat, lng, name: resolved };
        }
    } else {
        locName = lastResolvedLocation.name;
    }

    lastKnownLocation = { lat, lng, locName };
    updateMarker(lat, lng);

    const currentLocationEl = el('currentLocation');
    if (currentLocationEl) {
        currentLocationEl.textContent = locName;
        currentLocationEl.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lat + ',' + lng)}`;
    }
    
    const lastUpdateEl = el('lastUpdate');
    if (lastUpdateEl) {
        lastUpdateEl.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    if (now - lastNetworkSync > SYNC_INTERVAL) {
        sendDataToServer(lat, lng, locName);
        lastNetworkSync = now;
    }
}

/**
 * Triggers web geolocation watcher.
 */
function startWebGeolocation() {
    if (!navigator.geolocation) return showAlert('No GPS support', 'danger');
    watchId = navigator.geolocation.watchPosition(
        onLocationUpdate,
        err => showAlert(`GPS Error: ${err.message}`, 'danger'),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
    startKeepAliveAudio();
    acquireWakeLock();
    showAlert('Web Tracking Started', 'primary');
}

/**
 * Handles initialization and request permissions for Geolocation background tracking.
 */
let isStartingGeolocation = false;
async function startGeolocation() {
    if (isStartingGeolocation) {
        console.log('startGeolocation already in progress, skipping concurrent call.');
        return;
    }
    isStartingGeolocation = true;

    try {
        // Remove any stale background geolocation watcher from previous sessions/pages
        const staleBgWatcherId = localStorage.getItem('byahero_conductor_bg_watcher_id');
        if (staleBgWatcherId && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.BackgroundGeolocation) {
            try {
                await window.Capacitor.Plugins.BackgroundGeolocation.removeWatcher({ id: staleBgWatcherId });
                console.log('Removed stale conductor background watcher:', staleBgWatcherId);
            } catch (e) {}
            localStorage.removeItem('byahero_conductor_bg_watcher_id');
        }

        if (watchId !== null) {
            try { navigator.geolocation.clearWatch(watchId); } catch (e) {}
            watchId = null;
        }
        if (bgWatcherId !== null && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.BackgroundGeolocation) {
            try { await window.Capacitor.Plugins.BackgroundGeolocation.removeWatcher({ id: bgWatcherId }); } catch (e) {}
            bgWatcherId = null;
        }

        setTimeout(() => { try { map.invalidateSize(); } catch (e) {} }, 250);

        // Poll/wait for Capacitor to be ready if we are running in the native app
        const isNative = navigator.userAgent.includes('Capacitor') || window.location.href.includes('capacitor://');
        if (isNative && (!window.Capacitor || !window.Capacitor.Plugins || !window.Capacitor.Plugins.Geolocation || !window.Capacitor.Plugins.BackgroundGeolocation)) {
            let attempts = 0;
            while ((!window.Capacitor || !window.Capacitor.Plugins || !window.Capacitor.Plugins.Geolocation || !window.Capacitor.Plugins.BackgroundGeolocation) && attempts < 30) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
        }

        // Request native permission if running in Capacitor (Bluestacks/Android)
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Geolocation) {
            let attempts = 0;
            let success = false;
            const Geolocation = window.Capacitor.Plugins.Geolocation;
            while (attempts < 10 && !success) {
                try {
                    let perm = await Geolocation.checkPermissions();
                    success = true;
                    if (perm.location !== 'granted') {
                        perm = await Geolocation.requestPermissions();
                    }
                } catch (e) {
                    console.warn(`Capacitor Geolocation bridge not ready yet, retrying in 150ms (attempt ${attempts + 1}):`, e);
                    await new Promise(resolve => setTimeout(resolve, 150));
                    attempts++;
                }
            }
        }

        const bgAvailable = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.BackgroundGeolocation;
        if (bgAvailable) {
            const BackgroundGeolocation = window.Capacitor.Plugins.BackgroundGeolocation;
            try {
                const permissions = await BackgroundGeolocation.requestPermissions();
                if (permissions.location !== 'granted') {
                    return showAlert('Background location permission denied.', 'danger');
                }

                bgWatcherId = await BackgroundGeolocation.addWatcher(
                    {
                        backgroundMessage: "Tracking active. Keep app open in background.",
                        backgroundTitle: "Tracking ByaHero Bus",
                        requestPermissions: true,
                        stale: false,
                        distanceFilter: 5
                    },
                    function callback(location, error) {
                        if (error) return;
                        const pos = { coords: { latitude: location.latitude, longitude: location.longitude } };
                        onLocationUpdate(pos);
                    }
                );
                if (bgWatcherId) {
                    localStorage.setItem('byahero_conductor_bg_watcher_id', bgWatcherId);
                }

                startKeepAliveAudio();
                acquireWakeLock();
                showAlert('Background Tracking Started', 'primary');
            } catch (e) {
                showAlert('Plugin Error', 'danger');
                if (!isNative) startWebGeolocation();
            }
        } else {
            if (!isNative) startWebGeolocation();
        }

        // Force an immediate location check so the map updates instantly even if stationary
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                onLocationUpdate,
                err => console.warn('Initial GPS check failed:', err.message),
                { enableHighAccuracy: true, timeout: 5000 }
            );
        }
    } finally {
        isStartingGeolocation = false;
    }
}

// App Lifecycles & Visibility Triggers
const _onVisibilityChange = async () => {
    if (document.visibilityState === 'visible') {
        acquireWakeLock();
        if (keepAliveAudio && keepAliveAudio.paused) keepAliveAudio.play().catch(() => {});
        
        const trackingActive = bgWatcherId !== null || watchId !== null;
        if (!trackingActive) {
            await startGeolocation();
        } else if (lastKnownLocation) {
            sendDataToServer(lastKnownLocation.lat, lastKnownLocation.lng, lastKnownLocation.locName);
            lastNetworkSync = Date.now();
        }
    }
};
document.addEventListener('visibilitychange', _onVisibilityChange);

if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
    const _appStateResult = window.Capacitor.Plugins.App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
            acquireWakeLock();
            if (keepAliveAudio && keepAliveAudio.paused) keepAliveAudio.play().catch(() => {});
            if (lastKnownLocation) {
                sendDataToServer(lastKnownLocation.lat, lastKnownLocation.lng, lastKnownLocation.locName);
                lastNetworkSync = Date.now();
            }
        }
    });
    if (_appStateResult && typeof _appStateResult.then === 'function') {
        _appStateResult.then(handle => { _appStateListener = handle; });
    } else {
        _appStateListener = _appStateResult;
    }
}

/**
 * Initializes operation dispatch logs in backend operations analytics table.
 */
async function initOperation() {
    if (operationId > 0 || !isNewSession) return;
    const json = await safePost('../api.php?action=start_operation', {
        bus_id: busId,
        route: busRoute,
        pre_departure_count: preDepartureCount,
        start_location: lastKnownLocation?.locName || null
    });
    if (json.success && json.operation_id) {
        operationId = json.operation_id;
    }
}

/**
 * Submits boarding or departing historical events to database logs.
 */
function flushPendingEvents() {
    const netBoards = pendingBoards;
    const netDeparts = pendingDeparts;
    pendingBoards = 0;
    pendingDeparts = 0;

    const net = netBoards - netDeparts;
    if (net === 0) return;

    const eventType = net > 0 ? 'board' : 'depart';
    const count = Math.abs(net);
    const locName = lastKnownLocation?.locName || null;
    const lat = lastKnownLocation?.lat || null;
    const lng = lastKnownLocation?.lng || null;

    if (operationId <= 0) return;

    const action = eventType === 'board' ? 'boarded' : 'departed';
    const loc = locName || 'current location';
    showAlert(`${count} passenger${count > 1 ? 's' : ''} ${action} at ${loc}`, 'info');

    return safePost('../api.php?action=log_passenger_event', {
        operation_id: operationId,
        event_type: eventType,
        count: count,
        location_name: locName,
        lat: lat,
        lng: lng
    });
}

/**
 * Throttles and flushes seats updates.
 */
function scheduleSync() {
    lastActionTime = Date.now();
    clearTimeout(syncTimer);
    syncTimer = setTimeout(async () => {
        await triggerManualUpdate();
        await flushPendingEvents();
        syncTimer = null;
    }, SYNC_DEBOUNCE_MS);
}

/**
 * Stop tracking loop, flushing final state, freeing locks & resources.
 */
async function stopTracking() {
    clearTimeout(syncTimer);
    flushPendingEvents();

    stopKeepAliveAudio();
    releaseWakeLock();
    
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'none';
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.MediaSession) {
        try { window.Capacitor.Plugins.MediaSession.setPlaybackState({ playbackState: 'none' }).catch(() => {}); } catch (e) {}
    }

    if (watchId !== null) {
        try { navigator.geolocation.clearWatch(watchId); } catch (e) {}
        watchId = null;
    }
    if (bgWatcherId !== null && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.BackgroundGeolocation) {
        try { await window.Capacitor.Plugins.BackgroundGeolocation.removeWatcher({ id: bgWatcherId }); } catch (e) {}
        bgWatcherId = null;
    }

    const endLocName = lastKnownLocation ? lastKnownLocation.locName : null;
    lastKnownLocation = null;
    if (heartbeatInterval) {
        clearTimeout(heartbeatInterval);
        heartbeatInterval = null;
    }

    const payload = {
        bus_id: busId,
        end_location: endLocName
    };
    await safePost('../api.php?action=stop_tracking', payload);

    window.location.href = 'conductor.php?stopped=1';
}

function triggerManualUpdate() {
    if (!lastKnownLocation) return;
    return sendDataToServer(lastKnownLocation.lat, lastKnownLocation.lng, lastKnownLocation.locName);
}

/**
 * Updates OS media session metadata displays (artist, album, artwork, playbackState).
 */
async function updateMediaSessionMetadata() {
    const metadata = {
        title: `BUS ${busCode} • ${busRoute}`,
        artist: `Passenger Count: ${seatsTotal - seats}`,
        album: 'ByaHero Conductor Tracker',
        artwork: [
            { src: '../../assets/images/byaheroLogo.png', sizes: '512x512', type: 'image/png' }
        ]
    };

    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.MediaSession) {
        try {
            const MediaSession = window.Capacitor.Plugins.MediaSession;
            await MediaSession.setMetadata(metadata);
            await MediaSession.setPlaybackState({ playbackState: 'playing' });
        } catch (e) {}
    } else if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata(metadata);
        navigator.mediaSession.playbackState = "playing";
    }
}

function incrementPassengers() {
    seats = seats - 1;
    updateSeatsUI();
    updateMediaSessionMetadata();
    pendingBoards++;
    scheduleSync();
}

function decrementPassengers() {
    if (seats < seatsTotal) {
        seats = seats + 1;
        updateSeatsUI();
        updateMediaSessionMetadata();
        pendingDeparts++;
        scheduleSync();
    }
}

function updateSeatsUI() {
    el('seatsCount').textContent = seatsTotal - seats;
}

/**
 * Hooks hardware media playback commands to count actions.
 */
async function setupMediaSession() {
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.MediaSession) {
        try {
            const MediaSession = window.Capacitor.Plugins.MediaSession;
            await MediaSession.setActionHandler({ action: 'nexttrack' }, incrementPassengers);
            await MediaSession.setActionHandler({ action: 'previoustrack' }, decrementPassengers);
            await updateMediaSessionMetadata();
        } catch (e) {}
    } else if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('nexttrack', incrementPassengers);
        navigator.mediaSession.setActionHandler('previoustrack', decrementPassengers);
        updateMediaSessionMetadata();
    }
}

// Initial Boot Loader
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    loadRouteFeatures().catch(() => {});
    startGeolocation();
    setupMediaSession();

    el('seatPlus').addEventListener('click', incrementPassengers);
    el('seatMinus').addEventListener('click', decrementPassengers);

    setTimeout(initOperation, 2000);

    // Heartbeat Monitor loop
    function _heartbeatTick() {
        const hasWatcher = (bgWatcherId !== null || watchId !== null);
        const isStale = lastKnownLocation && (Date.now() - lastNetworkSync > 20000);

        if (!hasWatcher || isStale) {
            if (!hasWatcher && lastKnownLocation === null) {
                heartbeatInterval = setTimeout(_heartbeatTick, 5000);
                return;
            }

            startGeolocation().finally(() => {
                heartbeatInterval = setTimeout(_heartbeatTick, 5000);
            });
            return;
        }

        if (lastKnownLocation && (Date.now() - lastNetworkSync > 8000)) {
            triggerManualUpdate();
        }
        heartbeatInterval = setTimeout(_heartbeatTick, 5000);
    }
    heartbeatInterval = setTimeout(_heartbeatTick, 5000);

    el('stopBtn').addEventListener('click', stopTracking);
});

// Unload lifecycle cleanups
function _cleanup() {
    if (heartbeatInterval) { clearTimeout(heartbeatInterval); heartbeatInterval = null; }
    if (_onVisibilityChange) document.removeEventListener('visibilitychange', _onVisibilityChange);
    
    if (_appStateListener) {
        const listener = _appStateListener;
        _appStateListener = null;
        if (typeof listener.then === 'function') {
            listener.then(h => { if (h && h.remove) h.remove(); });
        } else if (listener.remove) {
            listener.remove();
        }
    }
    
    if (watchId !== null) {
        try { navigator.geolocation.clearWatch(watchId); } catch (e) {}
        watchId = null;
    }
    
    // Do not remove native background geolocation watcher here during beforeunload/pagehide.
    // Doing so asynchronously during context destruction causes WebView hangs/crashes.
    // The stale watcher will be safely cleared in startGeolocation() upon next page load.
    bgWatcherId = null;
    
    releaseWakeLock();
    stopKeepAliveAudio();
}

window.addEventListener('beforeunload', _cleanup);
window.addEventListener('pagehide', _cleanup);
