<?php
declare(strict_types=1);
session_start();

/**
 * SECURE SYSTEM:
 * Require login before accessing to prevent URL manipulation.
 */
if (!isset($_SESSION['user_id'])) {
    $r = $_SERVER['SCRIPT_NAME'] ?? '';
    $p = rtrim(str_replace('\\', '/', dirname($r)), '/');
    $b = preg_replace('~/public/.*$~', '', $p) ?: '';
    header('Location: ' . $b . '/public/login.php', true, 302);
    exit;
}

ini_set('display_errors', '1');
error_reporting(E_ALL);

require __DIR__ . '/../config/db.php'; // adjust relative path if needed

$pdo = db();

/**
 * Compute base URL prefix so icons work on:
 * - Localhost: /Byahero-prototype-v3/...
 * - Hosting where project root is web root: /...
 */
$scriptName = $_SERVER['SCRIPT_NAME'] ?? '/public/busStops.php';
$publicDir  = rtrim(str_replace('\\', '/', dirname($scriptName)), '/'); // e.g. /Byahero-prototype-v3/public
$baseUrl    = preg_replace('~/public/.*$~', '', $publicDir) ?: '';      // e.g. /Byahero-prototype-v3 OR ""

function h($s): string {
    return htmlspecialchars((string)$s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

// Fetch bus stops/terminals created by admin
$stops = [];
$error = '';
try {
    $stmt = $pdo->query("
        SELECT id, name, type, location_name, location_landmark, lat, lng
        FROM busStopsTerminal
        ORDER BY FIELD(type,'terminal','bus_stop','pickup_point'), name ASC
    ");
    $stops = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (Exception $e) {
    $error = $e->getMessage();
    $stops = [];
}
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>ByaHero — Bus Stops Map</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">

    <!-- Bootstrap / Leaflet / Icons -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet">

    <style>
        :root { --brand: #2563eb; }
        body { background: #f8fafc; color: #1e293b; font-family: "Segoe UI", system-ui, sans-serif; }

        .navbar {
            background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
        }

        .card-standard {
            border: none;
            border-radius: 10px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            background: #fff;
        }

        .card-header-std {
            background: #fff;
            border-bottom: 1px solid #e2e8f0;
            font-weight: 600;
            padding: 1rem 1.25rem;
            border-radius: 10px 10px 0 0 !important;
        }

        #stopsMap {
            height: 480px;
            border-radius: 10px;
            overflow: hidden;
            border: 1px solid #e2e8f0;
        }

        .table > :not(caption) > * > * {
            padding: 0.65rem 0.9rem;
            vertical-align: middle;
        }

        @media (max-width: 991px) {
            #stopsMap { height: 360px; }
        }

        .badge-type {
            font-size: .7rem;
            letter-spacing: .06em;
        }

        .badge-pickup {
            background: #cffafe;
            color: #0e7490;
        }
        .badge-terminal {
            background: #0f172a;
            color: #e5e7eb;
        }
        .badge-stop {
            background: #2563eb;
        }
    </style>
</head>
<body>

<nav class="navbar navbar-expand-lg navbar-dark mb-4">
    <div class="container">
        <a class="navbar-brand fw-bold d-flex align-items-center gap-2" href="#">
            <span class="material-icons-round">directions_bus</span> ByaHero
        </a>
    </div>
</nav>

<div class="container mb-4">
    <?php if ($error): ?>
        <div class="alert alert-danger alert-dismissible fade show shadow-sm" role="alert">
            <span class="material-icons-round fs-5 align-middle me-2">error</span>
            Failed to load bus stops.
            <div class="small text-muted"><?= h($error) ?></div>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    <?php endif; ?>

    <div class="row g-4">
        <div class="col-lg-8">
            <div class="card card-standard">
                <div class="card-header-std d-flex justify-content-between align-items-center">
                    <div>Bus Stops Map</div>
                    <div class="small text-muted">Stops • Pick‑up Points • Terminals</div>
                </div>
                <div class="card-body">
                    <div id="stopsMap"></div>
                    <div class="small text-muted mt-2">
                        Tip: tap a marker to see the stop name and landmark.
                    </div>
                </div>
            </div>
        </div>

        <div class="col-lg-4">
            <div class="card card-standard">
                <div class="card-header-std">List of Bus Stops</div>
                <div class="card-body p-0">
                    <div class="list-group list-group-flush" id="stopsList">
                        <?php if (empty($stops)): ?>
                            <div class="text-center text-muted py-3 small">
                                No bus stops configured yet.
                            </div>
                        <?php else: ?>
                            <?php foreach ($stops as $s): ?>
                                <?php
                                    $type = strtolower((string)$s['type']);
                                    $label = $type === 'pickup_point'
                                        ? 'Pick-up Point'
                                        : ($type === 'terminal' ? 'Terminal' : 'Bus Stop');

                                    $badgeClass = $type === 'pickup_point'
                                        ? 'badge-pickup'
                                        : ($type === 'terminal' ? 'badge-terminal' : 'badge-stop');

                                    $subtitleParts = [];
                                    if (!empty($s['location_name'])) $subtitleParts[] = $s['location_name'];
                                    if (!empty($s['location_landmark'])) $subtitleParts[] = $s['location_landmark'];
                                    $subtitle = implode(' • ', $subtitleParts);
                                ?>
                                <button
                                    type="button"
                                    class="list-group-item list-group-item-action"
                                    data-stop-id="<?= h($s['id']) ?>">
                                    <div class="d-flex justify-content-between align-items-start">
                                        <div class="me-2">
                                            <div class="fw-bold"><?= h($s['name']) ?></div>
                                            <?php if ($subtitle): ?>
                                                <div class="small text-muted"><?= h($subtitle) ?></div>
                                            <?php else: ?>
                                                <div class="small text-muted"><?= h($label) ?></div>
                                            <?php endif; ?>
                                        </div>
                                        <span class="badge badge-type <?= h($badgeClass) ?> text-uppercase">
                                            <?= h($label) ?>
                                        </span>
                                    </div>
                                </button>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Scripts -->
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
<script>
    // Initial map
    const map = L.map('stopsMap').setView([14.0905, 121.0550], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }).addTo(map);

    // Same BASE_URL logic as manageStops.php
    const BASE_URL = <?= json_encode($baseUrl, JSON_UNESCAPED_SLASHES) ?>;

    // Use the SAME marker SVGs as in manageStops.php
    const PICKUP_URL = BASE_URL + '/assets/images/icons/busStopMarkerFinal1.svg';
    const STOP_URL   = BASE_URL + '/assets/images/icons/busStopMarkerFinal2.svg';

    // Default size — if you want the slider UI here too, you can copy it from manageStops.php
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

    const stops = <?= json_encode($stops, JSON_UNESCAPED_SLASHES) ?>;

    function escapeHtml(str) {
        return String(str ?? '').replace(/[&<>"']/g, s => ({
            '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
        }[s]));
    }

    // Keep a lookup so the list can focus markers
    const markersById = {};

    if (Array.isArray(stops)) {
        stops.forEach(s => {
            if (!s.lat || !s.lng) return;

            const lat = parseFloat(s.lat);
            const lng = parseFloat(s.lng);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

            const subtitleParts = [];
            if (s.location_name) subtitleParts.push(s.location_name);
            if (s.location_landmark) subtitleParts.push('Landmark: ' + s.location_landmark);

            const popup = `
                <b>${escapeHtml(s.name)}</b><br>
                ${escapeHtml(subtitleParts.join(' • '))}<br>
                <small>${escapeHtml(s.type)}</small>
            `;

            const m = L.marker([lat, lng], { icon: iconForType(s.type) })
                .addTo(map)
                .bindPopup(popup);

            markersById[String(s.id)] = m;
        });

        // Optionally fit map to markers
        const markerValues = Object.values(markersById);
        if (markerValues.length > 0) {
            const group = L.featureGroup(markerValues);
            map.fitBounds(group.getBounds().pad(0.2));
        }
    }

    // When user taps a list item, center/zoom to that stop
    document.getElementById('stopsList')?.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-stop-id]');
        if (!btn) return;

        const stopId = String(btn.getAttribute('data-stop-id') || '');
        const marker = markersById[stopId];
        if (marker) {
            const latLng = marker.getLatLng();
            map.setView(latLng, Math.max(map.getZoom(), 14));
            marker.openPopup();
        }
    });
</script>
</body>
</html>