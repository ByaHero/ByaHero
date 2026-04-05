<?php
declare(strict_types=1);

session_start();

require_once __DIR__ . '/../../config/db.php';

/**
 * PROTECT THIS PAGE
 * login.php sets:
 * - $_SESSION['user_id']
 * - $_SESSION['user_role']  (admin|driver|conductor|user)
 */
if (empty($_SESSION['user_id']) || empty($_SESSION['user_role'])) {
    header('Location: ../login.php?redirect=ADMIN/adminProfile.php');
    exit;
}

if ($_SESSION['user_role'] !== 'admin') {
    // logged in but not an admin -> send to their correct dashboard
    $role = (string)$_SESSION['user_role'];

    if ($role === 'conductor') {
        header('Location: ../conductor/conductor.php');
        exit;
    }
    if ($role === 'driver') {
        header('Location: ../driver/dashboard.php');
        exit;
    }
    // passenger/user
    header('Location: ../passenger/index.php');
    exit;
}

// prevent back-button cache after logout
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Cache-Control: post-check=0, pre-check=0', false);
header('Pragma: no-cache');
header('Expires: 0');

$pdo = db();

$id = (int)$_SESSION['user_id'];

/**
 * admins table columns (assumed similar to others):
 * id, email, password, created_at
 */
$stmt = $pdo->prepare("SELECT id, email, password, created_at FROM admins WHERE id = ? LIMIT 1");
$stmt->execute([$id]);
$admin = $stmt->fetch(PDO::FETCH_ASSOC);

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

    header('Location: ../login.php');
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
            $up = $pdo->prepare("UPDATE admins SET email = ? WHERE id = ? LIMIT 1");
            $up->execute([$newEmail, $id]);

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
            $stmtPwd = $pdo->prepare("SELECT password FROM admins WHERE id = ? LIMIT 1");
            $stmtPwd->execute([$id]);
            $rowPwd = $stmtPwd->fetch(PDO::FETCH_ASSOC);
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
                    $up = $pdo->prepare("UPDATE admins SET password = ? WHERE id = ? LIMIT 1");
                    $up->execute([$newHash, $id]);

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

/* navbarAdmin config (component) */
$pageDepth = '../../';
$pageType  = 'adminProfile';
$backLink  = 'admin.php';
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <title>ByaHero - Admin Profile</title>

    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">

    <style>
        :root{
            --header-blue: #0f3878;
            --page-bg: #ffffff;
            --sheet-bg: #eef2f6;
            --muted: #6b7280;
            --shadow: 0 6px 14px rgba(0,0,0,0.10);
            --radius-lg: 26px;
            --radius-card: 16px;
        }

        html, body{ height: 100%; }

        body{
            background: var(--page-bg);
            font-family: 'Segoe UI', sans-serif;
            margin: 0;
            display: flex;
            flex-direction: column;
            min-height: 100%;
        }

        /* Header */
        .profile-header-wrap{
            padding: 26px 18px 10px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
        }

        .avatar-circle{
            width: 110px;
            height: 110px;
            border-radius: 50%;
            background: #d9d9d9;
            display: grid;
            place-items: center;
            font-weight: 900;
            font-size: 52px;
            color: #111;
        }

        .profile-name{
            font-size: 1.15rem;
            font-weight: 800;
            color: #1d4ed8;
            margin: 0;
        }

        /* Bottom sheet */
        .bottom-sheet{
            background: var(--sheet-bg);
            border-top-left-radius: var(--radius-lg);
            border-top-right-radius: var(--radius-lg);
            min-height: 0;
            flex: 1;
            padding: 22px 18px 30px;
        }

        .section-title{
            font-weight: 900;
            font-size: 0.8rem;
            color: #111;
            margin: 12px 6px 14px;
        }

        /* Card layout */
        .detail-card{
            background: #f0f2f4;
            border-radius: var(--radius-card);
            box-shadow: var(--shadow);
            padding: 14px 14px;
            display: grid;
            grid-template-columns: 34px 1fr 34px;
            gap: 12px;
            align-items: center;
            margin-bottom: 14px;
        }

        .detail-icon{
            width: 30px;
            height: 30px;
            display: grid;
            place-items: center;
        }

        .detail-icon img{
            width: 22px;
            height: 22px;
            object-fit: contain;
            image-rendering: -webkit-optimize-contrast;
            image-rendering: crisp-edges;
            transform: translateZ(0);
        }

        .detail-main{ min-width: 0; }

        .detail-label{
            font-size: 0.72rem;
            font-weight: 800;
            color: var(--muted);
            margin: 0 0 2px;
        }

        .detail-value{
            font-size: 0.78rem;
            font-weight: 900;
            color: #111;
            margin: 0;
            word-break: break-word;
        }

        .detail-action{
            width: 34px;
            height: 34px;
            border: 0;
            background: transparent;
            padding: 0;
            display: grid;
            place-items: center;
        }

        .detail-action img{
            width: 18px;
            height: 18px;
            object-fit: contain;
            image-rendering: -webkit-optimize-contrast;
            image-rendering: crisp-edges;
            transform: translateZ(0);
        }

        /* Alert */
        .msg{
            border-radius: 12px;
            font-weight: 700;
            font-size: 0.85rem;
            padding: 10px 12px;
            margin: 0 0 14px;
        }

        /* Modals */
        .modal-overlay{
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.40);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            backdrop-filter: blur(2px);
            padding: 18px;
        }
        .custom-box{
            background: #fff;
            border-radius: 24px;
            padding: 26px;
            width: 100%;
            max-width: 360px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0,0,0,0.15);
        }
        .custom-box h3{
            font-weight: 900;
            font-size: 1.25rem;
            margin: 0 0 8px;
            color: #000;
        }
        .custom-box p{
            color: #4a4a4a;
            font-size: 0.9rem;
            margin-bottom: 18px;
            line-height: 1.4;
        }

        /* Toggle bar pattern */
        .pw-wrap{
            position: relative;
        }
        .pw-eye{
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            border: 0;
            background: transparent;
            font-weight: 900;
            color: #334155;
            padding: 6px 8px;
        }

        /* ONLY CHANGE: make the show.png icon bigger */
        .pw-eye img{
            width: 24px;
            height: 24px;
            object-fit: contain;
            display: block;
        }

        .modal-actions{
            display: flex;
            justify-content: center;
            gap: 12px;
        }
        .modal-btn{
            border-radius: 12px;
            padding: 10px 18px;
            font-weight: 800;
            font-size: 0.95rem;
            border: none;
            cursor: pointer;
            text-decoration: none;
            flex: 1;
        }
        .btn-no{ background-color: #f0f2f5; color: #333; }
        .btn-yes{ background-color: var(--header-blue); color: #fff; }
    </style>
</head>

<body>

    <?php include __DIR__ . '/../../components/navbarAdmin.php'; ?>

    <div class="profile-header-wrap">
        <div class="avatar-circle">
            <?php echo htmlspecialchars(strtoupper(substr($displayName, 0, 1))); ?>
        </div>
        <h2 class="profile-name"><?php echo htmlspecialchars($displayName); ?></h2>
    </div>

    <div class="bottom-sheet">

        <?php if ($message): ?>
            <div class="alert alert-info msg text-center">
                <?php echo htmlspecialchars($message); ?>
            </div>
        <?php endif; ?>

        <div class="section-title">Account Details</div>

        <!-- Email Card -->
        <div class="detail-card">
            <div class="detail-icon">
                <img src="<?php echo htmlspecialchars($iconMail); ?>" alt="Email" width="22" height="22">
            </div>

            <div class="detail-main">
                <p class="detail-label">Email Address</p>
                <p class="detail-value"><?php echo htmlspecialchars($userEmail); ?></p>
            </div>

            <button type="button" class="detail-action" onclick="openEmailModal()" aria-label="Edit Email">
                <img src="<?php echo htmlspecialchars($iconEdit); ?>" alt="Edit" width="18" height="18">
            </button>
        </div>

        <!-- Password Card -->
        <div class="detail-card">
            <div class="detail-icon">
                <img src="<?php echo htmlspecialchars($iconPassword); ?>" alt="Password" width="22" height="22">
            </div>

            <div class="detail-main">
                <p class="detail-label">Password</p>
                <p class="detail-value">••••••••••••</p>
            </div>

            <button type="button" class="detail-action" onclick="openPasswordModal()" aria-label="Edit Password">
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
                <div class="modal-actions">
                    <button type="button" class="modal-btn btn-no" onclick="closeEmailModal()">Cancel</button>
                    <button type="submit" name="update_email" class="modal-btn btn-yes">Save</button>
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

                <div class="modal-actions">
                    <button type="button" class="modal-btn btn-no" onclick="closePasswordModal()">Cancel</button>
                    <button type="submit" name="update_password" class="modal-btn btn-yes">Save</button>
                </div>
            </form>
        </div>
    </div>

    <script>
        function openEmailModal() { document.getElementById('emailModal').style.display = 'flex'; }
        function closeEmailModal() { document.getElementById('emailModal').style.display = 'none'; }

        function openPasswordModal() { document.getElementById('passwordModal').style.display = 'flex'; }
        function closePasswordModal() { document.getElementById('passwordModal').style.display = 'none'; }

        // Toggle bar logic (show.png / 🙈)
        document.querySelectorAll('.pw-eye').forEach((btn) => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-target');
                const input = id ? document.getElementById(id) : null;
                if (!input) return;

                const isPw = input.type === 'password';
                input.type = isPw ? 'text' : 'password';

                btn.innerHTML = isPw
                    ? '🙈'
                    : '<img src="<?php echo htmlspecialchars($iconShow); ?>" alt="Show">';
            });
        });
    </script>
</body>
</html>