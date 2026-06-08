<?php
declare(strict_types=1);

ini_set('display_errors', '1');
error_reporting(E_ALL);

require __DIR__ . '/../../config/db.php';

@session_start();

// --- AUTH: rely on public/login.php session values ---
if (empty($_SESSION['user_role']) || $_SESSION['user_role'] !== 'admin') {
    header("Location: ../login.php");
    exit;
}

$conn = db();
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
                    // Manual whitelist check since table name is interpolated
                    if (!in_array($t, ['admins', 'drivers', 'conductors'])) continue;
                    
                    $chk = $conn->prepare("SELECT id FROM {$t} WHERE email = ? LIMIT 1");
                    $chk->bind_param("s", $email);
                    $chk->execute();
                    if ($chk->get_result()->fetch_assoc()) { $exists = true; break; }
                }

                if ($exists) {
                    $error = "Email is already registered in the system.";
                } else {
                    $hash = password_hash($password, PASSWORD_DEFAULT);
                    if ($role === 'driver') {
                        $stmt = $conn->prepare("INSERT INTO drivers (email, password, created_at) VALUES (?, ?, NOW())");
                        $stmt->bind_param("ss", $email, $hash);
                        $stmt->execute();
                        $message = "New driver <strong>" . h($email) . "</strong> added!";
                    } else {
                        $stmt = $conn->prepare("INSERT INTO conductors (email, password, created_at) VALUES (?, ?, NOW())");
                        $stmt->bind_param("ss", $email, $hash);
                        $stmt->execute();
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
                $stDel = $conn->prepare("DELETE FROM {$table} WHERE id = ?");
                $stDel->bind_param("i", $id);
                $stDel->execute();
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
    $resDrivers = $conn->query("SELECT id, email, created_at, 'driver' AS role FROM drivers ORDER BY email ASC");
    $drivers = $resDrivers ? $resDrivers->fetch_all(MYSQLI_ASSOC) : [];

    $resConductors = $conn->query("SELECT id, email, created_at, 'conductor' AS role FROM conductors ORDER BY email ASC");
    $conductors = $resConductors ? $resConductors->fetch_all(MYSQLI_ASSOC) : [];
    
    $staff = array_merge($conductors, $drivers);
} catch (Throwable $e) {
    $staff = [];
}

/* === navbarAdmin config (component) === */
$pageDepth = '../../';
$pageType = 'manageConductors';
$backLink = 'admin.php';
/* === END === */
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <link rel="icon" href="../../assets/images/byaheroLogoBlue.svg" type="image/svg+xml">
    <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
    <title>ByaHero — Manage Conductors & Drivers</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Material+Icons+Round&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
    <style>
        <?php include __DIR__ . '/../../assets/css/admin/manageConductors.css'; ?>
    </style>
</head>
<body>

<?php include __DIR__ . '/../../components/navbarAdmin.php'; ?>

<div class="container py-3 py-lg-4" style="max-width: 480px;">

    <?php if($message): ?>
        <div class="alert alert-success alert-dismissible fade show shadow-sm" role="alert" style="border-radius: 14px;">
            <?= $message ?>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    <?php endif; ?>

    <?php if($error): ?>
        <div class="alert alert-danger alert-dismissible fade show shadow-sm" role="alert" style="border-radius: 14px;">
            <?= $error ?>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    <?php endif; ?>

    <h2 class="text-center fw-bold fs-4 mb-3" style="color: #0f172a; margin: 18px 0 14px;">New Conductor & Driver</h2>

    <div class="bg-white rounded-4 shadow border p-4 mb-4" style="border-color: rgba(148, 163, 184, 0.35) !important;">
        <form method="POST">
            <input type="hidden" name="action" value="add_user">

            <!-- Photo has First/Last name fields; backend doesn't store them.
                 We keep the UI similar but do NOT send them to backend to avoid breaking anything. -->
            <div class="mb-3">
                <div class="small text-secondary fw-semibold mb-1" style="font-size: 0.78rem;">First Name</div>
                <input type="text" class="form-control shadow-sm px-3 py-2" style="border-radius: 10px; border: 1px solid rgba(148, 163, 184, 0.55);" placeholder="First Name" disabled>
            </div>

            <div class="mb-3">
                <div class="small text-secondary fw-semibold mb-1" style="font-size: 0.78rem;">Last name</div>
                <input type="text" class="form-control shadow-sm px-3 py-2" style="border-radius: 10px; border: 1px solid rgba(148, 163, 184, 0.55);" placeholder="Last name" disabled>
            </div>

            <div class="mb-3">
                <div class="small text-secondary fw-semibold mb-1" style="font-size: 0.78rem;">Email</div>
                <input type="email" name="email" class="form-control shadow-sm px-3 py-2" style="border-radius: 10px; border: 1px solid rgba(148, 163, 184, 0.55);" placeholder="staff@byahero.com" required>
            </div>

            <div class="mb-3">
                <div class="small text-secondary fw-semibold mb-1" style="font-size: 0.78rem;">Password</div>
                <div class="pw-wrap">
                    <input type="password" name="password" id="pwField" class="form-control shadow-sm px-3 py-2 pe-5" style="border-radius: 10px; border: 1px solid rgba(148, 163, 184, 0.55);" required>
                    <button type="button" class="pw-eye" id="togglePw" aria-pressed="false" aria-label="Show password" title="Show password">
                        <img src="../../assets/images/hash.svg" id="eyeIcon" style="width:18px; height:18px;" alt="Show password">
                    </button>
                </div>
            </div>

            <!-- keep role support but visually minimal (not in photo) -->
            <div class="mb-3">
                <div class="small text-secondary fw-semibold mb-1" style="font-size: 0.78rem;">Role</div>
                <select name="role" class="form-select shadow-sm px-3 py-2" style="border-radius: 10px; border: 1px solid rgba(148, 163, 184, 0.55);" aria-label="Role">
                    <option value="conductor" selected>Conductor</option>
                    <option value="driver">Driver</option>
                </select>
            </div>

            <div class="d-flex justify-content-center mt-4">
                <button type="submit" class="btn btn-primary rounded-pill px-5 py-2 fw-bold" style="background-color: #1d4ed8; border-color: #1d4ed8; font-size: 0.95rem;">Save</button>
            </div>
        </form>
    </div>

    <div class="d-flex justify-content-between align-items-center fw-bold mt-4 mb-2 mx-auto" style="max-width: 420px; color: #0f172a; cursor: pointer; user-select: none;" data-bs-toggle="collapse" data-bs-target="#staffListCollapse" aria-expanded="false" aria-controls="staffListCollapse">
        <span>Registered Staff</span>
        <span class="material-icons-round transition-icon text-muted">expand_more</span>
    </div>
    <div class="collapse" id="staffListCollapse">
        <div class="bg-white rounded-4 shadow border overflow-hidden mb-4" style="max-width: 420px; margin: 0 auto; border-color: rgba(148, 163, 184, 0.30) !important;">
            <?php if(empty($staff)): ?>
                <div class="text-center text-muted py-4">No staff accounts found.</div>
            <?php else: foreach($staff as $u): ?>
                <div class="d-flex justify-content-between align-items-center gap-2 p-3 border-bottom" style="border-bottom-color: #f1f5f9 !important;">
                    <div style="min-width:0">
                        <p class="fw-bold mb-0 text-truncate text-dark" style="font-size: 0.95rem;"><?= h($u['email']) ?></p>
                        <p class="mb-0 text-secondary" style="font-size: 0.78rem;"><?= h($u['created_at'] ?? '') ?></p>
                    </div>

                    <div class="d-flex align-items-center gap-2">
                        <span class="badge rounded-pill bg-secondary bg-opacity-10 text-dark px-2 py-1 text-uppercase fw-bold" style="font-size: 0.72rem;"><?= h($u['role'] ?? 'staff') ?></span>

                        <form method="POST" onsubmit="return confirm('Delete <?= h($u['email']) ?>?');" class="m-0">
                            <input type="hidden" name="action" value="delete_user">
                            <input type="hidden" name="id" value="<?= h($u['id']) ?>">
                            <input type="hidden" name="role" value="<?= h($u['role'] ?? 'conductor') ?>">
                            <button class="btn btn-danger rounded-pill px-3 py-1 fw-bold" style="background-color: #dc2626; border-color: #dc2626; font-size: 0.78rem;" type="submit">Remove</button>
                        </form>
                    </div>
                </div>
            <?php endforeach; endif; ?>
        </div>
    </div>

</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
<script>
    <?php include __DIR__ . '/../../assets/js/admin/manageConductors.js'; ?>
</script>
</body>
</html>