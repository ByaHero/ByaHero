<?php
declare(strict_types=1);

ini_set('display_errors', '1');
error_reporting(E_ALL);

require __DIR__ . '/../../config/db.php';

session_start();

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

$pdo = db();

try {
    // Silent auto-migration for the InfinityFree database 
    $pdo->exec("ALTER TABLE busstopsterminal ADD COLUMN route varchar(100) DEFAULT 'LAUREL - TANAUAN' AFTER type");
    $pdo->exec("ALTER TABLE busstopsterminal ADD COLUMN sort_order int(11) DEFAULT 0 AFTER lng");
} catch (Exception $e) {
    // Ignore error if columns already exist
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
                $stmtMax = $pdo->prepare("SELECT COALESCE(MAX(sort_order), 0) AS max_sort FROM busstopsterminal WHERE route = ?");
                $stmtMax->execute([$route]);
                $maxSort = (int)($stmtMax->fetchColumn() ?? 0);
                $newSort = $maxSort + 1;

                $stmt = $pdo->prepare("
                    INSERT INTO busstopsterminal (name, type, route, location_name, location_landmark, lat, lng, sort_order)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute([
                    $name,
                    $type,
                    $route,
                    $locationName,
                    ($landmark !== '' ? $landmark : null),
                    $lat,
                    $lng,
                    $newSort
                ]);
                $message = "Stop saved successfully.";
            }

        } elseif ($action === 'delete_stop') {
            $id = (int)($_POST['id'] ?? 0);
            if ($id > 0) {
                $pdo->prepare("DELETE FROM busstopsterminal WHERE id = ?")->execute([$id]);
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
                    $pdo->prepare("UPDATE busstopsterminal SET sort_order = 0 WHERE route = ?")
                        ->execute([$routeName]);

                    $upd = $pdo->prepare("
                        UPDATE busstopsterminal
                        SET sort_order = ?
                        WHERE id = ? AND route = ?
                    ");

                    foreach ($ids as $idx => $stopId) {
                        $sort = $idx + 1; // 1-based
                        $upd->execute([$sort, $stopId, $routeName]);
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
    $stops = $pdo->query("SELECT * FROM busstopsterminal ORDER BY id DESC")->fetchAll(PDO::FETCH_ASSOC);
} catch (Exception $e) {
    $stops = [];
}

// Fetch stops by route for summary & draggable lists (ordered by sort_order)
$stopsForward = [];
$stopsReverse = [];

try {
    $stmt = $pdo->prepare("SELECT * FROM busstopsterminal WHERE route = ? ORDER BY sort_order ASC, id ASC");
    $stmt->execute([ROUTE_FORWARD]);
    $stopsForward = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $stmt->execute([ROUTE_REVERSE]);
    $stopsReverse = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (Exception $e) {
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
    <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
    <title>ByaHero — Manage Bus Stops</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Material+Icons+Round&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
    <style>
        :root { --brand: #2563eb; }
        body { background: #f8fafc; color: #1e293b; font-family: "Segoe UI", system-ui, sans-serif; }

        .card-standard { border: none; border-radius: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); background: #fff; }
        .card-header-std { background: #fff; border-bottom: 1px solid #e2e8f0; font-weight: 800; padding: 1rem 1.25rem; border-radius: 14px 14px 0 0 !important; }
        #stopMap { height: 440px; border-radius: 14px; overflow: hidden; border: 1px solid #e2e8f0; }
        .hint { font-size: .9rem; color: #64748b; }
        .table > :not(caption) > * > * { padding: 0.65rem 0.9rem; vertical-align: middle; }
        @media (max-width: 991px) { #stopMap { height: 320px; } }

        .icon-size-card {
            border: 1px dashed #cbd5e1;
            border-radius: 14px;
            padding: .75rem;
            background: #f8fafc;
        }
        .icon-size-value {
            font-variant-numeric: tabular-nums;
            font-weight: 800;
        }

        .pill-btn { border-radius: 999px; font-weight: 800; letter-spacing: .2px; }
        .form-control, .form-select { border-radius: 12px; }

        .route-list-card { margin-bottom: 1.5rem; }

        /* Draggable list styling */
        .route-item {
            cursor: grab;
            background: #f8fafc;
            border-radius: 8px;
            padding: 6px 8px;
        }
        .route-item + .route-item {
            margin-top: 4px;
        }
    </style>
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
        <div class="col-lg-7">
            <div class="card card-standard">
                <div class="card-header-std d-flex justify-content-between align-items-center">
                    <div class="fw-bold">Stops Map</div>
                    <div class="hint">Click map to choose coordinates</div>
                </div>
                <div class="card-body">
                    <div id="stopMap"></div>

                    <div class="icon-size-card mt-3">
                        <div class="d-flex justify-content-between align-items-center">
                            <div class="fw-bold">Marker Icon Size</div>
                            <div class="small text-muted">
                                <span class="icon-size-value" id="iconSizeValue">42</span>px
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

        <div class="col-lg-5">
            <div class="card card-standard">
                <div class="card-header-std text-primary d-flex align-items-center gap-2">
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
                            <input type="text" name="name" class="form-control" placeholder="e.g. TALISAY" required>
                        </div>

                        <div class="mb-3">
                            <label class="form-label small fw-bold text-uppercase">Type</label>
                            <select name="type" id="typeSelect" class="form-select" required>
                                <option value="bus_stop">Bus Stop</option>
                                <option value="pickup_point">Pick-up Point</option>
                                <option value="terminal">Terminal</option>
                            </select>
                        </div>

                        <div class="mb-3">
                            <label class="form-label small fw-bold text-uppercase">Route</label>
                            <select name="route" class="form-select" required>
                                <option value="<?= h(ROUTE_FORWARD) ?>">LAUREL - TANAUAN</option>
                                <option value="<?= h(ROUTE_REVERSE) ?>">TANAUAN - LAUREL</option>
                            </select>
                        </div>

                        <div class="mb-3">
                            <label class="form-label small fw-bold text-uppercase">Location Name</label>
                            <input type="text" name="location_name" class="form-control" placeholder="e.g. Mototrade" required>
                        </div>

                        <div class="mb-3">
                            <label class="form-label small fw-bold text-uppercase">Location Landmark (optional)</label>
                            <input type="text" name="location_landmark" class="form-control" placeholder="e.g. Near public market">
                        </div>

                        <div class="d-grid">
                            <button class="btn btn-primary pill-btn">Save</button>
                        </div>
                    </form>
                </div>
            </div>

            <div class="card card-standard mt-4">
                <div class="card-header-std d-flex justify-content-between align-items-center">
                    <div class="fw-bold">Existing Stops (All Routes)</div>
                    <div class="small text-muted">Rows: <?= count($stops) ?></div>
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-sm table-hover mb-0">
                            <thead class="table-light">
                                <tr>
                                    <th>Name</th>
                                    <th>Type</th>
                                    <th>Route</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                            <?php if (empty($stops)): ?>
                                <tr><td colspan="4" class="text-center text-muted py-3">No stops yet.</td></tr>
                            <?php else: foreach ($stops as $s): ?>
                                <tr>
                                    <td class="fw-bold">
                                        <?= h($s['name']) ?>
                                        <div class="small text-muted"><?= h($s['location_name']) ?></div>
                                        <?php if (!empty($s['location_landmark'])): ?>
                                            <div class="small text-muted">Landmark: <?= h($s['location_landmark']) ?></div>
                                        <?php endif; ?>
                                    </td>
                                    <td class="text-uppercase small"><?= h($s['type']) ?></td>
                                    <td class="small"><?= h($s['route'] ?? '') ?></td>
                                    <td class="text-end">
                                        <form method="POST" onsubmit="return confirm('Delete this stop?');">
                                            <input type="hidden" name="action" value="delete_stop">
                                            <input type="hidden" name="id" value="<?= h($s['id']) ?>">
                                            <button class="btn btn-sm btn-outline-danger pill-btn">Delete</button>
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

    <!-- Per‑route draggable summaries -->
    <div class="row g-4 my-4">
        <div class="col-lg-6">
            <div class="card card-standard route-list-card">
                <div class="card-header-std text-primary">
                    Laurel → Tanauan (Bus Stops &amp; Pick‑up Points)
                </div>
                <div class="card-body">
                    <?php if (empty($stopsForward)): ?>
                        <p class="text-muted small mb-0">No stops yet for this route.</p>
                    <?php else: ?>
                        <ul class="list-unstyled mb-0 small" id="route-forward-list">
                            <?php foreach ($stopsForward as $s): ?>
                                <li class="route-item" data-id="<?= h($s['id']) ?>">
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
                            <button type="submit" class="btn btn-outline-primary btn-sm pill-btn">
                                Save Order (Laurel → Tanauan)
                            </button>
                        </form>
                    <?php endif; ?>
                </div>
            </div>
        </div>

        <div class="col-lg-6">
            <div class="card card-standard route-list-card">
                <div class="card-header-std text-primary">
                    Tanauan → Laurel (Bus Stops &amp; Pick‑up Points)
                </div>
                <div class="card-body">
                    <?php if (empty($stopsReverse)): ?>
                        <p class="text-muted small mb-0">No stops yet for this route.</p>
                    <?php else: ?>
                        <ul class="list-unstyled mb-0 small" id="route-reverse-list">
                            <?php foreach ($stopsReverse as $s): ?>
                                <li class="route-item" data-id="<?= h($s['id']) ?>">
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
                            <button type="submit" class="btn btn-outline-primary btn-sm pill-btn">
                                Save Order (Tanauan → Laurel)
                            </button>
                        </form>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </div>

</div>

<script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
<!-- SortableJS for drag & drop -->
<script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js"></script>
<script>
    const map = L.map('stopMap').setView([14.0905, 121.0550], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }).addTo(map);

    const BASE_URL = <?= json_encode($baseUrl, JSON_UNESCAPED_SLASHES) ?>;

    const PICKUP_URL = BASE_URL + '/assets/images/icons/busStopMarkerFinal1.svg';
    const STOP_URL   = BASE_URL + '/assets/images/icons/busStopMarkerFinal2.svg';

    // These spans exist in your original version – if you removed them, also remove these two lines.
    // document.getElementById('pickupUrlText').textContent = PICKUP_URL;
    // document.getElementById('stopUrlText').textContent = STOP_URL;

    let MARKER_SIZE = 42;

    function makeIcons() {
        const size = MARKER_SIZE;
        const anchorX = Math.round(size / 2);
        const anchorY = size;

        const pickupIcon = L.icon({
            iconUrl: PICKUP_URL,
            iconSize: [size, size],
            iconAnchor: [anchorX, anchorY],
            popupAnchor: [0, -Math.round(size * 0.9)]
        });

        const stopIcon = L.icon({
            iconUrl: STOP_URL,
            iconSize: [size, size],
            iconAnchor: [anchorX, anchorY],
            popupAnchor: [0, -Math.round(size * 0.9)]
        });

        const terminalIcon = stopIcon;

        return { pickupIcon, stopIcon, terminalIcon };
    }

    let ICONS = makeIcons();

    function iconForType(type) {
        const t = String(type || '').toLowerCase();
        if (t === 'pickup_point') return ICONS.pickupIcon;
        if (t === 'terminal') return ICONS.terminalIcon;
        return ICONS.stopIcon;
    }

    const existingStops = <?= json_encode($stops, JSON_UNESCAPED_SLASHES) ?>;

    function escapeHtml(str) {
        return String(str ?? '').replace(/[&<>"']/g, s => ({
            '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
        }[s]));
    }

    const stopMarkers = [];

    function renderExistingStops() {
        existingStops.forEach(s => {
            if (!s.lat || !s.lng) return;

            const popup = `
              <b>${escapeHtml(s.name)}</b><br>
              ${escapeHtml(s.location_name)}<br>
              <small>${escapeHtml(s.type)}</small>
              ${s.location_landmark ? `<br><small>Landmark: ${escapeHtml(s.location_landmark)}</small>` : ''}
            `;

            const m = L.marker([parseFloat(s.lat), parseFloat(s.lng)], { icon: iconForType(s.type) })
              .addTo(map)
              .bindPopup(popup);

            stopMarkers.push(m);
        });
    }

    renderExistingStops();

    let pickMarker = null;
    const coordsEl = document.getElementById('pickedCoords');
    const latField = document.getElementById('latField');
    const lngField = document.getElementById('lngField');
    const typeSelect = document.getElementById('typeSelect');

    function refreshPickedMarkerIcon() {
        if (!pickMarker) return;
        pickMarker.setIcon(iconForType(typeSelect.value));
    }
    typeSelect.addEventListener('change', refreshPickedMarkerIcon);

    map.on('click', (e) => {
        const { lat, lng } = e.latlng;

        if (pickMarker) map.removeLayer(pickMarker);

        pickMarker = L.marker([lat, lng], { icon: iconForType(typeSelect.value) })
          .addTo(map)
          .bindPopup('Selected location')
          .openPopup();

        latField.value = lat.toFixed(7);
        lngField.value = lng.toFixed(7);
        coordsEl.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    });

    const slider = document.getElementById('iconSizeSlider');
    const sizeValue = document.getElementById('iconSizeValue');

    function applyMarkerSize(newSize) {
        MARKER_SIZE = newSize;
        sizeValue.textContent = String(newSize);

        ICONS = makeIcons();

        stopMarkers.forEach((m, idx) => {
            const s = existingStops[idx];
            m.setIcon(iconForType(s?.type));
        });

        refreshPickedMarkerIcon();
    }

    slider.addEventListener('input', () => {
        applyMarkerSize(parseInt(slider.value, 10) || 42);
    });

    applyMarkerSize(parseInt(slider.value, 10) || 42);

    // ---- Drag & drop ordering with SortableJS ----
    function initSortable(listId, inputId) {
        const list = document.getElementById(listId);
        const hiddenInput = document.getElementById(inputId);
        if (!list || !hiddenInput) return;

        new Sortable(list, {
            animation: 150,
            handle: ".route-item",
            onSort: function () {
                const ids = Array.from(list.querySelectorAll(".route-item"))
                    .map(li => li.getAttribute("data-id"));
                hiddenInput.value = ids.join(",");
            }
        });

        // Initial order
        const initialIds = Array.from(list.querySelectorAll(".route-item"))
            .map(li => li.getAttribute("data-id"));
        hiddenInput.value = initialIds.join(",");
    }

    initSortable("route-forward-list", "route-forward-order-input");
    initSortable("route-reverse-list", "route-reverse-order-input");
</script>
</body>
</html>