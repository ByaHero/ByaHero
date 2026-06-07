<?php
@session_start();

if (isset($_GET['stopped']) && $_GET['stopped'] == '1') {
    // Explicitly stopped tracking: clear any current bus session
    unset($_SESSION['current_bus']);
}

if (!isset($_SESSION['user_id']) || !in_array($_SESSION['user_role'] ?? '', ['conductor', 'driver'])) {
    header("Location: ../../index");
    exit;
}

require_once __DIR__ . '/../../config/db.php';
$conn = db();

$userId   = (int)($_SESSION['user_id'] ?? 0);
$userName = $_SESSION['user_name'] ?? 'User';
$busError = $_GET['error'] ?? null;

/**
 * AUTO-RESUME:
 * If this conductor already has a current_bus_id and that bus is still
 * assigned to them (current_conductor_id), send them straight to
 * conductorLive.php so they continue managing the same bus.
 */
if (!isset($_GET['stopped']) || $_GET['stopped'] != '1') {
    $stmt = $conn->prepare("SELECT current_bus_id FROM conductors WHERE id = ? LIMIT 1");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();

    $currentBusId = isset($row['current_bus_id']) ? (int)$row['current_bus_id'] : 0;

    if ($currentBusId > 0) {
        $stmtBus = $conn->prepare("
            SELECT Bus_ID
            FROM busses
            WHERE Bus_ID = ? AND current_conductor_id = ?
            LIMIT 1
        ");
        $stmtBus->bind_param("ii", $currentBusId, $userId);
        $stmtBus->execute();
        $busRow = $stmtBus->get_result()->fetch_assoc();

        if ($busRow) {
            header("Location: conductorLive");
            exit;
        }
    }
}
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
    <title>Conductor Dashboard | ByaHero Transit Tracker</title>

    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css" />
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0&display=swap" rel="stylesheet" media="print" onload="this.media='all'" />
    <style>
        <?php include __DIR__ . '/../../assets/css/conductor/conductor.css'; ?>
    </style>
</head>

<body>

    <?php include __DIR__ . '/../../components/navbarConductor.php'; ?>

    <main class="container py-4">
        <h1 class="visually-hidden">ByaHero Conductor Main Dashboard</h1>
        <?php if ($busError === 'bus_taken'): ?>
            <div class="alert alert-danger mb-3 text-center fw-bold shadow-sm" style="border-radius: 12px;">
                That bus is already in use by another conductor.
            </div>
        <?php endif; ?>

        <div class="row g-4 align-items-stretch">
            <!-- Left Column: Map & Filter -->
            <div class="col-lg-7 d-flex flex-column">
                <div class="position-relative d-flex align-items-center justify-content-center justify-content-lg-between mb-3 px-2 px-lg-0 mt-3 mt-lg-0">
                    <h5 class="fw-bold mb-0 text-dark d-none d-lg-block position-absolute start-0" style="font-size: 1.15rem; letter-spacing: 0.2px;">Commuter Dispatch Map</h5>
                    <div class="dropdown mx-auto">
                        <button id="filterBtnLabel" class="btn bg-white px-4 py-2 rounded-pill shadow-sm fw-bold text-secondary border d-flex align-items-center gap-2 text-uppercase" type="button" data-bs-toggle="dropdown" aria-expanded="false" style="font-size: 0.75rem;">
                            FILTER ROUTES <span class="material-symbols-rounded" style="font-size: 18px;">route</span>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end">
                            <li><button class="dropdown-item" type="button" onclick="setMapFilter('', 'ALL ROUTES')">ALL ROUTES</button></li>
                            <li><button class="dropdown-item" type="button" onclick="setMapFilter('LAUREL - TANAUAN', 'LAUREL - TANAUAN')">LAUREL - TANAUAN</button></li>
                            <li><button class="dropdown-item" type="button" onclick="setMapFilter('TANAUAN - LAUREL', 'TANAUAN - LAUREL')">TANAUAN - LAUREL</button></li>
                        </ul>
                    </div>
                </div>

                <div class="map-card-wrapper flex-grow-1 position-relative overflow-hidden shadow bg-white border border-4 border-white" style="border-radius: 20px;">
                    <div class="position-absolute start-0 end-0 p-2" id="alertBox" style="bottom: 10px; z-index: 900;"></div>
                    <div id="mainMap"></div>
                </div>
            </div>

            <!-- Right Column: Setup Panel Card -->
            <div class="col-lg-5">
                <div class="card shadow-sm border-0 h-100" style="border-radius: 20px; background: #ffffff;">
                    <div class="card-body p-4 d-flex flex-column justify-content-between">
                        <div>
                            <div class="text-center text-lg-start mb-4">
                                <h4 class="fw-bold text-dark mb-1" style="font-size: 1.35rem;">Route Dispatch Setup</h4>
                                <p class="text-muted small mb-0">Select your bus and route below to initialize live passenger tracking and GPS coordinates.</p>
                            </div>

                            <div class="mb-3">
                                <label class="form-label small fw-bold text-uppercase text-muted" style="letter-spacing: 0.5px; font-size: 0.72rem;">Active Fleet Unit</label>
                                <div class="custom-select-container" id="busSelectContainer">
                                    <div class="custom-select-header" onclick="toggleDropdown('busSelectContainer')">
                                        <span id="busDropdownValue" class="value-text">Select Bus</span>
                                        <span class="chevron">v</span>
                                    </div>
                                    <div class="custom-select-options" id="busOptionsList"></div>
                                    <input type="hidden" id="busSelect" value="">
                                </div>
                            </div>

                            <div class="mb-4">
                                <label class="form-label small fw-bold text-uppercase text-muted" style="letter-spacing: 0.5px; font-size: 0.72rem;">Scheduled Transit Route</label>
                                <div class="custom-select-container" id="routeSelectContainer">
                                    <div class="custom-select-header" onclick="toggleDropdown('routeSelectContainer')">
                                        <span id="routeDropdownValue" class="value-text">Select Route</span>
                                        <span class="chevron">v</span>
                                    </div>
                                    <div class="custom-select-options">
                                        <div class="custom-option" data-value="LAUREL - TANAUAN" onclick="selectRoute('LAUREL - TANAUAN', 'LAUREL - TANAUAN')">LAUREL - TANAUAN</div>
                                        <div class="custom-option" data-value="TANAUAN - LAUREL" onclick="selectRoute('TANAUAN - LAUREL', 'TANAUAN - LAUREL')">TANAUAN - LAUREL</div>
                                    </div>
                                    <input type="hidden" id="routeSelect" value="">
                                </div>
                            </div>
                        </div>

                        <div class="text-center w-100 mt-auto">
                            <button id="startBtn" class="btn-circle-start w-100">
                                START TRACKING
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <div class="position-fixed bottom-0 start-0 w-100 bg-primary" style="height: 35px; background-color: #0f3878 !important; z-index: 1000;"></div>

    <!-- PRE-DEPARTURE MODAL -->
    <div class="modal fade" id="preDepartureModal" tabindex="-1" aria-hidden="true" style="z-index: 2000;">
        <div class="modal-dialog modal-dialog-centered px-4">
            <div class="modal-content" style="border-radius: var(--card-radius); border: none;">
                <div class="modal-header border-0 pb-0">
                    <h5 class="modal-title fw-bold" style="color: var(--btn-blue);">Pre-Departure Check</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body text-center pt-2">
                    <p class="text-muted small mb-4">How many passengers have already boarded?</p>
                    <div class="d-flex justify-content-center align-items-center gap-3 mb-2">
                        <input type="number" id="boardedCount" class="form-control text-center fw-bold fs-1 border-0 shadow-sm mx-auto" placeholder="0" min="0" style="width: 150px; height: 80px; border-radius: 20px;">
                    </div>
                    <small id="seatsTotalHelper" class="text-muted d-block mt-3"></small>
                </div>
                <div class="modal-footer border-0 pt-0 pb-4 justify-content-center">
                    <button type="button" class="btn w-100 fw-bold py-3 text-white" style="border-radius: 12px; background-color: var(--btn-blue);" onclick="confirmStartTracking()">CONFIRM & START</button>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        <?php include __DIR__ . '/../../assets/js/conductor/conductor.js'; ?>
    </script>
</body>
</html>
