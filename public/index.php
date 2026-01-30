<?php
session_start();
require __DIR__ . '/config/db.php';

// Fetch user details if logged in
$currentUser = null;
if (isset($_SESSION['user_id'])) {
  try {
    $pdo = db();
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $currentUser = $stmt->fetch();
  } catch (Exception $e) {
  }
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
  <link rel="manifest" href="manifest.webmanifest">
  <meta name="theme-color" content="#1e3a8a">

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

    .w-40px {
      width: 40px;
    }

    .h-40px {
      height: 40px;
    }

    .rounded-top-4 {
      border-top-left-radius: 1.5rem;
      border-top-right-radius: 1.5rem;
    }

    .map-overlay {
      z-index: 1000;
    }

    .filter-pill {
      cursor: pointer;
      font-size: 0.8rem;
      letter-spacing: 0.5px;
    }

    .bottom-sheet {
      height: 45%;
      margin-top: -20px;
      z-index: 1002;
      box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
    }

    .timeline-container {
      height: 12px;
      border-radius: 12px;
    }

    .timeline-progress {
      transition: width 600ms ease;
    }

    .timeline-icon {
      top: -12px;
      transform: translateX(-50%);
      padding: 2px;
    }

    .stop-point {
      top: -6px;
      width: 18px;
      height: 18px;
      border: 3px solid #e6eefc;
      z-index: 2;
    }

    @media (min-width: 992px) {
      .map-and-sidebar {
        display: grid;
        grid-template-columns: 1fr 350px;
        height: calc(100vh - 56px);
      }
    }
  </style>
</head>

<body class="bg-light">

  <div class="d-lg-none d-flex flex-column vh-100 w-100">
    <div class="flex-grow-1 position-relative" style="min-height: 0;">
      <div id="map"></div>

      <div
        class="position-absolute mt-5 top-0 start-0 end-0 p-3 d-flex justify-content-between align-items-center map-overlay">
        <button
          class="btn btn-light rounded-circle shadow p-0 h-40px w-40px d-flex align-items-center justify-content-center border-0"
          data-bs-toggle="modal" data-bs-target="#settingsModal">
          <span class="material-symbols-rounded">settings</span>
        </button>

        <div
          class="bg-white rounded-pill shadow px-4 py-2 d-flex align-items-center gap-2 fw-bold text-dark filter-pill"
          data-bs-toggle="modal" data-bs-target="#filterModal">
          <span id="filterLabelMobile">FILTER ROUTES</span>
          <span class="material-symbols-rounded fs-6">tune</span>
        </div>

        <button
          class="btn btn-light rounded-circle shadow p-0 h-40px w-40px d-flex align-items-center justify-content-center border-0">
          <span class="material-symbols-rounded">notifications</span>
        </button>
      </div>

      <button
        class="position-absolute start-50 translate-middle-x bottom-0 mb-4 btn btn-light rounded-pill shadow px-4 py-2 d-flex align-items-center gap-2 text-primary fw-bold border-0 map-overlay"
        style="z-index: 1000;">
        <span class="material-symbols-rounded fs-4">security</span>
        <span>SOS</span>
      </button>
    </div>
  </div>

  <div
    class="bottom-sheet bg-white rounded-top-4 shadow-lg d-flex flex-column overflow-hidden position-absolute start-0 w-100"
    style="bottom: 80px; height: 40%; z-index: 1050;">

    <div class="flex-shrink-0 w-100 bg-white rounded-top-4">
      <div class="bg-secondary opacity-25 rounded-pill mx-auto mt-3" style="width: 40px; height: 5px;"></div>

      <div class="container-fluid px-3 pt-3 pb-2">
        <div class="row g-2">
          <div class="col-4" onclick="switchSheetTab('location')">
            <div id="tab-location"
              class="sheet-tab active bg-primary text-white rounded-4 p-3 d-flex justify-content-center align-items-center shadow-sm h-100 cursor-pointer">
              <span class="material-symbols-rounded fs-3">location_on</span>
            </div>
          </div>
          <div class="col-4" onclick="switchSheetTab('groups')">
            <div id="tab-groups"
              class="sheet-tab bg-primary-subtle border border-primary text-primary rounded-4 p-3 d-flex justify-content-center align-items-center h-100 cursor-pointer">
              <span class="material-symbols-rounded fs-3">groups</span>
            </div>
          </div>
          <div class="col-4" onclick="switchSheetTab('pins')">
            <div id="tab-pins"
              class="sheet-tab bg-primary-subtle border border-primary text-primary rounded-4 p-3 d-flex justify-content-center align-items-center h-100 cursor-pointer">
              <span class="material-symbols-rounded fs-3">push_pin</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="flex-grow-1 overflow-y-auto pb-4 px-3" style="min-height: 0;">

      <div id="view-location" class="mt-2">
        <div id="busListMobile">
          <div class="text-center text-muted mt-4 small">Loading buses...</div>
        </div>
      </div>

      <?php include '../components/group_view.php'; ?>
      <?php include '../components/pins_list_view.php'; ?>

      <div id="view-alerts" class="d-none mt-5 text-center text-muted">
        <span class="material-symbols-rounded display-1 opacity-25">notifications_off</span>
        <p class="mt-2">No active alerts</p>
      </div>
    </div>
  </div>

  <div class="d-none d-lg-block h-100">
    <nav class="navbar navbar-dark bg-primary px-3" style="height:56px">
      <span class="navbar-brand mb-0 h1">ByaHero Desktop</span>
      <div class="ms-auto">
        <?php if (isset($_SESSION['user_id'])): ?>
          <span class="text-white me-3">Welcome, <?= htmlspecialchars($_SESSION['user_name']) ?></span>
          <a href="logout.php" class="btn btn-sm btn-light">Logout</a>
        <?php else: ?>
          <button class="btn btn-sm btn-light" data-bs-toggle="modal" data-bs-target="#loginModal">Login</button>
        <?php endif; ?>
      </div>
    </nav>
    <div class="map-and-sidebar">
      <div id="map-desktop-placeholder" class="h-100"></div>
      <div class="overflow-y-auto bg-white border-start">
        <h6 class="p-3 border-bottom bg-light m-0 sticky-top">Active Buses</h6>
        <div id="busListDesktop" class="list-group list-group-flush"></div>
      </div>
    </div>
  </div>

  <div class="modal fade" id="loginModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header border-0 pb-0">
          <h5 class="fw-bold">Login</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <div id="loginAlert"></div>
          <form id="loginForm">
            <input type="hidden" name="action" value="login">
            <div class="mb-3"><input type="email" name="email" class="form-control" placeholder="Email" required></div>
            <div class="mb-3"><input type="password" name="password" class="form-control" placeholder="Password"
                required></div>
            <button type="submit" class="btn btn-primary w-100">Sign In</button>
          </form>
        </div>
      </div>
    </div>
  </div>

  <div class="modal fade" id="filterModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered modal-sm">
      <div class="modal-content">
        <div class="modal-header">
          <h6 class="modal-title fw-bold">Select Route</h6>
        </div>
        <div class="modal-body p-0">
          <div class="list-group list-group-flush" id="routeFilterList"></div>
        </div>
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
        <div class="modal-body text-center"><?php if (isset($_SESSION['user_id'])): ?>
            <h6><?= htmlspecialchars($_SESSION['user_name']) ?></h6><a href="logout.php"
              class="btn btn-sm btn-outline-danger mt-2">Logout</a><?php else: ?>
            <p>Please log in.</p><button class="btn btn-primary btn-sm" data-bs-toggle="modal"
              data-bs-target="#loginModal">Login</button><?php endif; ?>
        </div>
      </div>
    </div>
  </div>

  <?php include("../components/navbar.php"); ?>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>

  <script>
    // --- GLOBAL VARIABLES ---
    const isMobile = document.querySelector('.d-lg-none').offsetParent !== null;
    const mapId = isMobile ? 'map' : 'map-desktop-placeholder';
    const map = L.map(mapId, { zoomControl: false }).setView([14.0905, 121.0550], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '', maxZoom: 19 }).addTo(map);

    const busMarkers = {};
    let userLocation = null;
    let userMarker = null;
    let selectedRoute = '';
    const statusColors = { available: '#10b981', on_stop: '#f59e0b', full: '#ef4444', unavailable: '#6b7280' };
    const AVG_SPEED_MPS = (30 * 1000) / 3600;
    const MAX_DISTANCE_METERS = 5000;

    // --- TAB SWITCHING ---
    function switchSheetTab(tabName) {
      const tabs = ['location', 'groups', 'pins'];
      const sheet = document.querySelector('.bottom-sheet');

      // 1. Resize Bottom Sheet
      if (sheet) sheet.style.height = (tabName === 'location') ? '40%' : '55%';

      // 2. Tab Styling & View Toggling
      tabs.forEach(t => {
        const el = document.getElementById('tab-' + t);
        const view = document.getElementById('view-' + t);
        if (el) el.className = (t === tabName)
          ? 'sheet-tab active bg-primary text-white rounded-4 p-3 d-flex justify-content-center align-items-center shadow-sm h-100 cursor-pointer'
          : 'sheet-tab bg-primary-subtle border border-primary text-primary rounded-4 p-3 d-flex justify-content-center align-items-center h-100 cursor-pointer';
        if (view) view.classList.add('d-none');
      });
      const selectedView = document.getElementById('view-' + tabName);
      if (selectedView) selectedView.classList.remove('d-none');

      // 3. Layer Management
      if (typeof hideGroupVisuals === 'function') hideGroupVisuals();
      if (typeof setPinsVisibility === 'function') setPinsVisibility(false); // Hide pins by default

      if (tabName === 'groups') {
        if (typeof showGroupVisuals === 'function') showGroupVisuals();
      } else if (tabName === 'pins') {
        if (typeof setPinsVisibility === 'function') setPinsVisibility(true); // Show pins
      }
    }

    function selectNav(element, section) {
      document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('text-primary');
        btn.classList.add('text-dark');
      });
      element.classList.remove('text-dark');
      element.classList.add('text-primary');
      const bottomSheet = document.querySelector('.bottom-sheet');
      if (bottomSheet) {
        if (section === 'location') {
          bottomSheet.classList.remove('d-none');
          bottomSheet.classList.add('d-flex');
        } else {
          bottomSheet.classList.remove('d-flex');
          bottomSheet.classList.add('d-none');
        }
      }
    }

    // --- BUS TRACKING ---
    async function updateBuses() {
      try {
        const res = await fetch('api.php?action=get_buses');
        const json = await res.json();
        if (json.success && json.buses) {
          const buses = json.buses.map(normalizeBus);
          buses.forEach(b => {
            if (b.coords && userLocation) {
              const dist = distanceMeters(b.coords[0], b.coords[1], userLocation.lat, userLocation.lng);
              b.eta = formatArrivalBySeconds(dist / AVG_SPEED_MPS);
              b.progress = Math.round(Math.max(0, Math.min(100, 100 - (dist / MAX_DISTANCE_METERS) * 100)));
            }
          });
          updateMap(buses);
          renderBusList(buses);
          updateFilters(buses);
        }
      } catch (e) { console.error("Bus fetch error:", e); }
    }

    function updateMap(buses) {
      const filtered = buses.filter(b => (!selectedRoute || b.route === selectedRoute) && b.status !== 'unavailable' && b.coords !== null);
      const currentIds = new Set(filtered.map(b => String(b.id)));
      Object.keys(busMarkers).forEach(id => {
        if (!currentIds.has(id)) { map.removeLayer(busMarkers[id]); delete busMarkers[id]; }
      });
      filtered.forEach(b => {
        const color = statusColors[b.status] || '#999';
        if (busMarkers[b.id]) {
          busMarkers[b.id].setLatLng(b.coords).setIcon(createBusIcon(color));
          busMarkers[b.id].bindPopup(`<b>${b.code}</b><br>${b.locName}${b.eta ? `<br><small>ETA: ${b.eta}</small>` : ''}`);
        } else {
          const m = L.marker(b.coords, { icon: createBusIcon(color) }).addTo(map);
          m.bindPopup(`<b>${b.code}</b><br>${b.locName}${b.eta ? `<br><small>ETA: ${b.eta}</small>` : ''}`);
          busMarkers[b.id] = m;
        }
      });
      if (userLocation) {
        if (!userMarker) userMarker = L.circleMarker([userLocation.lat, userLocation.lng], { radius: 8, color: '#2563eb', fillColor: '#60a5fa', fillOpacity: 0.9 }).addTo(map);
        else userMarker.setLatLng([userLocation.lat, userLocation.lng]);
      }
    }

    function renderBusList(buses) {
      const container = isMobile ? document.getElementById('busListMobile') : document.getElementById('busListDesktop');
      if (!container) return;
      const activeBuses = buses.filter(b => (!selectedRoute || b.route === selectedRoute) && b.status !== 'unavailable' && b.coords !== null);
      if (activeBuses.length === 0) {
        container.innerHTML = `<div class="d-flex flex-column justify-content-center align-items-center h-100 text-muted p-5"><span class="material-symbols-rounded fs-1 mb-2">directions_bus_off</span><span class="fw-bold">No Available Bus</span></div>`;
        return;
      }
      const html = activeBuses.map(b => {
        const color = statusColors[b.status] || '#ccc';
        const progress = b.progress || 0;
        const arrivalText = b.eta ? `Arriving by ${b.eta}` : '';
        if (isMobile) {
          return `<div class="card border-0 border-bottom rounded-0 cursor-pointer" onclick="focusBus('${b.id}')"><div class="card-body py-3 px-4"><div class="d-flex justify-content-between align-items-center mb-1"><span class="badge bg-primary rounded-2 text-uppercase fw-bold">${b.code}</span><div style="width: 30px; height: 12px; border-radius: 6px; background:${color}"></div></div><div class="d-flex justify-content-between small text-muted"><span>${b.locName}</span><span>${b.seats} Seats</span></div><div class="small text-muted mb-2">${arrivalText}</div><div class="timeline-container bg-secondary-subtle position-relative"><div class="timeline-progress bg-primary position-absolute top-0 bottom-0 start-0 rounded-pill" style="width: ${progress}%"></div><span class="material-symbols-rounded timeline-icon position-absolute bg-white rounded-circle text-primary border" style="left: ${progress}%; font-size:18px">directions_bus</span><span class="material-symbols-rounded timeline-icon stop-point stop-commuter position-absolute bg-white rounded-circle" style="right:6px; transform: translateX(0);">place</span></div></div></div>`;
        } else {
          return `<button class="list-group-item list-group-item-action" onclick="focusBus('${b.id}')"><h6 class="mb-1 fw-bold">${b.code}</h6><small>${b.locName}</small></button>`;
        }
      }).join('');
      container.innerHTML = html;
    }

    function normalizeBus(bus) {
      let coords = null;
      if (bus.current_location) { try { const geo = JSON.parse(bus.current_location); if (geo.geometry) coords = [geo.geometry.coordinates[1], geo.geometry.coordinates[0]]; } catch (e) { } }
      if (!coords && bus.lat && bus.lng) coords = [bus.lat, bus.lng];
      return { id: bus.Bus_ID || bus.id, code: bus.code || 'BUS', route: bus.route || '', status: bus.status || 'unavailable', coords: coords, locName: bus.current_location_name || 'Updating...', seats: `${bus.seat_availability}/${bus.total_seats}`, eta: null, progress: 0 };
    }
    function createBusIcon(color) { return L.divIcon({ html: `<div style="background:${color};width:16px;height:16px;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 5px rgba(0,0,0,0.3)"></div>`, className: 'bus-marker-dot', iconSize: [20, 20], iconAnchor: [10, 10] }); }
    function distanceMeters(lat1, lon1, lat2, lon2) { const R = 6371000; const dLat = (lat2 - lat1) * Math.PI / 180; const dLon = (lon2 - lon1) * Math.PI / 180; const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2); return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); }
    function formatArrivalBySeconds(seconds) { const dt = new Date(Date.now() + Math.max(0, seconds * 1000)); let h = dt.getHours(), m = dt.getMinutes().toString().padStart(2, '0'), ampm = h >= 12 ? 'PM' : 'AM'; h = h % 12; h = h ? h : 12; return `${h}:${m} ${ampm}`; }
    window.focusBus = (id) => { const m = busMarkers[id]; if (m) { map.flyTo(m.getLatLng(), 15); m.openPopup(); } };
    window.setRoute = (r) => { selectedRoute = r; const label = document.getElementById('filterLabelMobile'); if (label) label.textContent = r ? r.substring(0, 12) + "..." : 'FILTER ROUTES'; bootstrap.Modal.getInstance(document.getElementById('filterModal'))?.hide(); updateBuses(); }
    function updateFilters(buses) { const routes = [...new Set(buses.map(b => b.route).filter(r => r))]; const list = document.getElementById('routeFilterList'); if (!list) return; let html = `<button class="list-group-item list-group-item-action ${selectedRoute === '' ? 'active' : ''}" onclick="setRoute('')">All Routes</button>`; routes.forEach(r => html += `<button class="list-group-item list-group-item-action ${selectedRoute === r ? 'active' : ''}" onclick="setRoute('${r}')">${r}</button>`); list.innerHTML = html; }

    function startUserLocationWatch() {
      if (!navigator.geolocation) return;
      navigator.geolocation.watchPosition(pos => {
        userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (userMarker) userMarker.setLatLng([userLocation.lat, userLocation.lng]);
        updateBuses();
      }, (e) => { }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 });
    }

    document.addEventListener('DOMContentLoaded', () => {
      const modals = ['safetyModal', 'infoModal', 'profileModal', 'filterModal', 'settingsModal'];
      const locationBtn = document.querySelector('button[onclick*="location"]');
      modals.forEach(id => { const el = document.getElementById(id); if (el) el.addEventListener('hidden.bs.modal', () => { if (locationBtn) selectNav(locationBtn, 'location'); }); });

      // FIXED: LOGIN LOGIC HANDLES REDIRECT
      document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const alertBox = document.getElementById('loginAlert');
        try {
          const res = await fetch('auth_api.php', { method: 'POST', body: fd });
          const data = await res.json();
          if (data.success) {
            alertBox.innerHTML = '<div class="alert alert-success py-1">Success! Redirecting...</div>';
            // NEW LOGIC: Follow the redirect URL from server if present
            if (data.redirect) {
              window.location.href = data.redirect;
            } else {
              setTimeout(() => location.reload(), 1000);
            }
          } else {
            alertBox.innerHTML = `<div class="alert alert-danger py-1">${data.message}</div>`;
          }
        } catch (err) { alertBox.innerHTML = '<div class="alert alert-danger py-1">Connection Error</div>'; }
      });

      // Init pins with the main map instance
      if (typeof initPinsFeature === 'function') initPinsFeature(map);
    });
    startUserLocationWatch();
    updateBuses();
    setInterval(updateBuses, 4000);
  </script>
</body>

</html>