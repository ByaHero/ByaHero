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

      <div class="position-absolute pt-5 top-0 start-0 end-0 p-3 d-flex justify-content-between align-items-center map-overlay">
        
        <!-- ✅ SETTINGS BUTTON (Now from component) -->
        <?php 
        $settingsButtonPath = './passengerSettings/settings.php';
        include __DIR__ . '/../../components/settingsButton.php'; 
        ?>

        <!-- ✅ FILTER ROUTES dropdown (pill style + centered menu) -->
        <div class="dropdown">
          <button
            class="route-pill bg-white rounded-pill shadow px-4 py-2 d-flex align-items-center gap-2 fw-bold text-dark border-0 dropdown-toggle"
            type="button"
            id="routeDropdownBtn"
            data-bs-toggle="dropdown"
            aria-expanded="false"
            onclick="if(typeof analytics !== 'undefined') analytics.buttonClick('Filter Routes Button');">
            <span id="filterLabelMobile" class="text-truncate" style="max-width: 140px;">FILTER ROUTES</span>
            <span class="material-symbols-rounded fs-6">tune</span>
          </button>

          <!-- NOTE: removed dropdown-menu-end so it can center -->
          <ul class="dropdown-menu route-menu route-menu-centered shadow" id="routeDropdownMenu" aria-labelledby="routeDropdownBtn">
            <li>
              <button class="dropdown-item active" type="button" onclick="setRoute('')">All Routes</button>
            </li>
            <!-- routes inserted by updateFilters() -->
          </ul>
        </div>

        <a href="notifications.php"
          class="btn btn-light rounded-circle shadow p-0 d-flex align-items-center justify-content-center border-0 text-decoration-none text-dark position-relative h-40px w-40px topbar-btn"
          onclick="if(typeof analytics !== 'undefined') analytics.buttonClick('Notifications Button');">

          <span class="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle"
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
    // --- GLOBAL VARIABLES ---
    const isMobile = document.querySelector('.d-lg-none').offsetParent !== null;
    const mapId = isMobile ? 'map' : 'map-desktop-placeholder';
    const map = L.map(mapId, {
      zoomControl: false
    }).setView([14.0905, 121.0550], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '',
      maxZoom: 19
    }).addTo(map);

    const busMarkers = {};
    let userLocation = null;
    let userMarker = null;
    let selectedRoute = '';
    let locationPermissionGranted = true;

    const statusColors = {
      available: '#10b981',
      on_stop: '#f59e0b',
      full: '#ef4444',
      unavailable: '#6b7280'
    };

    const AVG_SPEED_MPS = (30 * 1000) / 3600;
    const MAX_DISTANCE_METERS = 5000;

    // ICON configuration (works on both local + InfinityFree)
//
// Uses the current origin + detects whether the app is running under
// a project subfolder (e.g. /ByaHero-Prototype-V3/) or at domain root (/).
(function () {
  const PROJECT_FOLDER = 'ByaHero-Prototype-V3'; // must match your local folder name (case-sensitive)

  // pathname like: "/ByaHero-Prototype-V3/public/passenger/index.php" OR "/public/passenger/index.php"
  const path = window.location.pathname || '/';

  // If the URL starts with "/ByaHero-Prototype-V3/", prefix asset paths with it; otherwise use root.
  const base = path.toLowerCase().startsWith('/' + PROJECT_FOLDER.toLowerCase() + '/')
    ? '/' + PROJECT_FOLDER
    : '';

  // Now assets resolve as:
  // - local:      /ByaHero-Prototype-V3/assets/images/icons
  // - infinityfree: /assets/images/icons
  window.ICON_BASE = base + '/assets/images/icons';
})();

// Use ICON_BASE like before:
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
      if (!status) status = '';
      const s = String(status).toLowerCase();

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

    // --- LOCATION PERMISSION HANDLING ---
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

      setTimeout(() => {
        if (notice.parentElement) notice.remove();
      }, 5000);
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
        console.log('Location services disabled by user');
        locationPermissionGranted = false;
        showLocationDisabledNotice();
        return;
      }

      if (!navigator.geolocation) {
        console.log('Geolocation not supported');
        locationPermissionGranted = false;
        return;
      }

      locationPermissionGranted = true;

      navigator.geolocation.watchPosition(pos => {
        userLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        };

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

    // --- BUS TRACKING ---
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

          updateMap(buses);
          renderBusList(buses);
          updateFilters(buses);
        }
      } catch (e) {
        console.error("Bus fetch error:", e);
        if (typeof analytics !== 'undefined') {
          analytics.error('Bus fetch error: ' + e.message);
        }
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
          const m = L.marker(b.coords, {
            icon: iconForBus
          }).addTo(map);
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
        } catch (e) {}
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
      if (m) {
        map.flyTo(m.getLatLng(), 15);
        m.openPopup();

        if (typeof analytics !== 'undefined') {
          analytics.busTracked(id);
          analytics.featureUsed('Bus Tracking', {
            bus_id: id
          });
        }
      }
    };

    window.setRoute = (r) => {
      selectedRoute = r;

      const label = document.getElementById('filterLabelMobile');
      if (label) label.textContent = r ? r.substring(0, 12) + "..." : 'FILTER ROUTES';

      if (typeof analytics !== 'undefined') {
        analytics.featureUsed('Route Filter', {
          route: r || 'All Routes'
        });
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

    document.addEventListener('DOMContentLoaded', () => {
      if (typeof initPinsFeature === 'function') initPinsFeature(map);

      const locationEnabled = localStorage.getItem('byahero_location_services') !== '0';
      if (!locationEnabled) {
        locationPermissionGranted = false;
      }
    });

    startUserLocationWatch();
    updateBuses();
    setInterval(updateBuses, 4000);
  </script>
</body>

</html>