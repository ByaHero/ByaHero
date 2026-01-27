<?php
/**
 * Admin UI - ByaHero
 * Features: View Active Buses (Live Map), Add Buses, Manage Conductors/Drivers
 */

declare(strict_types=1);

// Error reporting for debugging (disable in production)
ini_set('display_errors', '1');
error_reporting(E_ALL);

require __DIR__ . '/../config/db.php';

// --- Authentication ---
$envUser = getenv('ADMIN_USER');
$envPass = getenv('ADMIN_PASS');
define('ADMIN_USER', $envUser !== false ? $envUser : 'admin');
define('ADMIN_PASS', $envPass !== false ? $envPass : 'password');

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

session_start();
$pdo = db();
$message = '';
$error = '';

// --- Handle Form Submissions ---
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    try {
        // 1. Add New Bus
        if ($action === 'add_bus') {
            $code = trim($_POST['code'] ?? '');
            $route = trim($_POST['route'] ?? '');
            $seats = (int)($_POST['total_seats'] ?? 25);
            $status = $_POST['status'] ?? 'unavailable';

            if ($code && $route) {
                $stmt = $pdo->prepare("INSERT INTO busses (code, route, total_seats, seat_availability, status) VALUES (?, ?, ?, ?, ?)");
                $stmt->execute([$code, $route, $seats, $seats, $status]);
                $message = "Bus <strong>" . htmlspecialchars($code) . "</strong> added successfully!";
            } else {
                $error = "Bus Code and Route are required.";
            }
        }
        // 2. Add Conductor / Driver
        elseif ($action === 'add_user') {
            $name = trim($_POST['name'] ?? '');
            $email = trim($_POST['email'] ?? '');
            $password = $_POST['password'] ?? '';
            $role = $_POST['role'] ?? 'conductor';

            if ($name && $email && $password) {
                $check = $pdo->prepare("SELECT id FROM users WHERE email = ?");
                $check->execute([$email]);
                if ($check->fetch()) {
                    $error = "Email is already registered.";
                } else {
                    $hash = password_hash($password, PASSWORD_DEFAULT);
                    $stmt = $pdo->prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)");
                    $stmt->execute([$name, $email, $hash, $role]);
                    $message = "New " . htmlspecialchars($role) . " <strong>" . htmlspecialchars($name) . "</strong> added!";
                }
            } else {
                $error = "All fields are required for adding a user.";
            }
        }
        // 3. Delete Bus
        elseif ($action === 'delete_bus') {
            $id = $_POST['id'] ?? null;
            if ($id) {
                $pdo->prepare("DELETE FROM busses WHERE Bus_ID = ?")->execute([$id]);
                // File cleanup handled by API usually, but safe to ignore here as API handles updates
                $message = "Bus deleted.";
            }
        }
        // 4. Delete User
        elseif ($action === 'delete_user') {
            $id = $_POST['id'] ?? null;
            if ($id) {
                $pdo->prepare("DELETE FROM users WHERE id = ?")->execute([$id]);
                $message = "User deleted.";
            }
        }
    } catch (Exception $e) {
        $error = "Database Error: " . $e->getMessage();
    }
}

// --- Fetch Data for Tables (Static View) ---
function h($s): string {
    return htmlspecialchars((string)$s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

$buses = $pdo->query("SELECT * FROM busses ORDER BY code ASC")->fetchAll();
$staff = $pdo->query("SELECT * FROM users WHERE role IN ('conductor', 'driver') ORDER BY role, name")->fetchAll();
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>ByaHero — Admin Dashboard</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/leaflet@1.9.3/dist/leaflet.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet">
    
    <style>
        :root { --brand: #2563eb; }
        body { background: #f8fafc; color: #1e293b; font-family: "Segoe UI", system-ui, sans-serif; }
        .navbar { background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .nav-link { color: rgba(255,255,255,0.85) !important; font-weight: 500; }
        .nav-link.active { color: #fff !important; background: rgba(255,255,255,0.15); border-radius: 6px; }
        .card { border: none; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1); margin-bottom: 1.5rem; }
        .card-header { background: #fff; border-bottom: 1px solid #e2e8f0; font-weight: 600; padding: 1rem 1.25rem; border-radius: 10px 10px 0 0 !important; }
        .btn-brand { background-color: var(--brand); color: white; }
        .btn-brand:hover { background-color: #1d4ed8; color: white; }
        .map-wrapper { height: 600px; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
        .badge-avail { background: #10b981; }
        .badge-stop { background: #f59e0b; }
        .badge-full { background: #ef4444; }
        .badge-none { background: #64748b; }
        .table > :not(caption) > * > * { padding: 0.75rem 1rem; vertical-align: middle; }
    </style>
</head>
<body>

<nav class="navbar navbar-expand-lg navbar-dark mb-4">
    <div class="container">
        <a class="navbar-brand fw-bold d-flex align-items-center gap-2" href="#">
            <span class="material-icons-round">directions_bus</span> ByaHero Admin
        </a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navContent">
            <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navContent">
            <ul class="nav nav-pills ms-auto gap-2" id="adminTabs" role="tablist">
                <li class="nav-item">
                    <button class="nav-link active" data-bs-toggle="pill" data-bs-target="#tab-dashboard">Dashboard & Map</button>
                </li>
                <li class="nav-item">
                    <button class="nav-link" data-bs-toggle="pill" data-bs-target="#tab-buses">Manage Buses</button>
                </li>
                <li class="nav-item">
                    <button class="nav-link" data-bs-toggle="pill" data-bs-target="#tab-staff">Conductors & Drivers</button>
                </li>
            </ul>
        </div>
    </div>
</nav>

<div class="container">
    <?php if($message): ?>
        <div class="alert alert-success alert-dismissible fade show shadow-sm" role="alert">
            <span class="material-icons-round fs-5 align-middle me-2">check_circle</span>
            <?= $message ?>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    <?php endif; ?>
    <?php if($error): ?>
        <div class="alert alert-danger alert-dismissible fade show shadow-sm" role="alert">
            <span class="material-icons-round fs-5 align-middle me-2">error</span>
            <?= $error ?>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    <?php endif; ?>

    <div class="tab-content">
        
        <div class="tab-pane fade show active" id="tab-dashboard">
            <div class="row g-4">
                <div class="col-lg-3 col-md-6">
                    <div class="card bg-primary text-white h-100">
                        <div class="card-body">
                            <h6 class="opacity-75 mb-2">Total Buses</h6>
                            <h2 class="display-5 fw-bold mb-0"><?= count($buses) ?></h2>
                        </div>
                    </div>
                </div>
                <div class="col-lg-3 col-md-6">
                    <div class="card bg-success text-white h-100">
                        <div class="card-body">
                            <h6 class="opacity-75 mb-2">Active on Map</h6>
                            <h2 class="display-5 fw-bold mb-0" id="activeCount">-</h2>
                        </div>
                    </div>
                </div>
                <div class="col-lg-3 col-md-6">
                    <div class="card bg-info text-white h-100">
                        <div class="card-body">
                            <h6 class="opacity-75 mb-2">Conductors</h6>
                            <h2 class="display-5 fw-bold mb-0"><?= count(array_filter($staff, fn($u) => $u['role'] === 'conductor')) ?></h2>
                        </div>
                    </div>
                </div>
                <div class="col-lg-3 col-md-6">
                    <div class="card bg-warning text-dark h-100">
                        <div class="card-body">
                            <h6 class="opacity-75 mb-2">Drivers</h6>
                            <h2 class="display-5 fw-bold mb-0"><?= count(array_filter($staff, fn($u) => $u['role'] === 'driver')) ?></h2>
                        </div>
                    </div>
                </div>

                <div class="col-12">
                    <div class="card">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <div class="d-flex align-items-center gap-2">
                                <span class="material-icons-round text-primary">map</span>
                                <span>Live Fleet Map</span>
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
            </div>
        </div>

        <div class="tab-pane fade" id="tab-buses">
            <div class="row g-4">
                <div class="col-lg-4">
                    <div class="card h-100">
                        <div class="card-header bg-light text-primary">
                            <span class="material-icons-round align-middle me-1">add_circle</span> Add New Bus
                        </div>
                        <div class="card-body">
                            <form method="POST">
                                <input type="hidden" name="action" value="add_bus">
                                <div class="mb-3">
                                    <label class="form-label small fw-bold text-uppercase">Bus Code / Plate</label>
                                    <input type="text" name="code" class="form-control" placeholder="e.g. BUS-001" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label small fw-bold text-uppercase">Default Route</label>
                                    <select name="route" class="form-select" required>
                                        <option value="">-- Select Route --</option>
                                        <option value="LAUREL - TANAUAN">LAUREL - TANAUAN</option>
                                        <option value="TANAUAN - LAUREL">TANAUAN - LAUREL</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label small fw-bold text-uppercase">Total Seats</label>
                                    <input type="number" name="total_seats" class="form-control" value="25" min="10" max="60" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label small fw-bold text-uppercase">Initial Status</label>
                                    <select name="status" class="form-select">
                                        <option value="unavailable">Unavailable</option>
                                        <option value="available">Available</option>
                                    </select>
                                </div>
                                <div class="d-grid">
                                    <button type="submit" class="btn btn-brand">Create Bus</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                <div class="col-lg-8">
                    <div class="card h-100">
                        <div class="card-header">Existing Fleet</div>
                        <div class="table-responsive">
                            <table class="table table-hover mb-0">
                                <thead class="table-light text-muted small text-uppercase">
                                    <tr>
                                        <th>Code</th>
                                        <th>Route</th>
                                        <th>Status</th>
                                        <th>Seats</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php if(empty($buses)): ?>
                                        <tr><td colspan="5" class="text-center text-muted py-4">No buses found.</td></tr>
                                    <?php else: foreach($buses as $bus): 
                                        $s = $bus['status'];
                                        $badgeClass = match($s) { 'available'=>'badge-avail', 'on_stop'=>'badge-stop', 'full'=>'badge-full', default=>'badge-none' };
                                    ?>
                                        <tr>
                                            <td class="fw-bold"><?= h($bus['code']) ?></td>
                                            <td class="small"><?= h($bus['route']) ?: '<em class="text-muted">None</em>' ?></td>
                                            <td><span class="badge rounded-pill <?= $badgeClass ?>"><?= ucfirst(h($s)) ?></span></td>
                                            <td class="small font-monospace"><?= h($bus['seat_availability']) ?>/<?= h($bus['total_seats']) ?></td>
                                            <td>
                                                <form method="POST" onsubmit="return confirm('Delete bus <?= h($bus['code']) ?>?');">
                                                    <input type="hidden" name="action" value="delete_bus">
                                                    <input type="hidden" name="id" value="<?= h($bus['Bus_ID']??$bus['id']) ?>">
                                                    <button class="btn btn-sm btn-outline-danger px-2 py-0" title="Delete"><small>Delete</small></button>
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

        <div class="tab-pane fade" id="tab-staff">
            <div class="row g-4">
                <div class="col-lg-4">
                    <div class="card h-100">
                        <div class="card-header bg-light text-primary">
                            <span class="material-icons-round align-middle me-1">person_add</span> Add Conductor / Driver
                        </div>
                        <div class="card-body">
                            <form method="POST">
                                <input type="hidden" name="action" value="add_user">
                                <div class="mb-3">
                                    <label class="form-label small fw-bold text-uppercase">Full Name</label>
                                    <input type="text" name="name" class="form-control" placeholder="John Doe" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label small fw-bold text-uppercase">Email Address</label>
                                    <input type="email" name="email" class="form-control" placeholder="staff@byahero.com" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label small fw-bold text-uppercase">Password</label>
                                    <input type="password" name="password" class="form-control" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label small fw-bold text-uppercase">Role</label>
                                    <select name="role" class="form-select" required>
                                        <option value="conductor">Conductor</option>
                                        <option value="driver">Driver</option>
                                    </select>
                                </div>
                                <div class="d-grid">
                                    <button type="submit" class="btn btn-brand">Create Account</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                <div class="col-lg-8">
                    <div class="card h-100">
                        <div class="card-header">Registered Staff</div>
                        <div class="table-responsive">
                            <table class="table table-hover mb-0">
                                <thead class="table-light text-muted small text-uppercase">
                                    <tr>
                                        <th>Role</th>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php if(empty($staff)): ?>
                                        <tr><td colspan="4" class="text-center text-muted py-4">No staff accounts found.</td></tr>
                                    <?php else: foreach($staff as $u): ?>
                                        <tr>
                                            <td><span class="badge bg-secondary text-uppercase"><?= h($u['role']) ?></span></td>
                                            <td class="fw-bold"><?= h($u['name']) ?></td>
                                            <td class="small text-muted"><?= h($u['email']) ?></td>
                                            <td>
                                                <form method="POST" onsubmit="return confirm('Delete user <?= h($u['name']) ?>?');">
                                                    <input type="hidden" name="action" value="delete_user">
                                                    <input type="hidden" name="id" value="<?= h($u['id']) ?>">
                                                    <button class="btn btn-sm btn-outline-danger px-2 py-0" title="Delete"><small>Remove</small></button>
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
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.3/dist/leaflet.js"></script>
<script>
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Map
    const map = L.map('map').setView([14.0905, 121.0550], 12); // Tanauan Area
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }).addTo(map);

    let busMarkers = {};
    const activeCountEl = document.getElementById('activeCount');

    // 2. Fetch and Update Markers Function
    async function updateBusMap() {
        try {
            // Poll the API for bus data (relative to public/ADMIN/ is ../api.php)
            const res = await fetch('../api.php?action=get_buses');
            const data = await res.json();

            if (data.success && data.buses) {
                const buses = data.buses;
                let activeCount = 0;

                // Identify IDs currently on map to check for removals
                const fetchedIds = new Set();

                buses.forEach(bus => {
                    // Only process active buses
                    if (['available', 'on_stop', 'full'].includes(bus.status)) {
                        
                        // Parse Coordinates
                        let coords = null;
                        if (bus.lat && bus.lng) {
                            coords = [bus.lat, bus.lng];
                        } else if (bus.current_location) {
                            try {
                                const geo = JSON.parse(bus.current_location);
                                if (geo.geometry && geo.geometry.coordinates) {
                                    // GeoJSON is [lng, lat], Leaflet needs [lat, lng]
                                    coords = [geo.geometry.coordinates[1], geo.geometry.coordinates[0]];
                                }
                            } catch (e) {}
                        }

                        if (coords) {
                            const id = bus.Bus_ID || bus.id;
                            fetchedIds.add(String(id));
                            activeCount++;

                            // Determine Color
                            let color = '#64748b';
                            if (bus.status === 'available') color = '#10b981';
                            if (bus.status === 'on_stop') color = '#f59e0b';
                            if (bus.status === 'full') color = '#ef4444';

                            // Create HTML Icon
                            const icon = L.divIcon({
                                className: 'custom-bus-marker',
                                html: `<div style="background-color:${color}; width:28px; height:28px; border:2px solid white; border-radius:50%; box-shadow:0 3px 6px rgba(0,0,0,0.3);"></div>`,
                                iconSize: [28, 28],
                                iconAnchor: [14, 14]
                            });

                            // Popup Content
                            const popupContent = `
                                <div class="fw-bold">${bus.code}</div>
                                <div class="small text-muted mb-1">${bus.route || 'No Route'}</div>
                                <span class="badge" style="background:${color}">${bus.status.toUpperCase()}</span>
                                <div class="small mt-1">
                                    <span class="material-icons-round" style="font-size:12px; vertical-align:middle">airline_seat_recline_normal</span>
                                    ${bus.seat_availability}/${bus.total_seats} Seats
                                </div>
                            `;

                            // Update or Create Marker
                            if (busMarkers[id]) {
                                busMarkers[id].setLatLng(coords);
                                busMarkers[id].setIcon(icon);
                                busMarkers[id].setPopupContent(popupContent);
                            } else {
                                const marker = L.marker(coords, { icon: icon }).addTo(map);
                                marker.bindPopup(popupContent);
                                busMarkers[id] = marker;
                            }
                        }
                    }
                });

                // Remove stale markers (buses that went offline or unavailable)
                Object.keys(busMarkers).forEach(id => {
                    if (!fetchedIds.has(id)) {
                        map.removeLayer(busMarkers[id]);
                        delete busMarkers[id];
                    }
                });

                // Update Dashboard Counter
                if (activeCountEl) activeCountEl.innerText = activeCount;
            }
        } catch (e) {
            console.error("Map Update Error:", e);
        }
    }

    // 3. Start Polling (Every 3 seconds)
    updateBusMap(); // Initial call
    setInterval(updateBusMap, 3000);

    // 4. Fix map layout on tab switch
    const tabEl = document.querySelector('button[data-bs-target="#tab-dashboard"]');
    if (tabEl) {
        tabEl.addEventListener('shown.bs.tab', function (event) {
            map.invalidateSize();
        });
    }
});
</script>
</body>
</html>