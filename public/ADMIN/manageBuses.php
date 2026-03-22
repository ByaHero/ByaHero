<?php
declare(strict_types=1);

ini_set('display_errors', '1');
error_reporting(E_ALL);

require __DIR__ . '/../../config/db.php';

session_start();

// --- AUTH ---
if (empty($_SESSION['user_role']) || $_SESSION['user_role'] !== 'admin') {
    header('Location: ../login.php');
    exit;
}

$pdo = db();
$message = '';
$error = '';

function h($s): string {
    return htmlspecialchars((string)$s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

// --- Handle Form Submissions (BUSES ONLY) ---
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    try {
        // Add New Bus
        if ($action === 'add_bus') {
            $code  = trim((string)($_POST['code'] ?? ''));
            $route = trim((string)($_POST['route'] ?? ''));
            // allow NULL route (no assignment yet)
            $route = ($route === '') ? null : $route;

            // Always default to 25 seats
            $seats  = 25;
            // Initial status default to 'unavailable'
            $status = (string)($_POST['status'] ?? 'unavailable');

            if ($code === '') {
                $error = "Bus Code is required.";
            } else {
                $stmt = $pdo->prepare(
                    "INSERT INTO busses (code, route, total_seats, seat_availability, status)
                     VALUES (?, ?, ?, ?, ?)"
                );
                $stmt->execute([$code, $route, $seats, $seats, $status]);
                $message = "Bus <strong>" . h($code) . "</strong> added successfully!";
            }
        }
        // Delete Bus
        elseif ($action === 'delete_bus') {
            $id = $_POST['id'] ?? null;
            if ($id) {
                $pdo->prepare("DELETE FROM busses WHERE Bus_ID = ?")->execute([$id]);
                $message = "Bus deleted.";
            } else {
                $error = "Invalid delete request.";
            }
        }
        // Update Bus Route/Seats/Status (optional quick edit)
        elseif ($action === 'update_bus') {
            $id = $_POST['id'] ?? null;
            $route = trim((string)($_POST['route'] ?? ''));
            $route = ($route === '') ? null : $route;   // still allow “no route” if you clear it

            $totalSeats = (int)($_POST['total_seats'] ?? 25);
            $status     = (string)($_POST['status'] ?? 'unavailable');

            $allowedStatuses = ['available', 'on_stop', 'full', 'unavailable'];

            if (!$id) {
                $error = "Invalid update request.";
            } elseif ($totalSeats < 1) {
                $error = "Total seats must be valid.";
            } elseif (!in_array($status, $allowedStatuses, true)) {
                $error = "Invalid status.";
            } else {
                // Keep seat_availability <= total_seats
                $stmt = $pdo->prepare("
                    UPDATE busses
                    SET route = ?,
                        total_seats = ?,
                        seat_availability = LEAST(seat_availability, ?),
                        status = ?
                    WHERE Bus_ID = ?
                ");
                $stmt->execute([$route, $totalSeats, $totalSeats, $status, $id]);
                $message = "Bus updated.";
            }
        }
    } catch (Exception $e) {
        $error = "Database error: " . $e->getMessage();
    }
}

// --- Fetch Buses ---
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
    <title>ByaHero — Manage Buses</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet">
    <style>
        :root { --brand: #2563eb; }
        body { background: #f8fafc; color: #1e293b; font-family: "Segoe UI", system-ui, sans-serif; }
        .navbar { background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .nav-link { color: rgba(255,255,255,0.85) !important; font-weight: 500; }
        .card-standard { border: none; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 1.5rem; background: #fff; }
        .card-header-std { background: #fff; border-bottom: 1px solid #e2e8f0; font-weight: 600; padding: 1rem 1.25rem; border-radius: 10px 10px 0 0 !important; }
        .btn-brand { background-color: var(--brand); color: white; }
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
        <a class="navbar-brand fw-bold d-flex align-items-center gap-2" href="admin.php">
            <span class="material-icons-round">directions_bus</span> ByaHero
        </a>
        <div class="ms-auto d-flex gap-2 align-items-center">
            <a class="nav-link" href="admin.php">Back to Admin</a>
            <a href="logout.php" class="btn btn-outline-light btn-sm">Logout</a>
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
                            <!-- NO route required on create; stays "null" unless admin sets it later -->
                            <select name="route" class="form-select">
                                <option value="" selected>-- Select Route --</option>
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
                                <option value="unavailable" selected>Unavailable</option>
                                <option value="available">Available</option>
                                <option value="on_stop">On Stop</option>
                                <option value="full">Full</option>
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
                                <th style="width:340px">Quick Edit</th>
                                <th style="width:120px">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                        <?php if (empty($buses)): ?>
                            <tr><td colspan="6" class="text-center text-muted py-4">No buses found.</td></tr>
                        <?php else: foreach ($buses as $bus):
                            $s = (string)($bus['status'] ?? '');
                            $badgeClass = match($s) {
                                'available' => 'badge-avail',
                                'on_stop' => 'badge-stop',
                                'full' => 'badge-full',
                                default => 'badge-none'
                            };
                            $busId = $bus['Bus_ID'] ?? $bus['id'] ?? null;
                        ?>
                            <tr>
                                <td class="fw-bold"><?= h($bus['code']) ?></td>
                                <td class="small">
                                    <?php if (!empty($bus['route'])): ?>
                                        <?= h($bus['route']) ?>
                                    <?php else: ?>
                                        <em class="text-muted">None</em>
                                    <?php endif; ?>
                                </td>
                                <td><span class="badge rounded-pill <?= $badgeClass ?>"><?= ucfirst(h($s)) ?></span></td>
                                <td class="small font-monospace"><?= h($bus['seat_availability']) ?>/<?= h($bus['total_seats']) ?></td>

                                <td>
                                    <form method="POST" class="d-flex gap-2 align-items-center flex-wrap">
                                        <input type="hidden" name="action" value="update_bus">
                                        <input type="hidden" name="id" value="<?= h($busId) ?>">

                                        <select name="route" class="form-select form-select-sm" style="min-width:200px">
                                            <option value="" <?= empty($bus['route']) ? 'selected' : '' ?>>None</option>
                                            <option value="LAUREL - TANAUAN" <?= ($bus['route'] ?? '') === 'LAUREL - TANAUAN' ? 'selected' : '' ?>>LAUREL - TANAUAN</option>
                                            <option value="TANAUAN - LAUREL" <?= ($bus['route'] ?? '') === 'TANAUAN - LAUREL' ? 'selected' : '' ?>>TANAUAN - LAUREL</option>
                                        </select>

                                        <input type="number" name="total_seats" class="form-control form-control-sm" style="width:90px"
                                               value="<?= h($bus['total_seats']) ?>" min="10" max="60" required>

                                        <select name="status" class="form-select form-select-sm" style="width:auto">
                                            <option value="unavailable" <?= $s==='unavailable'?'selected':'' ?>>Unavailable</option>
                                            <option value="available" <?= $s==='available'?'selected':'' ?>>Available</option>
                                            <option value="on_stop" <?= $s==='on_stop'?'selected':'' ?>>On Stop</option>
                                            <option value="full" <?= $s==='full'?'selected':'' ?>>Full</option>
                                        </select>

                                        <button class="btn btn-sm btn-outline-primary">Save</button>
                                    </form>
                                </td>

                                <td>
                                    <form method="POST" onsubmit="return confirm('Delete bus <?= h($bus['code']) ?>?');">
                                        <input type="hidden" name="action" value="delete_bus">
                                        <input type="hidden" name="id" value="<?= h($busId) ?>">
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

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>