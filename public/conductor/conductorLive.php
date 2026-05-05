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
    $initial_available_seats = isset($_POST['initial_available_seats']) ? (int)$_POST['initial_available_seats'] : $seats_total;
    $pre_departure_count = isset($_POST['pre_departure_count']) ? (int)$_POST['pre_departure_count'] : 0;

    // Check who owns the bus to prevent rowCount() === 0 false positives when no row is modified
    $checkStmt = $pdo->prepare("SELECT current_conductor_id FROM busses WHERE Bus_ID = :bus_id");
    $checkStmt->execute([':bus_id' => $busId]);
    $busOwner = $checkStmt->fetchColumn();

    if ($busOwner !== false && $busOwner !== null && $busOwner != $userId) {
        // Someone else already has this bus
        unset($_SESSION['current_bus']);
        header('Location: conductor.php?error=bus_taken');
        exit;
    } else {
        // Claim the bus / update it
        $stmt = $pdo->prepare("UPDATE busses SET current_conductor_id = :uid WHERE Bus_ID = :bus_id");
        $stmt->execute([':uid' => $userId, ':bus_id' => $busId]);
    }

    // Also store on the conductor
    $stmt2 = $pdo->prepare("UPDATE conductors SET current_bus_id = :bus_id WHERE id = :uid");
    $stmt2->execute([':bus_id' => $busId, ':uid' => $userId]);

    // store into session to allow reloads
    $_SESSION['current_bus'] = [
        'id'          => $busId,
        'code'        => $code,
        'route'       => $route,
        'seats_total' => $seats_total,
        'seats_available' => $initial_available_seats,
        'pre_departure_count' => $pre_departure_count,
        'is_new_session' => true
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
            SELECT Bus_ID, code, route, total_seats, seat_availability
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
                'seats_available' => (int)($busRow['seat_availability'] ?? $busRow['total_seats'] ?? 25)
            ];

            // Recover active operation_id for analytics
            $stmtOp = $pdo->prepare("SELECT id FROM bus_operations WHERE bus_id = ? AND conductor_id = ? AND status = 'active' ORDER BY id DESC LIMIT 1");
            $stmtOp->execute([(int)$busRow['Bus_ID'], $userId]);
            $opRow = $stmtOp->fetch(PDO::FETCH_ASSOC);
            if ($opRow) {
                $_SESSION['current_bus']['operation_id'] = (int)$opRow['id'];
            }
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

// Fetch latest seat availability from DB, as it might have been updated by
// background tasks (e.g. MediaSession adjustments from push notifications).
$stmtRefresh = $pdo->prepare("SELECT seat_availability FROM busses WHERE Bus_ID = ? LIMIT 1");
$stmtRefresh->execute([$busId]);
$refreshRow = $stmtRefresh->fetch(PDO::FETCH_ASSOC);
if ($refreshRow && isset($refreshRow['seat_availability'])) {
    $currentBus['seats_available'] = (int)$refreshRow['seat_availability'];
    $_SESSION['current_bus']['seats_available'] = $currentBus['seats_available'];
}

$busCode     = $currentBus['code'];
$busRoute    = $currentBus['route'];
$seatsTotal  = (int)$currentBus['seats_total'];
$seatsAvailable = isset($currentBus['seats_available']) ? (int)$currentBus['seats_available'] : $seatsTotal;
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
        :root { --bg: #f5f7fa; --blue:#0f3878; }

        body{
            background: #fff;
            font-family: 'Segoe UI', sans-serif;
            margin: 0;
            padding-bottom: 80px;
            overflow-x: hidden;
        }

        .main-content-wrapper{
            padding: 12px 14px 84px;
        }

        /* Top status pill centered like screenshot */
        .status-pill{
            display: inline-block;
            padding: 6px 18px;
            border-radius: 999px;
            background: #d8f5da;
            color: #1a8d3d;
            font-weight: 800;
            font-size: 0.8rem;
        }

        .status-row{
            display:flex;
            justify-content:center;
            margin: 6px 0 10px;
        }

        /* Map matches screenshot: rounded, clean, no thick border */
        .map-card-wrapper{
            position: relative;
            border-radius: 18px;
            overflow: hidden;
            background: #fff;
            height: 300px;
            box-shadow: 0 10px 28px rgba(15,23,42,0.10);
        }
        #mainMap{ width:100%; height:100%; z-index:1; }

        /* Seats control row (pill buttons + center number) */
        .seats-control{
            display:flex;
            justify-content:center;
            align-items:center;
            gap: 14px;
            margin-top: 14px;
        }
        .btn-seat{
            width: 52px;
            height: 46px;
            border-radius: 10px;
            border: 0;
            background: #eef2f6;
            box-shadow: 0 10px 22px rgba(15,23,42,0.10);
            font-size: 24px;
            font-weight: 900;
            line-height: 1;
            color: #0f172a;
        }
        .seats-num{
            width: 64px;
            height: 46px;
            border-radius: 10px;
            background: #ffffff;
            box-shadow: 0 10px 22px rgba(15,23,42,0.10);
            display:flex;
            align-items:center;
            justify-content:center;
            font-size: 20px;
            font-weight: 900;
            color: #0f172a;
        }

        /* Info table card like screenshot */
        .info-card{
            margin-top: 14px;
            background: #eef2f6;
            border-radius: 18px;
            padding: 14px 14px;
        }
        .info-item{
            display:flex;
            justify-content:space-between;
            padding: 10px 6px;
            border-bottom: 1px solid rgba(148,163,184,0.45);
            font-size: 0.85rem;
        }
        .info-item:last-child{ border-bottom:0; }
        .info-label{ color:#0f172a; font-weight: 800; }
        .info-value{ color:#0f172a; font-weight: 800; }

        .location-link{
            color: #0f172a;
            font-weight: 900;
            text-decoration: none;
        }
        .location-link:hover{ text-decoration: underline; }

        /* Stop button: blue pill like screenshot */
        .btn-stop{
            margin-top: 14px;
            width: 100%;
            border: 0;
            border-radius: 999px;
            padding: 12px 16px;
            font-weight: 900;
            background: var(--blue);
            color: #fff;
            box-shadow: 0 12px 26px rgba(15, 56, 120, 0.28);
        }
        .btn-stop:hover{ background: #0b2f66; color:#fff; }

        /* Remove big bottom bar; keep thin strip */
        .footer-bar{
            position: fixed;
            bottom: 0; left: 0;
            width: 100%;
            height: 30px;
            background: var(--blue);
            z-index: 1000;
        }

        .alert-area{
            position: absolute;
            bottom: 14px;
            left: 14px;
            right: 14px;
            z-index: 900;
            pointer-events: none;
        }
        .alert-area .alert{ pointer-events:auto; }

        /* Hide the status select visually but keep it in DOM so JS can use it if needed */
        #statusSelect{ display:none; }
    </style>
</head>
<body>

    <?php include __DIR__ . '/../../components/navbarConductor.php'; ?>

    <div class="main-content-wrapper">

        <div class="status-row">
            <div class="status-pill" id="netStatus">Active</div>
        </div>

        <div class="map-card-wrapper">
            <div class="alert-area" id="alertBox"></div>
            <div id="mainMap"></div>
        </div>

        <div class="text-center fw-bold mt-3 mb-1" style="color: #64748b; font-size: 0.85rem; letter-spacing: 0.5px; text-transform: uppercase;">Passenger Count</div>
        <div class="seats-control" style="margin-top: 0;">
            <button id="seatMinus" class="btn-seat" style="display: flex; justify-content: center; align-items: center;" type="button">
                <img src="../../assets/images/decrease.svg" alt="Leaving" style="width: 28px; height: 28px;">
            </button>
            <div id="seatsCount" class="seats-num"><?= intval($seatsTotal - $seatsAvailable) ?></div>
            <button id="seatPlus" class="btn-seat" style="display: flex; justify-content: center; align-items: center;" type="button">
                <img src="../../assets/images/increase.svg" alt="Boarding" style="width: 28px; height: 28px;">
            </button>
        </div>

        <!-- statusSelect is kept but hidden; JS will update it automatically -->
        <select id="statusSelect">
            <option value="available">available</option>
            <option value="on_stop">on_stop</option>
            <option value="full">full</option>
        </select>

        <div class="info-card">
            <div class="info-item">
                <div class="info-label">Bus Number</div>
                <!-- ONLY FIX: show the bus number/code, not the internal ID -->
                <div class="info-value"><?= htmlspecialchars((string)$busCode) ?></div>
            </div>
            <div class="info-item">
                <div class="info-label">Route</div>
                <div class="info-value"><?= htmlspecialchars($busRoute ?: '-') ?></div>
            </div>
            <div class="info-item">
                <div class="info-label">Location</div>
                <div class="info-value">
                    <a id="currentLocation" class="location-link" href="#" target="_blank" rel="noopener noreferrer">Waiting for GPS...</a>
                </div>
            </div>
            <div class="info-item">
                <div class="info-label">Last Update</div>
                <div class="info-value" id="lastUpdate">00:00</div>
            </div>
        </div>

        <button id="stopBtn" class="btn-stop" type="button">Stop Tracking</button>
    </div>

    <div class="footer-bar"></div>

    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>

    <script>
    // --- Variables & helpers ---
    const busId = <?= json_encode($busId) ?>;
    const userId = <?= json_encode($userId) ?>;
    const busCode = <?= json_encode($busCode) ?>;
    const busRoute = <?= json_encode($busRoute) ?>;
    const seatsTotal = <?= intval($seatsTotal) ?>;
    
    // In conductor view, we display Passenger Count (Total - Available)
    // But 'seats' variable in JS will continue to represent seatsAvailable for API syncing
    let seats = <?= intval($seatsAvailable) ?>;
    
    let map = null, marker = null, watchId = null, lastNetworkSync = 0, lastKnownLocation = null;
    let heartbeatInterval = null;
    let routeFeatures = [];
    const SYNC_INTERVAL = 1000;
    const el = id => document.getElementById(id);
    const alertBox = el('alertBox');
    const netStatus = el('netStatus');
    let bgWatcherId = null;
    let _appStateListener = null;

    let lastMoveCheck = { time: 0, lat: null, lng: null };
    let lastComputedStatus = 'available';
    const MOVE_THRESHOLD_METERS = 3;
    const STOP_TIME_MS = 5000;

    // --- ANALYTICS: Operation tracking ---
    let operationId = <?= json_encode((int)($currentBus['operation_id'] ?? 0)) ?>;
    const isNewSession = <?= json_encode(!empty($currentBus['is_new_session'])) ?>;
    const preDepartureCount = <?= json_encode((int)($currentBus['pre_departure_count'] ?? 0)) ?>;

    // Debounce-cancel system: tracks net seat changes before flushing to server
    let pendingBoards = 0;
    let pendingDeparts = 0;
    let syncTimer = null;
    let lastActionTime = 0;
    const SYNC_DEBOUNCE_MS = 3000; // Increased to 3s for InfinityFree stability

    /**
     * Standardized POST helper. 
     * Uses CapacitorHttp (Native side) if available to bypass WebView background throttling.
     */
    async function safePost(relativeUrl, payload) {
        const url = new URL(relativeUrl, window.location.href).href;
        try {
            if (window.Capacitor && window.Capacitor.Plugins.CapacitorHttp) {
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
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                return await res.json();
            }
        } catch(e) {
            console.error('safePost error:', e);
            return { success: false, error: e.message };
        }
    }

    function showAlert(message, type = 'info') {
        const bsType = (type === 'danger') ? 'danger' : 'primary';
        alertBox.innerHTML = `<div class="alert alert-${bsType} border-0 text-center fw-bold shadow-sm" style="border-radius: 12px; padding: 10px;">${message}</div>`;
        setTimeout(() => { if (alertBox) alertBox.innerHTML = ''; }, 3000);
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

    async function loadRouteFeatures() {
        try {
            const res = await fetch('../map_data.php', { cache: 'no-store' });
            const json = await res.json();
            if (json && Array.isArray(json.features)) {
                routeFeatures = json.features.filter(f => f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon'));
            }
        } catch (e) { }
    }

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

    function autoComputeStatus(currentLat, currentLng) {
        const now = Date.now();
        if (seats <= 0) return 'full';

        if (lastMoveCheck.lat === null || lastMoveCheck.lng === null) {
            lastMoveCheck = { time: now, lat: currentLat, lng: currentLng };
            return 'available';
        }

        const dist = distanceMeters(lastMoveCheck.lat, lastMoveCheck.lng, currentLat, currentLng);
        if (dist > MOVE_THRESHOLD_METERS) {
            lastMoveCheck = { time: now, lat: currentLat, lng: currentLng };
            return 'available';
        }

        if (now - lastMoveCheck.time >= STOP_TIME_MS) return 'on_stop';
        return 'available';
    }

    async function sendDataToServer(lat, lng, locName) {
        if(netStatus) { netStatus.textContent = 'Saving...'; netStatus.className = 'badge bg-warning text-dark'; }

        const statusSelect = el('statusSelect');
        const status = autoComputeStatus(lat, lng) || (statusSelect?.value || 'available');
        if (statusSelect) statusSelect.value = status;
        lastComputedStatus = status;

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
            const json = await safePost('../update_geo_location.php', payload);
            if(netStatus) { netStatus.textContent = 'Live'; netStatus.className = 'badge bg-success'; }
            
            // Fallback: Flush if no timer is active, OR if the timer appears to be stuck.
            // A stuck timer happens when the phone is locked and the OS pauses JS execution.
            // We force a flush if the last action was more than 5 seconds ago.
            const timeSinceAction = Date.now() - lastActionTime;
            if (!syncTimer || timeSinceAction > (SYNC_DEBOUNCE_MS + 2000)) {
                flushPendingEvents();
            }
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
            currentLocationEl.textContent = locName;
            currentLocationEl.href = `https://www.google.com/maps/search/?api=1&query=$${encodeURIComponent(lat + ',' + lng)}`;
        }
        const lastUpdateEl = el('lastUpdate');
        if (lastUpdateEl) lastUpdateEl.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const now = Date.now();
        if (now - lastNetworkSync > SYNC_INTERVAL) {
            sendDataToServer(lat, lng, locName);
            lastNetworkSync = now;
        }
    }

    async function startGeolocation() {
        setTimeout(() => { try { map.invalidateSize(); } catch(e){} }, 250);

        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.BackgroundGeolocation) {
            const BackgroundGeolocation = window.Capacitor.Plugins.BackgroundGeolocation;
            try {
                const permissions = await BackgroundGeolocation.requestPermissions();
                if (permissions.location !== 'granted') {
                    return showAlert('Background location permission denied.', 'danger');
                }

                bgWatcherId = await BackgroundGeolocation.addWatcher(
                    {
                        backgroundMessage: "Tracking active. Keep app open in background.",
                        backgroundTitle: "Tracking ByaHero Bus",
                        requestPermissions: true,
                        stale: false,
                        distanceFilter: 0 
                    },
                    function callback(location, error) {
                        if (error) { return; }
                        const pos = { coords: { latitude: location.latitude, longitude: location.longitude } };
                        onLocationUpdate(pos);
                    }
                );

                if (window.Capacitor && typeof window.Capacitor.registerPlugin === 'function') {
                    const Native = window.Capacitor.registerPlugin('ByaHeroNative');
                    if (Native) {
                        const syncUrl = new URL('../update_geo_location.php', window.location.href).href;
                        console.log('Starting native tracking at:', syncUrl);
                        Native.startNativeTracking({
                            syncUrl: syncUrl,
                            busId: String(busId),
                            userId: String(userId),
                            route: busRoute,
                            seatsAvailable: String(seats)
                        }).then(() => console.log('Native tracking started successfully'))
                          .catch(e => console.error('Native tracking failed to start:', e));
                    } else {
                        console.warn('ByaHeroNative plugin not found in Capacitor.Plugins');
                    }
                }

                startKeepAliveAudio();
                acquireWakeLock();
                showAlert('Background Tracking Started', 'primary');
            } catch (e) {
                showAlert('Plugin Error', 'danger');
                startWebGeolocation();
            }
        } else {
            startWebGeolocation();
        }
    }

    function startWebGeolocation() {
        if (!navigator.geolocation) return showAlert('No GPS support', 'danger');
        watchId = navigator.geolocation.watchPosition(
            onLocationUpdate,
            (err) => showAlert('GPS Error: ' + err.message, 'danger'),
            { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
        );
        startKeepAliveAudio();
        acquireWakeLock();
        showAlert('Web Tracking Started', 'primary');
    }

    // --- SCREEN WAKE LOCK (prevents Doze from pausing the WebView JS thread) ---
    let wakeLock = null;
    async function acquireWakeLock() {
        if (!('wakeLock' in navigator)) return;
        try {
            wakeLock = await navigator.wakeLock.request('screen');
            wakeLock.addEventListener('release', () => {
                // Re-acquire when screen wakes up (e.g. user picks up phone)
                if (document.visibilityState === 'visible') acquireWakeLock();
            });
        } catch (e) { }
    }
    async function releaseWakeLock() {
        if (wakeLock) { try { await wakeLock.release(); } catch(e){} wakeLock = null; }
    }

    // --- THE AUTOPLAY BYPASS ---
    let keepAliveAudio = null;
    function startKeepAliveAudio() {
        if (!keepAliveAudio) {
            keepAliveAudio = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=');
            keepAliveAudio.loop = true;
            keepAliveAudio.volume = 0.001; // Near-silent but non-zero keeps audio session alive
            keepAliveAudio.play().catch(e => {
                const playOnInteraction = () => {
                    if (keepAliveAudio) keepAliveAudio.play().catch(()=>{});
                    document.removeEventListener('touchstart', playOnInteraction);
                    document.removeEventListener('click', playOnInteraction);
                };
                document.addEventListener('touchstart', playOnInteraction);
                document.addEventListener('click', playOnInteraction);
            });
        }
    }

    function stopKeepAliveAudio() {
        if (keepAliveAudio) {
            keepAliveAudio.pause();
            keepAliveAudio = null;
        }
    }

    // --- VISIBILITY CHANGE: restart tracking if Android killed the watcher while screen was off ---
    const _onVisibilityChange = async () => {
        if (document.visibilityState === 'visible') {
            // Re-acquire wake lock (it auto-releases when screen turns off)
            acquireWakeLock();
            // Re-start audio session if it got paused
            if (keepAliveAudio && keepAliveAudio.paused) keepAliveAudio.play().catch(()=>{});
            // If the background watcher was silently dropped (Android killed it), restart it
            const trackingActive = bgWatcherId !== null || watchId !== null;
            if (!trackingActive) {
                await startGeolocation();
            } else if (lastKnownLocation) {
                // Force an immediate sync on return so the passenger map updates without waiting
                sendDataToServer(lastKnownLocation.lat, lastKnownLocation.lng, lastKnownLocation.locName);
                lastNetworkSync = Date.now();
            }
        }
    };
    document.addEventListener('visibilitychange', _onVisibilityChange);

    // --- CAPACITOR APP STATE: handle native foreground/background transitions ---
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
        const _appStateResult = window.Capacitor.Plugins.App.addListener('appStateChange', ({ isActive }) => {
            if (isActive) {
                // App came back to foreground
                acquireWakeLock();
                if (keepAliveAudio && keepAliveAudio.paused) keepAliveAudio.play().catch(()=>{});
                if (lastKnownLocation) {
                    sendDataToServer(lastKnownLocation.lat, lastKnownLocation.lng, lastKnownLocation.locName);
                    lastNetworkSync = Date.now();
                }
            }
        });
        if (_appStateResult && typeof _appStateResult.then === 'function') {
            _appStateResult.then(handle => { _appStateListener = handle; });
        } else {
            _appStateListener = _appStateResult;
        }
    }

    // --- ANALYTICS: Start operation on first load ---
    async function initOperation() {
        if (operationId > 0 || !isNewSession) return; // already has one or is a resume
        const json = await safePost('../api.php?action=start_operation', {
            bus_id: busId,
            route: busRoute,
            pre_departure_count: preDepartureCount,
            start_location: lastKnownLocation?.locName || null
        });
        if (json.success && json.operation_id) {
            operationId = json.operation_id;
        }
    }

    // --- ANALYTICS: Debounce-cancel event flushing ---
    function flushPendingEvents() {
        // Calculate net change
        const netBoards = pendingBoards;
        const netDeparts = pendingDeparts;
        pendingBoards = 0;
        pendingDeparts = 0;

        // Cancel out: only log the net difference
        const net = netBoards - netDeparts;
        if (net === 0) return; // They cancelled each other!

        const eventType = net > 0 ? 'board' : 'depart';
        const count = Math.abs(net);
        const locName = lastKnownLocation?.locName || null;
        const lat = lastKnownLocation?.lat || null;
        const lng = lastKnownLocation?.lng || null;

        if (operationId <= 0) return;

        // Show toast
        const action = eventType === 'board' ? 'boarded' : 'departed';
        const loc = locName || 'current location';
        showAlert(`${count} passenger${count > 1 ? 's' : ''} ${action} at ${loc}`, 'info');

        // Fire and forget
        return safePost('../api.php?action=log_passenger_event', {
            operation_id: operationId,
            event_type: eventType,
            count: count,
            location_name: locName,
            lat: lat,
            lng: lng
        });
    }

    /**
     * Unified Sync: Handles both seat/location updates and analytics logging.
     * Serializing these calls prevents InfinityFree from blocking simultaneous requests.
     */
    function scheduleSync() {
        lastActionTime = Date.now();
        clearTimeout(syncTimer);
        syncTimer = setTimeout(async () => {
            // 1. Update current status (Location + Current Seat Count)
            await triggerManualUpdate();
            
            // 2. Log analytics events (Historical Flow)
            await flushPendingEvents();

            syncTimer = null;
        }, SYNC_DEBOUNCE_MS);
    }

    // --- THE UNIFIED STOP TRACKING FUNCTION ---
    async function stopTracking() {
        // Flush any pending events immediately before stopping
        clearTimeout(syncTimer);
        flushPendingEvents();

        stopKeepAliveAudio();
        releaseWakeLock();
        
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'none';
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.MediaSession) {
            try { window.Capacitor.Plugins.MediaSession.setPlaybackState({ playbackState: 'none' }).catch(()=>{}); } catch(e){}
        }

        if (watchId !== null) {
            try { navigator.geolocation.clearWatch(watchId); } catch(e){}
            watchId = null;
        }
        if (bgWatcherId !== null && window.Capacitor && window.Capacitor.Plugins.BackgroundGeolocation) {
            try { await window.Capacitor.Plugins.BackgroundGeolocation.removeWatcher({ id: bgWatcherId }); } catch(e){}
            bgWatcherId = null;
        }

        if (window.Capacitor && typeof window.Capacitor.registerPlugin === 'function') {
            try { 
                const Native = window.Capacitor.registerPlugin('ByaHeroNative');
                if (Native) await Native.stopNativeTracking(); 
            } catch(e){}
        }

        // IMPORTANT: Prevent heartbeat from re-opening the bus if a sync fires during redirect
        lastKnownLocation = null;
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
        }

        const payload = {
            bus_id: busId,
            end_location: lastKnownLocation?.locName || null
        };
        await safePost('../api.php?action=stop_tracking', payload);

        window.location.href = 'conductor.php?stopped=1';
    }

    function triggerManualUpdate() {
        if (!lastKnownLocation) return;
        return sendDataToServer(lastKnownLocation.lat, lastKnownLocation.lng, lastKnownLocation.locName);
    }

    async function updateMediaSessionMetadata() {
        const metadata = {
            title: `BUS ${busCode} • ${busRoute}`, // Bus number and route
            artist: `Passenger Count: ${seatsTotal - seats}`,
            album: 'ByaHero Conductor Tracker',
            artwork: [
                { src: '../../assets/images/byaheroLogo.png', sizes: '512x512', type: 'image/png' } // High quality logo for Android color extraction
            ]
        };

        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.MediaSession) {
            try {
                const MediaSession = window.Capacitor.Plugins.MediaSession;
                await MediaSession.setMetadata(metadata);
                await MediaSession.setPlaybackState({ playbackState: 'playing' });
            } catch(e) { }
        } else if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata(metadata);
            navigator.mediaSession.playbackState = "playing";
        }
    }

    function incrementPassengers() {
        if (seats > 0) {
            seats = seats - 1;
            updateSeatsUI();
            updateMediaSessionMetadata();
            pendingBoards++;
            scheduleSync();
        } else {
            showAlert('Bus is full!', 'danger');
        }
    }

    function decrementPassengers() {
        if (seats < seatsTotal) {
            seats = seats + 1;
            updateSeatsUI();
            updateMediaSessionMetadata();
            pendingDeparts++;
            scheduleSync();
        }
    }

    function updateSeatsUI() {
        // Display Passenger Count: Total - Available
        el('seatsCount').textContent = seatsTotal - seats;
    }

    // Media Session Action Handlers
    async function setupMediaSession() {
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.MediaSession) {
            try {
                const MediaSession = window.Capacitor.Plugins.MediaSession;
                await MediaSession.setActionHandler({ action: 'nexttrack' }, incrementPassengers);
                await MediaSession.setActionHandler({ action: 'previoustrack' }, decrementPassengers);
                await updateMediaSessionMetadata();
            } catch(e) { }
        } else if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('nexttrack', incrementPassengers);
            navigator.mediaSession.setActionHandler('previoustrack', decrementPassengers);
            updateMediaSessionMetadata();
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        initMap();
        loadRouteFeatures().catch(()=>{});
        startGeolocation();

        // Hook up Media Session as soon as the DOM loads
        setupMediaSession();

        el('seatPlus').addEventListener('click', incrementPassengers);
        el('seatMinus').addEventListener('click', decrementPassengers);

        // ANALYTICS: Create operation after a short delay to allow GPS to resolve
        setTimeout(initOperation, 2000);

        // Heartbeat: force a sync if no update in 8s, and restart watcher if it went dead
        heartbeatInterval = setInterval(async () => {
            const trackingActive = (bgWatcherId !== null || watchId !== null) && lastKnownLocation !== null;
            if (!trackingActive) {
                // If we explicitly stopped, lastKnownLocation is null, so we don't restart
                if ((bgWatcherId === null && watchId === null) && lastKnownLocation === null) return;
                
                await startGeolocation();
                return;
            }
            if (lastKnownLocation && (Date.now() - lastNetworkSync > 8000)) {
                triggerManualUpdate();
            }
        }, 5000);

        el('stopBtn').addEventListener('click', stopTracking);
    });

    // --- CLEANUP: prevent memory leaks on page unload ---
    function _cleanup() {
        if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = null; }
        if (_onVisibilityChange) document.removeEventListener('visibilitychange', _onVisibilityChange);
        if (_appStateListener) {
            const listener = _appStateListener;
            _appStateListener = null;
            if (typeof listener.then === 'function') {
                listener.then(h => { if (h && h.remove) h.remove(); });
            } else if (listener.remove) {
                listener.remove();
            }
        }
        if (watchId !== null) {
            try { navigator.geolocation.clearWatch(watchId); } catch(e){}
            watchId = null;
        }
        if (bgWatcherId !== null && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.BackgroundGeolocation) {
            try { window.Capacitor.Plugins.BackgroundGeolocation.removeWatcher({ id: bgWatcherId }); } catch(e){}
            bgWatcherId = null;
        }
        releaseWakeLock();
        stopKeepAliveAudio();
    }
    window.addEventListener('beforeunload', _cleanup);
    window.addEventListener('pagehide', _cleanup);
    </script>
</body>
</html>