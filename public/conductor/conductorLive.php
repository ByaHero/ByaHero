<?php
@session_start();

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
    $currentBus['operation_id'] = (int)$opRow['id'];
    $currentBus['is_new_session'] = false;
}

// Fetch latest seat availability from DB
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

    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css" />
    <link href="https://fonts.googleapis.com/css2?family=Material+Icons+Round&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
    <link rel="stylesheet" href="../../assets/css/conductor/conductorLive.css">
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
    <script src="../../assets/js/byaheroTracking.js?v=3"></script>

    <script>
        // Pass PHP variables to global JS scope configuration
        window.BYAHERO_CONDUCTOR_CONFIG = {
            busId: <?= json_encode($busId) ?>,
            busCode: <?= json_encode($busCode) ?>,
            busRoute: <?= json_encode($busRoute) ?>,
            seatsTotal: <?= intval($seatsTotal) ?>,
            seatsAvailable: <?= intval($seatsAvailable) ?>,
            operationId: <?= json_encode((int)($currentBus['operation_id'] ?? 0)) ?>,
            isNewSession: <?= json_encode(!empty($currentBus['is_new_session'])) ?>,
            preDepartureCount: <?= json_encode((int)($currentBus['pre_departure_count'] ?? 0)) ?>
        };
    </script>
    <script src="../../assets/js/conductor/conductorLive.js"></script>
</body>
</html>
