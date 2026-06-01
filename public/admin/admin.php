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

/* === ADDED: operation schedule count === */
$scheduleCount = 0;
/* === END ADDED === */

/* === ADDED: lost and found count === */
$lostFoundCount = 0;
/* === END ADDED === */

/* === ADDED: reports count === */
$reportsCount = 0;
/* === END ADDED === */

/* === ADDED: feedbacks count === */
$feedbacksCount = 0;
/* === END ADDED === */

/* === ADDED: analytics count === */
$analyticsCount = 0;
/* === END ADDED === */

/* === ADDED: waiting passengers count === */
$waitingPassengersCount = 0;
/* === END ADDED === */

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

    // IMPORTANT: InfinityFree table is lowercase (case-sensitive on Linux)
    $stopsCount = (int)$conn->query("SELECT COUNT(*) FROM busstopsterminal")->fetch_row()[0];

    // NEW: bus fares count
    $faresCount = (int)$conn->query("SELECT COUNT(*) FROM bus_fares")->fetch_row()[0];

    /* === ADDED: operation schedule count query === */
    $scheduleCount = (int)$conn->query("SELECT COUNT(*) FROM bus_schedule")->fetch_row()[0];
    /* === END ADDED === */

    /* === ADDED: lost and found count query === */
    $lostFoundCount = (int)$conn->query("SELECT COUNT(*) FROM lost_and_found")->fetch_row()[0];
    /* === END ADDED === */

    /* === ADDED: reports count query === */
    $reportsCount = (int)$conn->query("SELECT COUNT(*) FROM reports WHERE status = 'pending'")->fetch_row()[0];
    /* === END ADDED === */

    /* === ADDED: feedbacks count query === */
    $feedbacksCount = (int)$conn->query("SELECT COUNT(*) FROM feedbacks")->fetch_row()[0];
    /* === END ADDED === */

    /* === ADDED: analytics count query === */
    $analyticsCount = (int)$conn->query("SELECT COALESCE(SUM(total_boarded), 0) FROM bus_operations WHERE status = 'completed'")->fetch_row()[0];
    /* === END ADDED === */
    
    /* === ADDED: waiting passengers count query === */
    $waitingPassengersCount = (int)$conn->query("SELECT COUNT(*) FROM waiting_passengers WHERE status='waiting'")->fetch_row()[0];
    /* === END ADDED === */
} catch (Throwable $e) {
    // keep zeros if something fails
}

/* === ADDED: navbarAdmin config === */
$pageDepth = '../../';
$pageType = 'dashboard';
/* === === */
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
    <style>
        :root {
            --brand: #2563eb;
            --card-blue: #4e85c5;
            --brand-dark: #0f3878;
        }

        body {
            background: #f8fafc;
            color: #1e293b;
            font-family: "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
            -webkit-font-smoothing: antialiased;
        }

        /* Control Center Header */
        .control-header-border {
            border-bottom: 1px solid #e2e8f0;
        }

        .status-badge {
            font-size: 0.82rem;
            font-weight: 600;
            background: #ffffff;
            color: #475569;
            border: 1px solid #e2e8f0;
            box-shadow: 0 1px 3px rgba(0,0,0,0.02);
            transition: all 0.2s ease;
        }

        .status-pulse {
            display: inline-block;
            width: 8px;
            height: 8px;
            background-color: #10b981;
            border-radius: 50%;
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.5);
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0% {
                transform: scale(0.9);
                box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
            }
            70% {
                transform: scale(1.1);
                box-shadow: 0 0 0 6px rgba(16, 185, 129, 0);
            }
            100% {
                transform: scale(0.9);
                box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
            }
        }

        /* Section Categorization Headers */
        .dashboard-section-header {
            font-size: 0.9rem;
            font-weight: 700;
            color: var(--brand-dark);
            letter-spacing: 1px;
            text-transform: uppercase;
            margin-bottom: 1.25rem;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .dashboard-section-header::before {
            content: '';
            display: inline-block;
            width: 4px;
            height: 16px;
            background: var(--card-blue);
            border-radius: 2px;
        }

        /* Cards Layout styling */
        .stat-card {
            background: var(--card-blue);
            border-radius: 16px;
            border: 1px solid rgba(255, 255, 255, 0.12);
            color: white;
            padding: 1.25rem;
            position: relative;
            box-shadow: 0 4px 12px rgba(15, 56, 120, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.2);
            height: 140px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            overflow: hidden;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .stat-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 24px rgba(15, 56, 120, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.35);
        }

        .card-total {
            background: var(--card-blue);
        }

        .stat-card-title {
            font-size: 0.95rem;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.92);
            letter-spacing: 0.1px;
            margin: 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            padding-right: 8px;
            z-index: 2;
        }

        .stat-card-number {
            font-size: 2.8rem;
            font-weight: 700;
            text-align: left;
            margin-top: auto;
            margin-bottom: 0px;
            z-index: 2;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
            line-height: 1.1;
        }

        .btn-manage-pill {
            position: absolute;
            bottom: 1.25rem;
            right: 1.25rem;
            background: rgba(255, 255, 255, 0.14);
            color: #ffffff;
            border-radius: 20px;
            padding: 4px 12px;
            font-size: 0.72rem;
            font-weight: 700;
            text-decoration: none;
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
            border: 1px solid rgba(255, 255, 255, 0.25);
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            white-space: nowrap;
            cursor: pointer;
            z-index: 3;
        }

        .btn-manage-pill:hover {
            background: #ffffff;
            color: var(--brand-dark);
            border-color: #ffffff;
            transform: scale(1.05);
        }

        /* Bus Tracker Map Container styling */
        .card-standard {
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.02);
            margin-bottom: 2rem;
            background: #fff;
            overflow: hidden;
        }

        .card-header-std {
            background: #ffffff;
            border-bottom: 1px solid #e2e8f0;
            font-weight: 700;
            font-size: 0.95rem;
            color: var(--brand-dark);
            letter-spacing: 0.5px;
            padding: 1.2rem 1.5rem;
        }

        .map-wrapper {
            height: 500px;
            border-radius: 0;
            overflow: hidden;
            border: none;
        }

        @media (max-width: 767px) {
            .stat-card {
                height: 125px;
                padding: 1rem;
            }

            .stat-card-number {
                font-size: 2.2rem;
            }

            .stat-card-title {
                font-size: 0.85rem;
            }

            .btn-manage-pill {
                bottom: 1rem;
                right: 1rem;
                padding: 3px 10px;
                font-size: 0.68rem;
            }
        }
    </style>
</head>

<body>

    <!-- Use the new navbar component -->
    <?php include __DIR__ . '/../../components/navbarAdmin.php'; ?>

    <div class="container pb-4">
        <!-- Control Center Header -->
        <div class="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 mt-4 pb-3 control-header-border">
            <div>
                <h2 class="fw-bold mb-1 text-dark">Control Center</h2>
                <p class="text-muted mb-0 small">Monitor and manage real-time transport fleet, personnel, and passenger analytics.</p>
            </div>
            <div class="mt-3 mt-md-0 d-flex align-items-center gap-2 px-3 py-2 rounded-pill status-badge">
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

        <div class="card card-standard">
            <div class="card-header-std d-flex justify-content-between align-items-center">
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
                <div id="map" class="map-wrapper"></div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.3/dist/leaflet.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            let _updateBusMapIntervalId = null;
            const map = L.map('map').setView([14.0905, 121.0550], 12);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '© OpenStreetMap'
            }).addTo(map);

            const activeBusIcon = L.icon({
                iconUrl: '../../assets/images/icons/marker.svg',
                iconSize: [34, 34],
                iconAnchor: [17, 17],
                popupAnchor: [0, -17]
            });

            let _updateBusMapTimer = null;
            let _updateBusMapInProgress = false;

            let busMarkers = {};

            async function updateBusMap() {
                if (_updateBusMapInProgress) return;
                _updateBusMapInProgress = true;
                try {
                    const res = await fetch('../api.php?action=get_buses');
                    const data = await res.json();

                    if (data.success && data.buses) {
                        const buses = data.buses;
                        const fetchedIds = new Set();

                        buses.forEach(bus => {
                            if (['available', 'on_stop', 'full'].includes(bus.status)) {
                                let coords = null;

                                if (bus.lat && bus.lng) coords = [bus.lat, bus.lng];
                                else if (bus.current_location) {
                                    try {
                                        const geo = JSON.parse(bus.current_location);
                                        if (geo.geometry && geo.geometry.coordinates) {
                                            coords = [geo.geometry.coordinates[1], geo.geometry.coordinates[0]];
                                        }
                                    } catch (e) {}
                                }

                                if (!coords) return;

                                const id = bus.Bus_ID || bus.id;
                                fetchedIds.add(String(id));

                                const popupContent = `
                            <div class="fw-bold">${bus.code}</div>
                            <div class="small text-muted mb-1">${bus.route || 'No Route'}</div>
                            <div class="small">Status: <strong>${String(bus.status).toUpperCase()}</strong></div>
                            <div class="small mt-1">${bus.seat_availability}/${bus.total_seats} Seats</div>
                        `;

                                if (busMarkers[id]) {
                                    busMarkers[id].setLatLng(coords);
                                    busMarkers[id].setIcon(activeBusIcon);
                                    busMarkers[id].setPopupContent(popupContent);
                                } else {
                                    const marker = L.marker(coords, {
                                        icon: activeBusIcon
                                    }).addTo(map);
                                    marker.bindPopup(popupContent);
                                    busMarkers[id] = marker;
                                }
                            }
                        });

                        Object.keys(busMarkers).forEach(id => {
                            if (!fetchedIds.has(id)) {
                                map.removeLayer(busMarkers[id]);
                                delete busMarkers[id];
                            }
                        });
                    }
                } catch (e) {
                    console.error("Map Update Error:", e);
                } finally {
                    _updateBusMapInProgress = false;
                }
            }

            function scheduleNextBusMapUpdate() {
                _updateBusMapTimer = setTimeout(async () => {
                    await updateBusMap();
                    scheduleNextBusMapUpdate();
                }, 3000);
            }

            updateBusMap();
            scheduleNextBusMapUpdate();

            function _cleanup() {
                if (_updateBusMapTimer) { clearTimeout(_updateBusMapTimer); _updateBusMapTimer = null; }
                _updateBusMapInProgress = false;
            }
            window.addEventListener('beforeunload', _cleanup);
            window.addEventListener('pagehide', _cleanup);
        });
    </script>
</body>

</html>