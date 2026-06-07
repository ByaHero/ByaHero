/**
 * byaheroTracking.js
 * ──────────────────────────────────────────────────────────────────────────
 * Shared telemetry, geolocation, platform, and networking utilities.
 * Used by both passenger/index.php and conductor/conductorLive.php.
 * ──────────────────────────────────────────────────────────────────────────
 */

// Global state variables
window.wakeLock = null;
window.keepAliveAudio = null;
window.routeFeatures = [];

/**
 * Standardized POST utility.
 * Utilizes CapacitorHttp if running as a native app, otherwise standard fetch.
 * Uses a robust set of headers to ensure compatibility with various server environments (e.g. InfinityFree).
 */
window.safePost = async function safePost(relativeUrl, payload = {}) {
    const url = new URL(relativeUrl, window.location.href).href;
    try {
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.CapacitorHttp) {
            const res = await window.Capacitor.Plugins.CapacitorHttp.post({
                url,
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json, text/plain, */*',
                    'User-Agent': navigator.userAgent,
                    'X-Requested-With': 'XMLHttpRequest'
                },
                data: payload
            });
            return res.data;
        } else {
            const res = await fetch(url, {
                method: 'POST',
                credentials: 'include', // CRITICAL: Ensures session cookies are sent for autoboarding & tracking requests
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json, text/plain, */*',
                    'User-Agent': navigator.userAgent,
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(payload)
            });
            return await res.json();
        }
    } catch(e) {
        console.error('safePost error:', e);
        return { success: false, error: e.message };
    }
};

/**
 * Calculates the distance in meters between two coordinates.
 */
window.distanceMeters = function distanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Radius of the earth in m
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Ray-casting algorithm to determine if a point is inside a polygon ring.
 */
window.pointInRing = function pointInRing(x, y, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i][0], yi = ring[i][1];
        const xj = ring[j][0], yj = ring[j][1];
        const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / ((yj - yi) || 1) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
};

/**
 * Resolves coordinate to a named location using boundaries loaded from route features.
 */
window.resolveLocationName = function resolveLocationName(lat, lng) {
    if (!window.routeFeatures || window.routeFeatures.length === 0) return null;
    for (const f of window.routeFeatures) {
        if (!f.geometry) continue;
        if (f.geometry.type === 'Polygon' && Array.isArray(f.geometry.coordinates) && f.geometry.coordinates[0]) {
            if (window.pointInRing(lng, lat, f.geometry.coordinates[0])) {
                return (f.properties && (f.properties['Current Location'] || f.properties.name)) || null;
            }
        }
        if (f.geometry.type === 'MultiPolygon' && Array.isArray(f.geometry.coordinates)) {
            for (const poly of f.geometry.coordinates) {
                if (poly && poly[0] && window.pointInRing(lng, lat, poly[0])) {
                    return (f.properties && (f.properties['Current Location'] || f.properties.name)) || null;
                }
            }
        }
    }
    return null;
};

/**
 * Loads geojson route features from map_data.php for geofencing name resolution.
 */
window.loadRouteFeatures = async function loadRouteFeatures() {
    try {
        const res = await fetch('../map_data.php', { cache: 'no-store' });
        const json = await res.json();
        if (json && Array.isArray(json.features)) {
            window.routeFeatures = json.features.filter(f => f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon'));
        }
    } catch (e) {
        console.error('loadRouteFeatures error:', e);
    }
};

/**
 * Screen Wake Lock Management
 * Prevents screen auto-locking/dimming to keep background geolocation threads running.
 */
window.acquireWakeLock = async function acquireWakeLock() {
    if (!('wakeLock' in navigator)) return;
    try {
        window.wakeLock = await navigator.wakeLock.request('screen');
        window.wakeLock.addEventListener('release', () => {
            if (document.visibilityState === 'visible') window.acquireWakeLock();
        });
    } catch (e) {
        console.warn('Failed to acquire Wake Lock:', e);
    }
};

window.releaseWakeLock = async function releaseWakeLock() {
    if (window.wakeLock) {
        try {
            await window.wakeLock.release();
        } catch (e) {
            console.warn('Failed to release Wake Lock:', e);
        }
        window.wakeLock = null;
    }
};

/**
 * Audio Keep-Alive
 * Plays a silent audio loop in the background on mobile to prevent the WebView from going to sleep.
 */
window.startKeepAliveAudio = function startKeepAliveAudio() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (!isMobile) return;

    if (!window.keepAliveAudio) {
        // A 2-second silent WAV to bypass browser autoplay rules and keep CPU alive
        window.keepAliveAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAgAAAA');
        window.keepAliveAudio.loop = true;
        window.keepAliveAudio.volume = 0.001; // Near-silent
        window.keepAliveAudio.play().catch(e => {
            const playOnInteraction = () => {
                if (window.keepAliveAudio) window.keepAliveAudio.play().catch(()=>{});
                document.removeEventListener('touchstart', playOnInteraction);
                document.removeEventListener('click', playOnInteraction);
            };
            document.addEventListener('touchstart', playOnInteraction);
            document.addEventListener('click', playOnInteraction);
        });
    }
};

window.stopKeepAliveAudio = function stopKeepAliveAudio() {
    if (window.keepAliveAudio) {
        try {
            window.keepAliveAudio.pause();
        } catch(e){}
        window.keepAliveAudio = null;
    }
};

/**
 * Safely fetches the current GPS position, prioritizing native Capacitor Geolocation
 * over standard browser geolocation to prevent WebView permission failures on remote domains.
 */
window.safeGetCurrentPosition = async function safeGetCurrentPosition(successCallback, errorCallback, options) {
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Geolocation) {
        try {
            const Geolocation = window.Capacitor.Plugins.Geolocation;
            // Ensure permissions are checked/requested before querying location
            let perm = await Geolocation.checkPermissions();
            if (perm.location !== 'granted') {
                perm = await Geolocation.requestPermissions();
            }
            if (perm.location === 'granted') {
                const coordinates = await Geolocation.getCurrentPosition(options);
                successCallback(coordinates);
                return;
            }
        } catch (e) {
            console.warn('Native safeGetCurrentPosition failed, falling back to web:', e);
        }
    }
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(successCallback, errorCallback, options);
    } else {
        errorCallback({ code: 0, message: "Geolocation not supported" });
    }
};
