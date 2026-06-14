/**
 * passengerMap.js
 * ──────────────────────────────────────────────────────────────────────────
 * Passenger map and dashboard layout rendering logic.
 * Encapsulates Leaflet controls, custom markers, polling & lists updates.
 * Also handles initialization, modal bindings, and page cleanup hooks.
 * ──────────────────────────────────────────────────────────────────────────
 */

// =========================================================================
// 1. STATE & GLOBAL NAMESPACES
// =========================================================================

window.busMarkers = {};
window.userMarker = null;
window.userLocation = null;
window.lastKnownLocation = null;
window.isPassengerWaiting = false;
window.passengerWaitingLocation = null;
window.selectedRoute = '';
window.locationPermissionGranted = true;
window.allBuses = [];
window.allStops = [];
window.stopMarkers = {};
window._stopMarkers = window.stopMarkers; // For backwards compatibility
window.currentStopsRoute = 'LAUREL - TANAUAN';

// Constants
const AVG_SPEED_MPS = (30 * 1000) / 3600;
const MAX_DISTANCE_METERS = 5000;
const SYNC_INTERVAL = 15000;

const statusColors = {
  available: '#10b981',
  on_stop: '#f59e0b',
  full: '#ef4444',
  unavailable: '#6b7280'
};

// =========================================================================
// 2. ICON MANAGEMENT & CACHING
// =========================================================================

const ICON_CACHE = {};
const STOP_ICONS = {};

/**
 * Initializes the bus icon cache to prevent recreate overhead.
 */
function initIconCache() {
  if (ICON_CACHE.available) return;
  
  const iconBase = window.ICON_BASE || '../../images/icons';
  const iconConfig = {
    iconUrl: `${iconBase}/marker.svg`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
  };

  ICON_CACHE.available = L.icon(iconConfig);
  ICON_CACHE.full = L.icon(iconConfig);
}

/**
 * Initializes the stop icons cache.
 */
function initStopIcons() {
  if (STOP_ICONS.pickup_point) return;

  const base = window.PROJECT_BASE || '';
  const stopIconUrl = `${window.ICON_BASE || (base + '/images/icons')}/busStopMarkerFinal1.svg`;
  
  const defaultAnchor = {
    iconSize: [50, 50],
    iconAnchor: [25, 50],
    popupAnchor: [0, -44]
  };

  STOP_ICONS.pickup_point = L.icon({ iconUrl: stopIconUrl, ...defaultAnchor });
  STOP_ICONS.bus_stop = L.icon({ iconUrl: stopIconUrl, ...defaultAnchor });
  STOP_ICONS.terminal = L.icon({ iconUrl: stopIconUrl, ...defaultAnchor });
}

/**
 * Creates or retrieves the bus icon depending on status.
 */
window.createBusIcon = function createBusIcon(status) {
  initIconCache();
  const s = String(status || '').toLowerCase();
  return s === 'full' ? ICON_CACHE.full : ICON_CACHE.available;
};

/**
 * Creates/retrieves stop icon depending on type.
 */
window.stopIcon = function stopIcon(type) {
  initStopIcons();
  const t = String(type || '').toLowerCase();
  return STOP_ICONS[t] || STOP_ICONS.bus_stop;
};

/**
 * Restores user location from local storage instantly on boot.
 */
(function restoreSavedLocation() {
  try {
    const savedLat = localStorage.getItem('byahero_last_lat');
    const savedLng = localStorage.getItem('byahero_last_lng');
    const savedLocName = localStorage.getItem('byahero_last_locName');
    
    if (savedLat && savedLng) {
      const lat = parseFloat(savedLat);
      const lng = parseFloat(savedLng);
      if (!isNaN(lat) && !isNaN(lng)) {
        window.userLocation = { lat, lng };
        window.lastKnownLocation = { lat, lng, locName: savedLocName || '' };
      }
    }

    const savedWaiting = localStorage.getItem('byahero_is_passenger_waiting');
    const savedWaitingLoc = localStorage.getItem('byahero_passenger_waiting_location');
    if (savedWaiting === '1') {
      window.isPassengerWaiting = true;
      window.passengerWaitingLocation = savedWaitingLoc || '';
    }
  } catch (e) {
    console.warn('Failed to restore last known location or waiting status:', e);
  }
})();

/**
 * Generates custom Leaflet DivIcon for user marker scaled based on map zoom.
 */
window.getUserIcon = function getUserIcon() {
  const currentZoom = (typeof map !== 'undefined' && map) ? map.getZoom() : 12;
  const baseZoom = 12;
  let scale = Math.pow(1.10, currentZoom - baseZoom);
  scale = Math.max(0.85, Math.min(2.5, scale));

  const markerSize = Math.round(36 * scale);
  const bubbleBottom = Math.round(markerSize + 6);

  const userProfilePic = window.userProfilePic;
  const rawUserName = window.rawUserName || 'Guest';
  const userInitial = window.userInitial || (rawUserName.length > 0 ? rawUserName.charAt(0).toUpperCase() : '?');

  let imgHtml = '';
  if (userProfilePic) {
    const isAbsolute = /^https?:\/\/|^data:/i.test(userProfilePic);
    const safePic = isAbsolute ? userProfilePic : `${window.PROJECT_BASE}/${userProfilePic.replace(/^\/+/, '')}`;
    imgHtml = `<img src="${safePic}" style="width:100%;height:100%;object-fit:cover;" />`;
  } else {
    imgHtml = userInitial;
  }

  const isWaiting = (window.isPassengerWaiting && !(window.PassengerRideTracker && window.PassengerRideTracker.activeRide));
  const bubbleText = isWaiting ? 'Waiting' : 'Waiting?';
  const isWaitingClass = isWaiting ? ' is-waiting' : '';

  const htmlContent = `
    <div class="user-avatar-circle" style="width: ${markerSize}px; height: ${markerSize}px;">
      ${imgHtml}
    </div>
    <div class="user-waiting-chat-bubble" style="bottom: ${bubbleBottom}px; left: 50%;">
      ${bubbleText}
    </div>
  `;

  return L.divIcon({
    className: `user-marker-container${isWaitingClass}`,
    html: htmlContent,
    iconSize: [markerSize, markerSize],
    iconAnchor: [markerSize / 2, markerSize / 2]
  });
};

/**
 * Binds click handler & updates waiting styles on the user marker.
 */
window.bindUserMarker = function bindUserMarker(marker) {
  if (!marker) return;
  marker.off('click');
  marker.on('click', () => window.openWaitingModal());
  window.updateUserMarkerWaitingStyle();
};

/**
 * Resizes the Leaflet bus stop markers according to map zoom level.
 */
window.resizeStopMarkersForZoom = function resizeStopMarkersForZoom(zoom) {
  if (!window._stopMarkers) return;
  initStopIcons();

  let targetSizePx;
  if (zoom <= 12) targetSizePx = 45;
  else if (zoom >= 17) targetSizePx = 80;
  else {
    const t = (zoom - 12) / (17 - 12);
    targetSizePx = 45 + t * (80 - 45);
  }

  Object.values(window._stopMarkers).forEach(marker => {
    const t = marker.options.stopType || 'bus_stop';
    const baseIcon = STOP_ICONS[t] || STOP_ICONS.bus_stop;
    const baseSize = baseIcon.options.iconSize;
    const baseWidth = baseSize[0];
    const baseHeight = baseSize[1];
    
    const aspect = baseWidth / baseHeight || 1;
    const newHeight = targetSizePx;
    const newWidth = Math.round(newHeight * aspect);
    
    const baseAnchor = baseIcon.options.iconAnchor || [baseWidth / 2, baseHeight];
    const basePopup = baseIcon.options.popupAnchor || [0, -baseHeight * 0.9];
    
    const widthScale = newWidth / baseWidth;
    const heightScale = newHeight / baseHeight;
    
    const newAnchor = [Math.round(baseAnchor[0] * widthScale), Math.round(baseAnchor[1] * heightScale)];
    const newPopup = [Math.round(basePopup[0] * widthScale), Math.round(basePopup[1] * heightScale)];
    
    const zoomIcon = L.icon({
      iconUrl: baseIcon.options.iconUrl,
      iconSize: [newWidth, newHeight],
      iconAnchor: newAnchor,
      popupAnchor: newPopup
    });
    
    marker.setIcon(zoomIcon);
  });
};

// =========================================================================
// 3. API & TELEMETRY REQUESTS
// =========================================================================

/**
 * Pulls current waiting status of the user from the backend waiting API.
 */
window.checkWaitingStatus = async function checkWaitingStatus() {
  try {
    const url = new URL('../../backend/waiting_api.php?action=get_my_status', window.location.href).href;
    const res = await fetch(url, { credentials: 'include' });
    const data = await res.json();
    if (data && data.success) {
      window.isPassengerWaiting = !!data.is_waiting;
      window.passengerWaitingLocation = data.location_name;
      try {
        localStorage.setItem('byahero_is_passenger_waiting', data.is_waiting ? '1' : '0');
        if (data.location_name) {
          localStorage.setItem('byahero_passenger_waiting_location', data.location_name);
        } else {
          localStorage.removeItem('byahero_passenger_waiting_location');
        }
      } catch (e) {}
      window.updateUserMarkerWaitingStyle();
      window.updateUserWaitingCardUI();
    }
  } catch (e) {
    console.error("Error checking waiting status:", e);
  }
};

/**
 * Uploads user location coordinates and accuracy to the server.
 */
window.uploadMyLocation = async function uploadMyLocation(lat, lng, accuracy) {
  await window.safePost('../../backend/updateUserLocation.php', {
    latitude: lat,
    longitude: lng,
    accuracy: accuracy ?? null
  });
};

// =========================================================================
// 4. UI RENDERERS & LAYOUT UPDATERS
// =========================================================================

/**
 * Synchronizes user marker display details to reflect boarded or waiting states.
 */
window.updateUserMarkerWaitingStyle = function updateUserMarkerWaitingStyle() {
  if (!window.userMarker) return;
  const element = window.userMarker._icon || window.userMarker._path;
  if (!element) return;

  const isBoarded = window.PassengerRideTracker && window.PassengerRideTracker.activeRide;
  const shouldShowWaiting = window.isPassengerWaiting && !isBoarded;

  if (shouldShowWaiting || isBoarded) {
    element.classList.add('is-waiting');
  } else {
    element.classList.remove('is-waiting');
  }

  const chatBubble = element.querySelector('.user-waiting-chat-bubble');
  if (!chatBubble) return;

  if (isBoarded) {
    chatBubble.textContent = 'Boarded';
    chatBubble.style.backgroundColor = '#0dcaf0';
    chatBubble.style.color = '#fff';
    chatBubble.style.border = 'none';
    chatBubble.style.setProperty('--bubble-bg', '#0dcaf0');
    chatBubble.style.setProperty('--bubble-border', 'transparent');
  } else {
    chatBubble.textContent = shouldShowWaiting ? 'Waiting' : 'Waiting?';
    chatBubble.style.backgroundColor = shouldShowWaiting ? '#10b981' : '#ffffff';
    chatBubble.style.color = shouldShowWaiting ? '#ffffff' : '#10b981';
    
    if (shouldShowWaiting) {
      chatBubble.style.border = 'none';
      chatBubble.style.setProperty('--bubble-bg', '#10b981');
      chatBubble.style.setProperty('--bubble-border', 'transparent');
    } else {
      chatBubble.style.border = '2px solid #10b981';
      chatBubble.style.setProperty('--bubble-bg', '#ffffff');
      chatBubble.style.setProperty('--bubble-border', '#10b981');
    }
  }
};

/**
 * Updates the user avatar ring and waiting status display in the Location sheet tab.
 */
window.updateUserWaitingCardUI = function updateUserWaitingCardUI() {
  const avatarDiv = document.getElementById('userWaitingAvatar');
  const badgeDiv = document.getElementById('userWaitingBadge');
  const bubbleDiv = document.getElementById('userWaitingBubble');
  if (!avatarDiv) return;

  // Render initial avatar once
  if (!avatarDiv.hasChildNodes()) {
    if (window.userProfilePic) {
      const isAbsolute = /^https?:\/\/|^data:/i.test(window.userProfilePic);
      const safePic = isAbsolute ? window.userProfilePic : `${window.PROJECT_BASE}/${window.userProfilePic.replace(/^\/+/, '')}`;
      avatarDiv.innerHTML = `<img src="${safePic}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
    } else {
      avatarDiv.textContent = window.userInitial || '?';
    }
  }

  const isBoarded = window.PassengerRideTracker && window.PassengerRideTracker.activeRide;
  const isWaiting = window.isPassengerWaiting && !isBoarded;
  const showBubble = isWaiting || isBoarded;

  if (bubbleDiv) {
    bubbleDiv.style.opacity = showBubble ? '1' : '0';
    bubbleDiv.style.transform = showBubble ? 'translateX(-50%) scale(1)' : 'translateX(-50%) scale(0.6)';
    if (showBubble) {
      bubbleDiv.textContent = isBoarded ? 'Boarded' : 'Waiting';
      bubbleDiv.style.backgroundColor = isBoarded ? '#0dcaf0' : '#10b981';
      bubbleDiv.style.color = '#fff';
    }
  }

  if (badgeDiv) {
    badgeDiv.style.display = showBubble ? 'flex' : 'none';
    badgeDiv.style.backgroundColor = isBoarded ? '#0dcaf0' : '#dc3545';
  }

  if (isBoarded) {
    avatarDiv.style.borderColor = '#0dcaf0';
    avatarDiv.style.boxShadow = '0 0 0 3px rgba(13,202,240,0.3), 0 2px 6px rgba(0,0,0,0.15)';
  } else if (isWaiting) {
    avatarDiv.style.borderColor = '#10b981';
    avatarDiv.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.3), 0 2px 6px rgba(0,0,0,0.15)';
  } else {
    avatarDiv.style.borderColor = '#3b82f6';
    avatarDiv.style.boxShadow = '0 2px 6px rgba(0,0,0,0.15)';
  }
};

/**
 * Helper to escape HTML strings safely.
 */
window.escapeHtml = function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, s => {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s];
  });
};

/**
 * Builds HTML template and renders list of active buses on bottom drawer.
 */
window.renderBusList = function renderBusList(buses) {
  const container = document.getElementById('busListMobile');
  if (!container) return;

  const activeBuses = buses.filter(b => {
    return (!window.selectedRoute || b.route === window.selectedRoute) && b.status !== 'unavailable' && b.coords !== null;
  });

  if (activeBuses.length === 0) {
    container.innerHTML = `
      <div class="p-3">
        <div class="d-flex flex-column justify-content-center align-items-center text-muted text-center">
          <img src="../../assets/images/icons/noBus.svg" alt="No Bus" class="mb-2 no-bus-icon" />
          <span class="fw-bold">No Available Bus</span>
        </div>
      </div>`;
    return;
  }

  container.innerHTML = activeBuses.map(b => {
    const color = statusColors[b.status] || '#ccc';
    const progress = b.progress || 0;
    const arrivalText = b.eta ? `Arriving by ${b.eta}` : '';

    let statusLabel = '';
    if (b.status === 'available') statusLabel = 'Available';
    else if (b.status === 'on_stop') statusLabel = 'On Stop';
    else if (b.status === 'full') statusLabel = 'Full';
    else statusLabel = String(b.status || '').replace('_', ' ').toUpperCase();

    return `
      <div class="card border-0 border-bottom rounded-0 cursor-pointer" onclick="focusBus('${b.id}')">
        <div class="card-body py-3 px-4">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <span class="badge bg-primary rounded-2 text-uppercase fw-bold">${b.code}</span>
            <div style="padding: 2px 8px; border-radius: 12px; background: ${color}; color: black; font-size: 11px; font-weight: bold; text-transform: uppercase;">
              ${statusLabel}
            </div>
          </div>
          <div class="d-flex justify-content-between small text-muted">
            <span>${b.locName}</span>
            <span>${b.seats} Available</span>
          </div>
          ${arrivalText ? `<div class="small text-muted mb-1">${arrivalText}</div>` : ''}
          
          <div class="bus-timeline-track position-relative mt-4 mb-2 mx-2">
            <div class="bus-timeline-progress position-absolute top-0 bottom-0" style="left:${progress}%; width:${100 - progress}%"></div>
            <div class="bus-timeline-bus position-absolute bg-white rounded-circle shadow-sm border border-2 border-primary d-flex align-items-center justify-content-center" style="left:${progress}%; transform: translateX(-50%);">
              <span class="material-symbols-rounded text-primary" style="font-size: 16px;">directions_bus</span>
            </div>
            <div class="bus-timeline-destination position-absolute bg-white rounded-circle shadow-sm border border-2 border-danger d-flex align-items-center justify-content-center" style="right: 0; transform: translateX(50%);">
              <span class="material-symbols-rounded text-danger" style="font-size: 14px;">place</span>
            </div>
          </div>
        </div>
      </div>`;
  }).join('');
};

/**
 * Builds HTML template and renders list of stops on bottom drawer.
 */
window.renderStopsList = function renderStopsList(stops) {
  const listEl = document.getElementById('busStopsListMobile');
  if (!listEl || !stops) return;

  const filteredStops = stops.filter(s => s.route && s.route.toUpperCase() === window.currentStopsRoute);
  let stopsToRender = filteredStops;

  // Sync Leaflet map layer visibility for matching stops
  if (typeof window.stopMarkers !== 'undefined' && window._map) {
    const ids = new Set(stopsToRender.map(s => String(s.id)));
    Object.keys(window.stopMarkers).forEach(id => {
      if (!ids.has(id)) {
        window._map.removeLayer(window.stopMarkers[id]);
      } else {
        if (!window._map.hasLayer(window.stopMarkers[id])) {
          const viewBusstops = document.getElementById('view-busstops');
          if (viewBusstops && !viewBusstops.classList.contains('d-none')) {
            window._map.addLayer(window.stopMarkers[id]);
          }
        }
      }
    });
  }

  // Calculate distances and sort
  if (window.locationPermissionGranted && window.userLocation) {
    stopsToRender.forEach(s => {
      const lat = parseFloat(s.lat);
      const lng = parseFloat(s.lng);
      s.distance = Number.isFinite(lat) && Number.isFinite(lng) ? window.distanceMeters(lat, lng, window.userLocation.lat, window.userLocation.lng) : 9999999;
    });
    stopsToRender = stopsToRender.slice().sort((a, b) => (a.distance || 0) - (b.distance || 0));
  }

  if (!stopsToRender.length) {
    listEl.innerHTML = '<div class="text-center text-muted mt-4 small">No bus stops yet.</div>';
    return;
  }

  listEl.innerHTML = stopsToRender.map(s => {
    const subtitle = [s.location_name, s.location_landmark].filter(Boolean).join(' • ');
    const typeLabel = String(s.type || '').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    
    let distHtml = '';
    if (s.distance !== undefined && s.distance < 9999999) {
      const dText = s.distance < 1000 ? `${Math.round(s.distance)} m away` : `${(s.distance / 1000).toFixed(1)} km away`;
      distHtml = `
        <div class="small fw-bold text-primary mt-1 d-flex align-items-center gap-1">
          <span class="material-symbols-rounded" style="font-size: 14px;">directions_walk</span>
          ${dText}
        </div>`;
    }
    
    return `
      <button type="button" class="bus-stop-card" onclick="focusStop('${String(s.id)}')">
        <div class="d-flex justify-content-between align-items-start">
          <div class="me-2">
            <div class="bus-stop-title">${window.escapeHtml(s.name)}</div>
            <div class="bus-stop-subtitle">${window.escapeHtml(subtitle || '')}</div>
          </div>
          <div class="d-flex flex-column align-items-center">
            <span class="bus-stop-type-pill">${window.escapeHtml(typeLabel || 'Pick Up Point')}</span>
            ${distHtml}
          </div>
        </div>
      </button>`;
  }).join('');
};

/**
 * Dynamically constructs routing drop-down filters according to active routes.
 */
window.updateFilters = function updateFilters(buses) {
  const manualRoutes = ['Laurel - Tanauan', 'Tanauan - Laurel'];
  const apiRoutes = buses.map(b => b.route).filter(r => r);
  const routes = [...new Set([...manualRoutes, ...apiRoutes])];
  
  const menu = document.getElementById('routeDropdownMenu');
  if (!menu) return;
  
  let html = `<li><button class="dropdown-item ${window.selectedRoute === '' ? 'active' : ''}" type="button" onclick="setRoute('')">All Routes</button></li>`;
  routes.forEach(r => {
    const safe = window.escapeHtml(r).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    html += `<li><button class="dropdown-item ${window.selectedRoute === r ? 'active' : ''}" type="button" onclick="setRoute('${safe}')">${r}</button></li>`;
  });
  menu.innerHTML = html;
};

// =========================================================================
// 5. GEOLOCATION MANAGEMENT & WATCHERS
// =========================================================================

var _lastLocationUpdateAt = 0;
var _lastUiUpdateAt = 0;
var _lastNetworkSync = 0;

/**
 * Triggered on location updates, throttling UI writes and sync cycles.
 */
window.onLocationUpdate = function onLocationUpdate(pos) {
  const now = Date.now();
  if (now - _lastLocationUpdateAt < 1500) return;
  _lastLocationUpdateAt = now;

  const lat = pos.coords.latitude;
  const lng = pos.coords.longitude;
  const acc = pos.coords.accuracy;
  const resolved = window.resolveLocationName(lat, lng);
  const locName = resolved || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

  window.userLocation = { lat, lng };
  window.lastKnownLocation = { lat, lng, locName };

  try {
    localStorage.setItem('byahero_last_lat', lat);
    localStorage.setItem('byahero_last_lng', lng);
    localStorage.setItem('byahero_last_locName', locName);
  } catch (e) {
    console.warn('Failed to save last known location:', e);
  }

  if (!window.userMarker) {
    window.userMarker = L.marker([lat, lng], {
      icon: window.getUserIcon(),
      zIndexOffset: 100
    }).addTo(window._map);
    window.bindUserMarker(window.userMarker);
  } else {
    window.userMarker.setLatLng([lat, lng]);
    window.updateUserMarkerWaitingStyle();
  }

  if (now - _lastUiUpdateAt > 5000) {
    _lastUiUpdateAt = now;
    if (window.allStops) window.renderStopsList(window.allStops);
  }

  if (now - _lastNetworkSync > SYNC_INTERVAL) {
    window.uploadMyLocation(lat, lng, acc);
    _lastNetworkSync = now;
  }

  if (window.PassengerRideTracker && typeof window.PassengerRideTracker.tick === 'function') {
    if (now - (window._lastTrackerTick || 0) > 10000) {
      window._lastTrackerTick = now;
      window.PassengerRideTracker.tick();
    }
  }
};

/**
 * Fallback watcher utilizing pure HTML5 geolocation API.
 */
window.startWebGeolocation = function startWebGeolocation() {
  if (!navigator.geolocation) return;
  window.watchId = navigator.geolocation.watchPosition(
    window.onLocationUpdate,
    err => console.warn('GPS Error:', err.message),
    { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
  );
  window.startKeepAliveAudio();
  window.acquireWakeLock();
};

/**
 * Initializes and checks permission for Capacitor or browser Geolocation services.
 */
window.startUserLocationWatch = async function startUserLocationWatch() {
  const locationEnabled = localStorage.getItem('byahero_location_services') !== '0';
  if (!locationEnabled) {
    window.showLocationDisabledNotice();
    return;
  }
  if (!navigator.geolocation) return;

  const bgPluginAvailable = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.BackgroundGeolocation;
  if (bgPluginAvailable) {
    const BG = window.Capacitor.Plugins.BackgroundGeolocation;
    try {
      const permissions = await BG.requestPermissions();
      if (permissions.location !== 'granted') {
        window.startWebGeolocation();
        return;
      }

      window.bgWatcherId = await BG.addWatcher(
        {
          backgroundMessage: "Tracking active. Keep app open in background.",
          backgroundTitle: "ByaHero Journey Tracking",
          requestPermissions: true,
          distanceFilter: 0
        },
        function callback(location, error) {
          if (error) return;
          const pos = { coords: { latitude: location.latitude, longitude: location.longitude, accuracy: location.accuracy } };
          window.onLocationUpdate(pos);
        }
      );
      window.startKeepAliveAudio();
      window.acquireWakeLock();
    } catch (e) {
      window.startWebGeolocation();
    }
  } else {
    window.startWebGeolocation();
  }
};

/**
 * Forces a geolocation pull instantly.
 */
window.triggerManualUpdate = async function triggerManualUpdate() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(pos => {
    window.onLocationUpdate(pos);
  }, err => { }, { enableHighAccuracy: true, timeout: 5000 });
};

// =========================================================================
// 6. BUS POSITION TRACKING & SCHEDULING
// =========================================================================

let _updateBusesInProgress = false;

/**
 * Normalizes API response object fields.
 */
window.normalizeBus = function normalizeBus(bus) {
  let coords = null;
  if (bus.current_location) {
    try {
      const geo = JSON.parse(bus.current_location);
      if (geo.geometry) coords = [geo.geometry.coordinates[1], geo.geometry.coordinates[0]];
    } catch (e) { }
  }
  if (!coords && bus.lat && bus.lng) coords = [bus.lat, bus.lng];
  
  return {
    id: bus.Bus_ID || bus.id,
    code: bus.code || 'BUS',
    route: bus.route || '',
    status: bus.status || 'unavailable',
    coords: coords,
    locName: bus.current_location_name || 'Updating...',
    seats: `${bus.seat_availability || 0}/${bus.total_seats || 0}`,
    eta: null,
    progress: 0,
    updated: bus.updated || null,
    operation_id: bus.current_operation_id || null
  };
};

/**
 * Converts arrival ETA offsets into a structured time string (e.g. "5:30 PM").
 */
window.formatArrivalBySeconds = function formatArrivalBySeconds(seconds) {
  const dt = new Date(Date.now() + Math.max(0, seconds * 1000));
  let h = dt.getHours();
  const m = dt.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12;
  return `${h}:${m} ${ampm}`;
};

/**
 * Updates Leaflet layers and updates lists for buses.
 */
window.updateMap = function updateMap(buses) {
  const filtered = buses.filter(b => {
    return (!window.selectedRoute || b.route === window.selectedRoute) && b.status !== 'unavailable' && b.coords !== null;
  });
  
  const currentIds = new Set(filtered.map(b => String(b.id)));
  Object.keys(window.busMarkers).forEach(id => {
    if (!currentIds.has(id)) {
      window._map.removeLayer(window.busMarkers[id]);
      delete window.busMarkers[id];
    }
  });

  if (window.userLocation && window.locationPermissionGranted) {
    if (!window.userMarker) {
      window.userMarker = L.marker([window.userLocation.lat, window.userLocation.lng], {
        icon: window.getUserIcon(),
        zIndexOffset: 100
      }).addTo(window._map);
      window.bindUserMarker(window.userMarker);
    } else {
      window.userMarker.setLatLng([window.userLocation.lat, window.userLocation.lng]);
      window.updateUserMarkerWaitingStyle();
    }
  } else if (window.userMarker && !window.locationPermissionGranted) {
    window._map.removeLayer(window.userMarker);
    window.userMarker = null;
  }

  filtered.forEach(b => {
    const iconForBus = window.createBusIcon(b.status);
    const popup = `<b>${b.code}</b><br>${b.locName}${b.eta ? `<br><small>ETA: ${b.eta}</small>` : ''}`;
    
    if (window.busMarkers[b.id]) {
      window.busMarkers[b.id].setLatLng(b.coords).setIcon(iconForBus).setZIndexOffset(1500);
      if (window.busMarkers[b.id].getPopup()) {
        window.busMarkers[b.id].setPopupContent(popup);
      } else {
        window.busMarkers[b.id].bindPopup(popup);
      }
    } else {
      const m = L.marker(b.coords, { icon: iconForBus, zIndexOffset: 1500 }).addTo(window._map);
      m.bindPopup(popup);
      window.busMarkers[b.id] = m;
    }
  });
};

/**
 * Performs AJAX pull for bus locations and updates UI components accordingly.
 */
window.updateBuses = async function updateBuses() {
  if (_updateBusesInProgress) return;
  _updateBusesInProgress = true;
  
  try {
    const res = await fetch('../api.php?action=get_buses');
    const json = await res.json();
    if (json.success && json.buses) {
      const buses = json.buses.map(window.normalizeBus);
      window.allBuses = buses;
      
      if (window.locationPermissionGranted && window.userLocation) {
        buses.forEach(b => {
          if (b.coords) {
            const dist = window.distanceMeters(b.coords[0], b.coords[1], window.userLocation.lat, window.userLocation.lng);
            b.eta = window.formatArrivalBySeconds(dist / AVG_SPEED_MPS);
            b.progress = Math.round(Math.max(0, Math.min(100, 100 - (dist / MAX_DISTANCE_METERS) * 100)));
          }
        });
      }
      
      if (typeof generateSmartNotificationsFromBuses === 'function') {
        await generateSmartNotificationsFromBuses(buses);
      }
      
      window.updateMap(buses);
      window.renderBusList(buses);
      window.updateFilters(buses);
    }
  } catch (e) {
    console.error('Bus fetch error:', e);
  } finally {
    _updateBusesInProgress = false;
  }
};

/**
 * Loops bus updates on fixed timer intervals.
 */
window.scheduleNextBusUpdate = function scheduleNextBusUpdate() {
  window._updateBusesTimer = setTimeout(async () => {
    await window.updateBuses();
    window.scheduleNextBusUpdate();
  }, 15000);
};

// =========================================================================
// 7. ROUTING, BUS STOPS & VIEWS FOCUSING
// =========================================================================

/**
 * Pans map viewport directly to target bus marker coordinates.
 */
window.focusBus = function focusBus(id) {
  const m = window.busMarkers[id];
  if (!m) return;
  window._map.flyTo(m.getLatLng(), 15);
  m.openPopup();
};

/**
 * Applies route filtering selection.
 */
window.setRoute = function setRoute(r) {
  window.selectedRoute = r;
  const label = document.getElementById('filterLabelMobile');
  if (label) {
    label.textContent = r ? `${r.substring(0, 12)}...` : 'FILTER ROUTES';
  }
  window.updateBuses();
  setTimeout(() => window.centerToFirstBusInRoute(r, window.allBuses), 300);
};

/**
 * Helper to update routes selection via BottomSheet UI calls.
 */
window.setRouteFromSheet = function setRouteFromSheet(route) {
  window.setRoute(route);
  if (typeof window.updateRoutePills === 'function') window.updateRoutePills();
};

/**
 * Shifts map center directly onto the first active bus along selected route.
 */
window.centerToFirstBusInRoute = function centerToFirstBusInRoute(route, buses) {
  const filtered = buses.filter(b => {
    return (!route || b.route === route) && b.status !== 'unavailable' && b.coords !== null;
  });
  if (filtered.length > 0) window.focusBus(filtered[0].id);
};

/**
 * Fetches bus stops data and maps them.
 */
window.loadStops = async function loadStops() {
  const listEl = document.getElementById('busStopsListMobile');
  if (listEl) {
    listEl.innerHTML = `
      <div class="text-center mt-4">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>`;
  }

  let stops = [];
  try {
    const res = await fetch('../api.php?action=get_bus_stops_terminal', { cache: 'no-store' });
    const json = await res.json();
    if (json && json.success && Array.isArray(json.data)) {
      stops = json.data;
    }
  } catch (e) {
    console.warn('Failed to fetch stops, falling back to local cache:', e);
  }

  if (!stops || stops.length === 0) {
    const cachedStops = localStorage.getItem('byahero_offline_stops');
    if (cachedStops) {
      try {
        stops = JSON.parse(cachedStops);
      } catch (ex) {}
    }
  }

  if (!stops || stops.length === 0) {
    stops = window.BYAHERO_OFFLINE_DATA?.stops || [];
  }

  window.allStops = stops;
  window.renderStopsList(stops);

  const ids = new Set(stops.map(s => String(s.id)));
  Object.keys(window.stopMarkers).forEach(id => {
    if (!ids.has(id)) {
      window._map.removeLayer(window.stopMarkers[id]);
      delete window.stopMarkers[id];
    }
  });

  stops.forEach(s => {
    const id = String(s.id);
    const lat = parseFloat(s.lat);
    const lng = parseFloat(s.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const typeLabel = String(s.type || '').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    const popup = `
      <b>${window.escapeHtml(s.name)}</b><br>
      ${window.escapeHtml(s.location_name || '')}
      ${s.location_landmark ? `<br><small>${window.escapeHtml(s.location_landmark)}</small>` : ''}
      <br><small>${window.escapeHtml(typeLabel)}</small>`;

    if (window.stopMarkers[id]) {
      window.stopMarkers[id].setLatLng([lat, lng]).setIcon(window.stopIcon(s.type)).setPopupContent(popup);
    } else {
      window.stopMarkers[id] = L.marker([lat, lng], {
        icon: window.stopIcon(s.type),
        stopType: String(s.type || 'bus_stop').toLowerCase()
      }).addTo(window._map).bindPopup(popup);
    }
  });

  if (typeof setBusStopsVisibility === 'function') setBusStopsVisibility(false);
  window.resizeStopMarkersForZoom(window._map.getZoom());
};

/**
 * Toggles directional stops routing (Laurel->Tanauan or Tanauan->Laurel).
 */
window.toggleStopsRoute = function toggleStopsRoute() {
  const icon = document.getElementById('stopsRouteIcon');
  if (icon) {
    let currentRot = parseInt(icon.getAttribute('data-rot') || '0');
    currentRot += 180;
    icon.style.transform = `rotate(${currentRot}deg)`;
    icon.setAttribute('data-rot', currentRot);
  }

  window.currentStopsRoute = (window.currentStopsRoute === 'LAUREL - TANAUAN') ? 'TANAUAN - LAUREL' : 'LAUREL - TANAUAN';

  const textEl = document.getElementById('stopsRouteText');
  if (textEl) textEl.textContent = window.currentStopsRoute;

  if (window.allStops) {
    window.renderStopsList(window.allStops);
  }
};

/**
 * Pans map viewpoint directly onto coordinates, applying custom bottom sheet overlays offset.
 */
window.flyToMyLocationKeepingMarkerVisible = function flyToMyLocationKeepingMarkerVisible(lat, lng) {
  const zoom = Math.max(window._map.getZoom(), 16);
  window._map.flyTo([lat, lng], zoom, { animate: true, duration: 0.6 });
  
  setTimeout(() => {
    const sheetH = (typeof getBottomSheetHeightPx === 'function') ? getBottomSheetHeightPx() : 0;
    const padding = 40;
    const yOffset = Math.round((sheetH / 2) + padding);
    if (yOffset > 0) {
      window._map.panBy([0, yOffset], { animate: true, duration: 0.25 });
    }
  }, 650);
};

/**
 * Centers map directly over user position. Forces high accuracy hardware GPS request.
 */
window.centerToMyLocation = function centerToMyLocation() {
  if (window.userLocation && window.locationPermissionGranted) {
    window.flyToMyLocationKeepingMarkerVisible(window.userLocation.lat, window.userLocation.lng);
    if (window.userMarker) window.userMarker.bringToFront?.();
    return;
  }
  
  if (!navigator.geolocation) {
    alert('Geolocation is not supported on this device/browser.');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    pos => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      window.userLocation = { lat, lng };
      
      if (!window.userMarker) {
        window.userMarker = L.circleMarker([lat, lng], {
          radius: 8,
          color: '#2563eb',
          fillColor: '#60a5fa',
          fillOpacity: 0.9
        }).addTo(window._map);
      } else {
        window.userMarker.setLatLng([lat, lng]);
      }
      
      window.bindUserMarker(window.userMarker);
      window.flyToMyLocationKeepingMarkerVisible(lat, lng);
      window.uploadMyLocation(lat, lng, pos.coords.accuracy);
    },
    error => {
      console.error('centerToMyLocation error:', error);
      if (error.code === error.PERMISSION_DENIED) {
        window.showLocationPermissionDenied();
      } else {
        alert('Unable to get your location right now.');
      }
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
  );
};

// =========================================================================
// 8. NOTIFICATION MODALS
// =========================================================================

/**
 * Triggers permission disabled banners.
 */
window.showLocationDisabledNotice = function showLocationDisabledNotice() {
  if (sessionStorage.getItem('location_notice_shown')) return;
  
  const notice = document.createElement('div');
  notice.className = 'location-notice position-fixed bottom-0 start-50 translate-middle-x mb-5 p-3 bg-warning text-dark rounded shadow-lg d-flex align-items-center gap-2';
  notice.style.zIndex = '9999';
  notice.style.maxWidth = '90%';
  notice.innerHTML = `
    <span class="material-symbols-rounded">location_off</span>
    <span class="small">Location services disabled. <a href="./passengerSettings/privacySecurity.php" class="text-primary fw-bold text-decoration-underline">Enable</a></span>
    <button class="btn border-0 bg-transparent p-0 ms-2" style="box-shadow: none;" onclick="this.parentElement.remove()">
      <img src="../../assets/images/EKS.svg" alt="Close" style="width: 14px; height: 14px; display: block;" />
    </button>`;
  
  document.body.appendChild(notice);
  sessionStorage.setItem('location_notice_shown', '1');
  setTimeout(() => { if (notice.parentElement) notice.remove(); }, 5000);
};

/**
 * Triggers permission denied banners.
 */
window.showLocationPermissionDenied = function showLocationPermissionDenied() {
  const notice = document.createElement('div');
  notice.className = 'location-notice position-fixed bottom-0 start-50 translate-middle-x mb-5 p-3 bg-danger text-white rounded shadow-lg d-flex align-items-center gap-2';
  notice.style.zIndex = '9999';
  notice.style.maxWidth = '90%';
  notice.innerHTML = `
    <span class="material-symbols-rounded">error</span>
    <span class="small">Location permission denied. Please enable it in your browser settings.</span>
    <button class="btn border-0 bg-transparent p-0 ms-2" style="box-shadow: none;" onclick="this.parentElement.remove()">
      <img src="../../assets/images/EKS.svg" alt="Close" style="width: 14px; height: 14px; display: block; filter: brightness(0) invert(1);" />
    </button>`;
  
  document.body.appendChild(notice);
};

/**
 * Handles toggling state and fetching data to open the Passenger Waiting Modal.
 */
window.openWaitingModal = async function openWaitingModal() {
  const resolvedLoc = (window.lastKnownLocation && window.lastKnownLocation.locName) ? window.resolveLocationName(window.lastKnownLocation.lat, window.lastKnownLocation.lng) : null;
  const displaySpan = document.getElementById('waitingLocationNameDisplay');
  const btnSet = document.getElementById('btnSetWaiting');
  const btnCancel = document.getElementById('btnCancelWaiting');
  const statusMsg = document.getElementById('waitingStatusMsg');

  await window.checkWaitingStatus();
  
  const isBoarded = window.PassengerRideTracker && window.PassengerRideTracker.activeRide;

  if (isBoarded) {
    if (displaySpan) displaySpan.textContent = `On Bus ${window.PassengerRideTracker.activeRide.bus_code}`;
    if (btnSet) btnSet.classList.add('d-none');
    if (btnCancel) { btnCancel.classList.add('d-none'); btnCancel.classList.remove('d-flex'); }
    if (statusMsg) {
      statusMsg.classList.remove('d-none');
      statusMsg.className = "alert alert-info py-2 px-3 mb-3 small rounded-3";
      statusMsg.innerHTML = `<span class="material-symbols-rounded align-middle me-1" style="font-size:16px;">directions_bus</span> You are currently boarded. Enjoy your ride!`;
    }
  } else if (window.isPassengerWaiting) {
    if (displaySpan) displaySpan.textContent = window.passengerWaitingLocation || "Your current location";
    if (btnSet) btnSet.classList.add('d-none');
    if (btnCancel) { btnCancel.classList.remove('d-none'); btnCancel.classList.add('d-flex'); }
    if (statusMsg) {
      statusMsg.classList.remove('d-none');
      statusMsg.className = "alert alert-success py-2 px-3 mb-3 small rounded-3";
      statusMsg.innerHTML = `<strong>Status:</strong> Waiting for bus at <strong>${window.passengerWaitingLocation}</strong>.`;
    }
  } else {
    if (resolvedLoc) {
      if (displaySpan) displaySpan.textContent = resolvedLoc;
      if (btnSet) {
        btnSet.classList.remove('d-none');
        btnSet.removeAttribute('disabled');
      }
      if (btnCancel) { btnCancel.classList.add('d-none'); btnCancel.classList.remove('d-flex'); }
      if (statusMsg) statusMsg.classList.add('d-none');
    } else {
      if (displaySpan) displaySpan.textContent = "Unrecognized Location";
      if (btnSet) {
        btnSet.classList.remove('d-none');
        btnSet.setAttribute('disabled', 'true');
      }
      if (btnCancel) { btnCancel.classList.add('d-none'); btnCancel.classList.remove('d-flex'); }
      if (statusMsg) {
        statusMsg.classList.remove('d-none');
        statusMsg.className = "alert alert-danger py-2 px-3 mb-3 small rounded-3";
        statusMsg.innerHTML = `<span class="material-symbols-rounded align-middle me-1" style="font-size:16px;">warning</span> You are not inside any recognized location. Waiting can only be activated at designated locations.`;
      }
    }
  }

  const modalEl = document.getElementById('waitingModal');
  if (modalEl) {
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
  }
};

/**
 * Submits waiting state activate requests to the backend waiting API.
 */
window.handleSetWaiting = async function handleSetWaiting() {
  const btnSet = document.getElementById('btnSetWaiting');
  const resolvedLoc = (window.lastKnownLocation && window.lastKnownLocation.locName) ? window.resolveLocationName(window.lastKnownLocation.lat, window.lastKnownLocation.lng) : null;
  if (!resolvedLoc) {
    alert("Unable to set waiting status. You must be inside a recognized location.");
    return;
  }

  btnSet.setAttribute('disabled', 'true');
  btnSet.innerHTML = `<div class="d-flex align-items-center justify-content-center gap-2 py-2 text-primary fw-bold"><span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Updating status...</div>`;

  try {
    const res = await window.safePost('../../backend/waiting_api.php', {
      action: 'set_waiting',
      location_name: resolvedLoc
    });
    
    if (res && res.success) {
      window.isPassengerWaiting = true;
      window.passengerWaitingLocation = resolvedLoc;
      try {
        localStorage.setItem('byahero_is_passenger_waiting', '1');
        localStorage.setItem('byahero_passenger_waiting_location', resolvedLoc);
      } catch (e) {}
      window.updateUserMarkerWaitingStyle();
      window.updateUserWaitingCardUI();

      btnSet.classList.add('d-none');
      const btnCancel = document.getElementById('btnCancelWaiting');
      if (btnCancel) { btnCancel.classList.remove('d-none'); btnCancel.classList.add('d-flex'); }

      const statusMsg = document.getElementById('waitingStatusMsg');
      if (statusMsg) {
        statusMsg.classList.remove('d-none');
        statusMsg.className = "alert alert-success py-2 px-3 mb-3 small rounded-3";
        statusMsg.innerHTML = `<strong>Status:</strong> Waiting for bus at <strong>${resolvedLoc}</strong>.`;
      }

      const modalEl = document.getElementById('waitingModal');
      bootstrap.Modal.getInstance(modalEl).hide();
      alert(`🚌 You are now marked as waiting at ${resolvedLoc}!`);
    } else {
      alert(res.message || "Failed to update waiting status");
    }
  } catch (e) {
    console.error("Error setting waiting:", e);
    alert("An error occurred. Please try again.");
  } finally {
    btnSet.removeAttribute('disabled');
    btnSet.innerHTML = `<img src="../../assets/images/waitingButton.svg" alt="I am waiting" style="width: 100%; height: auto; max-width: 320px; display: block; margin: 0 auto;" />`;
  }
};

/**
 * Submits waiting state cancel requests to the backend waiting API.
 */
window.handleCancelWaiting = async function handleCancelWaiting() {
  const btnCancel = document.getElementById('btnCancelWaiting');
  const btnSet = document.getElementById('btnSetWaiting');
  
  btnCancel.setAttribute('disabled', 'true');
  btnCancel.innerHTML = `<div class="d-flex align-items-center justify-content-center gap-2"><span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Cancelling...</div>`;

  try {
    const res = await window.safePost('../../backend/waiting_api.php', {
      action: 'cancel_waiting'
    });
    
    if (res && res.success) {
      window.isPassengerWaiting = false;
      window.passengerWaitingLocation = null;
      try {
        localStorage.setItem('byahero_is_passenger_waiting', '0');
        localStorage.removeItem('byahero_passenger_waiting_location');
      } catch (e) {}
      window.updateUserMarkerWaitingStyle();
      window.updateUserWaitingCardUI();

      btnCancel.classList.add('d-none'); btnCancel.classList.remove('d-flex');
      if (btnSet) btnSet.classList.remove('d-none');

      const statusMsg = document.getElementById('waitingStatusMsg');
      if (statusMsg) statusMsg.classList.add('d-none');

      const modalEl = document.getElementById('waitingModal');
      bootstrap.Modal.getInstance(modalEl).hide();
      alert("Waiting status cancelled successfully.");
    } else {
      alert(res.message || "Failed to cancel waiting status");
    }
  } catch (e) {
    console.error("Error cancelling waiting:", e);
    alert("An error occurred. Please try again.");
  } finally {
    btnCancel.removeAttribute('disabled');
    btnCancel.innerHTML = `
      <span class="waiting-modal-btn-circle-icon text-secondary">
        <img src="../../assets/images/EKS.svg" alt="Close" style="width: 18px; height: 18px; display: inline-block; vertical-align: middle;" />
      </span>
      <span>Cancel Waiting</span>`;
  }
};

// =========================================================================
// 9. EVENT LISTENERS & APPLICATION LIFECYCLES
// =========================================================================

// DOM Ready Handler
document.addEventListener('DOMContentLoaded', () => {
  const locationEnabled = localStorage.getItem('byahero_location_services') !== '0';
  if (!locationEnabled) window.locationPermissionGranted = false;

  window.loadRouteFeatures().catch(() => { });

  // Deep Link Circle Join Parsing
  const urlParams = new URLSearchParams(window.location.search);
  const joinCode = urlParams.get('join_circle');
  if (joinCode) {
    window.history.replaceState({}, document.title, window.location.pathname);
    fetch('../../backend/joinCircleByCode.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invite_code: joinCode })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          alert('Welcome! You have successfully joined the circle.');
          if (typeof switchSheetTab === 'function') switchSheetTab('groups');
        } else {
          console.warn('Auto-join failed:', data.message);
          if (data.message !== 'Already in circle') {
            alert(`Join failed: ${data.message}`);
          }
        }
      })
      .catch(err => console.error('Deep link join error:', err));
  }

  // Wire up Waiting Modal Action Listeners
  const btnSet = document.getElementById('btnSetWaiting');
  if (btnSet) {
    btnSet.addEventListener('click', () => window.handleSetWaiting());
  }

  const btnCancel = document.getElementById('btnCancelWaiting');
  if (btnCancel) {
    btnCancel.addEventListener('click', () => window.handleCancelWaiting());
  }

  window.checkWaitingStatus();
  window.updateUserWaitingCardUI();
});

// App State Geolocation & Audio Keep-Alive Handlers
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible') {
    window.acquireWakeLock();
    if (window.keepAliveAudio && window.keepAliveAudio.paused) {
      window.keepAliveAudio.play().catch(() => { });
    }
    
    const trackingActive = (window.bgWatcherId !== null || window.watchId !== null);
    if (!trackingActive) {
      window.startUserLocationWatch();
    } else if (window.lastKnownLocation) {
      window.uploadMyLocation(window.lastKnownLocation.lat, window.lastKnownLocation.lng, 0);
      window._lastNetworkSync = Date.now();
    }
  }
});

// Capacitor Native App Lifecycle State Synchronization
if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
  window.Capacitor.Plugins.App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) {
      window.acquireWakeLock();
      if (window.keepAliveAudio && window.keepAliveAudio.paused) {
        window.keepAliveAudio.play().catch(() => { });
      }
      if (window.lastKnownLocation) {
        window.uploadMyLocation(window.lastKnownLocation.lat, window.lastKnownLocation.lng, 0);
        window._lastNetworkSync = Date.now();
      }
    }
  });
}

// Background Geolocation Heartbeat Keep-Alive Loop
let _heartbeatRunning = false;
async function _heartbeatTick() {
  if (_heartbeatRunning) return;
  _heartbeatRunning = true;
  try {
    if (document.visibilityState !== 'visible') {
      if (window.keepAliveAudio && window.keepAliveAudio.paused) {
        window.keepAliveAudio.play().catch(() => { });
      }
    }
    
    const trackingActive = (window.bgWatcherId !== null || window.watchId !== null);
    if (!trackingActive) {
      window.startUserLocationWatch();
    } else if (window.lastKnownLocation && (Date.now() - window._lastNetworkSync > 8000)) {
      window.triggerManualUpdate();
    }
  } finally {
    _heartbeatRunning = false;
    window._heartbeatIntervalId = setTimeout(_heartbeatTick, 30000);
  }
}
window._heartbeatIntervalId = setTimeout(_heartbeatTick, 30000);

// Storage Synchronization Listener (Privacy Toggles)
window.addEventListener('storage', e => {
  if (e.key !== 'byahero_location_services') return;
  
  const isEnabled = e.newValue !== '0';
  if (isEnabled && !window.locationPermissionGranted) {
    window.startUserLocationWatch();
  } else if (!isEnabled && window.locationPermissionGranted) {
    window.locationPermissionGranted = false;
    if (window.userMarker) {
      window._map.removeLayer(window.userMarker);
      window.userMarker = null;
    }
    window.userLocation = null;
  }
});

// Cleanup listeners on page unload
function _cleanup() {
  if (window._heartbeatIntervalId) {
    clearTimeout(window._heartbeatIntervalId);
    window._heartbeatIntervalId = null;
  }
  if (window._rideTrackerIntervalId) {
    clearTimeout(window._rideTrackerIntervalId);
    window._rideTrackerIntervalId = null;
  }
  if (window._updateBusesTimer) {
    clearTimeout(window._updateBusesTimer);
    window._updateBusesTimer = null;
  }
  
  _updateBusesInProgress = false;
  
  if (window.watchId) {
    try {
      navigator.geolocation.clearWatch(window.watchId);
    } catch (e) { }
    window.watchId = null;
  }
  
  const bgPluginAvailable = window.bgWatcherId && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.BackgroundGeolocation;
  if (bgPluginAvailable) {
    try {
      window.Capacitor.Plugins.BackgroundGeolocation.removeWatcher({ id: window.bgWatcherId });
    } catch (e) { }
    window.bgWatcherId = null;
  }
  
  window.releaseWakeLock();
  window.stopKeepAliveAudio();
}

window.addEventListener('beforeunload', _cleanup);
window.addEventListener('pagehide', _cleanup);