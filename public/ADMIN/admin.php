<?php
declare(strict_types=1);

ini_set('display_errors', '1');
error_reporting(E_ALL);

require __DIR__ . '/../../config/db.php';

session_start();

// --- AUTH: rely on public/login.php session values ---
if (empty($_SESSION['user_role']) || $_SESSION['user_role'] !== 'admin') {
    header('Location: ../login.php');
    exit;
}

$pdo = db();
$message = '';
$error = '';

// --- Helper ---
function h($s): string {
    return htmlspecialchars((string)$s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

// --- Handle Form Submissions ---
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    try {
        // 1. Add New Bus
        if ($action === 'add_bus') {
            $code = trim((string)($_POST['code'] ?? ''));
            $route = trim((string)($_POST['route'] ?? ''));
            $seats = (int)($_POST['total_seats'] ?? 25);
            $status = $_POST['status'] ?? 'unavailable';

            if ($code && $route) {
                $stmt = $pdo->prepare("INSERT INTO busses (code, route, total_seats, seat_availability, status) VALUES (?, ?, ?, ?, ?)");
                $stmt->execute([$code, $route, $seats, $seats, $status]);
                $message = "Bus <strong>" . h($code) . "</strong> added successfully!";
            } else {
                $error = "Bus Code and Route are required.";
            }
        }
        // 2. Add Conductor / Driver
        elseif ($action === 'add_user') {
            $email = trim((string)($_POST['email'] ?? ''));
            $password = (string)($_POST['password'] ?? '');
            $role = $_POST['role'] ?? 'conductor';

            if ($email === '' || $password === '') {
                $error = "Email and password are required.";
            } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $error = "Please provide a valid email address.";
            } else {
                $tablesToCheck = ['admins', 'users_new', 'drivers', 'conductors'];
                $exists = false;
                foreach ($tablesToCheck as $t) {
                    $chk = $pdo->prepare("SELECT id FROM {$t} WHERE email = ? LIMIT 1");
                    $chk->execute([$email]);
                    if ($chk->fetch()) { $exists = true; break; }
                }

                if ($exists) {
                    $error = "Email is already registered in the system.";
                } else {
                    $hash = password_hash($password, PASSWORD_DEFAULT);
                    if ($role === 'driver') {
                        $stmt = $pdo->prepare("INSERT INTO drivers (email, password, created_at) VALUES (?, ?, NOW())");
                        $stmt->execute([$email, $hash]);
                        $message = "New driver <strong>" . h($email) . "</strong> added!";
                    } else {
                        $stmt = $pdo->prepare("INSERT INTO conductors (email, password, created_at) VALUES (?, ?, NOW())");
                        $stmt->execute([$email, $hash]);
                        $message = "New conductor <strong>" . h($email) . "</strong> added!";
                    }
                }
            }
        }
        // 3. Delete Bus
        elseif ($action === 'delete_bus') {
            $id = $_POST['id'] ?? null;
            if ($id) {
                $pdo->prepare("DELETE FROM busses WHERE Bus_ID = ?")->execute([$id]);
                $message = "Bus deleted.";
            }
        }
        // 4. Delete User
        elseif ($action === 'delete_user') {
            $id = $_POST['id'] ?? null;
            $role = $_POST['role'] ?? '';
            if ($id && in_array($role, ['driver', 'conductor'], true)) {
                $table = $role === 'driver' ? 'drivers' : 'conductors';
                $pdo->prepare("DELETE FROM {$table} WHERE id = ?")->execute([$id]);
                $message = ucfirst($role) . " deleted.";
            } else {
                $error = "Invalid delete request.";
            }
        }
    } catch (Exception $e) {
        $error = "Database error: " . $e->getMessage();
    }
}

// --- Fetch Data ---
$staff = [];
try {
    $drivers = $pdo->query("SELECT id, email, created_at, 'driver' AS role FROM drivers ORDER BY email ASC")->fetchAll(PDO::FETCH_ASSOC);
    $conductors = $pdo->query("SELECT id, email, created_at, 'conductor' AS role FROM conductors ORDER BY email ASC")->fetchAll(PDO::FETCH_ASSOC);
    $staff = array_merge($conductors, $drivers);
} catch (Exception $e) {
    $staff = [];
}

$buses = [];
try {
    $buses = $pdo->query("SELECT * FROM busses ORDER BY code ASC")->fetchAll(PDO::FETCH_ASSOC);
} catch (Exception $e) {
    $buses = [];
}
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
        :root { --brand: #2563eb; }
        body { background: #f8fafc; color: #1e293b; font-family: "Segoe UI", system-ui, sans-serif; }
        .navbar { background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .nav-link { color: rgba(255,255,255,0.85) !important; font-weight: 500; }
        .nav-link.active { color: #fff !important; background: rgba(255,255,255,0.15); border-radius: 6px; }
        
        /* Custom Dashboard Card Styles */
        .stat-card {
            border-radius: 20px;
            border: none;
            color: white;
            padding: 1.25rem;
            position: relative;
            box-shadow: 0 4px 15px rgba(0,0,0,0.15);
            height: 160px; /* Fixed height for consistency */
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            overflow: hidden;
            transition: transform 0.2s;
        }
        .stat-card:hover { transform: translateY(-3px); }
        
        /* Specific Card Colors */
        .card-total { background: #4e85c5; } /* Muted Blue */
        .card-active { background: #15b77e; } /* Green */
        .card-drivers { background: #addbea; } /* Light Blue */
        .card-conductors { background: #2666be; } /* Royal Blue */

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
            text-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .btn-manage-pill {
            position: absolute;
            top: 20px;
            right: 20px;
            background: white;
            color: #333;
            border-radius: 20px;
            padding: 4px 12px;
            font-size: 0.75rem;
            font-weight: 700;
            text-decoration: none;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            cursor: pointer;
            z-index: 3;
            border: none;
            transition: background 0.2s;
        }
        .btn-manage-pill:hover { background: #f1f5f9; color: var(--brand); }
        .card-drivers .btn-manage-pill { color: #555; }

        /* Media query to ensure cards look good when split 2 per row on mobile */
        @media (max-width: 767px) {
            .stat-card { height: 140px; padding: 1rem; }
            .stat-card-number { font-size: 2.5rem; }
            .stat-card-title { font-size: 0.95rem; }
            .btn-manage-pill { padding: 3px 10px; font-size: 0.7rem; top: 15px; right: 15px; }
        }

        /* Existing Styles */
        .card-standard { border: none; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 1.5rem; background: #fff; }
        .card-header-std { background: #fff; border-bottom: 1px solid #e2e8f0; font-weight: 600; padding: 1rem 1.25rem; border-radius: 10px 10px 0 0 !important; }
        .btn-brand { background-color: var(--brand); color: white; }
        .map-wrapper { height: 500px; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
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
            <span class="material-icons-round">directions_bus</span> ByaHero
        </a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navContent">
            <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navContent">
            <ul class="nav nav-pills ms-auto gap-2" id="adminTabs" role="tablist">
                <li class="nav-item">
                    <button class="nav-link active" id="btn-tab-dashboard" data-bs-toggle="pill" data-bs-target="#tab-dashboard">Dashboard & Map</button>
                </li>
                <li class="nav-item">
                    <button class="nav-link" id="btn-tab-buses" data-bs-toggle="pill" data-bs-target="#tab-buses">Manage Buses</button>
                </li>
                <li class="nav-item">
                    <button class="nav-link" id="btn-tab-staff" data-bs-toggle="pill" data-bs-target="#tab-staff">Conductors & Drivers</button>
                </li>
            </ul>
            <div class="ms-3">
                <a href="logout.php" class="btn btn-outline-light btn-sm">Logout</a>
            </div>
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
            <div class="row g-3 g-lg-4 mb-4">
                
                <div class="col-6 col-md-6 col-lg-3">
                    <div class="stat-card card-total">
                        <div class="stat-card-title">Total Buses</div>
                        <button class="btn-manage-pill" onclick="switchTab('#tab-buses')">Manage</button>
                        <div class="stat-card-number"><?= count($buses) ?></div>
                    </div>
                </div>

                <div class="col-6 col-md-6 col-lg-3">
                    <div class="stat-card card-active">
                        <div class="stat-card-title">Active Buses</div>
                        <button class="btn-manage-pill" onclick="switchTab('#tab-buses')">Manage</button>
                        <div class="stat-card-number" id="activeCount">-</div>
                    </div>
                </div>

                <div class="col-6 col-md-6 col-lg-3">
                    <div class="stat-card card-drivers">
                        <div class="stat-card-title">Drivers</div>
                        <button class="btn-manage-pill" onclick="switchTab('#tab-staff')">Manage</button>
                        <div class="stat-card-number"><?= count(array_filter($staff, fn($u) => ($u['role'] ?? '') === 'driver')) ?></div>
                    </div>
                </div>

                <div class="col-6 col-md-6 col-lg-3">
                    <div class="stat-card card-conductors">
                        <div class="stat-card-title">Conductors</div>
                        <button class="btn-manage-pill" onclick="switchTab('#tab-staff')">Manage</button>
                        <div class="stat-card-number"><?= count(array_filter($staff, fn($u) => ($u['role'] ?? '') === 'conductor')) ?></div>
                    </div>
                </div>
            </div>

            <div class="card card-standard">
                <div class="card-header-std d-flex justify-content-between align-items-center">
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

        <div class="tab-pane fade" id="tab-buses">
            <div class="row g-4">
                <div class="col-lg-4">
                    <div class="card card-standard h-100">
                        <div class="card-header-std text-primary">
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
                    <div class="card card-standard h-100">
                        <div class="card-header-std">Existing Fleet</div>
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
                    <div class="card card-standard h-100">
                        <div class="card-header-std text-primary">
                            <span class="material-icons-round align-middle me-1">person_add</span> Add Conductor / Driver
                        </div>
                        <div class="card-body">
                            <form method="POST">
                                <input type="hidden" name="action" value="add_user">
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
                    <div class="card card-standard h-100">
                        <div class="card-header-std">Registered Staff</div>
                        <div class="table-responsive">
                            <table class="table table-hover mb-0">
                                <thead class="table-light text-muted small text-uppercase">
                                    <tr>
                                        <th>Role</th>
                                        <th>Email</th>
                                        <th>Created At</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php if(empty($staff)): ?>
                                        <tr><td colspan="4" class="text-center text-muted py-4">No staff accounts found.</td></tr>
                                    <?php else: foreach($staff as $u): ?>
                                        <tr>
                                            <td><span class="badge bg-secondary text-uppercase"><?= h($u['role'] ?? 'staff') ?></span></td>
                                            <td class="fw-bold"><?= h($u['email']) ?></td>
                                            <td class="small text-muted"><?= h($u['created_at'] ?? '') ?></td>
                                            <td>
                                                <form method="POST" onsubmit="return confirm('Delete <?= h($u['email']) ?>?');">
                                                    <input type="hidden" name="action" value="delete_user">
                                                    <input type="hidden" name="id" value="<?= h($u['id']) ?>">
                                                    <input type="hidden" name="role" value="<?= h($u['role'] ?? 'conductor') ?>">
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
// Helper to switch tabs via the "Manage" buttons
function switchTab(tabSelector) {
    const triggerEl = document.querySelector(`button[data-bs-target="${tabSelector}"]`);
    if(triggerEl) {
        bootstrap.Tab.getOrCreateInstance(triggerEl).show();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const map = L.map('map').setView([14.0905, 121.0550], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }).addTo(map);

    let busMarkers = {};
    const activeCountEl = document.getElementById('activeCount');

    async function updateBusMap() {
        try {
            // Note: Ensure api.php is returning correct JSON format
            const res = await fetch('../api.php?action=get_buses');
            const data = await res.json();

            if (data.success && data.buses) {
                const buses = data.buses;
                let activeCount = 0;
                const fetchedIds = new Set();

                buses.forEach(bus => {
                    if (['available', 'on_stop', 'full'].includes(bus.status)) {
                        let coords = null;
                        if (bus.lat && bus.lng) coords = [bus.lat, bus.lng];
                        else if (bus.current_location) {
                            try {
                                const geo = JSON.parse(bus.current_location);
                                if (geo.geometry && geo.geometry.coordinates) coords = [geo.geometry.coordinates[1], geo.geometry.coordinates[0]];
                            } catch (e) {}
                        }

                        if (coords) {
                            const id = bus.Bus_ID || bus.id;
                            fetchedIds.add(String(id));
                            activeCount++;

                            let color = '#64748b';
                            if (bus.status === 'available') color = '#10b981';
                            if (bus.status === 'on_stop') color = '#f59e0b';
                            if (bus.status === 'full') color = '#ef4444';

                            const icon = L.divIcon({
                                className: 'custom-bus-marker',
                                html: `<div style="background-color:${color}; width:28px; height:28px; border:2px solid white; border-radius:50%; box-shadow:0 3px 6px rgba(0,0,0,0.3);"></div>`,
                                iconSize: [28, 28],
                                iconAnchor: [14, 14]
                            });

                            const popupContent = `
                                <div class="fw-bold">${bus.code}</div>
                                <div class="small text-muted mb-1">${bus.route || 'No Route'}</div>
                                <span class="badge" style="background:${color}">${bus.status.toUpperCase()}</span>
                                <div class="small mt-1">
                                    <span class="material-icons-round" style="font-size:12px; vertical-align:middle">airline_seat_recline_normal</span>
                                    ${bus.seat_availability}/${bus.total_seats} Seats
                                </div>
                            `;

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

                Object.keys(busMarkers).forEach(id => {
                    if (!fetchedIds.has(id)) {
                        map.removeLayer(busMarkers[id]);
                        delete busMarkers[id];
                    }
                });

                if (activeCountEl) activeCountEl.innerText = activeCount;
            }
        } catch (e) {
            console.error("Map Update Error:", e);
        }
    }

    updateBusMap();
    setInterval(updateBusMap, 3000);

    const tabEl = document.querySelector('button[data-bs-target="#tab-dashboard"]');
    if (tabEl) {
        tabEl.addEventListener('shown.bs.tab', function () { map.invalidateSize(); });
    }
});
</script>
</body>
</html>