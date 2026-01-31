<?php
session_start();

// Enforce Access Control
if (!isset($_SESSION['user_id']) || !in_array($_SESSION['user_role'] ?? '', ['conductor', 'driver'])) {
    header("Location: ../index.php");
    exit;
}

$userName = $_SESSION['user_name'] ?? 'User';
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <title>ByaHero - Conductor</title>

    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet">

    <style>
        :root {
            --primary-blue: #0f3878;
            --btn-blue: #1c5ab5;
            --bg-light: #f5f7fa;
        }

        body {
            background-color: var(--bg-light);
            font-family: 'Segoe UI', sans-serif;
            padding-bottom: 80px;
            overflow-x: hidden;
        }

        /* 1. TOP HEADER */
        .top-dashboard-header {
            background-color: var(--primary-blue);
            color: white;
            padding: 30px 25px 40px 25px; 
            border-bottom-left-radius: 30px;
            border-bottom-right-radius: 30px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            position: relative;
            z-index: 0;
            box-shadow: 0 4px 10px rgba(0,0,0,0.1);
        }

        /* Right side container for Avatar + Logout */
        .header-actions {
            display: flex;
            align-items: center;
            gap: 15px; /* Space between avatar and logout */
        }

        .user-avatar {
            width: 48px; height: 48px;
            background: white;
            border-radius: 50%;
            color: var(--primary-blue);
            display: flex; align-items: center; justify-content: center;
            font-size: 30px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.1);
        }

        .logout-btn {
            color: rgba(255, 255, 255, 0.8);
            text-decoration: none;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: color 0.2s;
        }
        .logout-btn:hover {
            color: white;
        }

        /* 2. MAIN WRAPPER */
        .main-content-wrapper {
            margin-top: 20px; 
            padding: 0 20px;
            position: relative;
            z-index: 10;
        }

        /* 3. FILTER SECTION */
        .filter-section {
            display: flex;
            justify-content: center;
            margin-bottom: 20px; 
        }
        
        .filter-pill {
            background: white;
            padding: 10px 28px;
            border-radius: 50px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            font-weight: 700; 
            font-size: 0.75rem;
            color: #333;
            display: flex; align-items: center; gap: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            cursor: pointer;
            border: 1px solid rgba(0,0,0,0.05);
        }

        /* 4. MAP CARD */
        .map-card-wrapper {
            position: relative;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 8px 20px rgba(0,0,0,0.08);
            background: white;
            height: 350px; 
            margin-bottom: 20px;
            border: 4px solid white; 
        }

        #mainMap {
            width: 100%;
            height: 100%;
            z-index: 1;
        }

        /* 5. CONTROLS */
        .selection-card {
            background: white;
            border-radius: 16px;
            height: 64px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.05);
            position: relative;
            display: flex; align-items: center;
            padding: 0 24px;
            margin-bottom: 15px;
        }

        .selection-display {
            font-weight: 700; font-size: 1rem; color: #222;
            width: 100%; display: flex; justify-content: space-between; align-items: center;
        }

        .custom-select {
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            opacity: 0; cursor: pointer; z-index: 2;
        }

        .start-btn-wrapper {
            display: flex; justify-content: center; margin-top: 25px;
        }

        .btn-circle-start {
            width: 110px; height: 110px;
            border-radius: 50%;
            background-color: var(--btn-blue);
            color: white; border: none;
            box-shadow: 0 10px 30px rgba(28, 90, 181, 0.3);
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            font-weight: 800; font-size: 0.9rem; line-height: 1.2;
            transition: transform 0.1s;
        }
        .btn-circle-start:active { transform: scale(0.95); }

        .footer-bar {
            position: fixed; bottom: 0; left: 0; width: 100%;
            height: 40px; background-color: var(--primary-blue); z-index: 1000;
        }

        .visually-hidden { position: absolute !important; height: 1px; width: 1px; overflow: hidden; clip: rect(1px 1px 1px 1px); }
        .alert-area { position: absolute; bottom: 20px; left: 20px; right: 20px; z-index: 900; pointer-events: none; }
        .alert-area .alert { pointer-events: auto; }

        /* small info box for tracking */
        .info-box { padding: 12px; background: #f8fafc; border-radius: 12px; }
        .info-item { display:flex; justify-content:space-between; padding:6px 0; border-bottom: 1px solid #eef2f6; }
        .info-item:last-child { border-bottom:0; }
        .location-link { color:#0d6efd; font-weight:700; text-decoration:none; }
        .location-link:hover { text-decoration:underline; }
    </style>
</head>
<body>

    <header class="top-dashboard-header">
        <div>
            <h2 class="m-0 fw-bold" style="font-size: 1.5rem;">Hello, <?= htmlspecialchars($userName) ?>!</h2>
            <p class="m-0 small opacity-75" style="margin-top: 4px;">You are assigned in bus 00002 today</p>
        </div>
        
        <div class="header-actions">
            <div class="user-avatar">
                <span class="material-icons-round">person</span>
            </div>
            <a href="../logout.php" class="logout-btn" title="Logout">
                <span class="material-icons-round" style="font-size: 28px;">logout</span>
            </a>
        </div>
    </header>

    <div class="main-content-wrapper">
        
        <div class="filter-section">
            <div class="filter-pill">
                FILTER ROUTES <span class="material-icons-round" style="font-size: 18px;">tune</span>
            </div>
        </div>
        
        <div class="map-card-wrapper">
            <div class="alert-area" id="alertBox"></div>
            <div id="mainMap"></div>
        </div>

        <section id="setupSection">
            <div class="selection-card">
                <span id="busDisplay" class="selection-display">
                    Select Bus <span class="small fw-bold">v</span>
                </span>
                <select id="busSelect" class="custom-select" onchange="updateDisplay(this, 'busDisplay', 'Select Bus')">
                    <option value="">-- Choose --</option>
                </select>
            </div>

            <div class="selection-card">
                <span id="routeDisplay" class="selection-display">
                    Select Route <span class="small fw-bold">v</span>
                </span>
                <select id="routeSelect" class="custom-select" onchange="updateDisplay(this, 'routeDisplay', 'Select Route')">
                    <option value="">-- Choose --</option>
                    <option value="LAUREL - TANAUAN">LAUREL - TANAUAN</option>
                    <option value="TANAUAN - LAUREL">TANAUAN - LAUREL</option>
                </select>
            </div>

            <div class="start-btn-wrapper">
                <button id="startBtn" class="btn-circle-start">
                    START<br>TRACKING
                </button>
            </div>
        </section>

        <section id="trackingSection" style="display:none">
            <div class="card border-0 shadow-sm rounded-4 p-3 bg-white">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <div>
                        <h4 class="fw-bold m-0 text-primary" id="activeBusCode">-</h4>
                        <small class="text-muted" id="activeRoute">-</small>
                    </div>
                    <div class="badge bg-success" id="netStatus">Ready</div>
                </div>

                <div class="d-flex align-items-center justify-content-between bg-light p-3 rounded-3 mb-3">
                    <span class="fw-bold text-secondary">Seats Available</span>
                    <div class="d-flex gap-3 align-items-center">
                        <button id="seatMinus" class="btn btn-sm btn-white shadow-sm fw-bold" style="width:35px;height:35px;border-radius:8px;">-</button>
                        <span id="seatsCount" class="fs-4 fw-bold text-dark">25</span>
                        <button id="seatPlus" class="btn btn-sm btn-white shadow-sm fw-bold" style="width:35px;height:35px;border-radius:8px;">+</button>
                    </div>
                </div>
                <input id="seatsInput" type="number" class="visually-hidden" value="25" />

                <div class="mb-3">
                    <select id="statusSelect" class="form-select border-light bg-light fw-bold py-3" style="border-radius: 12px;">
                        <option value="available">🟢 Available</option>
                        <option value="on_stop">🟠 On Stop</option>
                        <option value="full">🔴 Full</option>
                        <option value="unavailable">⚫ Unavailable</option>
                    </select>
                </div>

                <!-- Added info box: Location, Last Update, Arrival, My Location -->
                <div class="info-box mb-3">
                    <div class="info-item">
                        <div>Location</div>
                        <div><a id="currentLocation" class="location-link" href="#" target="_blank" rel="noopener noreferrer">Waiting for GPS...</a></div>
                    </div>
                    <div class="info-item">
                        <div>Last Update</div>
                        <div id="lastUpdate">-</div>
                    </div>
                    <!-- <div class="info-item">
                        <div>Arrival</div>
                        <div id="arrivalTime">-</div>
                    </div>
                    <div class="info-item">
                        <div>My Location</div>
                        <div id="myLocation">-</div>
                    </div> -->
                </div>

                <button class="btn btn-danger w-100 py-3 rounded-pill fw-bold shadow-sm" id="stopBtn">
                    STOP TRACKING
                </button>
            </div>
        </section>

    </div>

    <div class="footer-bar"></div>

    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>

    <script>
    // --- UI HELPER ---
    function updateDisplay(select, displayId, defaultText) {
        const text = select.options[select.selectedIndex].text;
        const val = select.value;
        const displayEl = document.getElementById(displayId);
        if(val) {
            displayEl.innerHTML = `<span>${text}</span> <span class="small fw-bold">v</span>`;
            displayEl.style.color = '#000';
        } else {
            displayEl.innerHTML = `<span>${defaultText}</span> <span class="small fw-bold">v</span>`;
            displayEl.style.color = '#222';
        }
    }

    // --- CORE LOGIC ---
    let map = null, marker = null, watchId = null, wakeLock = null, currentBus = null, routeFeatures = [];
    let lastNetworkSync = 0, lastKnownLocation = null;
    const SYNC_INTERVAL = 1000;

    const el = (id) => document.getElementById(id);
    const alertBox = el('alertBox');
    const netStatus = el('netStatus');

    function showAlert(message, type = 'info') {
        const bsType = (type === 'danger') ? 'danger' : 'primary';
        alertBox.innerHTML = `<div class="alert alert-${bsType} border-0 text-center fw-bold shadow-sm" style="border-radius: 12px;">${message}</div>`;
        setTimeout(() => { if (alertBox) alertBox.innerHTML = ''; }, 3000);
    }

    function initMap() {
        if(map) return;
        map = L.map('mainMap', { zoomControl: false, attributionControl: false }).setView([14.0905, 121.0550], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    }

    function updateMarker(lat, lng) {
        const latlng = [lat, lng];
        if (!marker) { marker = L.marker(latlng).addTo(map); } 
        else { marker.setLatLng(latlng); }
        try { map.panTo(latlng); } catch(e){}
    }

    // Load route features (polygons) used to resolve named locations
    async function loadRouteFeatures() {
        try {
            const res = await fetch('../map_data.php', { cache: 'no-store' });
            const json = await res.json();
            if (json && Array.isArray(json.features)) {
                // Keep only Polygon / MultiPolygon features that have coordinates
                routeFeatures = json.features.filter(f => f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon'));
            }
        } catch (e) { console.warn('Failed to load route features', e); }
    }

    // point-in-polygon helper (ray-casting)
    function pointInRing(x, y, ring) {
      let inside = false;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i][0], yi = ring[i][1];
        const xj = ring[j][0], yj = ring[j][1];
        const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / ((yj - yi) || 1) + xi);
        if (intersect) inside = !inside;
      }
      return inside;
    }

    // Resolve a named location from loaded polygons (returns null if none)
    function resolveLocationName(lat, lng) {
      if (!routeFeatures || routeFeatures.length === 0) return null;
      for (const f of routeFeatures) {
        if (!f.geometry) continue;
        // Handle Polygon
        if (f.geometry.type === 'Polygon' && Array.isArray(f.geometry.coordinates) && f.geometry.coordinates[0]) {
          // coordinates for ring are in [lng, lat] order
          if (pointInRing(lng, lat, f.geometry.coordinates[0])) {
            return (f.properties && (f.properties['Current Location'] || f.properties.name)) || null;
          }
        }
        // Handle MultiPolygon
        if (f.geometry.type === 'MultiPolygon' && Array.isArray(f.geometry.coordinates)) {
          for (const poly of f.geometry.coordinates) {
            if (poly && poly[0] && pointInRing(lng, lat, poly[0])) {
              return (f.properties && (f.properties['Current Location'] || f.properties.name)) || null;
            }
          }
        }
      }
      return null;
    }

    async function loadBuses() {
        try {
            const r = await fetch('../api.php?action=get_buses', { cache: 'no-store' });
            const json = await r.json();
            if (json && Array.isArray(json.buses)) {
                const sel = el('busSelect');
                sel.innerHTML = '<option value="">-- Choose --</option>'; 
                json.buses.forEach(b => {
                    const id = b.id || b.Bus_ID || b.bus_id;
                    const o = document.createElement('option');
                    o.value = id;
                    o.textContent = `${b.code || 'BUS-' + id} (${b.seats_total || 25} seats)`;
                    o.dataset.code = b.code || `BUS-${id}`;
                    o.dataset.seats = b.seats_total || 25;
                    sel.appendChild(o);
                });
            }
        } catch (e) { console.error(e); }
    }

    async function startTracking() {
        const busId = el('busSelect').value;
        const route = el('routeSelect').value;
        
        if (!busId) return showAlert('Please select a bus', 'danger');
        if (!route) return showAlert('Please select a route', 'danger');

        const sel = el('busSelect');
        const selectedOption = sel.options[sel.selectedIndex];
        
        currentBus = {
            id: busId,
            code: selectedOption.dataset.code,
            route: route,
            totalSeats: selectedOption.dataset.seats || 25
        };

        el('activeBusCode').textContent = currentBus.code;
        el('activeRoute').textContent = currentBus.route;
        el('seatsCount').textContent = currentBus.totalSeats;
        el('seatsInput').value = currentBus.totalSeats;

        el('setupSection').style.display = 'none';
        el('trackingSection').style.display = 'block';

        if ('wakeLock' in navigator) { try { wakeLock = await navigator.wakeLock.request('screen'); } catch(e){} }
        if (!navigator.geolocation) return showAlert('No GPS support', 'danger');

        // ensure map resizes correctly after showing
        setTimeout(() => { try { map.invalidateSize(); } catch(e){} }, 300);

        watchId = navigator.geolocation.watchPosition(
            onLocationUpdate,
            (err) => showAlert('GPS Error: ' + err.message, 'danger'),
            { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
        );
        showAlert('Tracking Started!', 'primary');
    }

    function onLocationUpdate(pos) {
        const { latitude: lat, longitude: lng } = pos.coords;
        const resolved = resolveLocationName(lat, lng);
        const locName = resolved || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

        lastKnownLocation = { lat, lng, locName };

        // update map marker
        updateMarker(lat, lng);

        // update UI fields
        const currentLocationEl = el('currentLocation');
        if (currentLocationEl) {
            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lat + ',' + lng)}`;
            currentLocationEl.textContent = locName;
            currentLocationEl.href = mapsUrl;
            currentLocationEl.title = `Open in Google Maps`;
        }
        el('lastUpdate').textContent = new Date().toLocaleTimeString();
        el('myLocation').textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

        // arrivalTime left to app logic — keep placeholder or compute if you have an algorithm
        // el('arrivalTime').textContent = computeEstimatedArrival(...);

        const now = Date.now();
        if (now - lastNetworkSync > SYNC_INTERVAL) {
            sendDataToServer(lat, lng, locName);
            lastNetworkSync = now;
        }
    }

    async function sendDataToServer(lat, lng, locName) {
        if(netStatus) { netStatus.textContent = 'Saving...'; netStatus.className = 'badge bg-warning text-dark'; }

        const seats = parseInt(el('seatsCount').textContent) || 0;
        const status = el('statusSelect').value || 'available';

        const payload = {
            bus_id: currentBus.id,
            geojson: {
                type: "Feature",
                geometry: { type: "Point", coordinates: [lng, lat] },
                properties: {
                    bus_id: currentBus.id,
                    code: currentBus.code,
                    route: currentBus.route,
                    seats_available: seats,
                    status: status,
                    timestamp: new Date().toISOString(),
                    current_location_name: locName
                }
            },
            route: currentBus.route,
            seats_available: seats,
            status: status,
            current_location_name: locName
        };

        try {
            await fetch('../update_geo_location.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if(netStatus) { netStatus.textContent = 'Live'; netStatus.className = 'badge bg-success'; }
        } catch (e) {
            if(netStatus) { netStatus.textContent = 'Offline'; netStatus.className = 'badge bg-danger'; }
        }
    }

    function triggerManualUpdate() {
        if(lastKnownLocation && currentBus) {
            sendDataToServer(lastKnownLocation.lat, lastKnownLocation.lng, lastKnownLocation.locName);
            // reset throttle so it can send again soon after
            lastNetworkSync = Date.now();
        } else {
            // no GPS lock yet — clear throttle so next tick will send
            lastNetworkSync = 0;
            showAlert('Waiting for GPS fix...', 'info');
        }
    }

    function stopTracking() {
        if (watchId !== null) {
            try { navigator.geolocation.clearWatch(watchId); } catch (e) {}
        }
        if (wakeLock !== null && typeof wakeLock.release === 'function') {
            try { wakeLock.release(); } catch (e) {}
        }
        watchId = null;
        wakeLock = null;
        lastKnownLocation = null;

        if(currentBus) {
            try {
                fetch('../api.php?action=stop_tracking', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ bus_id: currentBus.id })
                }).catch(()=>{});
            } catch(e){}
        }

        // reset UI
        el('setupSection').style.display = 'block';
        el('trackingSection').style.display = 'none';
        el('activeBusCode').textContent = '-';
        el('activeRoute').textContent = '-';
        if (marker && map) {
            try { map.removeLayer(marker); } catch(e){}
            marker = null;
        }
        // reset info box
        const currentLocationEl = el('currentLocation');
        if (currentLocationEl) {
            currentLocationEl.textContent = 'Waiting for GPS...';
            currentLocationEl.href = '#';
            currentLocationEl.removeAttribute('title');
        }
        el('lastUpdate').textContent = '-';
        el('arrivalTime').textContent = '-';
        el('myLocation').textContent = '-';
        el('seatsCount').textContent = '25';
        el('seatsInput').value = '25';
        if (netStatus) { netStatus.textContent = 'Ready'; netStatus.className = 'badge bg-success'; }

        currentBus = null;
        showAlert('Tracking Stopped', 'primary');
    }

    document.addEventListener('DOMContentLoaded', () => {
        initMap();
        loadBuses();
        loadRouteFeatures();

        el('startBtn').addEventListener('click', startTracking);
        el('stopBtn').addEventListener('click', stopTracking);
        el('statusSelect').addEventListener('change', triggerManualUpdate);
        el('seatPlus').addEventListener('click', () => {
            el('seatsCount').textContent = parseInt(el('seatsCount').textContent) + 1;
            triggerManualUpdate();
        });
        el('seatMinus').addEventListener('click', () => {
            el('seatsCount').textContent = Math.max(0, parseInt(el('seatsCount').textContent) - 1);
            triggerManualUpdate();
        });

        // Make location link open maps only when it has a real href
        const currentLocationEl = el('currentLocation');
        if (currentLocationEl) {
            currentLocationEl.addEventListener('click', (ev) => {
                const href = currentLocationEl.getAttribute('href');
                if (!href || href === '#') {
                    ev.preventDefault();
                    if (lastKnownLocation) {
                        showAlert(`Location: ${lastKnownLocation.locName}`, 'info');
                    } else {
                        showAlert('Waiting for GPS fix...', 'info');
                    }
                }
            });
        }

        // Re-request wakeLock when visible again
        document.addEventListener('visibilitychange', async () => {
            if (wakeLock !== null && document.visibilityState === 'visible') {
                try { wakeLock = await navigator.wakeLock.request('screen'); } catch (e) {}
            }
        });
    });
    </script>
</body>
</html>