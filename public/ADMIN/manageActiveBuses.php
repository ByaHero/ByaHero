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

/**
 * "Active" = buses currently in use.
 * Based on your map logic: available, on_stop, full.
 */
$activeStatuses = ['available', 'on_stop', 'full'];

// --- Handle Actions (active buses page) ---
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    try {
        // Update bus status
        if ($action === 'update_status') {
            $id = $_POST['id'] ?? null;
            $status = (string)($_POST['status'] ?? '');

            $allowed = ['available', 'on_stop', 'full', 'unavailable'];
            if (!$id || !in_array($status, $allowed, true)) {
                $error = "Invalid status update request.";
            } else {
                $pdo->prepare("UPDATE busses SET status = ? WHERE Bus_ID = ?")
                    ->execute([$status, $id]);
                $message = "Bus status updated.";
            }
        }
        // Delete bus (same as admin)
        elseif ($action === 'delete_bus') {
            $id = $_POST['id'] ?? null;
            if ($id) {
                $pdo->prepare("DELETE FROM busses WHERE Bus_ID = ?")->execute([$id]);
                $message = "Bus deleted.";
            } else {
                $error = "Invalid delete request.";
            }
        }
    } catch (Exception $e) {
        $error = "Database error: " . $e->getMessage();
    }
}

// --- Fetch active buses ---
$activeBuses = [];
try {
    $in = implode(',', array_fill(0, count($activeStatuses), '?'));
    $stmt = $pdo->prepare("SELECT * FROM busses WHERE status IN ($in) ORDER BY code ASC");
    $stmt->execute($activeStatuses);
    $activeBuses = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (Exception $e) {
    $activeBuses = [];
}
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>ByaHero — Active Buses</title>
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

    <div class="d-flex justify-content-between align-items-center mb-3">
        <div>
            <h4 class="mb-1 fw-bold">Active Buses</h4>
            <p class="text-muted small mb-0">Buses currently in use (available / on stop / full)</p>
        </div>
        <a class="btn btn-sm btn-outline-primary" href="manageActiveBuses.php">
            <span class="material-icons-round" style="font-size:16px; vertical-align:middle">refresh</span>
            Refresh
        </a>
    </div>

    <div class="card card-standard">
        <div class="card-header-std">Active Fleet</div>
        <div class="table-responsive">
            <table class="table table-hover mb-0">
                <thead class="table-light text-muted small text-uppercase">
                    <tr>
                        <th>Code</th>
                        <th>Route</th>
                        <th>Status</th>
                        <th>Seats</th>
                        <th style="width:240px">Actions</th>
                    </tr>
                </thead>
                <tbody>
                <?php if (empty($activeBuses)): ?>
                    <tr><td colspan="5" class="text-center text-muted py-4">No active buses right now.</td></tr>
                <?php else: foreach ($activeBuses as $bus):
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
                        <td class="small"><?= h($bus['route']) ?: '<em class="text-muted">None</em>' ?></td>
                        <td><span class="badge rounded-pill <?= $badgeClass ?>"><?= ucfirst(h($s)) ?></span></td>
                        <td class="small font-monospace"><?= h($bus['seat_availability']) ?>/<?= h($bus['total_seats']) ?></td>
                        <td>
                            <div class="d-flex gap-2 align-items-center flex-wrap">
                                <form method="POST" class="d-flex gap-2 align-items-center">
                                    <input type="hidden" name="action" value="update_status">
                                    <input type="hidden" name="id" value="<?= h($busId) ?>">
                                    <select name="status" class="form-select form-select-sm" style="width:auto">
                                        <option value="available" <?= $s==='available'?'selected':'' ?>>Available</option>
                                        <option value="on_stop" <?= $s==='on_stop'?'selected':'' ?>>On Stop</option>
                                        <option value="full" <?= $s==='full'?'selected':'' ?>>Full</option>
                                        <option value="unavailable" <?= $s==='unavailable'?'selected':'' ?>>Unavailable</option>
                                    </select>
                                    <button class="btn btn-sm btn-outline-primary">Save</button>
                                </form>

                                <form method="POST" onsubmit="return confirm('Delete bus <?= h($bus['code']) ?>?');">
                                    <input type="hidden" name="action" value="delete_bus">
                                    <input type="hidden" name="id" value="<?= h($busId) ?>">
                                    <button class="btn btn-sm btn-outline-danger">Delete</button>
                                </form>
                            </div>
                        </td>
                    </tr>
                <?php endforeach; endif; ?>
                </tbody>
            </table>
        </div>
    </div>

</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>