<?php
session_start();

// Enforce Access Control
if (!isset($_SESSION['user_id']) || !in_array($_SESSION['user_role'] ?? '', ['conductor', 'driver'])) {
    header("Location: ../index.php");
    exit;
}

require_once __DIR__ . '/../../config/db.php';
$pdo = db();
$userId = (int)($_SESSION['user_id'] ?? 0);

// 1) If POST with bus info (coming from conductor.php), try to claim/attach the bus as before
if ($_SERVER['REQUEST_METHOD'] === 'POST' && !empty($_POST['bus_id'])) {
    $busId = (int)$_POST['bus_id'];
    $code = htmlspecialchars($_POST['code'] ?? ("BUS-" . $busId), ENT_QUOTES, 'UTF-8');
    $route = htmlspecialchars($_POST['route'] ?? '', ENT_QUOTES, 'UTF-8');
    $seats_total = (int)($_POST['seats_total'] ?? 25);

    // Try to "claim" this bus for this conductor
    $stmt = $pdo->prepare("
        UPDATE busses
        SET current_conductor_id = :uid
        WHERE Bus_ID = :bus_id
          AND (current_conductor_id IS NULL OR current_conductor_id = :uid)
    ");
    $stmt->execute([
        ':uid'    => $userId,
        ':bus_id' => $busId,
    ]);

    if ($stmt->rowCount() === 0) {
        // Someone else already has this bus
        unset($_SESSION['current_bus']);
        header('Location: conductor.php?error=bus_taken');
        exit;
    }

    // Also store on the conductor
    $stmt2 = $pdo->prepare("UPDATE conductors SET current_bus_id = :bus_id WHERE id = :uid");
    $stmt2->execute([
        ':bus_id' => $busId,
        ':uid'    => $userId,
    ]);

    // store into session to allow reloads
    $_SESSION['current_bus'] = [
        'id'          => $busId,
        'code'        => $code,
        'route'       => $route,
        'seats_total' => $seats_total
    ];
}

// 2) If there is NO POST and session has no current bus, try to RESTORE from DB
if (empty($_SESSION['current_bus'])) {
    // Look up current_bus_id on the conductor record
    $stmt = $pdo->prepare("SELECT current_bus_id FROM conductors WHERE id = ? LIMIT 1");
    $stmt->execute([$userId]);
    $conductorRow = $stmt->fetch(PDO::FETCH_ASSOC);

    $currentBusId = isset($conductorRow['current_bus_id']) ? (int)$conductorRow['current_bus_id'] : 0;

    if ($currentBusId > 0) {
        // Double-check the bus is still assigned to this conductor
        $stmtBus = $pdo->prepare("
            SELECT Bus_ID, code, route, total_seats
            FROM busses
            WHERE Bus_ID = ? AND current_conductor_id = ?
            LIMIT 1
        ");
        $stmtBus->execute([$currentBusId, $userId]);
        $busRow = $stmtBus->fetch(PDO::FETCH_ASSOC);

        if ($busRow) {
            // Rebuild session state
            $_SESSION['current_bus'] = [
                'id'          => (int)$busRow['Bus_ID'],
                'code'        => $busRow['code'] ?? ("BUS-" . $busRow['Bus_ID']),
                'route'       => $busRow['route'] ?? '',
                'seats_total' => (int)($busRow['total_seats'] ?? 25),
            ];
        }
    }
}

// 3) If after all that we STILL don't have a current bus, send them back to conductor.php
if (empty($_SESSION['current_bus'])) {
    header("Location: conductor.php");
    exit;
}

$currentBus  = $_SESSION['current_bus'];
$busId       = (int)$currentBus['id'];
$busCode     = $currentBus['code'];
$busRoute    = $currentBus['route'];
$seatsTotal  = (int)$currentBus['seats_total'];
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <title>ByaHero - Conductor Live</title>

    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet">

    <style>
        :root {
            --bg-light: #f5f7fa;
        }

        body {
            background-color: var(--bg-light);
            font-family: 'Segoe UI', sans-serif;
            padding-bottom: 80px;
            overflow-x: hidden;
            margin:0;
        }

        .main-content-wrapper {
            margin: 12px;
            padding-bottom: 72px;
        }

        .map-card-wrapper { position: relative; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.06); background: white; height: 320px; margin-bottom: 12px; border: 4px solid white; }
        #mainMap { width:100%; height:100%; z-index:1; }

        .status-pill { display:inline-block; padding:6px 14px; border-radius:30px; background:#d8f5da; color:#1a8d3d; font-weight:700; }
        .seats-control { display:flex; justify-content:center; gap:14px; margin-top:12px; }
        .btn-round { width:56px;height:56px;border-radius:12px; background:white; border:none; box-shadow:0 6px 16px rgba(0,0,0,0.08); font-size:22px; font-weight:800; }
        .seats-num { width:70px; height:56px; display:flex; align-items:center; justify-content:center; background:white; border-radius:12px; box-shadow:0 6px 16px rgba(0,0,0,0.08); font-size:20px; font-weight:800; }

        .info-box { padding:12px; background:#f8fafc; border-radius:12px; margin-top:12px; }
        .info-item { display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #eef2f6; }
        .info-item:last-child { border-bottom:0; }
        .location-link { color:#0d6efd; font-weight:700; text-decoration:none; }
        .location-link:hover { text-decoration:underline; }

        .footer-bar { position: fixed; bottom: 0; left: 0; width: 100%; height: 40px; background-color: #0f3878; z-index: 1000; }

        .alert-area { position: absolute; bottom: 20px; left: 20px; right: 20px; z-index: 900; pointer-events: none; }
        .alert-area .alert { pointer-events: auto; }

        /* Hide the status select visually but keep it in DOM so JS can use it if needed */
        #statusSelect {
            display: none;
        }
    </style>
</head>
<body>

    <?php include __DIR__ . '/../../components/navbarConductor.php'; ?>

    <div class="main-content-wrapper">
        <div class="d-flex justify-content-between align-items-center mb-2">
            <div>
                <div class="h5 mb-0"><?= htmlspecialchars($busCode) ?></div>
                <small class="text-muted"><?= htmlspecialchars($busRoute) ?></small>
            </div>
            <div class="status-pill" id="netStatus">Ready</div>
        </div>

        <div class="map-card-wrapper">
            <div class="alert-area" id="alertBox"></div>
            <div id="mainMap"></div>
        </div>

        <div class="seats-control">
            <button id="seatMinus" class="btn-round">-</button>
            <div id="seatsCount" class="seats-num"><?= intval($seatsTotal) ?></div>
            <button id="seatPlus" class="btn-round">+</button>
        </div>

        <!-- statusSelect is kept but hidden; JS will update it automatically -->
        <select id="statusSelect">
            <option value="available">available</option>
            <option value="on_stop">on_stop</option>
            <option value="full">full</option>
        </select>

        <!-- Info box with Location + Last Update (+ commented Arrival & My Location as requested) -->
        <div class="info-box">
            <div class="info-item">
                <div>Location</div>
                <div><a id="currentLocation" class="location-link" href="#" target="_blank" rel="noopener noreferrer">Waiting for GPS...</a></div>
            </div>
            <div class="info-item">
                <div>Last Update</div>
                <div id="lastUpdate">-</div>
            </div>
            <!--
            <div class="info-item">
                <div>Arrival</div>
                <div id="arrivalTime">-</div>
            </div>
            <div class="info-item">
                <div>My Location</div>
                <div id="myLocation">-</div>
            </div>
            -->
        </div>

        <div class="mt-3">
            <button id="stopBtn" class="btn btn-danger w-100 py-3 rounded-pill fw-bold shadow-sm">STOP TRACKING</button>
        </div>
    </div>

    <div class="footer-bar"></div>

    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>

    <script>
    // --- Variables & helpers ---
    const busId = <?= json_encode($busId) ?>;
    const busCode = <?= json_encode($busCode) ?>;
    const busRoute = <?= json_encode($busRoute) ?>;
    let seats = parseInt(document.getElementById('seatsCount').textContent) || <?= intval($seatsTotal) ?>;
    let map = null, marker = null, watchId = null, lastNetworkSync = 0, lastKnownLocation = null;
    let routeFeatures = [];
    const SYNC_INTERVAL = 1000;
    const el = id => document.getElementById(id);
    const alertBox = el('alertBox');
    const netStatus = el('netStatus');

    // --- Auto-status tracking vars ---
    let lastMoveCheck = {
        time: 0,
        lat: null,
        lng: null
    };
    let lastComputedStatus = 'available';

    const MOVE_THRESHOLD_METERS = 3;    // how far bus must move to count as moving
    const STOP_TIME_MS = 5000;          // how long of no movement => on_stop

    function showAlert(message, type = 'info') {
        const bsType = (type === 'danger') ? 'danger' : 'primary';
        alertBox.innerHTML = `<div class="alert alert-${bsType} border-0 text-center fw-bold shadow-sm" style="border-radius: 12px;">${message}</div>`;
        setTimeout(() => { if (alertBox) alertBox.innerHTML = ''; }, 2500);
    }

    function initMap() {
        if (map) return;
        map = L.map('mainMap', { zoomControl: false, attributionControl: false }).setView([14.0905, 121.0550], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    }

    function updateMarker(lat, lng) {
        const latlng = [lat, lng];
        if (!marker) { marker = L.marker(latlng).addTo(map); } else { marker.setLatLng(latlng); }
        try { map.panTo(latlng); } catch(e){}
    }

    // Load route features (polygons) used to resolve named locations
    async function loadRouteFeatures() {
        try {
            const res = await fetch('../map_data.php', { cache: 'no-store' });
            const json = await res.json();
            if (json && Array.isArray(json.features)) {
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

    function resolveLocationName(lat, lng) {
      if (!routeFeatures || routeFeatures.length === 0) return null;
      for (const f of routeFeatures) {
        if (!f.geometry) continue;
        if (f.geometry.type === 'Polygon' && Array.isArray(f.geometry.coordinates) && f.geometry.coordinates[0]) {
          if (pointInRing(lng, lat, f.geometry.coordinates[0])) {
            return (f.properties && (f.properties['Current Location'] || f.properties.name)) || null;
          }
        }
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

    function distanceMeters(lat1, lon1, lat2, lon2) {
      const R = 6371000;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    // Decide status based on seats + movement
    function autoComputeStatus(currentLat, currentLng) {
        const now = Date.now();

        // 1) No seats left -> full
        if (seats <= 0) {
            lastComputedStatus = 'full';
            return lastComputedStatus;
        }

        // 2) First fix: initialize reference; assume available
        if (lastMoveCheck.lat === null || lastMoveCheck.lng === null) {
            lastMoveCheck = {
                time: now,
                lat: currentLat,
                lng: currentLng
            };
            lastComputedStatus = 'available';
            return lastComputedStatus;
        }

        const dist = distanceMeters(lastMoveCheck.lat, lastMoveCheck.lng, currentLat, currentLng);

        if (dist > MOVE_THRESHOLD_METERS) {
            // moved => reset timer and treat as available
            lastMoveCheck = {
                time: now,
                lat: currentLat,
                lng: currentLng
            };
            lastComputedStatus = 'available';
            return lastComputedStatus;
        }

        // Not enough movement: check how long it's been still
        if (now - lastMoveCheck.time >= STOP_TIME_MS) {
            lastComputedStatus = 'on_stop';
            return lastComputedStatus;
        }

        // Default between updates
        lastComputedStatus = 'available';
        return lastComputedStatus;
    }

    async function sendDataToServer(lat, lng, locName) {
        if(netStatus) { netStatus.textContent = 'Saving...'; netStatus.className = 'badge bg-warning text-dark'; }

        const statusSelect = el('statusSelect');
        const status = lastComputedStatus || (statusSelect?.value || 'available');

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

    function onLocationUpdate(pos) {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const resolved = resolveLocationName(lat, lng);
        const locName = resolved || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

        lastKnownLocation = { lat, lng, locName };

        updateMarker(lat, lng);

        const currentLocationEl = el('currentLocation');
        if (currentLocationEl) {
            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lat + ',' + lng)}`;
            currentLocationEl.textContent = locName;
            currentLocationEl.href = mapsUrl;
            currentLocationEl.title = `Open in Google Maps`;
        }
        const lastUpdateEl = el('lastUpdate');
        if (lastUpdateEl) {
            lastUpdateEl.textContent = new Date().toLocaleTimeString();
        }
        const myLocationEl = el('myLocation');
        if (myLocationEl) {
            myLocationEl.textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        }

        // NEW: compute auto status
        const autoStatus = autoComputeStatus(lat, lng);

        // Keep hidden select in sync (for debugging / consistency)
        const statusSelect = el('statusSelect');
        if (statusSelect) {
            statusSelect.value = autoStatus;
        }

        const now = Date.now();
        if (now - lastNetworkSync > SYNC_INTERVAL) {
            sendDataToServer(lat, lng, locName);
            lastNetworkSync = now;
        }
    }

    function startGeolocation() {
        if (!navigator.geolocation) return showAlert('No GPS support', 'danger');

        setTimeout(() => { try { map.invalidateSize(); } catch(e){} }, 250);

        watchId = navigator.geolocation.watchPosition(
            onLocationUpdate,
            (err) => showAlert('GPS Error: ' + err.message, 'danger'),
            { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
        );
        showAlert('Tracking Started', 'primary');
    }

    async function stopTracking() {
        if (watchId !== null) {
            try { navigator.geolocation.clearWatch(watchId); } catch(e){}
            watchId = null;
        }

        try {
            await fetch('../api.php?action=stop_tracking', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bus_id: busId })
            }).catch(()=>{});
        } catch (e) {}

        window.location.href = 'conductor.php?stopped=1';
    }

    function triggerManualUpdate() {
        if (!lastKnownLocation) {
            showAlert('Waiting for GPS fix...', 'info');
            return;
        }

        // Recalculate status using last known location
        const autoStatus = autoComputeStatus(lastKnownLocation.lat, lastKnownLocation.lng);
        const statusSelect = el('statusSelect');
        if (statusSelect) {
            statusSelect.value = autoStatus;
        }

        sendDataToServer(lastKnownLocation.lat, lastKnownLocation.lng, lastKnownLocation.locName);
        lastNetworkSync = Date.now();
    }

    document.addEventListener('DOMContentLoaded', () => {
        initMap();
        loadRouteFeatures().catch(()=>{});
        startGeolocation();

        el('seatPlus').addEventListener('click', () => {
            seats = seats + 1;
            el('seatsCount').textContent = seats;
            triggerManualUpdate();
        });
        el('seatMinus').addEventListener('click', () => {
            seats = Math.max(0, seats - 1);
            el('seatsCount').textContent = seats;
            triggerManualUpdate();
        });

        // No manual status change listener; status is auto
        // el('statusSelect').addEventListener('change', triggerManualUpdate);

        el('stopBtn').addEventListener('click', () => {
            stopTracking();
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

        // optional: re-request wakeLock on visibilitychange
        let wakeLock = null;
        document.addEventListener('visibilitychange', async () => {
            if (wakeLock !== null && document.visibilityState === 'visible') {
                try { wakeLock = await navigator.wakeLock.request('screen'); } catch(e){}
            }
        });
    });
    </script>
</body>
</html>