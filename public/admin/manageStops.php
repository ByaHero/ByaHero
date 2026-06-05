<?php
declare(strict_types=1);

ini_set('display_errors', '1');
error_reporting(E_ALL);

require __DIR__ . '/../../config/db.php';

@session_start();

/**
 * Compute base URL prefix so assets work on:
 * - Localhost: /Byahero-prototype-v3/...
 * - InfinityFree (htdocs is web root): /...
 */
$scriptName = $_SERVER['SCRIPT_NAME'] ?? '/public/admin/manageStops.php';
$publicDir  = rtrim(str_replace('\\', '/', dirname($scriptName)), '/'); // e.g. /Byahero-prototype-v3/public/admin
$baseUrl    = preg_replace('~/public/.*$~', '', $publicDir) ?: '';      // e.g. /Byahero-prototype-v3 OR ""

// --- AUTH ---
if (empty($_SESSION['user_role']) || $_SESSION['user_role'] !== 'admin') {
    header('Location: ' . $baseUrl . '/public/login.php');
    exit;
}

$conn = db();

try {
    // Silent auto-migration for the InfinityFree database 
    $res = $conn->query("SHOW COLUMNS FROM busstopsterminal LIKE 'id'");
    $col = $res->fetch_assoc();
    if ($col && (empty($col['Key']) || strpos($col['Extra'], 'auto_increment') === false)) {
        // Fix 0 or duplicate IDs if they exist before applying PK
        $conn->query("SET @count = 0;");
        $conn->query("UPDATE busstopsterminal SET id = (@count := @count + 1) WHERE id = 0 OR id IS NULL;");
        // Apply primary key and auto_increment
        $conn->query("ALTER TABLE busstopsterminal MODIFY COLUMN id INT AUTO_INCREMENT PRIMARY KEY");
    }

    $conn->query("ALTER TABLE busstopsterminal ADD COLUMN route varchar(100) DEFAULT 'LAUREL - TANAUAN' AFTER type");
    $conn->query("ALTER TABLE busstopsterminal ADD COLUMN sort_order int(11) DEFAULT 0 AFTER lng");
} catch (Throwable $e) {
    // Ignore error if columns already exist or PK already applied
}


$message = '';
$error   = '';

function h($s): string {
    return htmlspecialchars((string)$s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

$allowedTypes  = ['pickup_point', 'bus_stop', 'terminal'];
$allowedRoutes = ['LAUREL - TANAUAN', 'TANAUAN - LAUREL'];

// Route names: keep consistent everywhere
const ROUTE_FORWARD = 'LAUREL - TANAUAN';
const ROUTE_REVERSE = 'TANAUAN - LAUREL';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    try {
        if ($action === 'add_stop') {
            $name         = trim((string)($_POST['name'] ?? ''));
            $type         = (string)($_POST['type'] ?? 'bus_stop');
            $route        = trim((string)($_POST['route'] ?? ROUTE_FORWARD));
            $locationName = trim((string)($_POST['location_name'] ?? ''));
            $landmark     = trim((string)($_POST['location_landmark'] ?? ''));
            $lat          = (float)($_POST['lat'] ?? 0);
            $lng          = (float)($_POST['lng'] ?? 0);

            if ($name === '' || $locationName === '') {
                $error = "Name and Location Name are required.";
            } elseif (!in_array($type, $allowedTypes, true)) {
                $error = "Invalid type.";
            } elseif (!in_array($route, $allowedRoutes, true)) {
                $error = "Invalid route.";
            } elseif ($lat === 0.0 || $lng === 0.0) {
                $error = "Please click on the map to pick a location.";
            } else {
                // New stops get sort_order at the end of this route
                $stmtMax = $conn->prepare("SELECT COALESCE(MAX(sort_order), 0) AS max_sort FROM busstopsterminal WHERE route = ?");
                $stmtMax->bind_param("s", $route);
                $stmtMax->execute();
                $resMax = $stmtMax->get_result()->fetch_row();
                $maxSort = (int)($resMax[0] ?? 0);
                $newSort = $maxSort + 1;

                $stmt = $conn->prepare("
                    INSERT INTO busstopsterminal (name, type, route, location_name, location_landmark, lat, lng, sort_order)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ");
                $landmarkVal = ($landmark !== '' ? $landmark : null);
                $stmt->bind_param("sssssddi", 
                    $name,
                    $type,
                    $route,
                    $locationName,
                    $landmarkVal,
                    $lat,
                    $lng,
                    $newSort
                );
                $stmt->execute();
                $message = "Stop saved successfully.";
            }

        } elseif ($action === 'delete_stop') {
            $id = (int)($_POST['id'] ?? 0);
            if ($id > 0) {
                $stDel = $conn->prepare("DELETE FROM busstopsterminal WHERE id = ?");
                $stDel->bind_param("i", $id);
                $stDel->execute();
                $message = "Stop deleted.";
            } else {
                $error = "Invalid delete request.";
            }

        } elseif ($action === 'save_forward_order' || $action === 'save_reverse_order') {
            $routeName = ($action === 'save_forward_order') ? ROUTE_FORWARD : ROUTE_REVERSE;
            $orderStr  = trim((string)($_POST['order'] ?? ''));

            if ($orderStr === '') {
                $error = "No order data received.";
            } else {
                $ids = array_filter(array_map('intval', explode(',', $orderStr)));

                if (!empty($ids)) {
                    // Reset sort_order for this route
                    $stReset = $conn->prepare("UPDATE busstopsterminal SET sort_order = 0 WHERE route = ?");
                    $stReset->bind_param("s", $routeName);
                    $stReset->execute();

                    $upd = $conn->prepare("
                        UPDATE busstopsterminal
                        SET sort_order = ?
                        WHERE id = ? AND route = ?
                    ");

                    foreach ($ids as $idx => $stopId) {
                        $sort = $idx + 1; // 1-based
                        $upd->bind_param("iis", $sort, $stopId, $routeName);
                        $upd->execute();
                    }

                    $message = "Order saved for {$routeName}.";
                } else {
                    $error = "Could not parse order.";
                }
            }
        }

    } catch (Exception $e) {
        $error = "Database error: " . $e->getMessage();
    }
}

// Fetch all stops (for table + map)
$stops = [];
try {
    $resStops = $conn->query("SELECT * FROM busstopsterminal ORDER BY id DESC");
    $stops = $resStops ? $resStops->fetch_all(MYSQLI_ASSOC) : [];
} catch (Throwable $e) {
    $stops = [];
}

// Fetch stops by route for summary & draggable lists (ordered by sort_order)
$stopsForward = [];
$stopsReverse = [];

try {
    $stmt = $conn->prepare("SELECT * FROM busstopsterminal WHERE route = ? ORDER BY sort_order ASC, id ASC");
    
    $stmt->bind_param("s", $fwd);
    $fwd = ROUTE_FORWARD;
    $stmt->execute();
    $stopsForward = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

    $stmt->bind_param("s", $rev);
    $rev = ROUTE_REVERSE;
    $stmt->execute();
    $stopsReverse = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
} catch (Throwable $e) {
    $stopsForward = [];
    $stopsReverse = [];
}

/* === navbarAdmin config (component) === */
$pageDepth = '../../';
$pageType  = 'manageStops';
$backLink  = 'admin.php';
/* === END ADDED === */
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <link rel="icon" href="../../assets/images/byaheroLogoBlue.svg" type="image/svg+xml">
    <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
    <title>ByaHero — Manage Bus Stops</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Material+Icons+Round&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
    <link href="../../assets/css/admin/manageStops.css" rel="stylesheet">
</head>
<body>

<?php include __DIR__ . '/../../components/navbarAdmin.php'; ?>

<div class="container">

    <?php if ($message): ?>
        <div class="alert alert-success alert-dismissible fade show shadow-sm mt-3" role="alert">
            <span class="material-icons-round fs-5 align-middle me-2">check_circle</span>
            <?= h($message) ?>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    <?php endif; ?>
    <?php if ($error): ?>
        <div class="alert alert-danger alert-dismissible fade show shadow-sm mt-3" role="alert">
            <span class="material-icons-round fs-5 align-middle me-2">error</span>
            <?= h($error) ?>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    <?php endif; ?>

    <div class="row g-4 mt-1">
        <div class="col-lg-8">
            <div class="card border-0 rounded-4 shadow-sm bg-white">
                <div class="card-header bg-white border-bottom fw-bold p-3 d-flex justify-content-between align-items-center" style="border-radius: 16px 16px 0 0;">
                    <div class="fw-bold">Stops Map</div>
                    <div class="small text-secondary text-nowrap">Click map to pick</div>
                </div>
                <div class="card-body">
                    <div class="rounded-4 text-center py-3 mb-3" style="background-color: #e5e7eb;">
                        <div class="fw-bold text-black mb-2" style="font-size: 0.95rem; letter-spacing: 0.03em;">
                            FILTER BUS PICK UP AND TERMINAL
                        </div>
                        <select id="mapRouteFilter" class="form-select form-select-sm mx-auto fw-bold text-uppercase" onchange="filterMapStops()" style="width: auto; border-radius: 20px; font-size: 0.8rem; letter-spacing: 0.02em; padding-left: 1rem; padding-right: 2rem;">
                            <option value="ALL">ALL PICK UP & TERMINAL</option>
                            <option value="<?= h(ROUTE_FORWARD) ?>">LAUREL - TANAUAN</option>
                            <option value="<?= h(ROUTE_REVERSE) ?>">TANAUAN - LAUREL</option>
                        </select>
                    </div>

                    <div id="stopMap"></div>

                    <div class="border p-3 bg-light mt-3" style="border-style: dashed !important; border-radius: 14px;">
                        <div class="d-flex justify-content-between align-items-center">
                            <div class="fw-bold">Marker Icon Size</div>
                            <div class="small text-muted">
                                <span class="fw-bold" id="iconSizeValue" style="font-variant-numeric: tabular-nums;">42</span>px
                            </div>
                        </div>
                        <input
                            id="iconSizeSlider"
                            type="range"
                            class="form-range mt-2"
                            min="22"
                            max="80"
                            step="1"
                            value="42"
                        />
                        <div class="d-flex justify-content-between small text-muted">
                            <span>Small</span><span>Large</span>
                        </div>
                        <div class="small text-muted mt-1">
                            Tip: adjust to make bus stop / pick-up / terminal icons bigger on the map.
                        </div>
                    </div>

                    <div class="mt-2 small text-muted">
                        Selected: <span id="pickedCoords">None</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="col-lg-4">
            <div class="card border-0 rounded-4 shadow-sm bg-white">
                <div class="card-header bg-white border-bottom fw-bold p-3 text-primary d-flex align-items-center gap-2" style="border-radius: 16px 16px 0 0;">
                    <span class="material-icons-round">add_location_alt</span>
                    <span>Add Stop / Terminal</span>
                </div>
                <div class="card-body">
                    <form method="POST">
                        <input type="hidden" name="action" value="add_stop">
                        <input type="hidden" name="lat" id="latField">
                        <input type="hidden" name="lng" id="lngField">

                        <div class="mb-3">
                            <label class="form-label small fw-bold text-uppercase">Name</label>
                            <input type="text" name="name" class="form-control" style="border-radius: 12px;" placeholder="e.g. TALISAY" required>
                        </div>

                        <div class="mb-3">
                            <label class="form-label small fw-bold text-uppercase">Type</label>
                            <select name="type" id="typeSelect" class="form-select" style="border-radius: 12px;" required>
                                <option value="bus_stop">Bus Stop</option>
                                <option value="pickup_point">Pick-up Point</option>
                                <option value="terminal">Terminal</option>
                            </select>
                        </div>

                        <div class="mb-3">
                            <label class="form-label small fw-bold text-uppercase">Route</label>
                            <select name="route" class="form-select" style="border-radius: 12px;" required>
                                <option value="<?= h(ROUTE_FORWARD) ?>">LAUREL - TANAUAN</option>
                                <option value="<?= h(ROUTE_REVERSE) ?>">TANAUAN - LAUREL</option>
                            </select>
                        </div>

                        <div class="mb-3">
                            <label class="form-label small fw-bold text-uppercase">Location Name</label>
                            <input type="text" name="location_name" class="form-control" style="border-radius: 12px;" placeholder="e.g. Mototrade" required>
                        </div>

                        <div class="mb-3">
                            <label class="form-label small fw-bold text-uppercase">Location Landmark (optional)</label>
                            <input type="text" name="location_landmark" class="form-control" style="border-radius: 12px;" placeholder="e.g. Near public market">
                        </div>

                        <div class="d-grid">
                            <button class="btn btn-primary rounded-pill px-4 py-2 fw-bold" style="letter-spacing: 0.2px;">Save</button>
                        </div>
                    </form>
                </div>
            </div>

        </div>
    </div>

    <!-- Per‑route draggable summaries -->
    <div class="row g-4 my-4">
        <div class="col-lg-6 mb-4">
            <div class="card border-0 rounded-4 shadow-sm bg-white">
                <div class="card-header bg-white border-bottom fw-bold p-3 text-primary" style="border-radius: 16px 16px 0 0;">
                    Laurel → Tanauan (Bus Stops &amp; Pick‑up Points)
                </div>
                <div class="card-body">
                    <?php if (empty($stopsForward)): ?>
                        <p class="text-muted small mb-0">No stops yet for this route.</p>
                    <?php else: ?>
                        <ul class="list-unstyled mb-0 small" id="route-forward-list">
                            <?php foreach ($stopsForward as $s): ?>
                                <li class="d-block bg-light rounded-2 p-2 mb-1" style="cursor: grab;" data-id="<?= h($s['id']) ?>">
                                    <span class="fw-bold"><?= h($s['name']) ?></span>
                                    <span class="text-muted"> — <?= h($s['location_name']) ?></span>
                                    <?php if (!empty($s['location_landmark'])): ?>
                                        <span class="text-muted"> (<?= h($s['location_landmark']) ?>)</span>
                                    <?php endif; ?>
                                    <span class="badge bg-light text-secondary ms-1 text-uppercase"><?= h($s['type']) ?></span>
                                </li>
                            <?php endforeach; ?>
                        </ul>
                        <form method="POST" id="route-forward-order-form" class="mt-3">
                            <input type="hidden" name="action" value="save_forward_order">
                            <input type="hidden" name="order" id="route-forward-order-input">
                            <button type="submit" class="btn btn-outline-primary btn-sm rounded-pill px-3 py-1 fw-bold" style="letter-spacing: 0.2px;">
                                Save Order (Laurel → Tanauan)
                            </button>
                        </form>
                    <?php endif; ?>
                </div>
            </div>
        </div>

        <div class="col-lg-6 mb-4">
            <div class="card border-0 rounded-4 shadow-sm bg-white">
                <div class="card-header bg-white border-bottom fw-bold p-3 text-primary" style="border-radius: 16px 16px 0 0;">
                    Tanauan → Laurel (Bus Stops &amp; Pick‑up Points)
                </div>
                <div class="card-body">
                    <?php if (empty($stopsReverse)): ?>
                        <p class="text-muted small mb-0">No stops yet for this route.</p>
                    <?php else: ?>
                        <ul class="list-unstyled mb-0 small" id="route-reverse-list">
                            <?php foreach ($stopsReverse as $s): ?>
                                <li class="d-block bg-light rounded-2 p-2 mb-1" style="cursor: grab;" data-id="<?= h($s['id']) ?>">
                                    <span class="fw-bold"><?= h($s['name']) ?></span>
                                    <span class="text-muted"> — <?= h($s['location_name']) ?></span>
                                    <?php if (!empty($s['location_landmark'])): ?>
                                        <span class="text-muted"> (<?= h($s['location_landmark']) ?>)</span>
                                    <?php endif; ?>
                                    <span class="badge bg-light text-secondary ms-1 text-uppercase"><?= h($s['type']) ?></span>
                                </li>
                            <?php endforeach; ?>
                        </ul>
                        <form method="POST" id="route-reverse-order-form" class="mt-3">
                            <input type="hidden" name="action" value="save_reverse_order">
                            <input type="hidden" name="order" id="route-reverse-order-input">
                            <button type="submit" class="btn btn-outline-primary btn-sm rounded-pill px-3 py-1 fw-bold" style="letter-spacing: 0.2px;">
                                Save Order (Tanauan → Laurel)
                            </button>
                        </form>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </div>

    <!-- Existing Stops (Full Width) -->
    <div class="row g-4 my-4">
        <div class="col-12">
            <div class="card border-0 rounded-4 shadow-sm bg-white">
                <div class="card-header bg-white border-bottom fw-bold p-3 d-flex justify-content-between align-items-center" style="border-radius: 16px 16px 0 0;">
                    <div class="fw-bold">Existing Stops (All Routes)</div>
                    <div class="small text-muted">Rows: <?= count($stops) ?></div>
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-sm table-hover mb-0">
                            <thead class="table-light">
                                <tr>
                                    <th class="px-3 py-2">Name</th>
                                    <th class="px-3 py-2">Type</th>
                                    <th class="px-3 py-2">Route</th>
                                    <th class="px-3 py-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                            <?php if (empty($stops)): ?>
                                <tr><td colspan="4" class="text-center text-muted py-3">No stops yet.</td></tr>
                            <?php else: foreach ($stops as $s): ?>
                                <tr>
                                    <td class="fw-bold px-3 py-2">
                                        <?= h($s['name']) ?>
                                        <div class="small text-muted"><?= h($s['location_name']) ?></div>
                                        <?php if (!empty($s['location_landmark'])): ?>
                                            <div class="small text-muted">Landmark: <?= h($s['location_landmark']) ?></div>
                                        <?php endif; ?>
                                    </td>
                                    <td class="text-uppercase small px-3 py-2"><?= h($s['type']) ?></td>
                                    <td class="small px-3 py-2"><?= h($s['route'] ?? '') ?></td>
                                    <td class="text-end px-3 py-2">
                                        <form method="POST" onsubmit="return confirm('Delete this stop?');" class="m-0 p-0">
                                            <input type="hidden" name="action" value="delete_stop">
                                            <input type="hidden" name="id" value="<?= h($s['id']) ?>">
                                            <button class="btn btn-sm btn-outline-danger rounded-pill px-3 py-1 fw-bold" style="letter-spacing: 0.2px;">Delete</button>
                                        </form>
                                    </td>
                                </tr>
                            <?php endforeach; endif; ?>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>

</div>

<script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
<!-- SortableJS for drag & drop -->
<script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js"></script>
<!-- TurfJS for geometry calculations -->
<script src="https://cdn.jsdelivr.net/npm/@turf/turf@6.5.0/turf.min.js"></script>
<script>
    window.BYAHERO_STOPS_CONFIG = {
        baseUrl: <?= json_encode($baseUrl, JSON_UNESCAPED_SLASHES) ?>,
        existingStops: <?= json_encode($stops, JSON_UNESCAPED_SLASHES) ?>,
        routeForward: <?= json_encode(ROUTE_FORWARD) ?>,
        routeReverse: <?= json_encode(ROUTE_REVERSE) ?>
    };
</script>
<script src="../../assets/js/admin/manageStops.js"></script>
</body>
</html>