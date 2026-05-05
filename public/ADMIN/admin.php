<?php

declare(strict_types=1);

ini_set('display_errors', '1');
error_reporting(E_ALL);

require __DIR__ . '/../../config/db.php';

session_start();

/**
 * Base URL that works for:
 * - Localhost: /Byahero-prototype-v3
 * - InfinityFree: ""  (htdocs is web root)
 */
$scriptName = $_SERVER['SCRIPT_NAME'] ?? '/public/ADMIN/admin.php';
$publicDir  = rtrim(str_replace('\\', '/', dirname($scriptName)), '/'); // e.g. /Byahero-prototype-v3/public/ADMIN
$baseUrl    = preg_replace('~/public/.*$~', '', $publicDir) ?: '';      // e.g. /Byahero-prototype-v3 OR ""

// --- AUTH ---
if (empty($_SESSION['user_role']) || $_SESSION['user_role'] !== 'admin') {
    header('Location: ' . $baseUrl . '/public/login.php');
    exit;
}

$pdo = db();

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

/* === ADDED: analytics count === */
$analyticsCount = 0;
/* === END ADDED === */

try {
    $totalBusesCount = (int)$pdo->query("SELECT COUNT(*) FROM busses")->fetchColumn();
    $activeBusesCount = (int)$pdo->query("
    SELECT COUNT(*)
    FROM busses
    WHERE current_conductor_id IS NOT NULL
      AND status IN ('available','on_stop','full')
")->fetchColumn();
    $driversCount = (int)$pdo->query("SELECT COUNT(*) FROM drivers")->fetchColumn();
    $conductorsCount = (int)$pdo->query("SELECT COUNT(*) FROM conductors")->fetchColumn();

    // IMPORTANT: InfinityFree table is lowercase (case-sensitive on Linux)
    $stopsCount = (int)$pdo->query("SELECT COUNT(*) FROM busstopsterminal")->fetchColumn();

    // NEW: bus fares count
    $faresCount = (int)$pdo->query("SELECT COUNT(*) FROM bus_fares")->fetchColumn();

    /* === ADDED: operation schedule count query === */
    $scheduleCount = (int)$pdo->query("SELECT COUNT(*) FROM bus_schedule")->fetchColumn();
    /* === END ADDED === */

    /* === ADDED: lost and found count query === */
    $lostFoundCount = (int)$pdo->query("SELECT COUNT(*) FROM lost_and_found")->fetchColumn();
    /* === END ADDED === */

    /* === ADDED: reports count query === */
    $reportsCount = (int)$pdo->query("SELECT COUNT(*) FROM reports WHERE status = 'pending'")->fetchColumn();
    /* === END ADDED === */

    /* === ADDED: analytics count query === */
    $analyticsCount = (int)$pdo->query("SELECT COALESCE(SUM(total_boarded), 0) FROM bus_operations WHERE status = 'completed'")->fetchColumn();
    /* === END ADDED === */
} catch (Exception $e) {
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
    <title>ByaHero — Admin</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/leaflet@1.9.3/dist/leaflet.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet">
    <style>
        :root {
            --brand: #2563eb;
        }

        body {
            background: #f8fafc;
            color: #1e293b;
            font-family: "Segoe UI", system-ui, sans-serif;
        }

        .stat-card {
            border-radius: 20px;
            border: none;
            color: white;
            padding: 1.25rem;
            position: relative;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
            height: 160px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            overflow: hidden;
            transition: transform 0.2s;
        }

        .stat-card:hover {
            transform: translateY(-3px);
        }

        .card-total {
            background: #4e85c5;
        }

        .stat-card-title {
            font-size: 1.1rem;
            font-weight: 500;
            z-index: 2;
        }

        .stat-card-number {
            font-size: 3.5rem;
            font-weight: 700;
            text-align: center;
            margin-top: auto;
            margin-bottom: 10px;
            z-index: 2;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .btn-manage-pill {
            position: absolute;
            bottom: 15px;
            right: 15px;
            background: white;
            color: #333;
            border-radius: 20px;
            padding: 4px 12px;
            font-size: 0.75rem;
            font-weight: 700;
            text-decoration: none;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
            cursor: pointer;
            z-index: 3;
            border: none;
            transition: background 0.2s;
        }

        .btn-manage-pill:hover {
            background: #f1f5f9;
            color: var(--brand);
        }

        .card-standard {
            border: none;
            border-radius: 10px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
            margin-bottom: 1.5rem;
            background: #fff;
        }

        .card-header-std {
            background: #fff;
            border-bottom: 1px solid #e2e8f0;
            font-weight: 600;
            padding: 1rem 1.25rem;
            border-radius: 10px 10px 0 0 !important;
        }

        .map-wrapper {
            height: 500px;
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid #e2e8f0;
        }

        @media (max-width: 767px) {
            .stat-card {
                height: 140px;
                padding: 1rem;
            }

            .stat-card-number {
                font-size: 2.5rem;
            }

            .stat-card-title {
                font-size: 0.95rem;
            }

            .btn-manage-pill {
                padding: 3px 10px;
                font-size: 0.7rem;
                bottom: 12px;
                right: 12px;
            }
        }
    </style>
</head>

<body>

    <!-- Use the new navbar component -->
    <?php include __DIR__ . '/../../components/navbarAdmin.php'; ?>

    <div class="container">
        <div class="mb-4 mt-4">
            <h2 class="fw-bold mb-0">Dashboard</h2>
        </div>

        <div class="row g-3 g-lg-4 mb-4">

            <!-- Top Row: Total Buses + Active Buses + Bus Fares -->
            <div class="col-6 col-lg-4">
                <div class="stat-card card-total">
                    <div class="stat-card-title">Total Buses</div>
                    <a class="btn-manage-pill" href="manageBuses.php">Manage</a>
                    <div class="stat-card-number"><?= $totalBusesCount ?></div>
                </div>
            </div>

            <div class="col-6 col-lg-4">
                <div class="stat-card card-total">
                    <div class="stat-card-title">Active Buses</div>
                    <a class="btn-manage-pill" href="manageActiveBuses.php">Manage</a>
                    <div class="stat-card-number"><?= $activeBusesCount ?></div>
                </div>
            </div>

            <!-- Bus Fares -->
            <div class="col-6 col-lg-4">
                <div class="stat-card card-total">
                    <div class="stat-card-title">Bus Fares</div>
                    <a class="btn-manage-pill" href="busFare.php">Manage</a>
                    <div class="stat-card-number"><?= $faresCount ?></div>
                </div>
            </div>

            <!-- ADDED: Operation Schedule -->
            <div class="col-6 col-lg-4">
                <div class="stat-card card-total">
                    <div class="stat-card-title">Operation Schedule</div>
                    <a class="btn-manage-pill" href="operationSchedule.php">Manage</a>
                    <div class="stat-card-number"><?= $scheduleCount ?></div>
                </div>
            </div>

            <!-- Bottom Row: Drivers + Bus Stops + Conductors -->
            <div class="col-6 col-lg-4">
                <div class="stat-card card-total">
                    <div class="stat-card-title">Drivers</div>
                    <a class="btn-manage-pill" href="manageConductors.php">Manage</a>
                    <div class="stat-card-number"><?= $driversCount ?></div>
                </div>
            </div>

            <div class="col-6 col-lg-4">
                <div class="stat-card card-total">
                    <div class="stat-card-title">Bus Stops</div>
                    <a class="btn-manage-pill" href="manageStops.php">Manage</a>
                    <div class="stat-card-number"><?= $stopsCount ?></div>
                </div>
            </div>

            <div class="col-6 col-lg-4">
                <div class="stat-card card-total">
                    <div class="stat-card-title">Conductors</div>
                    <a class="btn-manage-pill" href="manageConductors.php">Manage</a>
                    <div class="stat-card-number"><?= $conductorsCount ?></div>
                </div>
            </div>

            <!-- ADDED: Lost and Found -->
            <div class="col-6 col-lg-4">
                <div class="stat-card card-total">
                    <div class="stat-card-title">Lost & Found</div>
                    <a class="btn-manage-pill" href="manageLostAndFound.php">Manage</a>
                    <div class="stat-card-number"><?= $lostFoundCount ?></div>
                </div>
            </div>

            <!-- ADDED: Reports -->
            <div class="col-6 col-lg-4">
                <div class="stat-card card-total">
                    <div class="stat-card-title">Reports</div>
                    <a class="btn-manage-pill" href="manageReports.php">Manage</a>
                    <div class="stat-card-number"><?= $reportsCount ?></div>
                </div>
            </div>

            <!-- ADDED: Analytics Dashboard -->
            <div class="col-6 col-lg-4">
                <div class="stat-card card-total">
                    <div class="stat-card-title">Analytics</div>
                    <a class="btn-manage-pill" href="analytics.php">View</a>
                    <div class="stat-card-number"><?= $analyticsCount ?></div>
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
                iconAnchor: [17, 34],
                popupAnchor: [0, -30]
            });

            let busMarkers = {};

            async function updateBusMap() {
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
                }
            }

            updateBusMap();
            _updateBusMapIntervalId = setInterval(updateBusMap, 3000);

            function _cleanup() {
                if (_updateBusMapIntervalId) { clearInterval(_updateBusMapIntervalId); _updateBusMapIntervalId = null; }
            }
            window.addEventListener('beforeunload', _cleanup);
            window.addEventListener('pagehide', _cleanup);
        });
    </script>
</body>

</html>