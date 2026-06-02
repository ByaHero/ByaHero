/**
 * passengerMap.js
 * ──────────────────────────────────────────────────────────────────────────
 * Passenger map and dashboard layout rendering logic.
 * Encapsulates Leaflet controls, custom markers, polling & lists updates.
 * Also handles initialization, modal bindings, and page cleanup hooks.
 * ──────────────────────────────────────────────────────────────────────────
 */

// Global namespaces for passenger map state
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

var AVG_SPEED_MPS = (30 * 1000) / 3600;
var MAX_DISTANCE_METERS = 5000;

var statusColors = {
  available: '#10b981',
  on_stop: '#f59e0b',
  full: '#ef4444',
  unavailable: '#6b7280'
};

// --------------------- BUS ICONS ---------------------
var ICON_CACHE = {};
function initIconCache() {
  if (ICON_CACHE.available) return;
  ICON_CACHE.available = L.icon({
    iconUrl: window.ICON_BASE + '/marker.svg',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
  });
  ICON_CACHE.full = L.icon({
    iconUrl: window.ICON_BASE + '/marker.svg',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
  });
}

window.createBusIcon = function createBusIcon(status) {
  initIconCache();
  var s = String(status || '').toLowerCase();
  if (s === 'full') return ICON_CACHE.full;
  return ICON_CACHE.available;
};

// --------------------- USER LOCATION & AVATAR ---------------------
// Restore last known location from localStorage for instant map display
(function () {
  try {
    var savedLat = localStorage.getItem('byahero_last_lat');
    var savedLng = localStorage.getItem('byahero_last_lng');
    var savedLocName = localStorage.getItem('byahero_last_locName');
    if (savedLat && savedLng) {
      var lat = parseFloat(savedLat);
      var lng = parseFloat(savedLng);
      if (!isNaN(lat) && !isNaN(lng)) {
        window.userLocation = { lat: lat, lng: lng };
        window.lastKnownLocation = { lat: lat, lng: lng, locName: savedLocName || '' };
      }
    }
  } catch (e) {
    console.warn('Failed to restore last known location:', e);
  }
})();

window.getUserIcon = function getUserIcon() {
  var currentZoom = (typeof map !== 'undefined' && map) ? map.getZoom() : 12;
  var baseZoom = 12;
  var scale = Math.pow(1.10, currentZoom - baseZoom);
  scale = Math.max(0.85, Math.min(2.5, scale));

  var markerSize = Math.round(36 * scale);
  var bubbleBottom = Math.round(markerSize + 6);

  var htmlContent = '';
  htmlContent += '<div class="user-avatar-circle" style="width: ' + markerSize + 'px; height: ' + markerSize + 'px;">';

  var userProfilePic = window.userProfilePic;
  var rawUserName = window.rawUserName || 'Guest';
  var userInitial = window.userInitial || (rawUserName.length > 0 ? rawUserName.charAt(0).toUpperCase() : '?');

  if (userProfilePic) {
    var isAbsolute = /^https?:\/\//i.test(userProfilePic);
    var safePic = isAbsolute ? userProfilePic : window.PROJECT_BASE + '/' + userProfilePic.replace(/^\/+/, '');
    htmlContent += '<img src="' + safePic + '" style="width:100%;height:100%;object-fit:cover;" />';
  } else {
    htmlContent += userInitial;
  }
  htmlContent += '</div>';

  var isWaiting = (window.isPassengerWaiting && !(window.PassengerRideTracker && window.PassengerRideTracker.activeRide));
  var bubbleText = isWaiting ? 'Waiting' : 'Waiting?';

  htmlContent += '<div class="user-waiting-chat-bubble" style="bottom: ' + bubbleBottom + 'px; left: 50%;">';
  htmlContent += bubbleText;
  htmlContent += '</div>';

  var isWaitingClass = isWaiting ? ' is-waiting' : '';

  return L.divIcon({
    className: 'user-marker-container' + isWaitingClass,
    html: htmlContent,
    iconSize: [markerSize, markerSize],
    iconAnchor: [markerSize / 2, markerSize / 2]
  });
};

window.bindUserMarker = function bindUserMarker(marker) {
  if (!marker) return;
  marker.off('click');
  marker.on('click', function () {
    window.openWaitingModal();
  });
  window.updateUserMarkerWaitingStyle();
};

window.checkWaitingStatus = async function checkWaitingStatus() {
  try {
    const url = new URL('../../backend/waiting_api.php?action=get_my_status', window.location.href).href;
    const res = await fetch(url, { credentials: 'have' });
    const data = await res.json();
    if (data && data.success) {
      window.isPassengerWaiting = !!data.is_waiting;
      window.passengerWaitingLocation = data.location_name;
      window.updateUserMarkerWaitingStyle();
      window.updateUserWaitingCardUI();
    }
  } catch (e) { console.error("Error checking waiting status:", e); }
};

window.updateUserMarkerWaitingStyle = function updateUserMarkerWaitingStyle() {
  if (!window.userMarker) return;
  const element = window.userMarker._icon || window.userMarker._path;
  if (!element) return;

  var shouldShowWaiting = window.isPassengerWaiting && !(window.PassengerRideTracker && window.PassengerRideTracker.activeRide);

  if (shouldShowWaiting) {
    element.classList.add('is-waiting');
  } else {
    element.classList.remove('is-waiting');
  }

  // Dynamic text content update for the bubble to avoid marker redrawing
  const chatBubble = element.querySelector('.user-waiting-chat-bubble');
  if (chatBubble) {
    chatBubble.textContent = shouldShowWaiting ? 'Waiting' : 'Waiting?';
  }
};

// Updates the profile avatar + waiting bubble in the Location tab header
window.updateUserWaitingCardUI = function updateUserWaitingCardUI() {
  var avatarDiv = document.getElementById('userWaitingAvatar');
  var badgeDiv = document.getElementById('userWaitingBadge');
  var bubbleDiv = document.getElementById('userWaitingBubble');
  if (!avatarDiv) return;

  // Populate avatar once
  if (!avatarDiv.hasChildNodes()) {
    if (window.userProfilePic) {
      var isAbsolute = /^https?:\/\//i.test(window.userProfilePic);
      var safePic = isAbsolute ? window.userProfilePic : window.PROJECT_BASE + '/' + window.userProfilePic.replace(/^\/+/, '');
      avatarDiv.innerHTML = '<img src="' + safePic + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />';
    } else {
      avatarDiv.textContent = window.userInitial || '?';
    }
  }

  var isWaiting = window.isPassengerWaiting && !(window.PassengerRideTracker && window.PassengerRideTracker.activeRide);

  // Bubble visibility
  if (bubbleDiv) {
    bubbleDiv.style.opacity = isWaiting ? '1' : '0';
    bubbleDiv.style.transform = isWaiting ? 'translateX(-50%) scale(1)' : 'translateX(-50%) scale(0.6)';
  }

  // Badge visibility
  if (badgeDiv) badgeDiv.style.display = isWaiting ? 'flex' : 'none';

  // Avatar ring colour — green when waiting, blue otherwise
  avatarDiv.style.borderColor = isWaiting ? '#10b981' : '#3b82f6';
  avatarDiv.style.boxShadow = isWaiting
    ? '0 0 0 3px rgba(16,185,129,0.3), 0 2px 6px rgba(0,0,0,0.15)'
    : '0 2px 6px rgba(0,0,0,0.15)';
};

window.openWaitingModal = async function openWaitingModal() {
  const resolvedLoc = (window.lastKnownLocation && window.lastKnownLocation.locName) ? window.resolveLocationName(window.lastKnownLocation.lat, window.lastKnownLocation.lng) : null;

  const displaySpan = document.getElementById('waitingLocationNameDisplay');
  const btnSet = document.getElementById('btnSetWaiting');
  const btnCancel = document.getElementById('btnCancelWaiting');
  const statusMsg = document.getElementById('waitingStatusMsg');

  await window.checkWaitingStatus();

  if (window.isPassengerWaiting) {
    displaySpan.textContent = window.passengerWaitingLocation || "Your current stop";
    btnSet.classList.add('d-none');
    btnCancel.classList.remove('d-none');
    statusMsg.classList.remove('d-none');
    statusMsg.className = "alert alert-success py-2 px-3 mb-3 small rounded-3";
    statusMsg.innerHTML = `<strong>Status:</strong> Waiting for bus at <strong>${window.passengerWaitingLocation}</strong>.`;
  } else {
    if (resolvedLoc) {
      displaySpan.textContent = resolvedLoc;
      btnSet.classList.remove('d-none');
      btnSet.removeAttribute('disabled');
      btnCancel.classList.add('d-none');
      statusMsg.classList.add('d-none');
    } else {
      displaySpan.textContent = "Unrecognized Stop";
      btnSet.classList.remove('d-none');
      btnSet.setAttribute('disabled', 'true');
      btnCancel.classList.add('d-none');
      statusMsg.classList.remove('d-none');
      statusMsg.className = "alert alert-danger py-2 px-3 mb-3 small rounded-3";
      statusMsg.innerHTML = `<span class="material-symbols-rounded align-middle me-1" style="font-size:16px;">warning</span> You are not at any recognized stop. Waiting can only be activated at designated locations.`;
    }
  }

  const modalEl = document.getElementById('waitingModal');
  if (modalEl) {
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
  }
};

window.triggerManualUpdate = async function triggerManualUpdate() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(pos => {
    window.onLocationUpdate(pos);
  }, err => { }, { enableHighAccuracy: true, timeout: 5000 });
};

window.showLocationDisabledNotice = function showLocationDisabledNotice() {
  if (sessionStorage.getItem('location_notice_shown')) return;
  var notice = document.createElement('div');
  notice.className = 'location-notice position-fixed bottom-0 start-50 translate-middle-x mb-5 p-3 bg-warning text-dark rounded shadow-lg d-flex align-items-center gap-2';
  notice.style.zIndex = '9999';
  notice.style.maxWidth = '90%';
  notice.innerHTML = `<span class="material-symbols-rounded">location_off</span><span class="small">Location services disabled. <a href="./passengerSettings/privacySecurity.php" class="text-primary fw-bold text-decoration-underline">Enable</a></span><button class="btn border-0 bg-transparent p-0 ms-2" style="box-shadow: none;" onclick="this.parentElement.remove()"><img src="../../assets/images/EKS.svg" alt="Close" style="width: 14px; height: 14px; display: block;" /></button>`;
  document.body.appendChild(notice);
  sessionStorage.setItem('location_notice_shown', '1');
  setTimeout(function () { if (notice.parentElement) notice.remove(); }, 5000);
};

window.showLocationPermissionDenied = function showLocationPermissionDenied() {
  var notice = document.createElement('div');
  notice.className = 'location-notice position-fixed bottom-0 start-50 translate-middle-x mb-5 p-3 bg-danger text-white rounded shadow-lg d-flex align-items-center gap-2';
  notice.style.zIndex = '9999'; notice.style.maxWidth = '90%';
  notice.innerHTML = `<span class="material-symbols-rounded">error</span><span class="small">Location permission denied. Please enable it in your browser settings.</span><button class="btn border-0 bg-transparent p-0 ms-2" style="box-shadow: none;" onclick="this.parentElement.remove()"><img src="../../assets/images/EKS.svg" alt="Close" style="width: 14px; height: 14px; display: block; filter: brightness(0) invert(1);" /></button>`;
  document.body.appendChild(notice);
};

// Consolidated UI update throttles
var _lastLocationUpdateAt = 0;
var _lastUiUpdateAt = 0;
var _lastNetworkSync = 0;
var SYNC_INTERVAL = 5000;

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

window.uploadMyLocation = async function uploadMyLocation(lat, lng, accuracy) {
  await window.safePost('../../backend/updateUserLocation.php', {
    latitude: lat,
    longitude: lng,
    accuracy: accuracy ?? null
  });
};

window.startUserLocationWatch = async function startUserLocationWatch() {
  const locationEnabled = localStorage.getItem('byahero_location_services') !== '0';
  if (!locationEnabled) { window.showLocationDisabledNotice(); return; }
  if (!navigator.geolocation) return;

  if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.BackgroundGeolocation) {
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
    } catch (e) { window.startWebGeolocation(); }
  } else {
    window.startWebGeolocation();
  }
};

window.startWebGeolocation = function startWebGeolocation() {
  if (!navigator.geolocation) return;
  window.watchId = navigator.geolocation.watchPosition(
    window.onLocationUpdate,
    (err) => console.warn('GPS Error:', err.message),
    { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
  );
  window.startKeepAliveAudio();
  window.acquireWakeLock();
};

// --------------------- BUS POLLING & MAPPING ---------------------
var _updateBusesInProgress = false;

window.updateBuses = async function updateBuses() {
  if (_updateBusesInProgress) return;
  _updateBusesInProgress = true;
  try {
    var res = await fetch('../api.php?action=get_buses');
    var json = await res.json();
    if (json.success && json.buses) {
      var buses = json.buses.map(window.normalizeBus);
      window.allBuses = buses;
      if (window.locationPermissionGranted && window.userLocation) {
        buses.forEach(function (b) {
          if (b.coords) {
            var dist = window.distanceMeters(b.coords[0], b.coords[1], window.userLocation.lat, window.userLocation.lng);
            b.eta = window.formatArrivalBySeconds(dist / AVG_SPEED_MPS);
            b.progress = Math.round(Math.max(0, Math.min(100, 100 - (dist / MAX_DISTANCE_METERS) * 100)));
          }
        });
      }
      if (typeof generateSmartNotificationsFromBuses === 'function') await generateSmartNotificationsFromBuses(buses);
      window.updateMap(buses);
      window.renderBusList(buses);
      window.updateFilters(buses);
    }
  } catch (e) { console.error('Bus fetch error:', e); }
  finally {
    _updateBusesInProgress = false;
  }
};

window.scheduleNextBusUpdate = function scheduleNextBusUpdate() {
  window._updateBusesTimer = setTimeout(async () => {
    await window.updateBuses();
    window.scheduleNextBusUpdate();
  }, 4000);
};

window.updateMap = function updateMap(buses) {
  var filtered = buses.filter(function (b) {
    return (!window.selectedRoute || b.route === window.selectedRoute) && b.status !== 'unavailable' && b.coords !== null;
  });
  var currentIds = new Set(filtered.map(function (b) { return String(b.id); }));
  Object.keys(window.busMarkers).forEach(function (id) {
    if (!currentIds.has(id)) { window._map.removeLayer(window.busMarkers[id]); delete window.busMarkers[id]; }
  });

  if (window.userLocation && window.locationPermissionGranted) {
    if (!window.userMarker) {
      window.userMarker = L.marker([window.userLocation.lat, window.userLocation.lng], { icon: window.getUserIcon(), zIndexOffset: 100 }).addTo(window._map);
      window.bindUserMarker(window.userMarker);
    } else {
      window.userMarker.setLatLng([window.userLocation.lat, window.userLocation.lng]);
      window.updateUserMarkerWaitingStyle();
    }
  } else if (window.userMarker && !window.locationPermissionGranted) {
    window._map.removeLayer(window.userMarker); window.userMarker = null;
  }

  filtered.forEach(function (b) {
    var iconForBus = window.createBusIcon(b.status);
    var popup = '<b>' + b.code + '</b><br>' + b.locName + (b.eta ? '<br><small>ETA: ' + b.eta + '</small>' : '');
    if (window.busMarkers[b.id]) {
      window.busMarkers[b.id].setLatLng(b.coords).setIcon(iconForBus).setZIndexOffset(1500);
      if (window.busMarkers[b.id].getPopup()) {
        window.busMarkers[b.id].setPopupContent(popup);
      } else {
        window.busMarkers[b.id].bindPopup(popup);
      }
    } else {
      var m = L.marker(b.coords, { icon: iconForBus, zIndexOffset: 1500 }).addTo(window._map);
      m.bindPopup(popup);
      window.busMarkers[b.id] = m;
    }
  });
};

window.renderBusList = function renderBusList(buses) {
  var container = document.getElementById('busListMobile');
  if (!container) return;
  var activeBuses = buses.filter(function (b) {
    return (!window.selectedRoute || b.route === window.selectedRoute) && b.status !== 'unavailable' && b.coords !== null;
  });
  if (activeBuses.length === 0) {
    container.innerHTML = `<div class="p-3"><div class="d-flex flex-column justify-content-center align-items-center text-muted text-center"><img src="../../assets/images/icons/noBus.svg" alt="No Bus" class="mb-2 no-bus-icon" /><span class="fw-bold">No Available Bus</span></div></div>`;
    return;
  }
  var html = activeBuses.map(function (b) {
    var color = statusColors[b.status] || '#ccc';
    var progress = b.progress || 0;
    var arrivalText = b.eta ? 'Arriving by ' + b.eta : '';

    var statusLabel = '';
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
  container.innerHTML = html;
};

window.normalizeBus = function normalizeBus(bus) {
  var coords = null;
  if (bus.current_location) {
    try {
      var geo = JSON.parse(bus.current_location);
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
    seats: (bus.seat_availability || 0) + '/' + (bus.total_seats || 0),
    eta: null,
    progress: 0,
    updated: bus.updated || null,
    operation_id: bus.current_operation_id || null
  };
};

window.formatArrivalBySeconds = function formatArrivalBySeconds(seconds) {
  var dt = new Date(Date.now() + Math.max(0, seconds * 1000));
  var h = dt.getHours();
  var m = dt.getMinutes().toString().padStart(2, '0');
  var ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12; h = h ? h : 12;
  return h + ':' + m + ' ' + ampm;
};

window.focusBus = function focusBus(id) {
  var m = window.busMarkers[id];
  if (!m) return;
  window._map.flyTo(m.getLatLng(), 15);
  m.openPopup();
};

window.setRoute = function setRoute(r) {
  window.selectedRoute = r;
  var label = document.getElementById('filterLabelMobile');
  if (label) label.textContent = r ? r.substring(0, 12) + '...' : 'FILTER ROUTES';
  window.updateBuses();
  setTimeout(function () { window.centerToFirstBusInRoute(r, window.allBuses); }, 300);
};

window.setRouteFromSheet = function setRouteFromSheet(route) {
  window.setRoute(route);
  if (typeof window.updateRoutePills === 'function') window.updateRoutePills();
};

window.centerToFirstBusInRoute = function centerToFirstBusInRoute(route, buses) {
  var filtered = buses.filter(function (b) {
    return (!route || b.route === route) && b.status !== 'unavailable' && b.coords !== null;
  });
  if (filtered.length > 0) window.focusBus(filtered[0].id);
};

window.updateFilters = function updateFilters(buses) {
  var manualRoutes = ['Laurel - Tanauan', 'Tanauan - Laurel'];
  var apiRoutes = buses.map(function (b) { return b.route; }).filter(function (r) { return r; });
  var routes = [...new Set([...manualRoutes, ...apiRoutes])];
  var menu = document.getElementById('routeDropdownMenu');
  if (!menu) return;
  var html = `<li><button class="dropdown-item ${window.selectedRoute === '' ? 'active' : ''}" type="button" onclick="setRoute('')">All Routes</button></li>`;
  routes.forEach(function (r) {
    var safe = window.escapeHtml(r).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    html += `<li><button class="dropdown-item ${window.selectedRoute === r ? 'active' : ''}" type="button" onclick="setRoute('${safe}')">${r}</button></li>`;
  });
  menu.innerHTML = html;
};

window.escapeHtml = function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, function (s) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]);
  });
};

// --------------------- BUS STOPS & ZOOM SCALING ---------------------
window.stopMarkers = {};
window._stopMarkers = window.stopMarkers;

var STOP_ICONS = {};
function initStopIcons() {
  if (STOP_ICONS.pickup_point) return;
  var base = window.PROJECT_BASE;
  STOP_ICONS.pickup_point = L.icon({ iconUrl: base + '/assets/images/icons/busStopMarkerFinal1.svg', iconSize: [50, 50], iconAnchor: [25, 50], popupAnchor: [0, -44] });
  STOP_ICONS.bus_stop = L.icon({ iconUrl: base + '/assets/images/icons/busStopMarkerFinal1.svg', iconSize: [50, 50], iconAnchor: [25, 50], popupAnchor: [0, -44] });
  STOP_ICONS.terminal = L.icon({ iconUrl: base + '/assets/images/icons/BUSSTOP.png', iconSize: [50, 50], iconAnchor: [25, 50], popupAnchor: [0, -44] });
}

window.stopIcon = function stopIcon(type) {
  initStopIcons();
  var t = String(type || '').toLowerCase();
  return STOP_ICONS[t] || STOP_ICONS.bus_stop;
};

window.resizeStopMarkersForZoom = function resizeStopMarkersForZoom(zoom) {
  if (!window._stopMarkers) return;
  initStopIcons();
  var targetSizePx;
  if (zoom <= 12) targetSizePx = 45;
  else if (zoom >= 17) targetSizePx = 80;
  else { var t = (zoom - 12) / (17 - 12); targetSizePx = 45 + t * (80 - 45); }

  Object.values(window._stopMarkers).forEach(function (marker) {
    var t = marker.options.stopType || 'bus_stop';
    var baseIcon = STOP_ICONS[t] || STOP_ICONS.bus_stop;
    var baseSize = baseIcon.options.iconSize;
    var baseWidth = baseSize[0], baseHeight = baseSize[1];
    var aspect = baseWidth / baseHeight || 1;
    var newHeight = targetSizePx, newWidth = Math.round(newHeight * aspect);
    var baseAnchor = baseIcon.options.iconAnchor || [baseWidth / 2, baseHeight];
    var basePopup = baseIcon.options.popupAnchor || [0, -baseHeight * 0.9];
    var widthScale = newWidth / baseWidth, heightScale = newHeight / baseHeight;
    var newAnchor = [Math.round(baseAnchor[0] * widthScale), Math.round(baseAnchor[1] * heightScale)];
    var newPopup = [Math.round(basePopup[0] * widthScale), Math.round(basePopup[1] * heightScale)];
    var zoomIcon = L.icon({ iconUrl: baseIcon.options.iconUrl, iconSize: [newWidth, newHeight], iconAnchor: newAnchor, popupAnchor: newPopup });
    marker.setIcon(zoomIcon);
  });
};

window.loadStops = async function loadStops() {
  var listEl = document.getElementById('busStopsListMobile');
  if (listEl) listEl.innerHTML = '<div class="text-center mt-4"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>';

  try {
    var res = await fetch('../api.php?action=get_bus_stops_terminal', { cache: 'no-store' });
    var json = await res.json();
    if (!json || !json.success || !Array.isArray(json.data)) {
      var msg = json?.error || 'Failed to load stops';
      if (listEl) listEl.innerHTML = '<div class="text-center text-danger mt-4 small">' + window.escapeHtml(msg) + '</div>';
      return;
    }
    var stops = json.data;
    window.allStops = stops;
    window.renderStopsList(stops);
    var ids = new Set(stops.map(function (s) { return String(s.id); }));
    Object.keys(window.stopMarkers).forEach(function (id) {
      if (!ids.has(id)) { window._map.removeLayer(window.stopMarkers[id]); delete window.stopMarkers[id]; }
    });

    stops.forEach(function (s) {
      var id = String(s.id), lat = parseFloat(s.lat), lng = parseFloat(s.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      var typeLabel = String(s.type || '').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
      var popup = '<b>' + window.escapeHtml(s.name) + '</b><br>' + window.escapeHtml(s.location_name || '') + (s.location_landmark ? '<br><small>' + window.escapeHtml(s.location_landmark) + '</small>' : '') + '<br><small>' + window.escapeHtml(typeLabel) + '</small>';
      if (window.stopMarkers[id]) { window.stopMarkers[id].setLatLng([lat, lng]).setIcon(window.stopIcon(s.type)).setPopupContent(popup); }
      else { window.stopMarkers[id] = L.marker([lat, lng], { icon: window.stopIcon(s.type), stopType: String(s.type || 'bus_stop').toLowerCase() }).addTo(window._map).bindPopup(popup); }
    });

    if (typeof setBusStopsVisibility === 'function') setBusStopsVisibility(false);
    window.resizeStopMarkersForZoom(window._map.getZoom());
  } catch (e) {
    if (listEl) listEl.innerHTML = '<div class="text-center text-danger mt-4 small">Error loading bus stops</div>';
  }
};

window.currentStopsRoute = 'LAUREL - TANAUAN';

window.toggleStopsRoute = function toggleStopsRoute() {
  var icon = document.getElementById('stopsRouteIcon');
  if (icon) {
    var currentRot = parseInt(icon.getAttribute('data-rot') || '0');
    currentRot += 180;
    icon.style.transform = 'rotate(' + currentRot + 'deg)';
    icon.setAttribute('data-rot', currentRot);
  }

  window.currentStopsRoute = (window.currentStopsRoute === 'LAUREL - TANAUAN') ? 'TANAUAN - LAUREL' : 'LAUREL - TANAUAN';

  var textEl = document.getElementById('stopsRouteText');
  if (textEl) textEl.textContent = window.currentStopsRoute;

  if (window.allStops) {
    window.renderStopsList(window.allStops);
  }
};

window.renderStopsList = function renderStopsList(stops) {
  var listEl = document.getElementById('busStopsListMobile');
  if (!listEl || !stops) return;

  var filteredStops = stops.filter(function (s) {
    return !s.route || s.route.toUpperCase() === window.currentStopsRoute;
  });
  stops = filteredStops;

  if (typeof window.stopMarkers !== 'undefined' && window._map) {
    var ids = new Set(stops.map(function (s) { return String(s.id); }));
    Object.keys(window.stopMarkers).forEach(function (id) {
      if (!ids.has(id)) {
        window._map.removeLayer(window.stopMarkers[id]);
      } else {
        if (!window._map.hasLayer(window.stopMarkers[id])) {
          var viewBusstops = document.getElementById('view-busstops');
          if (viewBusstops && !viewBusstops.classList.contains('d-none')) {
            window._map.addLayer(window.stopMarkers[id]);
          }
        }
      }
    });
  }

  if (window.locationPermissionGranted && window.userLocation) {
    stops.forEach(function (s) {
      var lat = parseFloat(s.lat), lng = parseFloat(s.lng);
      s.distance = Number.isFinite(lat) && Number.isFinite(lng) ? window.distanceMeters(lat, lng, window.userLocation.lat, window.userLocation.lng) : 9999999;
    });
    stops = stops.slice().sort(function (a, b) { return (a.distance || 0) - (b.distance || 0); });
  }

  if (!stops.length) listEl.innerHTML = '<div class="text-center text-muted mt-4 small">No bus stops yet.</div>';
  else {
    listEl.innerHTML = stops.map(function (s) {
      var subtitle = [s.location_name, s.location_landmark].filter(Boolean).join(' • ');
      var typeLabel = String(s.type || '').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
      var distHtml = '';
      if (s.distance !== undefined && s.distance < 9999999) {
        var dText = s.distance < 1000 ? Math.round(s.distance) + ' m away' : (s.distance / 1000).toFixed(1) + ' km away';
        distHtml = '<div class="small fw-bold text-primary mt-1 d-flex align-items-center gap-1"><span class="material-symbols-rounded" style="font-size: 14px;">directions_walk</span> ' + dText + '</div>';
      }
      return `<button type="button" class="bus-stop-card" onclick="focusStop('${String(s.id)}')"><div class="d-flex justify-content-between align-items-start"><div class="me-2"><div class="bus-stop-title">${window.escapeHtml(s.name)}</div><div class="bus-stop-subtitle">${window.escapeHtml(subtitle || '')}</div></div><div class="d-flex flex-column align-items-center"><span class="bus-stop-type-pill">${window.escapeHtml(typeLabel || 'Pick Up Point')}</span>${distHtml}</div></div></button>`;
    }).join('');
  }
};

window.flyToMyLocationKeepingMarkerVisible = function flyToMyLocationKeepingMarkerVisible(lat, lng) {
  var zoom = Math.max(window._map.getZoom(), 16);
  window._map.flyTo([lat, lng], zoom, { animate: true, duration: 0.6 });
  setTimeout(function () {
    var sheetH = (typeof getBottomSheetHeightPx === 'function') ? getBottomSheetHeightPx() : 0;
    var padding = 40, yOffset = Math.round((sheetH / 2) + padding);
    if (yOffset > 0) window._map.panBy([0, yOffset], { animate: true, duration: 0.25 });
  }, 650);
};

window.centerToMyLocation = function centerToMyLocation() {
  if (window.userLocation && window.locationPermissionGranted) {
    window.flyToMyLocationKeepingMarkerVisible(window.userLocation.lat, window.userLocation.lng);
    if (window.userMarker) window.userMarker.bringToFront?.();
    return;
  }
  if (!navigator.geolocation) { alert('Geolocation is not supported on this device/browser.'); return; }
  navigator.geolocation.getCurrentPosition(function (pos) {
    var lat = pos.coords.latitude, lng = pos.coords.longitude;
    window.userLocation = { lat: lat, lng: lng };
    if (!window.userMarker) {
      window.userMarker = L.circleMarker([lat, lng], { radius: 8, color: '#2563eb', fillColor: '#60a5fa', fillOpacity: 0.9 }).addTo(window._map);
      window.bindUserMarker(window.userMarker);
    }
    else {
      window.userMarker.setLatLng([lat, lng]);
      window.bindUserMarker(window.userMarker);
    }
    window.flyToMyLocationKeepingMarkerVisible(lat, lng);
    window.uploadMyLocation(lat, lng, pos.coords.accuracy);
  }, function (error) {
    console.error('centerToMyLocation error:', error);
    if (error.code === error.PERMISSION_DENIED) window.showLocationPermissionDenied();
    else alert('Unable to get your location right now.');
  }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 });
};

// --------------------- DOM & INITIALIZATION LIFECYCLE ---------------------
document.addEventListener('DOMContentLoaded', function () {
  const locationEnabled = localStorage.getItem('byahero_location_services') !== '0';
  if (!locationEnabled) window.locationPermissionGranted = false;

  window.loadRouteFeatures().catch(() => { });

  const urlParams = new URLSearchParams(window.location.search);
  const joinCode = urlParams.get('join_circle');
  if (joinCode) {
    window.history.replaceState({}, document.title, window.location.pathname);
    fetch('../../backend/joinCircleByCode.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ invite_code: joinCode }) })
      .then(res => res.json()).then(data => {
        if (data.success) { alert('Welcome! You have successfully joined the circle.'); if (typeof switchSheetTab === 'function') switchSheetTab('groups'); }
        else { console.warn('Auto-join failed:', data.message); if (data.message !== 'Already in circle') { alert('Join failed: ' + data.message); } }
      }).catch(err => console.error('Deep link join error:', err));
  }

  // Wire up Waiting Modal Actions
  const btnSet = document.getElementById('btnSetWaiting');
  if (btnSet) {
    btnSet.addEventListener('click', async function () {
      const resolvedLoc = (window.lastKnownLocation && window.lastKnownLocation.locName) ? window.resolveLocationName(window.lastKnownLocation.lat, window.lastKnownLocation.lng) : null;
      if (!resolvedLoc) {
        alert("Unable to set waiting status. You must be at a recognized stop.");
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
          window.updateUserMarkerWaitingStyle();
          window.updateUserWaitingCardUI();

          btnSet.classList.add('d-none');
          const btnCancel = document.getElementById('btnCancelWaiting');
          if (btnCancel) btnCancel.classList.remove('d-none');

          const statusMsg = document.getElementById('waitingStatusMsg');
          if (statusMsg) {
            statusMsg.classList.remove('d-none');
            statusMsg.className = "alert alert-success py-2 px-3 mb-3 small rounded-3";
            statusMsg.innerHTML = `<strong>Status:</strong> Waiting for bus at <strong>${resolvedLoc}</strong>.`;
          }

          bootstrap.Modal.getInstance(document.getElementById('waitingModal')).hide();
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
    });
  }

  const btnCancel = document.getElementById('btnCancelWaiting');
  if (btnCancel) {
    btnCancel.addEventListener('click', async function () {
      btnCancel.setAttribute('disabled', 'true');
      btnCancel.innerHTML = `<div class="d-flex align-items-center justify-content-center gap-2"><span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Cancelling...</div>`;

      try {
        const res = await window.safePost('../../backend/waiting_api.php', {
          action: 'cancel_waiting'
        });
        if (res && res.success) {
          window.isPassengerWaiting = false;
          window.passengerWaitingLocation = null;
          window.updateUserMarkerWaitingStyle();
          window.updateUserWaitingCardUI();

          btnCancel.classList.add('d-none');
          if (btnSet) btnSet.classList.remove('d-none');

          const statusMsg = document.getElementById('waitingStatusMsg');
          if (statusMsg) {
            statusMsg.classList.add('d-none');
          }

          bootstrap.Modal.getInstance(document.getElementById('waitingModal')).hide();
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
                  <span>Cancel Waiting</span>
              `;
      }
    });
  }

  setTimeout(window.checkWaitingStatus, 2000);
  window.updateUserWaitingCardUI();
});

// App State Geolocation & Audio Lifecycles
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible') {
    window.acquireWakeLock();
    if (window.keepAliveAudio && window.keepAliveAudio.paused) window.keepAliveAudio.play().catch(() => { });
    const trackingActive = (window.bgWatcherId !== null || window.watchId !== null);
    if (!trackingActive) window.startUserLocationWatch();
    else if (window.lastKnownLocation) {
      window.uploadMyLocation(window.lastKnownLocation.lat, window.lastKnownLocation.lng, 0);
      window._lastNetworkSync = Date.now();
    }
  }
});

if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
  window.Capacitor.Plugins.App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) {
      window.acquireWakeLock();
      if (window.keepAliveAudio && window.keepAliveAudio.paused) window.keepAliveAudio.play().catch(() => { });
      if (window.lastKnownLocation) {
        window.uploadMyLocation(window.lastKnownLocation.lat, window.lastKnownLocation.lng, 0);
        window._lastNetworkSync = Date.now();
      }
    }
  });
}

// Heartbeat Monitor
var _heartbeatRunning = false;
async function _heartbeatTick() {
  if (_heartbeatRunning) return;
  _heartbeatRunning = true;
  try {
    if (document.visibilityState !== 'visible') {
      if (window.keepAliveAudio && window.keepAliveAudio.paused) window.keepAliveAudio.play().catch(() => { });
    }
    const trackingActive = (window.bgWatcherId !== null || window.watchId !== null);
    if (!trackingActive) {
      window.startUserLocationWatch();
    } else if (window.lastKnownLocation && (Date.now() - window._lastNetworkSync > 8000)) {
      window.triggerManualUpdate();
    }
  } finally {
    _heartbeatRunning = false;
    window._heartbeatIntervalId = setTimeout(_heartbeatTick, 5000);
  }
}
window._heartbeatIntervalId = setTimeout(_heartbeatTick, 5000);

window.addEventListener('storage', function (e) {
  if (e.key !== 'byahero_location_services') return;
  var isEnabled = e.newValue !== '0';
  if (isEnabled && !window.locationPermissionGranted) {
    window.startUserLocationWatch();
  } else if (!isEnabled && window.locationPermissionGranted) {
    window.locationPermissionGranted = false;
    if (window.userMarker) { window._map.removeLayer(window.userMarker); window.userMarker = null; }
    window.userLocation = null;
  }
});

// Cleanup listeners on page unload
function _cleanup() {
  if (window._heartbeatIntervalId) { clearTimeout(window._heartbeatIntervalId); window._heartbeatIntervalId = null; }
  if (window._rideTrackerIntervalId) { clearTimeout(window._rideTrackerIntervalId); window._rideTrackerIntervalId = null; }
  if (window._updateBusesTimer) { clearTimeout(window._updateBusesTimer); window._updateBusesTimer = null; }
  _updateBusesInProgress = false;
  if (window.watchId) { try { navigator.geolocation.clearWatch(window.watchId); } catch (e) { } window.watchId = null; }
  if (window.bgWatcherId && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.BackgroundGeolocation) {
    try { window.Capacitor.Plugins.BackgroundGeolocation.removeWatcher({ id: window.bgWatcherId }); } catch (e) { }
    window.bgWatcherId = null;
  }
  window.releaseWakeLock();
  window.stopKeepAliveAudio();
}
window.addEventListener('beforeunload', _cleanup);
window.addEventListener('pagehide', _cleanup);
