<?php
session_start();

// Enforce Access Control: Only 'conductor' or 'driver' roles allowed
if (!isset($_SESSION['user_id']) || !in_array($_SESSION['user_role'] ?? '', ['conductor', 'driver'])) {
  // go up one dir to the public index
  header("Location: ../index.php");
  exit;
}
?>
<!doctype html>
<html lang="en">

<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>ByaHero - Conductor Dashboard</title>

  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet">

  <link rel="manifest" href="/ByaHero-Prototype-V3/public/manifest.webmanifest">
  <meta name="theme-color" content="#667eea">

  <style>
    :root {
      --navbar-h: 56px;
    }

    html,
    body {
      height: 100%;
      margin: 0;
      font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #eef2ff 0%, #f3f7ff 100%);
    }

    .page-wrapper {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      box-sizing: border-box;
    }

    .dashboard-card {
      width: 100%;
      max-width: 880px;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(2, 6, 23, 0.12);
      background: #fff;
    }

    .dashboard-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
      padding: 1.25rem 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .user-profile {
      text-align: right;
      line-height: 1.2;
    }

    .user-name {
      font-weight: 700;
      font-size: 0.9rem;
    }

    .user-role {
      font-size: 0.75rem;
      opacity: 0.9;
      text-transform: uppercase;
      background: rgba(255, 255, 255, 0.2);
      padding: 1px 6px;
      border-radius: 4px;
    }

    .card-body {
      padding: 1rem 1.25rem;
    }

    .form-row {
      display: flex;
      flex-wrap: wrap;
      gap: .75rem;
      margin-bottom: .75rem;
    }

    .form-group {
      flex: 1 1 220px;
      min-width: 180px;
    }

    label {
      font-weight: 600;
      font-size: .95rem;
      margin-bottom: .25rem;
      display: block;
    }

    .status-indicator {
      padding: .7rem 0.9rem;
      border-radius: 8px;
      margin-bottom: .75rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: .5rem;
    }

    .status-inactive {
      background: #fff7ed;
      color: #92400e;
      border-left: 4px solid #fb923c;
    }

    .status-active {
      background: #ecfdf5;
      color: #065f46;
      border-left: 4px solid #10b981;
    }

    @keyframes pulse-green {
      0% {
        box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
      }

      70% {
        box-shadow: 0 0 0 10px rgba(16, 185, 129, 0);
      }

      100% {
        box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
      }
    }

    .status-icon-active {
      animation: pulse-green 2s infinite;
      border-radius: 50%;
    }

    .info-box {
      background: #f8fafc;
      padding: .9rem;
      border-radius: 8px;
      margin-top: .75rem;
    }

    .info-item {
      display: flex;
      justify-content: space-between;
      padding: .45rem 0;
      border-bottom: 1px solid #eef2f6;
      font-size: .95rem;
    }

    .info-item:last-child {
      border-bottom: 0;
    }

    #miniMapWrap {
      margin-top: .75rem;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #e6eefc;
      position: relative;
    }

    #miniMap {
      width: 100%;
      height: 240px;
      display: block;
    }

    .seat-control {
      display: flex;
      gap: .5rem;
      align-items: center;
      justify-content: center;
      max-width: 260px;
    }

    .seat-btn {
      width: 44px;
      height: 44px;
      border-radius: 8px;
      border: 0;
      background: #f3f4f6;
      font-weight: 700;
      font-size: 1.1rem;
      cursor: pointer;
    }

    .seat-count {
      min-width: 64px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      background: #fff;
      border: 1px solid #e8eefc;
      font-weight: 700;
      font-size: 1.05rem;
    }

    .visually-hidden {
      position: absolute !important;
      height: 1px;
      width: 1px;
      overflow: hidden;
      clip: rect(1px, 1px, 1px, 1px);
      white-space: nowrap;
    }

    .btn-space {
      display: flex;
      gap: .6rem;
      flex-wrap: wrap;
      align-items: center;
    }

    .alert-placeholder {
      min-height: 2rem;
      margin-bottom: .5rem;
    }
  </style>
</head>

<body>
  <div class="page-wrapper">
    <article class="dashboard-card">
      <header class="dashboard-header">
        <div class="d-flex align-items-center gap-3">
          <div style="font-size:1.6rem">🚌</div>
          <div>
            <h1 id="pageTitle">Conductor</h1>
            <p class="d-none d-sm-block m-0">Manage bus & share location</p>
          </div>
        </div>
        <div class="d-flex align-items-center gap-3">
          <div class="user-profile d-none d-sm-block">
            <div class="user-name"><?= htmlspecialchars($_SESSION['user_name'] ?? 'User') ?></div>
            <div class="user-role"><?= htmlspecialchars($_SESSION['user_role'] ?? 'Staff') ?></div>
          </div>
          <a href="../logout.php" class="btn btn-sm btn-outline-light d-flex align-items-center gap-1" style="border-radius:8px;">
            <span class="material-icons-round" style="font-size:1.1rem">logout</span>
          </a>
        </div>
      </header>

      <div class="card-body">
        <div class="alert-placeholder" id="alertBox"></div>

        <section id="setupSection">
          <div class="status-indicator status-inactive" id="setupStatus">
            <div class="d-flex align-items-center gap-2">
              <span class="material-icons-round">warning_amber</span>
              <span>Select bus to start tracking</span>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="busSelect">Select Your Bus</label>
              <select id="busSelect" class="form-select">
                <option value="">-- Select Bus --</option>
              </select>
            </div>
            <div class="form-group">
              <label for="routeSelect">Fixed Routes</label>
              <select id="routeSelect" class="form-select">
                <option value="">-- Select a route --</option>
                <option value="LAUREL - TANAUAN">LAUREL - TANAUAN</option>
                <option value="TANAUAN - LAUREL">TANAUAN - LAUREL</option>
              </select>
            </div>
          </div>
          <div class="btn-space">
            <button class="btn btn-primary w-100" id="startBtn" type="button">Start Tracking</button>
          </div>
        </section>

        <section id="trackingSection" style="display:none">
          <div class="status-indicator status-active" id="trackingStatus">
            <div class="d-flex align-items-center gap-2">
              <span class="material-icons-round status-icon-active">my_location</span>
              <span>Live Tracking Active</span>
            </div>
            <div id="netStatus" class="badge bg-light text-secondary border fw-normal" style="font-size:0.75rem">Ready</div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="statusSelect">Bus Status</label>
              <select id="statusSelect" class="form-select">
                <option value="available">🟢 Available</option>
                <option value="on_stop">🟠 On Stop</option>
                <option value="full">🔴 Full</option>
                <option value="unavailable">⚫ Unavailable</option>
              </select>
            </div>
            <div class="form-group">
              <label>Seats Available</label>
              <div class="seat-control">
                <button type="button" id="seatMinus" class="seat-btn">−</button>
                <div id="seatsCount" class="seat-count">25</div>
                <button type="button" id="seatPlus" class="seat-btn">+</button>
              </div>
              <input id="seatsInput" type="number" class="visually-hidden" value="25" />
            </div>
          </div>

          <div id="miniMapWrap">
            <div id="miniMap"></div>
          </div>

          <div class="info-box">
            <div class="info-item">
              <div>Bus Code</div>
              <div id="currentBusCode">-</div>
            </div>
            <div class="info-item">
              <div>Route</div>
              <div id="currentRoute">-</div>
            </div>
            <div class="info-item">
              <div>Location</div>
              <div id="currentLocation" class="fw-bold text-primary">Waiting for GPS...</div>
            </div>
            <div class="info-item">
              <div>Last Update</div>
              <div id="lastUpdate">-</div>
            </div>
            <div class="info-item">
              <div>Arrival</div>
              <div id="arrivalTime">-</div>
            </div>
            <div class="info-item">
              <div>My Location</div>
              <div id="myLocation">-</div>
            </div>
          </div>

          <div class="btn-space mt-3">
            <button class="btn btn-danger w-100" id="stopBtn" type="button">Stop Tracking</button>
          </div>
        </section>
      </div>
    </article>
  </div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>

  <script>
    let watchId = null,
      wakeLock = null,
      currentBus = null,
      routeFeatures = [];
    let miniMap = null,
      miniMarker = null,
      miniMapHasCentered = false;
    let lastNetworkSync = 0;

    // Track the last known position to allow instant manual updates
    let lastKnownLocation = null;

    // Sync GPS updates every 1 second
    const SYNC_INTERVAL = 1000;

    const el = (id) => document.getElementById(id);
    const alertBox = el('alertBox');
    const netStatus = el('netStatus');

    function showAlert(message, type = 'info') {
      const bsType = (type === 'danger' || type === 'error') ? 'danger' : (type === 'success' ? 'success' : 'primary');
      alertBox.innerHTML = `<div class="alert alert-${bsType} py-2 mb-0" role="alert">${message}</div>`;
      setTimeout(() => {
        if (alertBox) alertBox.innerHTML = '';
      }, 4500);
    }

    async function loadRouteFeatures() {
      try {
        const res = await fetch('../map_data.php', {
          cache: 'no-store'
        });
        const json = await res.json();
        if (json && Array.isArray(json.features)) {
          routeFeatures = json.features.filter(f => f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon'));
        }
      } catch (e) {
        console.warn('Failed to load route features', e);
      }
    }

    function pointInRing(x, y, ring) {
      let inside = false;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i][0],
          yi = ring[i][1];
        const xj = ring[j][0],
          yj = ring[j][1];
        const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / ((yj - yi) || 1) + xi);
        if (intersect) inside = !inside;
      }
      return inside;
    }

    function resolveLocationName(lat, lng) {
      if (!routeFeatures || routeFeatures.length === 0) return null;
      for (const f of routeFeatures) {
        if (f.geometry.type === 'Polygon' && f.geometry.coordinates && f.geometry.coordinates[0]) {
          if (pointInRing(lng, lat, f.geometry.coordinates[0])) {
            return f.properties['Current Location'] || f.properties.name || null;
          }
        }
      }
      return null;
    }

    function normalizeBus(raw) {
      const bus = Object.assign({}, raw);
      const id = bus.id ?? bus.Bus_ID ?? bus.id ?? bus.bus_id;
      const seats_total = bus.seats_total ?? bus.total_seats ?? 25;
      return {
        id: (typeof id !== 'undefined' && id !== null) ? String(id) : null,
        code: bus.code ?? null,
        route: bus.route ?? null,
        seats_total: Number(seats_total),
        // optional fields to be filled in after normalization
        coords: null,
        status: bus.status ?? 'unavailable',
        locName: bus.current_location_name ?? bus.current_location ?? null
      };
    }

    async function loadBuses() {
      try {
        const r = await fetch('../api.php?action=get_buses', {
          cache: 'no-store'
        });
        const json = await r.json();
        if (json && Array.isArray(json.buses)) {
          const sel = el('busSelect');
          [...sel.options].forEach(o => {
            if (o.value !== '') o.remove();
          });
          json.buses.map(normalizeBus).forEach(b => {
            const o = document.createElement('option');
            o.value = b.id;
            o.textContent = `${b.code} (${b.seats_total ?? 'N/A'} seats)`;
            o.dataset.code = b.code ?? `BUS-${b.id}`;
            o.dataset.route = b.route ?? '';
            o.dataset.seats = b.seats_total;
            sel.appendChild(o);
          });
        }
      } catch (e) {
        console.error(e);
      }
    }

    function initMiniMap() {
      if (miniMap) return;
      try {
        miniMap = L.map('miniMap', {
          attributionControl: false,
          zoomControl: false,
          dragging: false
        }).setView([14.0905, 121.0550], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19
        }).addTo(miniMap);
      } catch (e) {}
    }

    function updateMiniMarker(lat, lng) {
      if (!miniMap) return;
      const latlng = [lat, lng];
      if (miniMarker) {
        miniMarker.setLatLng(latlng);
      } else {
        miniMarker = L.marker(latlng).addTo(miniMap);
      }
      if (!miniMapHasCentered) {
        miniMap.setView(latlng, 15);
        miniMapHasCentered = true;
      } else {
        miniMap.panTo(latlng);
      }
    }

    function getSeatsValue() {
      return parseInt(el('seatsCount').textContent || '0', 10);
    }

    function setSeatsValue(v) {
      const n = Math.max(0, Math.min(999, Number(v) || 0));
      el('seatsCount').textContent = n;
      el('seatsInput').value = n;
      triggerManualUpdate();
    }

    async function startTracking() {
      await loadRouteFeatures();
      const busId = el('busSelect').value;
      const route = el('routeSelect').value;
      if (!busId) {
        showAlert('Please select a bus', 'danger');
        return;
      }
      if (!route) {
        showAlert('Please choose a route', 'danger');
        return;
      }

      if ('wakeLock' in navigator) {
        try {
          wakeLock = await navigator.wakeLock.request('screen');
        } catch (e) {}
      }

      const sel = el('busSelect');
      const selectedOption = sel.options[sel.selectedIndex];

      currentBus = {
        id: busId,
        code: selectedOption.dataset.code,
        route: route,
        totalSeats: selectedOption.dataset.seats || 25
      };

      el('currentBusCode').textContent = currentBus.code;
      el('currentRoute').textContent = currentBus.route;
      setSeatsValue(currentBus.totalSeats);

      el('setupSection').style.display = 'none';
      el('trackingSection').style.display = 'block';

      initMiniMap();

      if (!navigator.geolocation) {
        showAlert('Geolocation not supported', 'danger');
        return;
      }

      watchId = navigator.geolocation.watchPosition(
        onLocationUpdate,
        (err) => showAlert('GPS Error: ' + err.message, 'warning'), {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 10000
        }
      );

      showAlert('Tracking started', 'success');
    }

    function onLocationUpdate(pos) {
      const {
        latitude: lat,
        longitude: lng
      } = pos.coords;
      const now = Date.now();

      const locName = resolveLocationName(lat, lng) || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

      // CACHE THE LOCATION for manual updates
      lastKnownLocation = {
        lat,
        lng,
        locName
      };

      // Update UI
      el('currentLocation').textContent = locName;
      el('lastUpdate').textContent = new Date().toLocaleTimeString();
      updateMiniMarker(lat, lng);

      // Update myLocation display for conductor
      const myLocEl = el('myLocation');
      if (myLocEl) myLocEl.textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

      // Throttle automatic GPS updates
      if (now - lastNetworkSync > SYNC_INTERVAL) {
        sendDataToServer(lat, lng, locName);
        lastNetworkSync = now;
      }
    }

    async function sendDataToServer(lat, lng, locName) {
      if (netStatus) {
        netStatus.textContent = 'Saving...';
        netStatus.className = 'badge bg-warning text-dark border fw-normal';
      }
      const seatsAvailable = getSeatsValue();
      const status = el('statusSelect').value;
      const geojsonFeature = {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [lng, lat]
        },
        properties: {
          bus_id: parseInt(currentBus.id, 10),
          code: currentBus.code,
          route: currentBus.route,
          seats_available: seatsAvailable,
          status: status,
          timestamp: new Date().toISOString(),
          current_location_name: locName
        }
      };

      try {
        await fetch('../update_geo_location.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            bus_id: currentBus.id,
            geojson: geojsonFeature,
            route: currentBus.route,
            seats_available: seatsAvailable,
            status,
            current_location_name: locName
          })
        });
        if (netStatus) {
          netStatus.textContent = 'Live';
          netStatus.className = 'badge bg-success text-white border fw-normal';
        }
      } catch (e) {
        if (netStatus) {
          netStatus.textContent = 'Offline';
          netStatus.className = 'badge bg-secondary text-white border fw-normal';
        }
      }
    }

    // UPDATED: Use cached location to send immediately
    function triggerManualUpdate() {
      if (lastKnownLocation && currentBus) {
        // Send immediately using the last known GPS coordinates
        sendDataToServer(lastKnownLocation.lat, lastKnownLocation.lng, lastKnownLocation.locName);
        // Reset the throttle timer so we don't double-send if GPS ticks right after
        lastNetworkSync = Date.now();
      } else {
        // If no GPS lock yet, just force the next check to pass
        lastNetworkSync = 0;
      }
    }

    function stopTracking() {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      if (wakeLock !== null) wakeLock.release();
      watchId = null;
      wakeLock = null;
      lastKnownLocation = null; // Clear cache

      if (currentBus && currentBus.id) {
        fetch('../api.php?action=stop_tracking', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            bus_id: currentBus.id
          })
        });
      }
      currentBus = null;
      el('setupSection').style.display = '';
      el('trackingSection').style.display = 'none';
      if (miniMarker && miniMap) {
        miniMap.removeLayer(miniMarker);
        miniMarker = null;
        miniMapHasCentered = false;
      }
      showAlert('Tracking stopped', 'info');
    }

    document.addEventListener('DOMContentLoaded', () => {
      el('startBtn').addEventListener('click', startTracking);
      el('stopBtn').addEventListener('click', stopTracking);
      el('seatPlus').addEventListener('click', () => setSeatsValue(getSeatsValue() + 1));
      el('seatMinus').addEventListener('click', () => setSeatsValue(getSeatsValue() - 1));
      el('statusSelect').addEventListener('change', triggerManualUpdate);
      loadRouteFeatures();
      loadBuses();
      document.addEventListener('visibilitychange', async () => {
        if (wakeLock !== null && document.visibilityState === 'visible') {
          try {
            wakeLock = await navigator.wakeLock.request('screen');
          } catch (e) {}
        }
      });
    });
  </script>
</body>

</html>