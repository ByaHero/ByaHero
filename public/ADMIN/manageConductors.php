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
    <title>ByaHero — Manage Conductors & Drivers</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet">
    <style>
        body { background: #f8fafc; color: #1e293b; font-family: "Segoe UI", system-ui, sans-serif; }
        .page-wrap { padding: 16px; }
        .alert { border-radius: 14px; }

        /* Match photo: centered title + single clean card + big pill save button */
        .page-title {
            text-align: center;
            font-weight: 900;
            font-size: 1.45rem;
            margin: 18px 0 14px;
            color: #0f172a;
        }

        .form-shell {
            max-width: 420px;
            margin: 0 auto;
        }

        .form-card {
            background: #fff;
            border-radius: 14px;
            box-shadow: 0 10px 26px rgba(15, 23, 42, 0.12);
            border: 1px solid rgba(148, 163, 184, 0.35);
            padding: 16px 16px 18px;
        }

        .field-label {
            font-size: .78rem;
            color: #64748b;
            font-weight: 700;
            margin: 0 0 6px;
        }

        .pill-input {
            border-radius: 10px;
            border: 1px solid rgba(148, 163, 184, 0.55);
            box-shadow: 0 10px 20px rgba(15, 23, 42, 0.08);
            padding: 10px 12px;
        }

        .pw-wrap {
            position: relative;
        }
        .pw-eye {
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            border: 0;
            background: transparent;
            color: #334155;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 4px;
            cursor: pointer;
            width: 28px;
            height: 28px;
            border-radius: 6px;
        }

        .save-wrap {
            display: flex;
            justify-content: center;
            margin-top: 18px;
        }

        .btn-save {
            border-radius: 999px;
            font-weight: 900;
            padding: 10px 34px;
            background: #1d4ed8;
            border: 0;
        }
        .btn-save:hover { background: #1e40af; }

        /* Staff list kept but minimal; below form */
        .list-title {
            max-width: 420px;
            margin: 18px auto 8px;
            font-weight: 900;
            color: #0f172a;
            cursor: pointer;
            user-select: none;
        }
        .transition-icon {
            transition: transform 0.3s ease;
        }
        .list-title[aria-expanded="true"] .transition-icon {
            transform: rotate(180deg);
        }

        .list-card {
            max-width: 420px;
            margin: 0 auto;
            background: #fff;
            border-radius: 14px;
            box-shadow: 0 10px 26px rgba(15, 23, 42, 0.08);
            border: 1px solid rgba(148, 163, 184, 0.30);
            overflow: hidden;
        }

        .staff-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 10px;
            padding: 12px 14px;
            border-bottom: 1px solid #f1f5f9;
        }
        .staff-row:last-child { border-bottom: none; }

        .staff-email { margin: 0; font-weight: 900; font-size: .95rem; }
        .staff-sub { margin: 2px 0 0; font-size: .78rem; color: #94a3b8; }

        .role-pill {
            border-radius: 999px;
            padding: 6px 10px;
            font-weight: 900;
            font-size: .72rem;
            text-transform: uppercase;
            background: #e2e8f0;
            color: #0f172a;
            white-space: nowrap;
        }

        /* CHANGED: Remove button is now pill + solid */
        .btn-remove{
            border-radius: 999px;
            font-weight: 900;
            padding: 8px 14px;
            border: 0;
            background: #dc2626;
            color: #fff;
        }
        .btn-remove:hover{
            background: #b91c1c;
            color: #fff;
        }
    </style>
</head>
<body>

<?php include __DIR__ . '/../../components/navbarAdmin.php'; ?>

<div class="page-wrap">

    <?php if($message): ?>
        <div class="alert alert-success alert-dismissible fade show shadow-sm" role="alert">
            <?= $message ?>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    <?php endif; ?>

    <?php if($error): ?>
        <div class="alert alert-danger alert-dismissible fade show shadow-sm" role="alert">
            <?= $error ?>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    <?php endif; ?>

    <div class="page-title">New Conductor & Driver</div>

    <div class="form-shell">
        <div class="form-card">
            <form method="POST">
                <input type="hidden" name="action" value="add_user">

                <!-- Photo has First/Last name fields; backend doesn't store them.
                     We keep the UI similar but do NOT send them to backend to avoid breaking anything. -->
                <div class="mb-3">
                    <div class="field-label">First Name</div>
                    <input type="text" class="form-control pill-input" placeholder="First Name" disabled>
                </div>

                <div class="mb-3">
                    <div class="field-label">Last name</div>
                    <input type="text" class="form-control pill-input" placeholder="Last name" disabled>
                </div>

                <div class="mb-3">
                    <div class="field-label">Email</div>
                    <input type="email" name="email" class="form-control pill-input" placeholder="staff@byahero.com" required>
                </div>

                <div class="mb-3">
                    <div class="field-label">Password</div>
                    <div class="pw-wrap">
                        <input type="password" name="password" id="pwField" class="form-control pill-input pe-5" required>
                        <button type="button" class="pw-eye" id="togglePw" aria-pressed="false" aria-label="Show password" title="Show password">
                            <span id="eyeIcon" class="material-icons-round" style="font-size:18px;line-height:1;">visibility_off</span>
                        </button>
                    </div>
                </div>

                <!-- keep role support but visually minimal (not in photo) -->
                <div class="mb-2">
                    <select name="role" class="form-select pill-input" aria-label="Role">
                        <option value="conductor" selected>Conductor</option>
                        <option value="driver">Driver</option>
                    </select>
                </div>

                <div class="save-wrap">
                    <button type="submit" class="btn btn-primary btn-save">Save</button>
                </div>
            </form>
        </div>
    </div>

    <div class="list-title d-flex justify-content-between align-items-center" data-bs-toggle="collapse" data-bs-target="#staffListCollapse" aria-expanded="false" aria-controls="staffListCollapse">
        <span>Registered Staff</span>
        <span class="material-icons-round transition-icon text-muted">expand_more</span>
    </div>
    <div class="collapse" id="staffListCollapse">
        <div class="list-card mb-4">
            <?php if(empty($staff)): ?>
                <div class="text-center text-muted py-4">No staff accounts found.</div>
            <?php else: foreach($staff as $u): ?>
                <div class="staff-row">
                    <div style="min-width:0">
                        <p class="staff-email text-truncate"><?= h($u['email']) ?></p>
                        <p class="staff-sub"><?= h($u['created_at'] ?? '') ?></p>
                    </div>

                    <div class="d-flex align-items-center gap-2">
                        <span class="role-pill"><?= h($u['role'] ?? 'staff') ?></span>

                        <form method="POST" onsubmit="return confirm('Delete <?= h($u['email']) ?>?');" class="m-0">
                            <input type="hidden" name="action" value="delete_user">
                            <input type="hidden" name="id" value="<?= h($u['id']) ?>">
                            <input type="hidden" name="role" value="<?= h($u['role'] ?? 'conductor') ?>">
                            <button class="btn btn-remove" type="submit">Remove</button>
                        </form>
                    </div>
                </div>
            <?php endforeach; endif; ?>
        </div>
    </div>

</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
<script>
    document.addEventListener('DOMContentLoaded', function() {
        const pw = document.getElementById('pwField');
        const toggle = document.getElementById('togglePw');
        const eye = document.getElementById('eyeIcon');

        function syncIcon() {
            if (pw.type === 'password') {
                eye.textContent = 'visibility_off';
                toggle.setAttribute('aria-pressed', 'false');
                toggle.setAttribute('title', 'Show password');
                toggle.setAttribute('aria-label', 'Show password');
            } else {
                eye.textContent = 'visibility';
                toggle.setAttribute('aria-pressed', 'true');
                toggle.setAttribute('title', 'Hide password');
                toggle.setAttribute('aria-label', 'Hide password');
            }
        }

        syncIcon();

        toggle?.addEventListener('click', () => {
            pw.type = (pw.type === 'password') ? 'text' : 'password';
            syncIcon();
            pw.focus();
            const val = pw.value;
            pw.value = '';
            pw.value = val;
        });
    });
</script>
</body>
</html>