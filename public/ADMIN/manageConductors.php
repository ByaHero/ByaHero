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

// --- Handle Form Submissions (STAFF ONLY) ---
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    try {
        // Add Conductor / Driver
        if ($action === 'add_user') {
            $email = trim((string)($_POST['email'] ?? ''));
            $password = (string)($_POST['password'] ?? '');
            $role = $_POST['role'] ?? 'conductor';

            if ($email === '' || $password === '') {
                $error = "Email and password are required.";
            } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $error = "Please provide a valid email address.";
            } else {
                $tablesToCheck = ['admins', 'drivers', 'conductors'];
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
        // Delete User
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

// --- Fetch Staff Data ---
$staff = [];
try {
    $drivers = $pdo->query("SELECT id, email, created_at, 'driver' AS role FROM drivers ORDER BY email ASC")->fetchAll(PDO::FETCH_ASSOC);
    $conductors = $pdo->query("SELECT id, email, created_at, 'conductor' AS role FROM conductors ORDER BY email ASC")->fetchAll(PDO::FETCH_ASSOC);
    $staff = array_merge($conductors, $drivers);
} catch (Exception $e) {
    $staff = [];
}
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>ByaHero — Manage Conductors & Drivers</title>
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
        .table > :not(caption) > * > * { padding: 0.75rem 1rem; vertical-align: middle; }
    </style>
</head>
<body>

<nav class="navbar navbar-expand-lg navbar-dark mb-4">
    <div class="container">
        <a class="navbar-brand fw-bold d-flex align-items-center gap-2" href="admin.php">
            <span class="material-icons-round">directions_bus</span> ByaHero
        </a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navContent">
            <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navContent">
            <ul class="navbar-nav ms-auto gap-2">
                <li class="nav-item">
                    <a class="nav-link" href="admin.php">Back to Admin</a>
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

    <div class="d-flex justify-content-between align-items-center mb-3">
        <div>
            <h4 class="mb-1 fw-bold">Conductors & Drivers</h4>
            <p class="text-muted small mb-0">Add and manage staff accounts</p>
        </div>
    </div>

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

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>