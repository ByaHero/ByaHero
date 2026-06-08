<?php
declare(strict_types=1);

@session_start();

include_once __DIR__ . '/../../config/db.php';

/**
 * PROTECT THIS PAGE
 * login.php sets:
 * - $_SESSION['user_id']
 * - $_SESSION['user_role']  (admin|driver|conductor|user)
 */
if (empty($_SESSION['user_id']) || empty($_SESSION['user_role'])) {
    header("Location: ../login.php?redirect=admin/adminProfile.php");
    exit;
}

if ($_SESSION['user_role'] !== 'admin') {
    // logged in but not an admin -> send to their correct dashboard
    $role = (string)$_SESSION['user_role'];

    if ($role === 'conductor') {
        header("Location: ../conductor/conductor.php");
        exit;
    }
    if ($role === 'driver') {
        header("Location: ../driver/dashboard.php");
        exit;
    }
    // passenger/user
    header("Location: ../passenger/index.php");
    exit;
}

// prevent back-button cache after logout
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Cache-Control: post-check=0, pre-check=0', false);
header('Pragma: no-cache');
header('Expires: 0');

$conn = db();

$id = (int)$_SESSION['user_id'];

/**
 * admins table columns (assumed similar to others):
 * id, email, password, created_at
 */
$stmt = $conn->prepare("SELECT id, email, password, created_at FROM admins WHERE id = ? LIMIT 1");
$stmt->bind_param("i", $id);
$stmt->execute();
$admin = $stmt->get_result()->fetch_assoc();

if (!$admin) {
    // session says admin but record missing -> force logout
    $_SESSION = [];
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params['path'] ?? '/',
            $params['domain'] ?? '',
            (bool)($params['secure'] ?? false),
            (bool)($params['httponly'] ?? true)
        );
    }
    session_destroy();

    header("Location: ../login.php");
    exit;
}

$userEmail = (string)($admin['email'] ?? ($_SESSION['user_email'] ?? ''));

// Display name derived from email (same pattern as conductor)
$displayName = 'Admin';
if ($userEmail !== '' && str_contains($userEmail, '@')) {
    $displayName = ucfirst(explode('@', $userEmail)[0]);
}

$message = '';

// Handle form submissions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    // UPDATE EMAIL
    if (isset($_POST['update_email'])) {
        $newEmail = filter_var($_POST['new_email'] ?? '', FILTER_SANITIZE_EMAIL);

        if (!filter_var($newEmail, FILTER_VALIDATE_EMAIL)) {
            $message = "Invalid email format.";
        } else {
            $up = $conn->prepare("UPDATE admins SET email = ? WHERE id = ? LIMIT 1");
            $up->bind_param("si", $newEmail, $id);
            $up->execute();

            // sync session too
            $_SESSION['user_email'] = $newEmail;
            $userEmail = $newEmail;

            // update displayName
            if (str_contains($newEmail, '@')) {
                $displayName = ucfirst(explode('@', $newEmail)[0]);
            } else {
                $displayName = 'Admin';
            }

            $message = "Email updated successfully.";
        }
    }

    // UPDATE PASSWORD
    elseif (isset($_POST['update_password'])) {
        $current = (string)($_POST['current_password'] ?? '');
        $new     = (string)($_POST['new_password'] ?? '');
        $confirm = (string)($_POST['confirm_new_password'] ?? '');

        if ($new !== $confirm) {
            $message = "New passwords do not match!";
        } else {
            // load current password from DB (source of truth)
            $stmtPwd = $conn->prepare("SELECT password FROM admins WHERE id = ? LIMIT 1");
            $stmtPwd->bind_param("i", $id);
            $stmtPwd->execute();
            $rowPwd = $stmtPwd->get_result()->fetch_assoc();
            $dbHash = (string)($rowPwd['password'] ?? '');

            if ($dbHash === '') {
                $message = "Password not found for this account.";
            } else {
                // Same logic as login.php: allow hashed or legacy plaintext
                $ok = false;

                if (password_verify($current, $dbHash)) {
                    $ok = true;
                } elseif ($current === $dbHash) {
                    $ok = true; // legacy plaintext
                }

                if (!$ok) {
                    $message = "Current password is incorrect!";
                } else {
                    $newHash = password_hash($new, PASSWORD_DEFAULT);
                    $up = $conn->prepare("UPDATE admins SET password = ? WHERE id = ? LIMIT 1");
                    $up->bind_param("si", $newHash, $id);
                    $up->execute();

                    $message = "Password successfully updated!";
                }
            }
        }
    }
}

/* Icon paths (relative to this file location) */
$iconMail = '../../assets/images/icons/mail.png';
$iconPassword = '../../assets/images/icons/password.png';
$iconEdit = '../../assets/images/icons/edit.png';

/* ONLY CHANGE: show icon for password toggle */
$iconShow = '../../assets/images/icons/show.png';
$iconHide = '../../assets/images/icons/shownot.svg';

/* navbarAdmin config (component) */
$pageDepth = '../../';
$pageType  = 'adminProfile';
$backLink  = 'admin.php';
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <link rel="icon" href="../../assets/images/byaheroLogoBlue.svg" type="image/svg+xml">
    <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <title>ByaHero - Admin Profile</title>

    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">

    <style>
        <?php include __DIR__ . '/../../assets/css/admin/adminProfile.css'; ?>
    </style>
</head>

<body class="d-flex flex-column min-vh-100 m-0 bg-white" style="font-family: 'Segoe UI', sans-serif;">

    <?php include __DIR__ . '/../../components/navbarAdmin.php'; ?>

    <div class="d-flex flex-column align-items-center gap-2 pt-4 px-3 pb-2">
        <div class="d-flex align-items-center justify-content-center rounded-circle fw-bold text-dark" style="width: 110px; height: 110px; background: #d9d9d9; font-size: 52px;">
            <?php echo htmlspecialchars(strtoupper(substr($displayName, 0, 1))); ?>
        </div>
        <h2 class="fw-bold text-primary mb-0" style="font-size: 1.15rem;"><?php echo htmlspecialchars($displayName); ?></h2>
    </div>

    <div class="flex-grow-1 p-4 pb-5 bg-light" style="border-top-left-radius: 26px; border-top-right-radius: 26px; background-color: #eef2f6 !important; min-height: 0;">

        <?php if ($message): ?>
            <div class="alert alert-info py-2 px-3 mb-3 fw-bold text-center" style="border-radius: 12px; font-size: 0.85rem;">
                <?php echo htmlspecialchars($message); ?>
            </div>
        <?php endif; ?>

        <div class="fw-bold text-dark mt-2 mb-3 ms-1" style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px;">Account Details</div>

        <!-- Email Card -->
        <div class="p-3 mb-3 shadow-sm border-0 d-grid align-items-center" style="grid-template-columns: 34px 1fr 34px; gap: 12px; border-radius: 16px; background: #f0f2f4;">
            <div class="d-flex align-items-center justify-content-center" style="width: 30px; height: 30px;">
                <img src="<?php echo htmlspecialchars($iconMail); ?>" alt="Email" width="22" height="22">
            </div>

            <div class="min-width-0">
                <p class="small text-secondary fw-semibold mb-1" style="font-size: 0.72rem; text-transform: uppercase;">Email Address</p>
                <p class="fw-bold text-dark mb-0 text-break" style="font-size: 0.78rem;"><?php echo htmlspecialchars($userEmail); ?></p>
            </div>

            <button type="button" class="btn p-0 d-flex align-items-center justify-content-center" onclick="openEmailModal()" aria-label="Edit Email" style="width: 34px; height: 34px;">
                <img src="<?php echo htmlspecialchars($iconEdit); ?>" alt="Edit" width="18" height="18">
            </button>
        </div>

        <!-- Password Card -->
        <div class="p-3 mb-3 shadow-sm border-0 d-grid align-items-center" style="grid-template-columns: 34px 1fr 34px; gap: 12px; border-radius: 16px; background: #f0f2f4;">
            <div class="d-flex align-items-center justify-content-center" style="width: 30px; height: 30px;">
                <img src="<?php echo htmlspecialchars($iconPassword); ?>" alt="Password" width="22" height="22">
            </div>

            <div class="min-width-0">
                <p class="small text-secondary fw-semibold mb-1" style="font-size: 0.72rem; text-transform: uppercase;">Password</p>
                <p class="fw-bold text-dark mb-0 text-break" style="font-size: 0.78rem;">••••••••••••</p>
            </div>

            <button type="button" class="btn p-0 d-flex align-items-center justify-content-center" onclick="openPasswordModal()" aria-label="Edit Password" style="width: 34px; height: 34px;">
                <img src="<?php echo htmlspecialchars($iconEdit); ?>" alt="Edit" width="18" height="18">
            </button>
        </div>

    </div>

    <!-- EMAIL MODAL -->
    <div id="emailModal" class="modal-overlay">
        <div class="custom-box">
            <h3>Edit Email</h3>
            <p>Enter your new email address below.</p>
            <form method="POST" action="adminProfile.php">
                <input type="email" name="new_email" class="form-control mb-4" style="border-radius: 10px; padding: 10px;" placeholder="New email address" required>
                <div class="d-flex justify-content-center gap-2">
                    <button type="button" class="btn btn-light w-100 py-2 fw-bold rounded-3" style="background-color: #f0f2f5; color: #333;" onclick="closeEmailModal()">Cancel</button>
                    <button type="submit" name="update_email" class="btn btn-primary w-100 py-2 fw-bold rounded-3" style="background-color: #0f3878; border-color: #0f3878; color: #fff;">Save</button>
                </div>
            </form>
        </div>
    </div>

    <!-- PASSWORD MODAL (with toggle bars) -->
    <div id="passwordModal" class="modal-overlay">
        <div class="custom-box">
            <h3>Edit Password</h3>
            <p>Enter your current and new password below.</p>

            <form method="POST" action="adminProfile.php">
                <div class="pw-wrap mb-3">
                    <input type="password" name="current_password" id="pwCurrent" class="form-control" style="border-radius: 10px; padding: 10px; padding-right: 44px;" placeholder="Current password" required>
                    <button type="button" class="pw-eye" data-target="pwCurrent" aria-label="Show password">
                        <img src="<?php echo htmlspecialchars($iconShow); ?>" alt="Show">
                    </button>
                </div>

                <div class="pw-wrap mb-3">
                    <input type="password" name="new_password" id="pwNew" class="form-control" style="border-radius: 10px; padding: 10px; padding-right: 44px;" placeholder="New password" required>
                    <button type="button" class="pw-eye" data-target="pwNew" aria-label="Show password">
                        <img src="<?php echo htmlspecialchars($iconShow); ?>" alt="Show">
                    </button>
                </div>

                <div class="pw-wrap mb-4">
                    <input type="password" name="confirm_new_password" id="pwConfirm" class="form-control" style="border-radius: 10px; padding: 10px; padding-right: 44px;" placeholder="Confirm new password" required>
                    <button type="button" class="pw-eye" data-target="pwConfirm" aria-label="Show password">
                        <img src="<?php echo htmlspecialchars($iconShow); ?>" alt="Show">
                    </button>
                </div>

                <div class="d-flex justify-content-center gap-2">
                    <button type="button" class="btn btn-light w-100 py-2 fw-bold rounded-3" style="background-color: #f0f2f5; color: #333;" onclick="closePasswordModal()">Cancel</button>
                    <button type="submit" name="update_password" class="btn btn-primary w-100 py-2 fw-bold rounded-3" style="background-color: #0f3878; border-color: #0f3878; color: #fff;">Save</button>
                </div>
            </form>
        </div>
    </div>

    <script>
        window.BYAHERO_PROFILE_CONFIG = {
            iconShow: <?php echo json_encode($iconShow); ?>,
            iconHide: <?php echo json_encode($iconHide); ?>
        };
    </script>
    <script>
        <?php include __DIR__ . '/../../assets/js/admin/adminProfile.js'; ?>
    </script>
</body>
</html>