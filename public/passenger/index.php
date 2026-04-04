<?php
session_start();

/**
 * REQUIRE LOGIN:
 * If user is not logged in, redirect to login page first.
 * After login, it will redirect back to passenger/index.php.
 */
if (!isset($_SESSION['user_id'])) {
  header('Location: ../login.php?redirect=passenger/index.php', true, 302);
  exit;
}

$currentUser = null;
if (isset($_SESSION['user_id'])) {
  $currentUser = [
    'id' => $_SESSION['user_id'],
    'name' => $_SESSION['user_name'] ?? null,
    'email' => $_SESSION['user_email'] ?? null
  ];
}

$scriptName = $_SERVER['SCRIPT_NAME'] ?? '';
$publicDir = rtrim(str_replace('\\', '/', dirname($scriptName)), '/');
$baseUrl = preg_replace('~/public/.*$~', '', $publicDir) ?: '';
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
  <link rel="stylesheet" href="<?= htmlspecialchars($baseUrl, ENT_QUOTES) ?>/assets/css/passengerBottomSheet.css?v=3">

  <!-- Global Accessibility CSS and JS -->
  <link rel="stylesheet" href="../../assets/css/accessibility.css">

  <script>
    window._sosPendingToken = null;
    window._gonativeInfoLog = [];

    function _sosHandleInfo(info) {
      window._gonativeInfoLog.push({
        time: new Date().toISOString(),
        info: info
      });
      console.log('[OneSignal] Info received:', JSON.stringify(info));

      // Try all possible property names for push-capable IDs/tokens.
      var id = info && (
        info.pushToken ||
        info.subscriptionId ||
        info.oneSignalId ||
        info.userId ||
        info.oneSignalUserId ||
        info.playerId ||
        info.id ||
        (info.subscription && (
          info.subscription.pushToken ||
          info.subscription.id ||
          info.subscription.subscriptionId ||
          info.subscription.playerId
        ))
      );

      if (!id) {
        console.warn('[OneSignal] No ID found in info object');
        return;
      }

      console.log('[OneSignal] Extracted token:', id);
      window._sosPendingToken = id;
      if (window.sosBridge) {
        window.sosBridge.saveToken(id);
      }
    }

    window.gonative_onesignal_info = _sosHandleInfo;
    window.median_onesignal_info = _sosHandleInfo;
  </script>
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

    .route-pill.dropdown-toggle::after {
      display: none;
    }

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

    .location-notice {
      animation: slideUp 0.3s ease-out;
    }

    .no-bus-icon {
      width: 110px !important;
      height: auto !important;
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

  <!-- Bottom sheet component JS (contains ALL bottom-sheet logic) -->
  <script src="../../assets/js/passengerBottomSheet.js?v=2"></script>

  <script>
    // --------------------- BASE URL DETECTION ---------------------
    // passengerBottomSheet.js auto-detects this too, but we set it early
    // here so any inline code below can also reference window.APP_BASE_URL.
    (function() {
      var PROJECT_FOLDER = 'Byahero-Prototype-v3';
      var path = window.location.pathname || '/';
      var base = path.toLowerCase().startsWith('/' + PROJECT_FOLDER.toLowerCase() + '/') ?
        '/' + PROJECT_FOLDER :
        '';
      window.PROJECT_BASE = base;
      window.APP_BASE_URL = base;
      window.ICON_BASE = base + '/assets/images/icons';
    })();

    // --------------------- MAP INIT ---------------------
    var isMobile = document.querySelector('.d-lg-none')?.offsetParent !== null;
    var mapId = isMobile ? 'map' : 'map-desktop-placeholder';
    var map = L.map(mapId, {
      zoomControl: false
    }).setView([14.0905, 121.0550], 12);

    // Expose map to passengerBottomSheet.js (used by setBusStopsVisibility / focusStop)
    window._map = map;

    // Resize bus-stop markers when zoom changes
    map.on('zoomend', function() {
      resizeStopMarkersForZoom(map.getZoom());
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '',
      maxZoom: 19
    }).addTo(map);

    // --------------------- BUS ICONS ---------------------
    var busMarkers = {};
    var statusColors = {
      available: '#10b981',
      on_stop: '#f59e0b',
      full: '#ef4444',
      unavailable: '#6b7280'
    };

    var ICON_CACHE = {
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
      var s = String(status || '').toLowerCase();

      // Always use the bus image icon for these states,
      // so the marker image does NOT change when on_stop.
      if (s === 'full') return ICON_CACHE.full; // you can keep a different icon if you want
      return ICON_CACHE.available; // used for available, on_stop, anything else
    }

    // --------------------- USER LOCATION ---------------------
    var userLocation = null;
    var userMarker = null;
    var selectedRoute = '';
    var locationPermissionGranted = true;

    var AVG_SPEED_MPS = (30 * 1000) / 3600;
    var MAX_DISTANCE_METERS = 5000;

    var _lastLocationUploadAt = 0;
    async function uploadMyLocation(lat, lng, accuracy) {
      var now = Date.now();
      if (now - _lastLocationUploadAt < 15000) return;
      _lastLocationUploadAt = now;

      try {
        var res = await fetch('../../backend/updateUserLocation.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            latitude: lat,
            longitude: lng,
            accuracy: accuracy ?? null
          })
        });
        if (!res.ok) {
          var txt = await res.text();
          console.warn('uploadMyLocation failed:', res.status, txt);
        }
      } catch (e) {
        console.warn('uploadMyLocation network error:', e);
      }
    }

    function showLocationDisabledNotice() {
      if (sessionStorage.getItem('location_notice_shown')) return;

      var notice = document.createElement('div');
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
      setTimeout(function() {
        if (notice.parentElement) notice.remove();
      }, 5000);
    }

    function showLocationPermissionDenied() {
      var notice = document.createElement('div');
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
      var locationEnabled = localStorage.getItem('byahero_location_services') !== '0';

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

      navigator.geolocation.watchPosition(function(pos) {
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

        uploadMyLocation(userLocation.lat, userLocation.lng, pos.coords.accuracy);
        updateBuses();
      }, function(error) {
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

    window.addEventListener('storage', function(e) {
      if (e.key !== 'byahero_location_services') return;
      var isEnabled = e.newValue !== '0';

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
    });

    // --------------------- BUSES ---------------------
    async function updateBuses() {
      try {
        var res = await fetch('../api.php?action=get_buses');
        var json = await res.json();

        if (json.success && json.buses) {
          var buses = json.buses.map(normalizeBus);
          allBuses = buses;

          if (locationPermissionGranted && userLocation) {
            buses.forEach(function(b) {
              if (b.coords) {
                var dist = distanceMeters(b.coords[0], b.coords[1], userLocation.lat, userLocation.lng);
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
        console.error('Bus fetch error:', e);
        if (typeof analytics !== 'undefined') analytics.error('Bus fetch error: ' + e.message);
      }
    }

    function updateMap(buses) {
      var filtered = buses.filter(function(b) {
        return (!selectedRoute || b.route === selectedRoute) &&
          b.status !== 'unavailable' && b.coords !== null;
      });

      var currentIds = new Set(filtered.map(function(b) {
        return String(b.id);
      }));

      Object.keys(busMarkers).forEach(function(id) {
        if (!currentIds.has(id)) {
          map.removeLayer(busMarkers[id]);
          delete busMarkers[id];
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

      filtered.forEach(function(b) {
        var iconForBus = createBusIcon(b.status);
        var popup = '<b>' + b.code + '</b><br>' + b.locName + (b.eta ? '<br><small>ETA: ' + b.eta + '</small>' : '');

        if (busMarkers[b.id]) {
          busMarkers[b.id].setLatLng(b.coords).setIcon(iconForBus).bindPopup(popup);
        } else {
          var m = L.marker(b.coords, {
            icon: iconForBus
          }).addTo(map);
          m.bindPopup(popup);
          busMarkers[b.id] = m;
        }
      });
    }

    function renderBusList(buses) {
      var container = isMobile ?
        document.getElementById('busListMobile') :
        document.getElementById('busListDesktop');
      if (!container) return;

      var activeBuses = buses.filter(function(b) {
        return (!selectedRoute || b.route === selectedRoute) &&
          b.status !== 'unavailable' && b.coords !== null;
      });

      if (activeBuses.length === 0) {
        container.innerHTML = `
    <div class="p-3">
      <div class="d-flex justify-content-between align-items-center mb-2">
        <span class="small fw-bold text-uppercase text-black">BUS LOCATION</span>
      </div>
      <div class="d-flex flex-column justify-content-center align-items-center text-muted text-center">
        <img src="../../assets/images/icons/noBus.svg" alt="No Bus" class="mb-2 no-bus-icon" />
        <span class="fw-bold">No Available Bus</span>
      </div>
    </div>`;
        return;
      }

      var html = activeBuses.map(function(b) {
        var color = statusColors[b.status] || '#ccc';
        var progress = b.progress || 0;
        var arrivalText = b.eta ? 'Arriving by ' + b.eta : '';

        if (isMobile) {
          return `<div class="card border-0 border-bottom rounded-0 cursor-pointer" onclick="focusBus('${b.id}')"><div class="card-body py-3 px-4"><div class="d-flex justify-content-between align-items-center mb-1"><span class="badge bg-primary rounded-2 text-uppercase fw-bold">${b.code}</span><div style="width:30px;height:12px;border-radius:6px;background:${color}"></div></div><div class="d-flex justify-content-between small text-muted"><span>${b.locName}</span><span>${b.seats} Seats</span></div>${arrivalText ? `<div class="small text-muted mb-2">${arrivalText}</div>` : ''}<div class="timeline-container bg-secondary-subtle position-relative"><div class="timeline-progress bg-primary position-absolute top-0 bottom-0 start-0 rounded-pill" style="width:${progress}%"></div><span class="material-symbols-rounded timeline-icon position-absolute bg-white rounded-circle text-primary border" style="left:${progress}%;font-size:18px">directions_bus</span><span class="material-symbols-rounded timeline-icon stop-point stop-commuter position-absolute bg-white rounded-circle" style="right:6px;transform:translateX(0);">place</span></div></div></div>`;
        }

        return `<button class="list-group-item list-group-item-action" onclick="focusBus('${b.id}')"><h6 class="mb-1 fw-bold">${b.code}</h6><small>${b.locName}</small></button>`;
      }).join('');

      container.innerHTML = html;
    }

    function normalizeBus(bus) {
      var coords = null;

      if (bus.current_location) {
        try {
          var geo = JSON.parse(bus.current_location);
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
        seats: bus.seat_availability + '/' + bus.total_seats,
        eta: null,
        progress: 0
      };
    }

    function distanceMeters(lat1, lon1, lat2, lon2) {
      var R = 6371000;
      var dLat = (lat2 - lat1) * Math.PI / 180;
      var dLon = (lon2 - lon1) * Math.PI / 180;
      var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    function formatArrivalBySeconds(seconds) {
      var dt = new Date(Date.now() + Math.max(0, seconds * 1000));
      var h = dt.getHours();
      var m = dt.getMinutes().toString().padStart(2, '0');
      var ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12;
      h = h ? h : 12;
      return h + ':' + m + ' ' + ampm;
    }

    window.focusBus = function(id) {
      var m = busMarkers[id];
      if (!m) return;
      map.flyTo(m.getLatLng(), 15);
      m.openPopup();

      if (typeof analytics !== 'undefined') {
        analytics.busTracked(id);
        analytics.featureUsed('Bus Tracking', {
          bus_id: id
        });
      }
    };

    var allBuses = [];

    window.setRoute = function(r) {
      selectedRoute = r;

      var label = document.getElementById('filterLabelMobile');
      if (label) label.textContent = r ? r.substring(0, 12) + '...' : 'FILTER ROUTES';

      if (typeof analytics !== 'undefined') {
        analytics.featureUsed('Route Filter', {
          route: r || 'All Routes'
        });
      }

      updateBuses();
      setTimeout(function() {
        centerToFirstBusInRoute(r, allBuses);
      }, 300);
    };

    window.setRouteFromSheet = function(route) {
      window.setRoute(route);
      if (typeof window.updateRoutePills === 'function') window.updateRoutePills();
    };

    window.centerToFirstBusInRoute = function(route, buses) {
      var filtered = buses.filter(function(b) {
        return (!route || b.route === route) && b.status !== 'unavailable' && b.coords !== null;
      });
      if (filtered.length > 0) focusBus(filtered[0].id);
    };

    function updateFilters(buses) {
      var manualRoutes = ['Laurel - Tanauan', 'Tanauan - Laurel'];
      var apiRoutes = buses.map(function(b) {
        return b.route;
      }).filter(function(r) {
        return r;
      });
      var routes = [...new Set([...manualRoutes, ...apiRoutes])];

      var menu = document.getElementById('routeDropdownMenu');
      if (!menu) return;

      var html = `<li><button class="dropdown-item ${selectedRoute === '' ? 'active' : ''}" type="button" onclick="setRoute('')">All Routes</button></li>`;

      routes.forEach(function(r) {
        var safe = String(r).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        html += `<li><button class="dropdown-item ${selectedRoute === r ? 'active' : ''}" type="button" onclick="setRoute('${safe}')">${r}</button></li>`;
      });

      menu.innerHTML = html;
    }

    function escapeHtml(str) {
      return String(str ?? '').replace(/[&<>"']/g, function(s) {
        return ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;'
        } [s]);
      });
    }

    // --------------------- BUS STOPS ---------------------
    var stopMarkers = {};
    // Expose to passengerBottomSheet.js for setBusStopsVisibility / focusStop
    window._stopMarkers = stopMarkers;

    var STOP_ICONS = {
      pickup_point: L.icon({
        iconUrl: PROJECT_BASE + '/assets/images/icons/busStopMarkerFinal1.svg',
        iconSize: [50, 50], // base size (medium)
        iconAnchor: [25, 50],
        popupAnchor: [0, -44]
      }),
      bus_stop: L.icon({
        iconUrl: PROJECT_BASE + '/assets/images/icons/busStopMarkerFinal2.svg',
        iconSize: [50, 50],
        iconAnchor: [25, 50],
        popupAnchor: [0, -44]
      }),
      terminal: L.icon({
        iconUrl: PROJECT_BASE + '/assets/images/icons/BUSSTOP.png',
        iconSize: [50, 50],
        iconAnchor: [25, 50],
        popupAnchor: [0, -44]
      })
    };

    function stopIcon(type) {
      var t = String(type || '').toLowerCase();
      return STOP_ICONS[t] || STOP_ICONS.bus_stop;
    }

    function resizeStopMarkersForZoom(zoom) {
      if (!window._stopMarkers) return;

      // Target icon size (in px) depending on zoom:
      // - zoom <= 12  → 45px
      // - zoom 12–17  → interpolate 45px → 80px
      // - zoom >= 17  → 80px
      var targetSizePx;
      if (zoom <= 12) {
        targetSizePx = 45; // small/normal when very zoomed out
      } else if (zoom >= 17) {
        targetSizePx = 80; // big at max zoom
      } else {
        // interpolate linearly between 45 and 80
        var t = (zoom - 12) / (17 - 12); // 0→1 as zoom goes 12→17
        targetSizePx = 45 + t * (80 - 45);
      }

      Object.values(window._stopMarkers).forEach(function(marker) {
        var t = marker.options.stopType || 'bus_stop';
        var baseIcon = STOP_ICONS[t] || STOP_ICONS.bus_stop;

        // Use base icon only for aspect ratio + reference anchors
        var baseSize = baseIcon.options.iconSize; // e.g. [50, 50]
        var baseWidth = baseSize[0];
        var baseHeight = baseSize[1];

        var aspect = baseWidth / baseHeight || 1;
        var newHeight = targetSizePx;
        var newWidth = Math.round(newHeight * aspect);

        // Scale anchor + popup positions proportionally
        var baseAnchor = baseIcon.options.iconAnchor || [baseWidth / 2, baseHeight];
        var basePopup = baseIcon.options.popupAnchor || [0, -baseHeight * 0.9];

        var widthScale = newWidth / baseWidth;
        var heightScale = newHeight / baseHeight;

        var newAnchor = [
          Math.round(baseAnchor[0] * widthScale),
          Math.round(baseAnchor[1] * heightScale)
        ];
        var newPopup = [
          Math.round(basePopup[0] * widthScale),
          Math.round(basePopup[1] * heightScale)
        ];

        var zoomIcon = L.icon({
          iconUrl: baseIcon.options.iconUrl,
          iconSize: [newWidth, newHeight],
          iconAnchor: newAnchor,
          popupAnchor: newPopup
        });

        marker.setIcon(zoomIcon);
      });
    }

    async function loadStops() {
      var listEl = document.getElementById('busStopsListMobile');
      if (listEl) {
        listEl.innerHTML = '<div class="text-center text-muted mt-4 small">Loading bus stops...</div>';
      }

      var res = await fetch('../api.php?action=get_bus_stops_terminal', {
        cache: 'no-store'
      });
      var json = await res.json();

      if (!json || !json.success || !Array.isArray(json.data)) {
        var msg = json?.error || 'Failed to load stops';
        if (listEl) {
          listEl.innerHTML = '<div class="text-center text-danger mt-4 small">' + escapeHtml(msg) + '</div>';
        }
        return;
      }

      var stops = json.data;

      // ---------- render list ----------
      if (listEl) {
        if (!stops.length) {
          listEl.innerHTML = '<div class="text-center text-muted mt-4 small">No bus stops yet.</div>';
        } else {
          listEl.innerHTML = stops.map(function(s) {
            var subtitle = [s.location_name, s.location_landmark].filter(Boolean).join(' • ');
            var typeLabel = String(s.type || '').replaceAll('_', ' ').toUpperCase();

            return `
          <button type="button"
                  class="bus-stop-card"
                  onclick="focusStop('${String(s.id)}')">
            <div class="d-flex justify-content-between align-items-start">
              <div class="me-2">
                <div class="bus-stop-title">${escapeHtml(s.name)}</div>
                <div class="bus-stop-subtitle">${escapeHtml(subtitle || '')}</div>
              </div>
              <span class="bus-stop-type-pill">${escapeHtml(typeLabel || 'Pick Up Point')}</span>
            </div>
          </button>`;
          }).join('');
        }
      }

      // ---------- markers on the map ----------
      var ids = new Set(stops.map(function(s) {
        return String(s.id);
      }));

      Object.keys(stopMarkers).forEach(function(id) {
        if (!ids.has(id)) {
          map.removeLayer(stopMarkers[id]);
          delete stopMarkers[id];
        }
      });

      stops.forEach(function(s) {
        var id = String(s.id);
        var lat = parseFloat(s.lat);
        var lng = parseFloat(s.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

        var popup = '<b>' + escapeHtml(s.name) + '</b><br>' +
          escapeHtml(s.location_name || '') +
          (s.location_landmark ? '<br><small>' + escapeHtml(s.location_landmark) + '</small>' : '') +
          '<br><small>' + escapeHtml(String(s.type || '')) + '</small>';

        if (stopMarkers[id]) {
          stopMarkers[id]
            .setLatLng([lat, lng])
            .setIcon(stopIcon(s.type))
            .setPopupContent(popup);
        } else {
          stopMarkers[id] = L.marker([lat, lng], {
            icon: stopIcon(s.type),
            stopType: String(s.type || 'bus_stop').toLowerCase() // remember type for resizing
          }).addTo(map).bindPopup(popup);
        }
      });

      // Keep window._stopMarkers in sync (same object reference, already in sync)
      if (typeof setBusStopsVisibility === 'function') setBusStopsVisibility(false);

      // Apply appropriate size for current zoom right after loading stops
      resizeStopMarkersForZoom(map.getZoom());
    }



    // --------------------- MAP OFFSET HELPER ---------------------
    function flyToMyLocationKeepingMarkerVisible(lat, lng) {
      var zoom = Math.max(map.getZoom(), 16);
      map.flyTo([lat, lng], zoom, {
        animate: true,
        duration: 0.6
      });

      setTimeout(function() {
        // getBottomSheetHeightPx is defined in passengerBottomSheet.js
        var sheetH = (typeof getBottomSheetHeightPx === 'function') ? getBottomSheetHeightPx() : 0;
        var padding = 40;
        var yOffset = Math.round((sheetH / 2) + padding);
        if (yOffset > 0) map.panBy([0, yOffset], {
          animate: true,
          duration: 0.25
        });
      }, 650);
    }

    window.centerToMyLocation = function() {
      if (userLocation && locationPermissionGranted) {
        flyToMyLocationKeepingMarkerVisible(userLocation.lat, userLocation.lng);
        if (userMarker) userMarker.bringToFront?.();
        return;
      }

      if (!navigator.geolocation) {
        alert('Geolocation is not supported on this device/browser.');
        return;
      }

      navigator.geolocation.getCurrentPosition(function(pos) {
        var lat = pos.coords.latitude;
        var lng = pos.coords.longitude;

        userLocation = {
          lat: lat,
          lng: lng
        };

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

        flyToMyLocationKeepingMarkerVisible(lat, lng);
        uploadMyLocation(lat, lng, pos.coords.accuracy);
      }, function(error) {
        console.error('centerToMyLocation error:', error);
        if (error.code === error.PERMISSION_DENIED) showLocationPermissionDenied();
        else alert('Unable to get your location right now.');
      }, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000
      });
    };

    // --------------------- INIT ---------------------
    document.addEventListener('DOMContentLoaded', function() {
      var locationEnabled = localStorage.getItem('byahero_location_services') !== '0';
      if (!locationEnabled) locationPermissionGranted = false;
    });

    startUserLocationWatch();
    updateBuses();

    setTimeout(function() {
      if (typeof updateRoutePills === 'function') updateRoutePills();
    }, 100);

    setInterval(updateBuses, 4000);
  </script>
</body>

</html>
