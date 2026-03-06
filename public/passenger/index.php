<?php
session_start();

$currentUser = null;
if (isset($_SESSION['user_id'])) {
  $currentUser = [
    'id' => $_SESSION['user_id'],
    'name' => $_SESSION['user_name'] ?? null,
    'email' => $_SESSION['user_email'] ?? null
  ];
}
?>
<!doctype html>
<html lang="en">

<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
  <title>ByaHero - Bus Tracker</title>

  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded" rel="stylesheet" />
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <link rel="manifest" href="../manifest.webmanifest">
  <meta name="theme-color" content="#1e3a8a">

  <!-- Bottom sheet component CSS -->
  <link rel="stylesheet" href="../../assets/css/passengerBottomSheet.css">

  <!-- Global Accessibility CSS and JS -->
  <link rel="stylesheet" href="../../assets/css/accessibility.css">
  <script src="../../assets/js/accessibility.js"></script>

  <!-- Analytics JS -->
  <script src="../../assets/js/analytics.js"></script>

  <style>
    :root {
      --bs-primary: #1e3a8a;
      --bs-primary-rgb: 30, 58, 138;
      --bs-bg-light: #f3f4f6;
    }

    body {
      font-family: "Segoe UI", sans-serif;
      overflow: hidden;
    }

    #map {
      height: 100%;
      width: 100%;
      z-index: 1;
    }

    .h-60px {
      height: 60px;
    }

    .rounded-top-4 {
      border-top-left-radius: 1.5rem;
      border-top-right-radius: 1.5rem;
    }

    .map-overlay {
      z-index: 1000;
    }

    /* --- FILTER ROUTES pill dropdown styling --- */
    .route-pill {
      cursor: pointer;
      font-size: 0.85rem;
      letter-spacing: 0.5px;
    }

    /* Remove Bootstrap caret from dropdown-toggle */
    .route-pill.dropdown-toggle::after {
      display: none;
    }

    /* Modern dropdown menu */
    .route-menu {
      border: 0;
      border-radius: 16px;
      padding: 8px;
      min-width: 220px;
      max-height: 280px;
      overflow-y: auto;
    }

    .route-menu .dropdown-item {
      border-radius: 12px;
      padding: 10px 12px;
      font-weight: 600;
    }

    .route-menu .dropdown-item.active,
    .route-menu .dropdown-item:active {
      background: #1e3a8a;
    }

    /* ✅ Center dropdown under the pill button */
    .route-menu-centered {
      left: 50% !important;
      right: auto !important;
      transform: translateX(-50%) !important;
    }

    @media (min-width: 992px) {
      .map-and-sidebar {
        display: grid;
        grid-template-columns: 1fr 350px;
        height: calc(100vh - 56px);
      }
    }

    .leaflet-marker-icon {
      pointer-events: auto;
    }

    /* Location notice styles */
    .location-notice {
      animation: slideUp 0.3s ease-out;
    }

    @keyframes slideUp {
      from {
        transform: translate(-50%, 20px);
        opacity: 0;
      }

      to {
        transform: translate(-50%, 0);
        opacity: 1;
      }
    }
  </style>
</head>

<body class="bg-light">

  <div class="d-lg-none d-flex flex-column vh-100 w-100">
    <div class="flex-grow-1 position-relative" style="min-height: 0;">
      <div id="map"></div>

      <div
        class="position-absolute pt-5 top-0 start-0 end-0 p-3 d-flex justify-content-between align-items-center map-overlay">

        <!-- ✅ SETTINGS BUTTON (Now from component) -->
        <?php
        $settingsButtonPath = './passengerSettings/settings.php';
        include __DIR__ . '/../../components/settingsButton.php';
        ?>

        <!-- ✅ FILTER ROUTES dropdown (pill style + centered menu) -->
        <div class="dropdown">
          <button
            class="route-pill bg-white rounded-pill shadow px-4 py-2 d-flex align-items-center gap-2 fw-bold text-dark border-0 dropdown-toggle"
            type="button" id="routeDropdownBtn" data-bs-toggle="dropdown" aria-expanded="false"
            onclick="if(typeof analytics !== 'undefined') analytics.buttonClick('Filter Routes Button');">
            <span id="filterLabelMobile" class="text-truncate" style="max-width: 140px;">FILTER ROUTES</span>
            <span class="material-symbols-rounded fs-6">tune</span>
          </button>

          <!-- NOTE: removed dropdown-menu-end so it can center -->
          <ul class="dropdown-menu route-menu route-menu-centered shadow" id="routeDropdownMenu"
            aria-labelledby="routeDropdownBtn">
            <li>
              <button class="dropdown-item active" type="button" onclick="setRoute('')">All Routes</button>
            </li>
            <!-- routes inserted by updateFilters() -->
          </ul>
        </div>

        <a href="notifications.php"
          class="btn btn-light rounded-circle shadow p-0 d-flex align-items-center justify-content-center border-0 text-decoration-none text-dark position-relative h-40px w-40px topbar-btn"
          onclick="if(typeof analytics !== 'undefined') analytics.buttonClick('Notifications Button');">

          <span
            class="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle"
            style="margin-left: -10px; margin-top: 10px;">
            <span class="visually-hidden">New alerts</span>
          </span>

          <span class="material-symbols-rounded topbar-icon">notifications</span>
        </a>
      </div>
    </div>
  </div>

  <!-- Bottom sheet component -->
  <?php include __DIR__ . '/../../components/passengerBottomSheet.php'; ?>

  <div class="d-none d-lg-block h-100">
    <div class="map-and-sidebar">
      <div id="map-desktop-placeholder" class="h-100"></div>
      <div class="overflow-y-auto bg-white border-start">
        <h6 class="p-3 border-bottom bg-light m-0 sticky-top">Active Buses</h6>
        <div id="busListDesktop" class="list-group list-group-flush"></div>
      </div>
    </div>
  </div>

  <div class="modal fade" id="settingsModal" tabindex="-1">
    <div class="modal-dialog modal-sm modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-body text-center">Settings</div>
      </div>
    </div>
  </div>

  <div class="modal fade" id="safetyModal" tabindex="-1">
    <div class="modal-dialog modal-sm modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-body text-center">Safety Features</div>
      </div>
    </div>
  </div>

  <div class="modal fade" id="infoModal" tabindex="-1">
    <div class="modal-dialog modal-sm modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-body text-center">Bus Information</div>
      </div>
    </div>
  </div>

  <div class="modal fade" id="profileModal" tabindex="-1">
    <div class="modal-dialog modal-sm modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-body text-center">
          <?php if ($currentUser): ?>
            <h6><?= htmlspecialchars($currentUser['name'] ?? $currentUser['email']) ?></h6>
            <a href="../logout.php" class="btn btn-sm btn-outline-danger mt-2">Logout</a>
          <?php else: ?>
            <p>Please log in.</p>
            <a href="../login.php" class="btn btn-primary btn-sm">Login</a>
          <?php endif; ?>
        </div>
      </div>
    </div>
  </div>

  <?php include __DIR__ . "/../../components/navbarPassenger.php"; ?>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>

  <!-- Bottom sheet component JS -->
  <script src="../../assets/js/passengerBottomSheet.js"></script>

  <script>
    // --------------------- MAP INIT ---------------------
    const isMobile = document.querySelector('.d-lg-none')?.offsetParent !== null;
    const mapId = isMobile ? 'map' : 'map-desktop-placeholder';
    const map = L.map(mapId, { zoomControl: false }).setView([14.0905, 121.0550], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '',
      maxZoom: 19
    }).addTo(map);

    // Detect correct project base (/Byahero-Prototype-v3 or root)
    (function () {
      const PROJECT_FOLDER = 'Byahero-Prototype-v3';
      const path = window.location.pathname || '/';
      const base = path.toLowerCase().startsWith('/' + PROJECT_FOLDER.toLowerCase() + '/')
        ? '/' + PROJECT_FOLDER
        : '';
      window.PROJECT_BASE = base;
      window.ICON_BASE = base + '/assets/images/icons';
    })();

    // --------------------- BUS ICONS ---------------------
    const busMarkers = {};
    const statusColors = {
      available: '#10b981',
      on_stop: '#f59e0b',
      full: '#ef4444',
      unavailable: '#6b7280'
    };

    const ICON_CACHE = {
      available: L.icon({
        iconUrl: ICON_BASE + '/marker.svg',
        iconSize: [40, 40],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36]
      }),
      full: L.icon({
        iconUrl: ICON_BASE + '/marker.svg',
        iconSize: [40, 40],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36]
      })
    };

    function createBusIcon(status) {
      const s = String(status || '').toLowerCase();
      if (s === 'available') return ICON_CACHE.available;
      if (s === 'full') return ICON_CACHE.full;

      const color = statusColors[s] || '#999';
      return L.divIcon({
        html: `<div style="background:${color};width:16px;height:16px;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 5px rgba(0,0,0,0.3)"></div>`,
        className: 'bus-marker-dot',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });
    }

    // --------------------- USER LOCATION ---------------------
    let userLocation = null;
    let userMarker = null;
    let selectedRoute = '';
    let locationPermissionGranted = true;

    const AVG_SPEED_MPS = (30 * 1000) / 3600;
    const MAX_DISTANCE_METERS = 5000;

    let _lastLocationUploadAt = 0;
    async function uploadMyLocation(lat, lng, accuracy) {
      const now = Date.now();
      if (now - _lastLocationUploadAt < 15000) return;
      _lastLocationUploadAt = now;

      try {
        const res = await fetch('../../backend/updateUserLocation.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ latitude: lat, longitude: lng, accuracy: accuracy ?? null })
        });

        if (!res.ok) {
          const txt = await res.text();
          console.warn('uploadMyLocation failed:', res.status, txt);
        }
      } catch (e) {
        console.warn('uploadMyLocation network error:', e);
      }
    }

    function showLocationDisabledNotice() {
      if (sessionStorage.getItem('location_notice_shown')) return;

      const notice = document.createElement('div');
      notice.className = 'location-notice position-fixed bottom-0 start-50 translate-middle-x mb-5 p-3 bg-warning text-dark rounded shadow-lg d-flex align-items-center gap-2';
      notice.style.zIndex = '9999';
      notice.style.maxWidth = '90%';
      notice.innerHTML = `
        <span class="material-symbols-rounded">location_off</span>
        <span class="small">Location services disabled. <a href="./passengerSettings/privacySecurity.php" class="text-primary fw-bold text-decoration-underline">Enable</a></span>
        <button class="btn-close btn-close-sm ms-2" onclick="this.parentElement.remove()"></button>
      `;
      document.body.appendChild(notice);
      sessionStorage.setItem('location_notice_shown', '1');
      setTimeout(() => { if (notice.parentElement) notice.remove(); }, 5000);
    }

    function showLocationPermissionDenied() {
      const notice = document.createElement('div');
      notice.className = 'location-notice position-fixed bottom-0 start-50 translate-middle-x mb-5 p-3 bg-danger text-white rounded shadow-lg d-flex align-items-center gap-2';
      notice.style.zIndex = '9999';
      notice.style.maxWidth = '90%';
      notice.innerHTML = `
        <span class="material-symbols-rounded">error</span>
        <span class="small">Location permission denied. Please enable it in your browser settings.</span>
        <button class="btn-close btn-close-white ms-2" onclick="this.parentElement.remove()"></button>
      `;
      document.body.appendChild(notice);
    }

    function startUserLocationWatch() {
      const locationEnabled = localStorage.getItem('byahero_location_services') !== '0';

      if (!locationEnabled) {
        locationPermissionGranted = false;
        showLocationDisabledNotice();
        return;
      }

      if (!navigator.geolocation) {
        locationPermissionGranted = false;
        return;
      }

      locationPermissionGranted = true;

      navigator.geolocation.watchPosition(pos => {
        userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };

        if (!userMarker) {
          userMarker = L.circleMarker([userLocation.lat, userLocation.lng], {
            radius: 8,
            color: '#2563eb',
            fillColor: '#60a5fa',
            fillOpacity: 0.9
          }).addTo(map);
        } else {
          userMarker.setLatLng([userLocation.lat, userLocation.lng]);
        }

        uploadMyLocation(userLocation.lat, userLocation.lng, pos.coords.accuracy);
        updateBuses();
      }, (error) => {
        console.error('Location error:', error);
        if (error.code === error.PERMISSION_DENIED) {
          locationPermissionGranted = false;
          showLocationPermissionDenied();
        }
      }, {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000
      });
    }

    window.addEventListener('storage', (e) => {
      if (e.key === 'byahero_location_services') {
        const isEnabled = e.newValue !== '0';

        if (isEnabled && !locationPermissionGranted) {
          startUserLocationWatch();
        } else if (!isEnabled && locationPermissionGranted) {
          locationPermissionGranted = false;
          if (userMarker) {
            map.removeLayer(userMarker);
            userMarker = null;
          }
          userLocation = null;
        }
      }
    });

    // --------------------- BUSES ---------------------
    async function updateBuses() {
      try {
        const res = await fetch('../api.php?action=get_buses');
        const json = await res.json();

        if (json.success && json.buses) {
          const buses = json.buses.map(normalizeBus);

          if (locationPermissionGranted && userLocation) {
            buses.forEach(b => {
              if (b.coords) {
                const dist = distanceMeters(b.coords[0], b.coords[1], userLocation.lat, userLocation.lng);
                b.eta = formatArrivalBySeconds(dist / AVG_SPEED_MPS);
                b.progress = Math.round(Math.max(0, Math.min(100, 100 - (dist / MAX_DISTANCE_METERS) * 100)));
              }
            });
          }

          if (typeof generateSmartNotificationsFromBuses === 'function') {
            await generateSmartNotificationsFromBuses(buses);
          }

          updateMap(buses);
          renderBusList(buses);
          updateFilters(buses);
        }
      } catch (e) {
        console.error("Bus fetch error:", e);
        if (typeof analytics !== 'undefined') analytics.error('Bus fetch error: ' + e.message);
      }
    }

    function updateMap(buses) {
      const filtered = buses.filter(b =>
        (!selectedRoute || b.route === selectedRoute) &&
        b.status !== 'unavailable' &&
        b.coords !== null
      );

      const currentIds = new Set(filtered.map(b => String(b.id)));

      Object.keys(busMarkers).forEach(id => {
        if (!currentIds.has(id)) {
          map.removeLayer(busMarkers[id]);
          delete busMarkers[id];
        }
      });

      filtered.forEach(b => {
        const iconForBus = createBusIcon(b.status);

        if (busMarkers[b.id]) {
          busMarkers[b.id].setLatLng(b.coords).setIcon(iconForBus);
          busMarkers[b.id].bindPopup(`<b>${b.code}</b><br>${b.locName}${b.eta ? `<br><small>ETA: ${b.eta}</small>` : ''}`);
        } else {
          const m = L.marker(b.coords, { icon: iconForBus }).addTo(map);
          m.bindPopup(`<b>${b.code}</b><br>${b.locName}${b.eta ? `<br><small>ETA: ${b.eta}</small>` : ''}`);
          busMarkers[b.id] = m;
        }
      });

      if (userLocation && locationPermissionGranted) {
        if (!userMarker) {
          userMarker = L.circleMarker([userLocation.lat, userLocation.lng], {
            radius: 8,
            color: '#2563eb',
            fillColor: '#60a5fa',
            fillOpacity: 0.9
          }).addTo(map);
        } else {
          userMarker.setLatLng([userLocation.lat, userLocation.lng]);
        }
      } else if (userMarker && !locationPermissionGranted) {
        map.removeLayer(userMarker);
        userMarker = null;
      }
    }

    function renderBusList(buses) {
      const container = isMobile ? document.getElementById('busListMobile') : document.getElementById('busListDesktop');
      if (!container) return;

      const activeBuses = buses.filter(b =>
        (!selectedRoute || b.route === selectedRoute) &&
        b.status !== 'unavailable' &&
        b.coords !== null
      );

      if (activeBuses.length === 0) {
        container.innerHTML = `<div class="d-flex flex-column justify-content-center align-items-center h-100 text-muted p-5"><span class="material-symbols-rounded fs-1 mb-2">directions_bus_off</span><span class="fw-bold">No Available Bus</span></div>`;
        return;
      }

      const html = activeBuses.map(b => {
        const color = statusColors[b.status] || '#ccc';
        const progress = b.progress || 0;
        const arrivalText = b.eta ? `Arriving by ${b.eta}` : '';

        if (isMobile) {
          return `<div class="card border-0 border-bottom rounded-0 cursor-pointer" onclick="focusBus('${b.id}')"><div class="card-body py-3 px-4"><div class="d-flex justify-content-between align-items-center mb-1"><span class="badge bg-primary rounded-2 text-uppercase fw-bold">${b.code}</span><div style="width: 30px; height: 12px; border-radius: 6px; background:${color}"></div></div><div class="d-flex justify-content-between small text-muted"><span>${b.locName}</span><span>${b.seats} Seats</span></div>${arrivalText ? `<div class="small text-muted mb-2">${arrivalText}</div>` : ''}<div class="timeline-container bg-secondary-subtle position-relative"><div class="timeline-progress bg-primary position-absolute top-0 bottom-0 start-0 rounded-pill" style="width: ${progress}%"></div><span class="material-symbols-rounded timeline-icon position-absolute bg-white rounded-circle text-primary border" style="left: ${progress}%; font-size:18px">directions_bus</span><span class="material-symbols-rounded timeline-icon stop-point stop-commuter position-absolute bg-white rounded-circle" style="right:6px; transform: translateX(0);">place</span></div></div></div>`;
        }

        return `<button class="list-group-item list-group-item-action" onclick="focusBus('${b.id}')"><h6 class="mb-1 fw-bold">${b.code}</h6><small>${b.locName}</small></button>`;
      }).join('');

      container.innerHTML = html;
    }

    function normalizeBus(bus) {
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
        seats: `${bus.seat_availability}/${bus.total_seats}`,
        eta: null,
        progress: 0
      };
    }

    function distanceMeters(lat1, lon1, lat2, lon2) {
      const R = 6371000;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    function formatArrivalBySeconds(seconds) {
      const dt = new Date(Date.now() + Math.max(0, seconds * 1000));
      let h = dt.getHours();
      const m = dt.getMinutes().toString().padStart(2, '0');
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12;
      h = h ? h : 12;
      return `${h}:${m} ${ampm}`;
    }

    window.focusBus = (id) => {
      const m = busMarkers[id];
      if (!m) return;
      map.flyTo(m.getLatLng(), 15);
      m.openPopup();

      if (typeof analytics !== 'undefined') {
        analytics.busTracked(id);
        analytics.featureUsed('Bus Tracking', { bus_id: id });
      }
    };

    window.setRoute = (r) => {
      selectedRoute = r;

      const label = document.getElementById('filterLabelMobile');
      if (label) label.textContent = r ? r.substring(0, 12) + "..." : 'FILTER ROUTES';

      if (typeof analytics !== 'undefined') {
        analytics.featureUsed('Route Filter', { route: r || 'All Routes' });
      }

      updateBuses();
    };

    function updateFilters(buses) {
      const manualRoutes = ['Laurel - Tanauan', 'Tanauan - Laurel'];
      const apiRoutes = buses.map(b => b.route).filter(r => r);
      const routes = [...new Set([...manualRoutes, ...apiRoutes])];

      const menu = document.getElementById('routeDropdownMenu');
      if (!menu) return;

      let html = `
        <li>
          <button class="dropdown-item ${selectedRoute === '' ? 'active' : ''}" type="button" onclick="setRoute('')">
            All Routes
          </button>
        </li>
      `;

      routes.forEach(r => {
        const safe = String(r).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        html += `
          <li>
            <button class="dropdown-item ${selectedRoute === r ? 'active' : ''}" type="button" onclick="setRoute('${safe}')">
              ${r}
            </button>
          </li>
        `;
      });

      menu.innerHTML = html;
    }

    // --------------------- BUS STOPS (ONLY SHOW WHEN TAB OPEN) ---------------------
    const stopMarkers = {};
    let stopsLoaded = false;

    const STOP_ICONS = {
      pickup_point: L.icon({
        iconUrl: PROJECT_BASE + '/assets/images/icons/busStopMarkerFinal1.svg',
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -36]
      }),
      bus_stop: L.icon({
        iconUrl: PROJECT_BASE + '/assets/images/icons/busStopMarkerFinal2.svg',
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -36]
      }),
      terminal: L.icon({
        iconUrl: PROJECT_BASE + '/assets/images/icons/BUSSTOP.png',
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -36]
      })
    };

    function escapeHtml(str) {
      return String(str ?? '').replace(/[&<>"']/g, s => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      }[s]));
    }

    function stopIcon(type) {
      const t = String(type || '').toLowerCase();
      return STOP_ICONS[t] || STOP_ICONS.bus_stop;
    }

    async function loadStops() {
      const listEl = document.getElementById('busStopsListMobile');
      if (listEl) listEl.innerHTML = `<div class="text-center text-muted mt-4 small">Loading bus stops...</div>`;

      const res = await fetch('../api.php?action=get_bus_stops_terminal', { cache: 'no-store' });
      const json = await res.json();

      if (!json || !json.success || !Array.isArray(json.data)) {
        const msg = json?.error || 'Failed to load stops';
        if (listEl) listEl.innerHTML = `<div class="text-center text-danger mt-4 small">${escapeHtml(msg)}</div>`;
        return;
      }

      const stops = json.data;

      if (listEl) {
        if (!stops.length) {
          listEl.innerHTML = `<div class="text-center text-muted mt-4 small">No bus stops yet.</div>`;
        } else {
          listEl.innerHTML = stops.map(s => {
            const subtitle = [s.location_name, s.location_landmark].filter(Boolean).join(' • ');
            const typeLabel = String(s.type || '').replaceAll('_', ' ').toUpperCase();
            return `
              <button type="button" class="list-group-item list-group-item-action" onclick="focusStop('${String(s.id)}')">
                <div class="d-flex justify-content-between align-items-start">
                  <div class="me-2">
                    <div class="fw-bold">${escapeHtml(s.name)}</div>
                    <div class="small text-muted">${escapeHtml(subtitle || '')}</div>
                  </div>
                  <span class="badge bg-secondary text-uppercase">${escapeHtml(typeLabel)}</span>
                </div>
              </button>
            `;
          }).join('');
        }
      }

      const ids = new Set(stops.map(s => String(s.id)));

      Object.keys(stopMarkers).forEach(id => {
        if (!ids.has(id)) {
          map.removeLayer(stopMarkers[id]);
          delete stopMarkers[id];
        }
      });

      stops.forEach(s => {
        const id = String(s.id);
        const lat = parseFloat(s.lat);
        const lng = parseFloat(s.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

        const popup = `
          <b>${escapeHtml(s.name)}</b><br>
          ${escapeHtml(s.location_name || '')}
          ${s.location_landmark ? `<br><small>${escapeHtml(s.location_landmark)}</small>` : ''}
          <br><small>${escapeHtml(String(s.type || ''))}</small>
        `;

        if (stopMarkers[id]) {
          stopMarkers[id].setLatLng([lat, lng]).setIcon(stopIcon(s.type)).setPopupContent(popup);
        } else {
          stopMarkers[id] = L.marker([lat, lng], { icon: stopIcon(s.type) }).addTo(map).bindPopup(popup);
        }
      });

      setBusStopsVisibility(false);
    }

    window.setBusStopsVisibility = function setBusStopsVisibility(show) {
      Object.values(stopMarkers).forEach(m => {
        const onMap = map.hasLayer(m);
        if (show && !onMap) m.addTo(map);
        if (!show && onMap) map.removeLayer(m);
      });
    };

    window.focusStop = function focusStop(id) {
      const m = stopMarkers[String(id)];
      if (!m) return;
      map.flyTo(m.getLatLng(), 16);
      m.openPopup();
    };

    const _switchSheetTab = window.switchSheetTab;
    window.switchSheetTab = function(tabName) {
      _switchSheetTab(tabName);

      if (tabName === 'busstops') {
        if (!stopsLoaded) {
          stopsLoaded = true;
          loadStops().then(() => setBusStopsVisibility(true));
        } else {
          setBusStopsVisibility(true);
        }
      } else {
        setBusStopsVisibility(false);
      }
    };

    // --------------------- INIT ---------------------
    document.addEventListener('DOMContentLoaded', () => {
      const locationEnabled = localStorage.getItem('byahero_location_services') !== '0';
      if (!locationEnabled) locationPermissionGranted = false;
    });

    startUserLocationWatch();
    updateBuses();
    setInterval(updateBuses, 4000);


    window.centerToMyLocation = function () {
      // If we already have a live location from watchPosition, just fly there.
      if (userLocation && locationPermissionGranted) {
        map.flyTo([userLocation.lat, userLocation.lng], Math.max(map.getZoom(), 16), {
          animate: true,
          duration: 0.6
        });
        if (userMarker) userMarker.bringToFront?.();
        return;
      }

      // Otherwise, request it once (and optionally start watch again if it wasn't running)
      if (!navigator.geolocation) {
        alert('Geolocation is not supported on this device/browser.');
        return;
      }

      navigator.geolocation.getCurrentPosition((pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        // Update globals so the rest of the page can use it too
        userLocation = { lat, lng };

        if (!userMarker) {
          userMarker = L.circleMarker([lat, lng], {
            radius: 8,
            color: '#2563eb',
            fillColor: '#60a5fa',
            fillOpacity: 0.9
          }).addTo(map);
        } else {
          userMarker.setLatLng([lat, lng]);
        }

        map.flyTo([lat, lng], Math.max(map.getZoom(), 16), {
          animate: true,
          duration: 0.6
        });

        // Keep backend updated (optional but consistent with existing behavior)
        uploadMyLocation(lat, lng, pos.coords.accuracy);

        // If location services were disabled before, this does not flip the toggle automatically.
      }, (error) => {
        console.error('centerToMyLocation error:', error);

        if (error.code === error.PERMISSION_DENIED) {
          showLocationPermissionDenied();
        } else {
          alert('Unable to get your location right now.');
        }
      }, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000
      });
    };
  </script>
</body>
</html>