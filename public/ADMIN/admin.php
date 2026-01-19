<?php
/**
 * Updated Admin UI with real-time bus indicators on the map.
 * Now responsive and using Bootstrap for mobile-first layout.
 */

declare(strict_types=1);

ini_set('display_errors', '1');
error_reporting(E_ALL);

define('DB_PATH', __DIR__ . '/../../data/db.sqlite');

$envUser = getenv('ADMIN_USER');
$envPass = getenv('ADMIN_PASS');

define('ADMIN_USER', $envUser !== false ? $envUser : 'admin');
define('ADMIN_PASS', $envPass !== false ? $envPass : 'password');

/* --- Basic Auth --- */
if (!isset($_SERVER['PHP_AUTH_USER']) || !isset($_SERVER['PHP_AUTH_PW'])
    || $_SERVER['PHP_AUTH_USER'] !== ADMIN_USER
    || $_SERVER['PHP_AUTH_PW'] !== ADMIN_PASS) {
    header('WWW-Authenticate: Basic realm="ByaHero Admin"');
    header('HTTP/1.0 401 Unauthorized');
    echo 'Authentication required';
    exit;
}

function getDB(): PDO {
    try {
        $pdo = new PDO('sqlite:' . DB_PATH);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        return $pdo;
    } catch (PDOException $e) {
        http_response_code(500);
        echo "DB connection failed: " . htmlspecialchars($e->getMessage());
        exit;
    }
}

function h($s) { return htmlspecialchars((string)$s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
session_start();

/* --- Fetch active buses and their locations --- */
$pdo = getDB();
$activeBuses = $pdo->query("SELECT id, code, route, current_location_name, seats_total, seats_available, status, updated_at FROM buses WHERE status IN ('available', 'on_stop', 'full')")->fetchAll(PDO::FETCH_ASSOC);
$locations = []; // To store live geo-coordinates for buses

foreach ($activeBuses as $bus) {
    $locationFile = __DIR__ . "/../../data/current_locations/bus_{$bus['id']}.geojson";
    if (is_file($locationFile)) {
        $geoData = json_decode(file_get_contents($locationFile), true);
        if (isset($geoData['geometry']['coordinates'])) {
            $locations[] = [
                'id' => $bus['id'],
                'code' => $bus['code'],
                'route' => $bus['route'],
                'location' => $bus['current_location_name'] ?? 'Unknown',
                'seats' => "{$bus['seats_available']} / {$bus['seats_total']}",
                'status' => $bus['status'],
                'updated_at' => $bus['updated_at'],
                'coordinates' => $geoData['geometry']['coordinates'] // [longitude, latitude]
            ];
        }
    }
}
?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>ByaHero — ADMIN</title>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<!-- Bootstrap CSS (mobile-first) -->
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
<!-- Leaflet -->
<link href="https://cdn.jsdelivr.net/npm/leaflet@1.9.3/dist/leaflet.css" rel="stylesheet">
<style>
    :root {
        --brand: #2563eb;
    }
    body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, Arial; background:#f6f7fb; color:#111; padding-bottom:40px; }
    .navbar-brand { font-weight:700; color:#fff !important; }
    .map-card { height: calc(60vh); min-height: 320px; border-radius: .5rem; overflow:hidden; }
    @media (max-width: 576px) {
        .map-card { height: 48vh; min-height: 260px; }
    }
    .status-badge-available { background:#10b981; color:#fff; }
    .status-badge-on_stop { background:#f59e0b; color:#fff; }
    .status-badge-full { background:#ef4444; color:#fff; }
    .table-responsive { max-height: 48vh; overflow:auto; }
    .small-muted { font-size:.85rem; color:#6b7280; }
    /* keep Leaflet controls visible on bootstrap containers */
    .leaflet-container { background: #fff; }
</style>
</head>
<body>
<nav class="navbar navbar-expand-lg" style="background:var(--brand);">
  <div class="container-fluid">
    <a class="navbar-brand" href="#">ByaHero — ADMIN</a>
    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#adminNav" aria-controls="adminNav" aria-expanded="false" aria-label="Toggle navigation">
      <span class="navbar-toggler-icon" style="filter: invert(1);"></span>
    </button>

    <div class="collapse navbar-collapse" id="adminNav">
      <ul class="navbar-nav ms-auto mb-2 mb-lg-0">
        <li class="nav-item">
          <a class="nav-link text-white active" data-bs-toggle="tab" href="#view" role="tab">View Active Buses</a>
        </li>
        <li class="nav-item">
          <a class="nav-link text-white" data-bs-toggle="tab" href="#add" role="tab">Add New Bus</a>
        </li>
      </ul>
    </div>
  </div>
</nav>

<div class="container my-4">
  <div class="tab-content">
    <div class="tab-pane fade show active" id="view" role="tabpanel">
      <div class="row g-3">
        <!-- Left: table -->
        <div class="col-12 col-lg-5">
          <div class="card shadow-sm">
            <div class="card-body">
              <h5 class="card-title mb-3">Active Buses</h5>
              <div class="table-responsive">
                <table class="table table-hover table-sm align-middle">
                  <thead class="table-light small">
                    <tr>
                      <th scope="col">ID</th>
                      <th scope="col">Code</th>
                      <th scope="col">Route</th>
                      <th scope="col">Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    <?php foreach ($activeBuses as $bus): ?>
                    <tr>
                      <td class="small"><?= h($bus['id']) ?></td>
                      <td class="fw-bold"><?= h($bus['code']) ?></td>
                      <td class="small-muted"><?= h($bus['route']) ?></td>
                      <td class="small"><?= h($bus['current_location_name']) ?></td>
                    </tr>
                    <tr class="d-lg-none">
                      <!-- On small screens show secondary details below each row -->
                      <td colspan="4" class="small text-muted">
                        Seats: <?= h("{$bus['seats_available']} / {$bus['seats_total']}") ?> •
                        Status:
                        <?php
                          $s = $bus['status'];
                          $badgeClass = $s === 'available' ? 'status-badge-available' : ($s === 'on_stop' ? 'status-badge-on_stop' : 'status-badge-full');
                        ?>
                        <span class="badge <?= h($badgeClass) ?>"><?= h($s) ?></span>
                        • Updated: <?= h($bus['updated_at']) ?>
                      </td>
                    </tr>
                    <?php endforeach; ?>
                  </tbody>
                </table>
              </div>

              <div class="mt-3">
                <small class="text-muted">Tap or click a bus on the map for details. Table hides extra details on small screens to save space.</small>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: map -->
        <div class="col-12 col-lg-7">
          <div class="card shadow-sm">
            <div class="card-body p-0">
              <div id="map" class="map-card"></div>
            </div>
            <div class="card-footer small text-muted">
              Live locations (last update shown in popup). Map tiles by OpenStreetMap.
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="tab-pane fade" id="add" role="tabpanel">
      <div class="card shadow-sm">
        <div class="card-body">
          <h5 class="card-title">Add New Bus</h5>
          <form method="post" action="add_bus.php" class="row g-3">
            <div class="col-md-6">
              <label class="form-label">Code</label>
              <input name="code" class="form-control" required>
            </div>
            <div class="col-md-6">
              <label class="form-label">Route</label>
              <input name="route" class="form-control" required>
            </div>
            <div class="col-md-4">
              <label class="form-label">Seats Total</label>
              <input name="seats_total" type="number" class="form-control" required>
            </div>
            <div class="col-md-4">
              <label class="form-label">Seats Available</label>
              <input name="seats_available" type="number" class="form-control" required>
            </div>
            <div class="col-md-4">
              <label class="form-label">Status</label>
              <select name="status" class="form-select">
                <option value="available">available</option>
                <option value="on_stop">on_stop</option>
                <option value="full">full</option>
              </select>
            </div>
            <div class="col-12">
              <button class="btn btn-primary">Create Bus</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Leaflet JS -->
<script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.3/dist/leaflet.js"></script>
<!-- Bootstrap JS bundle -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>

<script>
    // Safely encoded PHP data for use in JS
    const buses = <?= json_encode($locations, JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT) ?> || [];

    // Initialize map when DOM ready
    (function() {
        const defaultCenter = [14.5995, 120.9842]; // Manila
        const map = L.map('map', { center: defaultCenter, zoom: 11, preferCanvas: true });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(map);

        const busIcons = {
            'available': L.icon({ iconUrl: 'green-marker.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34] }),
            'on_stop': L.icon({ iconUrl: 'orange-marker.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34] }),
            'full': L.icon({ iconUrl: 'red-marker.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34] })
        };

        if (buses.length === 0) {
            // center remains default
        } else {
            // Fit map bounds to bus locations when multiple
            const latlngs = [];
            buses.forEach(bus => {
                if (bus.coordinates && Array.isArray(bus.coordinates)) {
                    const [lng, lat] = bus.coordinates;
                    latlngs.push([lat, lng]);
                }
            });
            if (latlngs.length === 1) {
                map.setView(latlngs[0], 13);
            } else if (latlngs.length > 1) {
                map.fitBounds(latlngs, { padding: [40, 40] });
            }
        }

        buses.forEach(bus => {
            if (bus.coordinates && Array.isArray(bus.coordinates)) {
                const [lng, lat] = bus.coordinates;
                const icon = busIcons[bus.status] || busIcons['available'];
                const popupHtml = `<div>
                    <strong>Bus Code:</strong> ${escapeHtml(bus.code)}<br>
                    <strong>Route:</strong> ${escapeHtml(bus.route)}<br>
                    <strong>Location:</strong> ${escapeHtml(bus.location)}<br>
                    <strong>Seats:</strong> ${escapeHtml(bus.seats)}<br>
                    <strong>Status:</strong> ${escapeHtml(bus.status)}<br>
                    <small class="text-muted">Updated: ${escapeHtml(bus.updated_at)}</small>
                </div>`;
                L.marker([lat, lng], { icon }).addTo(map).bindPopup(popupHtml);
            }
        });

        // Basic client-side escape for strings coming from server
        function escapeHtml(s) {
            if (!s && s !== 0) return '';
            return String(s)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }
    })();
</script>
</body>
</html>