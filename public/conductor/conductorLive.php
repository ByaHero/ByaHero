<?php
session_start();

// Enforce Access Control
if (!isset($_SESSION['user_id']) || !in_array($_SESSION['user_role'] ?? '', ['conductor', 'driver'])) {
    header("Location: ../index.php");
    exit;
}

require_once __DIR__ . '/../../config/db.php';
$conn = db();
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
    $checkStmt = $conn->prepare("SELECT current_conductor_id FROM busses WHERE Bus_ID = ?");
    $checkStmt->bind_param("i", $busId);
    $checkStmt->execute();
    $resCheck = $checkStmt->get_result();
    $busOwner = ($resCheck && $resCheck->num_rows > 0) ? $resCheck->fetch_row()[0] : false;

    if ($busOwner !== false && $busOwner !== null && $busOwner != $userId) {
        // Someone else already has this bus
        unset($_SESSION['current_bus']);
        header('Location: conductor.php?error=bus_taken');
        exit;
    } else {
        // Claim the bus / update it
        $stmt = $conn->prepare("UPDATE busses SET current_conductor_id = ? WHERE Bus_ID = ?");
        $stmt->bind_param("ii", $userId, $busId);
        $stmt->execute();
    }

    // Also store on the conductor
    $stmt2 = $conn->prepare("UPDATE conductors SET current_bus_id = ? WHERE id = ?");
    $stmt2->bind_param("ii", $busId, $userId);
    $stmt2->execute();

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
    $stmt = $conn->prepare("SELECT current_bus_id FROM conductors WHERE id = ? LIMIT 1");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $conductorRow = $stmt->get_result()->fetch_assoc();

    $currentBusId = isset($conductorRow['current_bus_id']) ? (int)$conductorRow['current_bus_id'] : 0;

    if ($currentBusId > 0) {
        // Double-check the bus is still assigned to this conductor
        $stmtBus = $conn->prepare("
            SELECT Bus_ID, code, route, total_seats, seat_availability
            FROM busses
            WHERE Bus_ID = ? AND current_conductor_id = ?
            LIMIT 1
        ");
        $stmtBus->bind_param("ii", $currentBusId, $userId);
        $stmtBus->execute();
        $busRow = $stmtBus->get_result()->fetch_assoc();

        if ($busRow) {
            // Rebuild session state
            $_SESSION['current_bus'] = [
                'id'          => (int)$busRow['Bus_ID'],
                'code'        => $busRow['code'] ?? ("BUS-" . $busRow['Bus_ID']),
                'route'       => $busRow['route'] ?? '',
                'seats_total' => (int)($busRow['total_seats'] ?? 25),
                'seats_available' => (int)($busRow['seat_availability'] ?? $busRow['total_seats'] ?? 25)
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

// [ANALYTICS] Always sync active operation_id from DB to ensure continuity on refresh
$stmtOp = $conn->prepare("SELECT id FROM bus_operations WHERE bus_id = ? AND conductor_id = ? AND status = 'active' ORDER BY id DESC LIMIT 1");
$stmtOp->bind_param("ii", $busId, $userId);
$stmtOp->execute();
$opRow = $stmtOp->get_result()->fetch_assoc();
if ($opRow) {
    $_SESSION['current_bus']['operation_id'] = (int)$opRow['id'];
    // If we found an existing operation, it's not a "new" session anymore
    $_SESSION['current_bus']['is_new_session'] = false;
}

// Fetch latest seat availability from DB, as it might have been updated by
// background tasks (e.g. MediaSession adjustments from push notifications).
$stmtRefresh = $conn->prepare("SELECT seat_availability FROM busses WHERE Bus_ID = ? LIMIT 1");
$stmtRefresh->bind_param("i", $busId);
$stmtRefresh->execute();
$refreshRow = $stmtRefresh->get_result()->fetch_assoc();
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
    <link rel="icon" href="../../assets/images/byaheroLogoBlue.svg" type="image/svg+xml">
    <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <title>Conductor Live Tracking | ByaHero Operation Tracker</title>
    <meta name="description" content="ByaHero Conductor live dashboard. Securely update real-time passenger counts, current route operations, and GPS coordinate tracking for passengers." />
    <meta name="keywords" content="byahero, conductor tracking, bus operator, live transit feed, passenger count updater" />
    <link rel="canonical" href="https://byahero.free.nf/public/conductor/conductorLive.php" />
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://byahero.free.nf/public/conductor/conductorLive.php" />
    <meta property="og:title" content="Conductor Live Tracking | ByaHero Operation Tracker" />
    <meta property="og:description" content="ByaHero Conductor live dashboard. Securely update real-time passenger counts, current route operations, and GPS coordinate tracking for passengers." />
    <meta property="og:image" content="../../assets/images/byaheroLogo.png" />

    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image" />
    <meta property="twitter:url" content="https://byahero.free.nf/public/conductor/conductorLive.php" />
    <meta property="twitter:title" content="Conductor Live Tracking | ByaHero Operation Tracker" />
    <meta property="twitter:description" content="ByaHero Conductor live dashboard. Securely update real-time passenger counts, current route operations, and GPS coordinate tracking for passengers." />
    <meta property="twitter:image" content="../../assets/images/byaheroLogo.png" />

    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css" />
    <link href="https://fonts.googleapis.com/css2?family=Material+Icons+Round&display=swap" rel="stylesheet" media="print" onload="this.media='all'">

    <style>
        :root { 
            --bg: #f5f7fa; 
            --blue: #0f3878; 
            --btn-blue: #1c5ab5;
            --btn-red: #ef4444;
        }

        body{
            background: #fff;
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            margin: 0;
            padding-bottom: 80px;
            overflow-x: hidden;
            -webkit-font-smoothing: antialiased;
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
            box-shadow: 0 8px 24px rgba(15,23,42,0.08);
            border: 1px solid #e2e8f0;
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
            border-radius: 12px;
            border: 0;
            background: #eef2f6;
            box-shadow: 0 4px 10px rgba(15,23,42,0.06);
            font-size: 24px;
            font-weight: 900;
            line-height: 1;
            color: #0f172a;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            cursor: pointer;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .btn-seat:hover {
            background: #e2e8f0;
            transform: scale(1.06);
        }
        .btn-seat:active {
            transform: scale(0.95);
        }
        .seats-num{
            width: 64px;
            height: 46px;
            border-radius: 12px;
            background: #ffffff;
            box-shadow: 0 4px 12px rgba(15,23,42,0.08);
            display:flex;
            align-items:center;
            justify-content:center;
            font-size: 20px;
            font-weight: 900;
            color: #0f172a;
            border: 1px solid #e2e8f0;
        }

        /* Info table card like screenshot */
        .info-card{
            margin-top: 14px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 18px;
            padding: 16px;
        }
        .info-item{
            display:flex;
            justify-content:space-between;
            padding: 12px 6px;
            border-bottom: 1px solid #f1f5f9;
            font-size: 0.88rem;
        }
        .info-item:last-child{ border-bottom:0; }
        .info-label{ color: #64748b; font-weight: 600; }
        .info-value{ color: #0f172a; font-weight: 700; }

        .location-link{
            color: var(--btn-blue);
            font-weight: 700;
            text-decoration: none;
        }
        .location-link:hover{ text-decoration: underline; }

        /* Stop button: red/blue pill like screenshot */
        .btn-stop{
            margin-top: 18px;
            width: 100%;
            border: 0;
            border-radius: 999px;
            padding: 14px 16px;
            font-weight: 900;
            font-size: 0.9rem;
            letter-spacing: 0.5px;
            background: var(--blue);
            color: #fff;
            box-shadow: 0 8px 20px rgba(15, 56, 120, 0.2);
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            cursor: pointer;
        }
        .btn-stop:hover{ 
            background: #0b2f66; 
            color:#fff; 
            transform: translateY(-2px);
            box-shadow: 0 12px 24px rgba(15, 56, 120, 0.3);
        }
        .btn-stop:active{
            transform: translateY(0) scale(0.98);
        }

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

        @media (min-width: 992px) {
            .map-card-wrapper {
                height: 480px;
                margin-bottom: 0;
            }
            .main-content-wrapper {
                padding: 24px 20px 84px;
            }
            .btn-stop {
                margin-top: 0;
            }
        }
    </style>
</head>
<body>

    <?php include __DIR__ . '/../../components/navbarConductor.php'; ?>

    <main class="main-content-wrapper container py-4">
        <h1 class="visually-hidden">ByaHero Conductor Tracker Dashboard</h1>

        <div class="row g-4 align-items-stretch">
            <!-- Left Column: Map & Status -->
            <div class="col-lg-7 d-flex flex-column">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5 class="fw-bold mb-0 text-dark" style="font-size: 1.15rem; letter-spacing: 0.2px;">Live Route Navigation</h5>
                    <div class="status-row m-0">
                        <div class="status-pill" id="netStatus">Active</div>
                    </div>
                </div>

                <div class="map-card-wrapper flex-grow-1">
                    <div class="alert-area" id="alertBox"></div>
                    <div id="mainMap"></div>
                </div>
            </div>

            <!-- Right Column: Controls & Info Card -->
            <div class="col-lg-5">
                <div class="card shadow-sm border-0 h-100" style="border-radius: 20px; background: #ffffff; border: 1px solid #e2e8f0 !important;">
                    <div class="card-body p-4 d-flex flex-column justify-content-between">
                        <div>
                            <!-- Header -->
                            <div class="text-center text-lg-start mb-4">
                                <h4 class="fw-bold text-dark mb-1" style="font-size: 1.35rem;">Live Operation Tracker</h4>
                                <p class="text-muted small mb-0">Manage current passenger capacity and view real-time location telemetry.</p>
                            </div>

                            <!-- Seats Controller -->
                            <div class="mb-4 text-center">
                                <div class="fw-bold mb-2 text-uppercase text-muted" style="font-size: 0.72rem; letter-spacing: 0.5px;">Passenger Count</div>
                                <div class="seats-control justify-content-center">
                                    <button id="seatMinus" class="btn-seat" type="button">
                                        <img src="../../assets/images/decrease.svg" alt="Leaving" style="width: 28px; height: 28px;">
                                    </button>
                                    <div id="seatsCount" class="seats-num"><?= intval($seatsTotal - $seatsAvailable) ?></div>
                                    <button id="seatPlus" class="btn-seat" type="button">
                                        <img src="../../assets/images/increase.svg" alt="Boarding" style="width: 28px; height: 28px;">
                                    </button>
                                </div>
                            </div>

                            <!-- Hidden standard status select -->
                            <select id="statusSelect">
                                <option value="available">available</option>
                                <option value="on_stop">on_stop</option>
                                <option value="full">full</option>
                            </select>

                            <!-- Operational Information -->
                            <div class="info-card mb-4">
                                <div class="info-item">
                                    <div class="info-label">Bus Number</div>
                                    <div class="info-value"><?= htmlspecialchars((string)$busCode) ?></div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">Route</div>
                                    <div class="info-value"><?= htmlspecialchars($busRoute ?: '-') ?></div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">Location</div>
                                    <div class="info-value text-end" style="max-width: 60%; word-break: break-word;">
                                        <a id="currentLocation" class="location-link" href="#" target="_blank" rel="noopener noreferrer">Waiting for GPS...</a>
                                    </div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">Last Update</div>
                                    <div class="info-value" id="lastUpdate">00:00</div>
                                </div>
                            </div>
                        </div>

                        <!-- Stop Button -->
                        <div class="text-center w-100 mt-auto">
                            <button id="stopBtn" class="btn-stop" type="button">Stop Tracking</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <div class="footer-bar"></div>

    <script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>

    <script>
    // --- Variables & helpers ---
    const busId = <?= json_encode($busId) ?>;
    const busCode = <?= json_encode($busCode) ?>;
    const busRoute = <?= json_encode($busRoute) ?>;
    const seatsTotal = <?= intval($seatsTotal) ?>;
    
    // In conductor view, we display Passenger Count (Total - Available)
    // But 'seats' variable in JS will continue to represent seatsAvailable for API syncing
    let seats = <?= intval($seatsAvailable) ?>;
    
    let map = null, marker = null, watchId = null, lastNetworkSync = 0, lastLocationUpdateAt = 0, lastKnownLocation = null;
    let heartbeatInterval = null;
    let routeFeatures = [];
    const SYNC_INTERVAL = 1000;
    const el = id => document.getElementById(id);
    const alertBox = el('alertBox');
    const netStatus = el('netStatus');
    let bgWatcherId = null;
    let _appStateListener = null;

    let lastMoveCheck = { time: 0, lat: null, lng: null };
    let lastResolvedLocation = { lat: null, lng: null, name: null };
    let lastComputedStatus = 'available';
    const MOVE_THRESHOLD_METERS = 3;
    const RESOLVE_THRESHOLD_METERS = 10; // Save CPU: only resolve name if moved > 10m
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
            
            const timeSinceAction = Date.now() - lastActionTime;
            if (!syncTimer || timeSinceAction > (SYNC_DEBOUNCE_MS + 2000)) {
                flushPendingEvents();
            }
        } catch (e) {
            if(netStatus) { netStatus.textContent = 'Offline'; netStatus.className = 'badge bg-danger'; }
        }
    }

    function onLocationUpdate(pos) {
        const now = Date.now();
        // Throttle updates to at most once every 1500ms to save CPU/battery
        if (now - lastLocationUpdateAt < 1500) return;
        lastLocationUpdateAt = now;

        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        
        let locName = lastKnownLocation?.locName || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        
        // Throttled name resolution: Only run heavy logic if moved significantly
        const distSinceResolve = lastResolvedLocation.lat ? distanceMeters(lastResolvedLocation.lat, lastResolvedLocation.lng, lat, lng) : 999;
        if (distSinceResolve > RESOLVE_THRESHOLD_METERS || !lastResolvedLocation.name) {
            const resolved = resolveLocationName(lat, lng);
            if (resolved) {
                locName = resolved;
                lastResolvedLocation = { lat, lng, name: resolved };
            }
        } else {
            locName = lastResolvedLocation.name;
        }

        lastKnownLocation = { lat, lng, locName };
        updateMarker(lat, lng);

        const currentLocationEl = el('currentLocation');
        if (currentLocationEl) {
            currentLocationEl.textContent = locName;
            currentLocationEl.href = `https://www.google.com/maps/search/?api=1&query=$${encodeURIComponent(lat + ',' + lng)}`;
        }
        const lastUpdateEl = el('lastUpdate');
        if (lastUpdateEl) lastUpdateEl.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (now - lastNetworkSync > SYNC_INTERVAL) {
            sendDataToServer(lat, lng, locName);
            lastNetworkSync = now;
        }
    }

    async function startGeolocation() {
        // [CLEANUP] Clear existing watchers to prevent RAM/Resource leaks
        if (watchId !== null) {
            try { navigator.geolocation.clearWatch(watchId); } catch(e){}
            watchId = null;
        }
        if (bgWatcherId !== null && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.BackgroundGeolocation) {
            try { await window.Capacitor.Plugins.BackgroundGeolocation.removeWatcher({ id: bgWatcherId }); } catch(e){}
            bgWatcherId = null;
        }

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
                        distanceFilter: 5 // Reduced frequency to save battery and CPU
                    },
                    function callback(location, error) {
                        if (error) { return; }
                        const pos = { coords: { latitude: location.latitude, longitude: location.longitude } };
                        onLocationUpdate(pos);
                    }
                );

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
        // Only run on mobile/Capacitor, not desktop web browsers
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (!isMobile) return;

        if (!keepAliveAudio) {
            // A valid 2-second silent WAV to avoid infinite loop CPU thrashing on 0-duration headers
            keepAliveAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAgAAAA');
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

        // IMPORTANT: Prevent heartbeat from re-opening the bus if a sync fires during redirect
        lastKnownLocation = null;
        if (heartbeatInterval) {
            clearTimeout(heartbeatInterval);
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
        seats = seats - 1;
        updateSeatsUI();
        updateMediaSessionMetadata();
        pendingBoards++;
        scheduleSync();
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
        function _heartbeatTick() {
            const hasWatcher = (bgWatcherId !== null || watchId !== null);
            const isStale = lastKnownLocation && (Date.now() - lastNetworkSync > 20000); // 20s without network sync

            // Only restart if we have NO watcher, or it's clearly stale.
            if (!hasWatcher || isStale) {
                if (!hasWatcher && lastKnownLocation === null) {
                    heartbeatInterval = setTimeout(_heartbeatTick, 5000);
                    return;
                }

                console.log("Heartbeat: Restarting geolocation...");
                startGeolocation().finally(() => {
                    heartbeatInterval = setTimeout(_heartbeatTick, 5000);
                });
                return;
            }

            if (lastKnownLocation && (Date.now() - lastNetworkSync > 8000)) {
                triggerManualUpdate();
            }
            heartbeatInterval = setTimeout(_heartbeatTick, 5000);
        }
        heartbeatInterval = setTimeout(_heartbeatTick, 5000);

        el('stopBtn').addEventListener('click', stopTracking);
    });

    // --- CLEANUP: prevent memory leaks on page unload ---
    function _cleanup() {
        if (heartbeatInterval) { clearTimeout(heartbeatInterval); heartbeatInterval = null; }
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