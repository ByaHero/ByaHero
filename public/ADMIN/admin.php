<?php

/**
 * Admin UI (MySQL/XAMPP version)
 */

declare(strict_types=1);

ini_set('display_errors', '1');
error_reporting(E_ALL);

require __DIR__ . '/../config/db.php';

$envUser = getenv('ADMIN_USER');
$envPass = getenv('ADMIN_PASS');

define('ADMIN_USER', $envUser !== false ? $envUser : 'admin');
define('ADMIN_PASS', $envPass !== false ? $envPass : 'password');

/* --- Basic Auth --- */
if (
  !isset($_SERVER['PHP_AUTH_USER'], $_SERVER['PHP_AUTH_PW'])
  || $_SERVER['PHP_AUTH_USER'] !== ADMIN_USER
  || $_SERVER['PHP_AUTH_PW'] !== ADMIN_PASS
) {
  header('WWW-Authenticate: Basic realm="ByaHero Admin"');
  header('HTTP/1.0 401 Unauthorized');
  echo 'Authentication required';
  exit;
}

function h($s): string
{
  return htmlspecialchars((string)$s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}
session_start();

/* --- Fetch active buses and their locations --- */
$pdo = db();

// NOTE: if you did NOT add current_location_name, this query will still work.
$activeBuses = $pdo->query("
    SELECT
      Bus_ID,
      code,
      route,
      total_seats,
      seat_availability,
      status,
      updated
    FROM busses
    WHERE status IN ('available', 'on_stop', 'full')
")->fetchAll();

$locations = []; // live geo-coordinates for buses (from GeoJSON files if you use them)
foreach ($activeBuses as $bus) {
  $id = $bus['Bus_ID'];

  // existing file-based geojson location (kept because your original admin used it)
  $locationFile = __DIR__ . "/../../data/current_locations/bus_{$id}.geojson";
  if (is_file($locationFile)) {
    $geoData = json_decode((string)file_get_contents($locationFile), true);
    if (isset($geoData['geometry']['coordinates']) && is_array($geoData['geometry']['coordinates'])) {
      $coords = $geoData['geometry']['coordinates']; // [lng, lat]
      $locations[] = [
        'id' => $id,
        'code' => $bus['code'],
        'route' => $bus['route'],
        'location' => 'Unknown',
        'seats' => "{$bus['seat_availability']} / {$bus['total_seats']}",
        'status' => $bus['status'],
        'updated_at' => $bus['updated'],
        'coordinates' => $coords
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
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/leaflet@1.9.3/dist/leaflet.css" rel="stylesheet">
  <link rel="manifest" href="/ByaHero-Prototype-V3/public/manifest.webmanifest">
  <meta name="theme-color" content="#667eea">
  <link rel="apple-touch-icon" href="/ByaHero-Prototype-V3/public/icons/icon-192x192.png">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <style>
    :root {
      --brand: #2563eb;
    }

    body {
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, Arial;
      background: #f6f7fb;
      color: #111;
      padding-bottom: 40px;
    }

    .navbar-brand {
      font-weight: 700;
      color: #fff !important;
    }

    .map-card {
      height: calc(60vh);
      min-height: 320px;
      border-radius: .5rem;
      overflow: hidden;
    }

    @media (max-width: 576px) {
      .map-card {
        height: 48vh;
        min-height: 260px;
      }
    }

    .status-badge-available {
      background: #10b981;
      color: #fff;
    }

    .status-badge-on_stop {
      background: #f59e0b;
      color: #fff;
    }

    .status-badge-full {
      background: #ef4444;
      color: #fff;
    }

    .table-responsive {
      max-height: 48vh;
      overflow: auto;
    }

    .small-muted {
      font-size: .85rem;
      color: #6b7280;
    }

    .leaflet-container {
      background: #fff;
    }
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
                        <th scope="col">Seats</th>
                      </tr>
                    </thead>
                    <tbody>
                      <?php foreach ($activeBuses as $bus): ?>
                        <tr>
                          <td class="small"><?= h($bus['Bus_ID']) ?></td>
                          <td class="fw-bold"><?= h($bus['code']) ?></td>
                          <td class="small-muted"><?= h($bus['route']) ?></td>
                          <td class="small"><?= h("{$bus['seat_availability']} / {$bus['total_seats']}") ?></td>
                        </tr>
                      <?php endforeach; ?>
                    </tbody>
                  </table>
                </div>

                <div class="mt-3">
                  <small class="text-muted">Tap or click a bus on the map for details.</small>
                </div>
              </div>
            </div>
          </div>

          <div class="col-12 col-lg-7">
            <div class="card shadow-sm">
              <div class="card-body p-0">
                <div id="map" class="map-card"></div>
              </div>
              <div class="card-footer small text-muted">
                Live locations (from saved GeoJSON files, if present).
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
                <label class="form-label">Total Seats</label>
                <input name="total_seats" type="number" class="form-control" value="25" required>
              </div>
              <div class="col-md-4">
                <label class="form-label">Seat Availability</label>
                <input name="seat_availability" type="number" class="form-control" value="25" required>
              </div>
              <div class="col-md-4">
                <label class="form-label">Status</label>
                <select name="status" class="form-select">
                  <option value="available">available</option>
                  <option value="on_stop">on_stop</option>
                  <option value="full">full</option>
                  <option value="unavailable">unavailable</option>
                </select>
              </div>
              <div class="col-12">
                <button class="btn btn-primary">Create Bus</button>
              </div>
            </form>
            <div class="small text-muted mt-2">Note: make sure ADMIN/add_bus.php is updated to insert into MySQL table <code>busses</code>.</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.3/dist/leaflet.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>

  <script>
    const buses = <?= json_encode($locations, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?> || [];

    (function() {
      const defaultCenter = [14.5995, 120.9842];
      const map = L.map('map', {
        center: defaultCenter,
        zoom: 11,
        preferCanvas: true
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18
      }).addTo(map);

      const busIcons = {
        'available': L.icon({
          iconUrl: 'green-marker.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34]
        }),
        'on_stop': L.icon({
          iconUrl: 'orange-marker.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34]
        }),
        'full': L.icon({
          iconUrl: 'red-marker.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34]
        })
      };

      buses.forEach(bus => {
        if (!bus.coordinates || !Array.isArray(bus.coordinates)) return;
        const [lng, lat] = bus.coordinates;
        const icon = busIcons[bus.status] || busIcons['available'];
        const popupHtml = `<div>
        <strong>Bus Code:</strong> ${escapeHtml(bus.code)}<br>
        <strong>Route:</strong> ${escapeHtml(bus.route)}<br>
        <strong>Seats:</strong> ${escapeHtml(bus.seats)}<br>
        <strong>Status:</strong> ${escapeHtml(bus.status)}<br>
        <small class="text-muted">Updated: ${escapeHtml(bus.updated_at)}</small>
      </div>`;
        L.marker([lat, lng], {
          icon
        }).addTo(map).bindPopup(popupHtml);
      });

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
  <script>
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function() {
        navigator.serviceWorker.register('/ByaHero-Prototype-V3/public/sw.js')
          .then(function(reg) {
            console.log('SW registered', reg);
          })
          .catch(function(err) {
            console.warn('SW registration failed', err);
          });
      });
    }
  </script>
</body>

</html>