<?php

declare(strict_types=1);

ini_set('display_errors', '1');
error_reporting(E_ALL);

require __DIR__ . '/../../config/db.php';

@session_start();

/**
 * Base URL that works for:
 * - Localhost: /Byahero-prototype-v3
 * - InfinityFree: ""  (htdocs is web root)
 */
$scriptName = $_SERVER['SCRIPT_NAME'] ?? '/public/admin/admin.php';
$publicDir  = rtrim(str_replace('\\', '/', dirname($scriptName)), '/'); // e.g. /Byahero-prototype-v3/public/admin
$baseUrl    = preg_replace('~/public/.*$~', '', $publicDir) ?: '';      // e.g. /Byahero-prototype-v3 OR ""

// --- AUTH ---
if (empty($_SESSION['user_role']) || $_SESSION['user_role'] !== 'admin') {
    header('Location: ' . $baseUrl . '/public/login.php');
    exit;
}

$conn = db();

// --- Helper ---
function h($s): string
{
    return htmlspecialchars((string)$s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

// --- Counts for dashboard cards (lightweight) ---
$totalBusesCount = 0;
$activeBusesCount = 0;
$driversCount = 0;
$conductorsCount = 0;
$stopsCount = 0;
$faresCount = 0;
$scheduleCount = 0;
$lostFoundCount = 0;
$reportsCount = 0;
$feedbacksCount = 0;
$analyticsCount = 0;
$waitingPassengersCount = 0;

try {
    $totalBusesCount = (int)$conn->query("SELECT COUNT(*) FROM busses")->fetch_row()[0];
    $activeBusesCount = (int)$conn->query("
        SELECT COUNT(*)
        FROM busses
        WHERE current_conductor_id IS NOT NULL
          AND status IN ('available','on_stop','full')
    ")->fetch_row()[0];
    $driversCount = (int)$conn->query("SELECT COUNT(*) FROM drivers")->fetch_row()[0];
    $conductorsCount = (int)$conn->query("SELECT COUNT(*) FROM conductors")->fetch_row()[0];
    $stopsCount = (int)$conn->query("SELECT COUNT(*) FROM busstopsterminal")->fetch_row()[0];
    $faresCount = (int)$conn->query("SELECT COUNT(*) FROM bus_fares")->fetch_row()[0];
    $scheduleCount = (int)$conn->query("SELECT COUNT(*) FROM bus_schedule")->fetch_row()[0];
    $lostFoundCount = (int)$conn->query("SELECT COUNT(*) FROM lost_and_found")->fetch_row()[0];
    $reportsCount = (int)$conn->query("SELECT COUNT(*) FROM reports WHERE status = 'pending'")->fetch_row()[0];
    $feedbacksCount = (int)$conn->query("SELECT COUNT(*) FROM feedbacks")->fetch_row()[0];
    $analyticsCount = (int)$conn->query("SELECT COALESCE(SUM(total_boarded), 0) FROM bus_operations WHERE status = 'completed'")->fetch_row()[0];
    $waitingPassengersCount = (int)$conn->query("SELECT COUNT(*) FROM waiting_passengers WHERE status='waiting'")->fetch_row()[0];
} catch (Throwable $e) {
    // keep zeros if something fails
}

/* Navbar Admin configurations */
$pageDepth = '../../';
$pageType = 'dashboard';
?>
<!doctype html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <link rel="icon" href="../../assets/images/byaheroLogoBlue.svg" type="image/svg+xml">
    <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
    <title>ByaHero — Admin</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/leaflet@1.9.3/dist/leaflet.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Material+Icons+Round&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
    <link rel="stylesheet" href="../../assets/css/admin/admin.css">
</head>

<body>

    <?php include __DIR__ . '/../../components/navbarAdmin.php'; ?>

    <div class="container pb-4">
        <!-- Control Center Header -->
        <div class="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 mt-4 pb-3 border-bottom">
            <div>
                <h2 class="fw-bold mb-1 text-dark">Control Center</h2>
                <p class="text-muted mb-0 small">Monitor and manage real-time transport fleet, personnel, and passenger analytics.</p>
            </div>
            <div class="mt-3 mt-md-0 d-flex align-items-center gap-2 px-3 py-2 rounded-pill bg-white text-secondary border shadow-sm" style="font-size: 0.82rem; font-weight: 600;">
                <span class="status-pulse"></span>
                <span>Live System: <strong class="text-success">Operational</strong></span>
            </div>
        </div>

        <!-- Section 1: Fleet & Operations -->
        <div class="mb-4">
            <h5 class="dashboard-section-header">Fleet & Operations</h5>
            <div class="row g-3 g-lg-4">
                <!-- Total Buses -->
                <div class="col-6 col-md-3">
                    <div class="stat-card">
                        <span class="stat-card-title">Total Buses</span>
                        <div class="stat-card-number"><?= $totalBusesCount ?></div>
                        <a class="btn-manage-pill" href="manageBuses.php">Manage</a>
                    </div>
                </div>

                <!-- Active Buses -->
                <div class="col-6 col-md-3">
                    <div class="stat-card">
                        <span class="stat-card-title">Active Buses</span>
                        <div class="stat-card-number"><?= $activeBusesCount ?></div>
                        <a class="btn-manage-pill" href="manageActiveBuses.php">Manage</a>
                    </div>
                </div>

                <!-- Operation Schedule -->
                <div class="col-6 col-md-3">
                    <div class="stat-card">
                        <span class="stat-card-title">Schedules</span>
                        <div class="stat-card-number"><?= $scheduleCount ?></div>
                        <a class="btn-manage-pill" href="operationSchedule.php">Manage</a>
                    </div>
                </div>

                <!-- Waiting Passengers -->
                <div class="col-6 col-md-3">
                    <div class="stat-card">
                        <span class="stat-card-title">Waiting Pax</span>
                        <div class="stat-card-number"><?= $waitingPassengersCount ?></div>
                        <a class="btn-manage-pill" href="manageWaitingPassengers.php">Manage</a>
                    </div>
                </div>
            </div>
        </div>

        <!-- Section 2: Transit Personnel & Infrastructure -->
        <div class="mb-4">
            <h5 class="dashboard-section-header">Personnel & Infrastructure</h5>
            <div class="row g-3 g-lg-4">
                <!-- Drivers -->
                <div class="col-6 col-md-4">
                    <div class="stat-card">
                        <span class="stat-card-title">Drivers</span>
                        <div class="stat-card-number"><?= $driversCount ?></div>
                        <a class="btn-manage-pill" href="manageConductors.php">Manage</a>
                    </div>
                </div>

                <!-- Conductors -->
                <div class="col-6 col-md-4">
                    <div class="stat-card">
                        <span class="stat-card-title">Conductors</span>
                        <div class="stat-card-number"><?= $conductorsCount ?></div>
                        <a class="btn-manage-pill" href="manageConductors.php">Manage</a>
                    </div>
                </div>

                <!-- Bus Stops -->
                <div class="col-6 col-md-4">
                    <div class="stat-card">
                        <span class="stat-card-title">Bus Stops</span>
                        <div class="stat-card-number"><?= $stopsCount ?></div>
                        <a class="btn-manage-pill" href="manageStops.php">Manage</a>
                    </div>
                </div>
            </div>
        </div>

        <!-- Section 3: Passenger Experience & Support -->
        <div class="mb-4">
            <h5 class="dashboard-section-header">Passenger Experience</h5>
            <div class="row g-3 g-lg-4">
                <!-- Lost & Found -->
                <div class="col-6 col-md-4">
                    <div class="stat-card">
                        <span class="stat-card-title">Lost & Found</span>
                        <div class="stat-card-number"><?= $lostFoundCount ?></div>
                        <a class="btn-manage-pill" href="manageLostAndFound.php">Manage</a>
                    </div>
                </div>

                <!-- Reports -->
                <div class="col-6 col-md-4">
                    <div class="stat-card">
                        <span class="stat-card-title">Reports</span>
                        <div class="stat-card-number"><?= $reportsCount ?></div>
                        <a class="btn-manage-pill" href="manageReports.php">Manage</a>
                    </div>
                </div>

                <!-- Feedbacks -->
                <div class="col-6 col-md-4">
                    <div class="stat-card">
                        <span class="stat-card-title">Feedbacks</span>
                        <div class="stat-card-number"><?= $feedbacksCount ?></div>
                        <a class="btn-manage-pill" href="manageFeedbacks.php">Manage</a>
                    </div>
                </div>
            </div>
        </div>

        <!-- Section 4: Revenue & Insights -->
        <div class="mb-5">
            <h5 class="dashboard-section-header">Revenue & Insights</h5>
            <div class="row g-3 g-lg-4">
                <!-- Bus Fares -->
                <div class="col-6 col-md-6">
                    <div class="stat-card">
                        <span class="stat-card-title">Bus Fares</span>
                        <div class="stat-card-number"><?= $faresCount ?></div>
                        <a class="btn-manage-pill" href="busFare.php">Manage</a>
                    </div>
                </div>

                <!-- Analytics -->
                <div class="col-6 col-md-6">
                    <div class="stat-card">
                        <span class="stat-card-title">Analytics (Boarded)</span>
                        <div class="stat-card-number"><?= $analyticsCount ?></div>
                        <a class="btn-manage-pill" href="analytics.php">View</a>
                    </div>
                </div>
            </div>
        </div>

        <div class="card border rounded-4 shadow-sm mb-4 bg-white overflow-hidden">
            <div class="card-header bg-white border-bottom fw-bold p-3 d-flex justify-content-between align-items-center" style="font-size: 0.95rem; color: #0f3878; letter-spacing: 0.5px;">
                <div class="d-flex align-items-center gap-2">
                    <img src="<?= htmlspecialchars($baseUrl) ?>/assets/images/byaheroLogo.png" alt="ByaHero Logo" style="width: 24px; height: 24px; object-fit: contain;">
                    <span>BUS TRACKER</span>
                </div>
                <small class="text-muted d-flex align-items-center gap-1">
                    <span class="spinner-grow spinner-grow-sm text-success" role="status" style="width:0.7rem;height:0.7rem"></span>
                    Live Updates
                </small>
            </div>
            <div class="card-body p-0">
                <div id="map" class="w-100 overflow-hidden" style="height: 500px;"></div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.3/dist/leaflet.js"></script>
    <script src="../../assets/js/admin/admin.js"></script>
</body>

</html>