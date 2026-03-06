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
$message = '';
$error = '';

function h($s): string {
    return htmlspecialchars((string)$s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

$allowedTypes = ['pickup_point', 'bus_stop', 'terminal'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    try {
        if ($action === 'add_stop') {
            $name = trim((string)($_POST['name'] ?? ''));
            $type = (string)($_POST['type'] ?? 'bus_stop');
            $locationName = trim((string)($_POST['location_name'] ?? ''));
            $landmark = trim((string)($_POST['location_landmark'] ?? ''));
            $lat = (float)($_POST['lat'] ?? 0);
            $lng = (float)($_POST['lng'] ?? 0);

            if ($name === '' || $locationName === '') {
                $error = "Name and Location Name are required.";
            } elseif (!in_array($type, $allowedTypes, true)) {
                $error = "Invalid type.";
            } elseif ($lat === 0.0 || $lng === 0.0) {
                $error = "Please click on the map to pick a location.";
            } else {
                $stmt = $pdo->prepare("
                    INSERT INTO busStopsTerminal (name, type, location_name, location_landmark, lat, lng)
                    VALUES (?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute([
                    $name,
                    $type,
                    $locationName,
                    ($landmark !== '' ? $landmark : null),
                    $lat,
                    $lng
                ]);
                $message = "Stop saved successfully.";
            }
        } elseif ($action === 'delete_stop') {
            $id = (int)($_POST['id'] ?? 0);
            if ($id > 0) {
                $pdo->prepare("DELETE FROM busStopsTerminal WHERE id = ?")->execute([$id]);
                $message = "Stop deleted.";
            } else {
                $error = "Invalid delete request.";
            }
        }
    } catch (Exception $e) {
        $error = "Database error: " . $e->getMessage();
    }
}

// Fetch stops
$stops = [];
try {
    $stops = $pdo->query("SELECT * FROM busStopsTerminal ORDER BY id DESC")->fetchAll(PDO::FETCH_ASSOC);
} catch (Exception $e) {
    $stops = [];
}
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>ByaHero — Manage Bus Stops</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet">
    <style>
        :root { --brand: #2563eb; }
        body { background: #f8fafc; color: #1e293b; font-family: "Segoe UI", system-ui, sans-serif; }
        .navbar { background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .card-standard { border: none; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); background: #fff; }
        .card-header-std { background: #fff; border-bottom: 1px solid #e2e8f0; font-weight: 600; padding: 1rem 1.25rem; border-radius: 10px 10px 0 0 !important; }
        #stopMap { height: 440px; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0; }
        .hint { font-size: .9rem; color: #64748b; }
        .table > :not(caption) > * > * { padding: 0.65rem 0.9rem; vertical-align: middle; }
        @media (max-width: 991px) { #stopMap { height: 320px; } }

        /* NEW: small "icon size" control UI */
        .icon-size-card {
            border: 1px dashed #cbd5e1;
            border-radius: 10px;
            padding: .75rem;
            background: #f8fafc;
        }
        .icon-size-value {
            font-variant-numeric: tabular-nums;
            font-weight: 700;
        }
    </style>
</head>
<body>

<nav class="navbar navbar-expand-lg navbar-dark mb-4">
    <div class="container">
        <a class="navbar-brand fw-bold d-flex align-items-center gap-2" href="admin.php">
            <span class="material-icons-round">directions_bus</span> ByaHero
        </a>
        <div class="ms-auto d-flex gap-2 align-items-center">
            <a class="btn btn-outline-light btn-sm" href="admin.php">Back</a>
            <a class="btn btn-outline-light btn-sm" href="logout.php">Logout</a>
        </div>
    </div>
</nav>

<div class="container">
    <?php if ($message): ?>
        <div class="alert alert-success alert-dismissible fade show shadow-sm" role="alert">
            <span class="material-icons-round fs-5 align-middle me-2">check_circle</span>
            <?= h($message) ?>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    <?php endif; ?>
    <?php if ($error): ?>
        <div class="alert alert-danger alert-dismissible fade show shadow-sm" role="alert">
            <span class="material-icons-round fs-5 align-middle me-2">error</span>
            <?= h($error) ?>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    <?php endif; ?>

    <div class="row g-4">
        <div class="col-lg-7">
            <div class="card card-standard">
                <div class="card-header-std d-flex justify-content-between align-items-center">
                    <div>Stops Map</div>
                    <div class="hint">Click map to choose coordinates</div>
                </div>
                <div class="card-body">
                    <div id="stopMap"></div>

                    <!-- NEW: icon size control -->
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
                <div class="card-header-std text-primary">
                    <span class="material-icons-round align-middle me-1">add_location_alt</span>
                    Add Stop / Terminal
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
                            <label class="form-label small fw-bold text-uppercase">Location Name</label>
                            <input type="text" name="location_name" class="form-control" placeholder="e.g. Mototrade" required>
                        </div>

                        <div class="mb-3">
                            <label class="form-label small fw-bold text-uppercase">Location Landmark (optional)</label>
                            <input type="text" name="location_landmark" class="form-control" placeholder="e.g. Near public market">
                        </div>

                        <div class="d-grid">
                            <button class="btn btn-primary">Save</button>
                        </div>
                    </form>

                    <div class="small text-muted mt-2">
                        If icons still don't show, open these in browser to confirm they load:
                        <div><code id="pickupUrlText"></code></div>
                        <div><code id="stopUrlText"></code></div>
                    </div>
                </div>
            </div>

            <div class="card card-standard mt-4">
                <div class="card-header-std">Existing Stops</div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-sm table-hover mb-0">
                            <thead class="table-light">
                                <tr>
                                    <th>Name</th>
                                    <th>Type</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                            <?php if (empty($stops)): ?>
                                <tr><td colspan="3" class="text-center text-muted py-3">No stops yet.</td></tr>
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
                                    <td class="text-end">
                                        <form method="POST" onsubmit="return confirm('Delete this stop?');">
                                            <input type="hidden" name="action" value="delete_stop">
                                            <input type="hidden" name="id" value="<?= h($s['id']) ?>">
                                            <button class="btn btn-sm btn-outline-danger">Delete</button>
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

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
<script>
    const map = L.map('stopMap').setView([14.0905, 121.0550], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }).addTo(map);

    // Auto base URL from PHP:
    const BASE_URL = <?= json_encode($baseUrl, JSON_UNESCAPED_SLASHES) ?>;

    // Icon URLs that work in both environments
    const PICKUP_URL = BASE_URL + '/assets/images/icons/busStopMarkerFinal1.svg';
    const STOP_URL   = BASE_URL + '/assets/images/icons/busStopMarkerFinal2.svg';

    document.getElementById('pickupUrlText').textContent = PICKUP_URL;
    document.getElementById('stopUrlText').textContent = STOP_URL;

    // NEW: adjustable marker size (defaults to 42 like before)
    let MARKER_SIZE = 42;

    // Build Leaflet icons based on MARKER_SIZE
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

    // Keep references so we can resize them when slider changes
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

    // NEW: slider wiring - update icons + update all markers
    const slider = document.getElementById('iconSizeSlider');
    const sizeValue = document.getElementById('iconSizeValue');

    function applyMarkerSize(newSize) {
        MARKER_SIZE = newSize;
        sizeValue.textContent = String(newSize);

        ICONS = makeIcons();

        // Update existing markers
        stopMarkers.forEach((m, idx) => {
            // We need the stop type to choose correct icon
            const s = existingStops[idx];
            m.setIcon(iconForType(s?.type));
        });

        // Update picked marker
        refreshPickedMarkerIcon();
    }

    slider.addEventListener('input', () => {
        applyMarkerSize(parseInt(slider.value, 10) || 42);
    });

    // init display
    applyMarkerSize(parseInt(slider.value, 10) || 42);
</script>
</body>
</html>