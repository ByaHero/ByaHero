<?php
declare(strict_types=1);

session_start();

require_once __DIR__ . '/../../../config/db.php';

/**
 * PROTECT THIS PAGE
 * login.php sets:
 * - $_SESSION['user_id']
 * - $_SESSION['user_role']  (admin|driver|conductor|user)
 */
if (empty($_SESSION['user_id']) || empty($_SESSION['user_role'])) {
    header('Location: ../../login.php?redirect=conductor/profile/profile.php');
    exit;
}

if ($_SESSION['user_role'] !== 'conductor') {
    // logged in but not a conductor -> send to their correct dashboard
    $role = (string)$_SESSION['user_role'];

    if ($role === 'admin') {
        header('Location: ../../ADMIN/admin.php');
        exit;
    }
    if ($role === 'driver') {
        header('Location: ../../driver/dashboard.php');
        exit;
    }
    // passenger/user
    header('Location: ../../passenger/index.php');
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
 * conductors table columns (from your screenshot):
 * id, email, password, created_at
 */
$stmt = $pdo->prepare("SELECT id, email, password, created_at FROM conductors WHERE id = ? LIMIT 1");
$stmt->execute([$id]);
$conductor = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$conductor) {
    // session says conductor but record missing -> force logout
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

    header('Location: ../../login.php');
    exit;
}

$userEmail = (string)($conductor['email'] ?? ($_SESSION['user_email'] ?? ''));

// Since you DON'T have name column, we display a label derived from email
$displayName = 'Conductor';
if ($userEmail !== '' && str_contains($userEmail, '@')) {
    $displayName = ucfirst(explode('@', $userEmail)[0]); // e.g. johndoe@ -> Johndoe
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
            $up = $pdo->prepare("UPDATE conductors SET email = ? WHERE id = ? LIMIT 1");
            $up->execute([$newEmail, $id]);

            // sync session too
            $_SESSION['user_email'] = $newEmail;
            $userEmail = $newEmail;

            // update displayName
            if (str_contains($newEmail, '@')) {
                $displayName = ucfirst(explode('@', $newEmail)[0]);
            } else {
                $displayName = 'Conductor';
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
            $stmtPwd = $pdo->prepare("SELECT password FROM conductors WHERE id = ? LIMIT 1");
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
                    $up = $pdo->prepare("UPDATE conductors SET password = ? WHERE id = ? LIMIT 1");
                    $up->execute([$newHash, $id]);

                    $message = "Password successfully updated!";
                }
            }
        }
    }
}
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <title>ByaHero - Profile</title>

    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded" rel="stylesheet" />

    <style>
        :root {
            --bg-light: #ffffff;
            --header-blue: #0f3878;
            --sheet-bg: #eef2f6;
            --card-bg: #f8f9fb;
            --text-dark: #000000;
        }

        body, html {
            background-color: var(--bg-light);
            font-family: 'Segoe UI', sans-serif;
            margin: 0;
            padding: 0;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }

        .top-app-bar {
            background-color: var(--header-blue);
            color: white;
            padding: 15px 20px;
            display: flex;
            align-items: center;
            font-size: 1rem;
            border-bottom-left-radius: 16px;
            border-bottom-right-radius: 16px;
            position: relative;
            z-index: 10;
        }

        .top-app-bar a {
            color: white;
            text-decoration: none;
            display: flex;
            align-items: center;
            margin-right: 15px;
        }

        .profile-header-section {
            display: flex;
            align-items: center;
            padding: 40px 30px;
            background-color: white;
        }

        .avatar-circle {
            width: 110px;
            height: 110px;
            background-color: #f0f2f5;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 20px;
            overflow: hidden;
        }

        .avatar-circle svg {
            width: 80px;
            height: 80px;
            margin-top: 15px;
        }

        .profile-name {
            font-size: 1.6rem;
            font-weight: 800;
            color: var(--text-dark);
            margin: 0;
        }

        .bottom-sheet {
            background-color: var(--sheet-bg);
            border-top-left-radius: 35px;
            border-top-right-radius: 35px;
            flex-grow: 1;
            padding: 35px 20px;
            display: flex;
            flex-direction: column;
            gap: 15px;
        }

        .info-card {
            background-color: var(--card-bg);
            border-radius: 16px;
            padding: 18px 20px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
            display: flex;
            align-items: center;
            margin: 0;
            border: 1px solid #f0f0f0;
        }

        .card-label {
            font-weight: 800;
            font-size: 0.95rem;
            color: var(--text-dark);
            width: 35%;
            line-height: 1.2;
        }

        .card-input-wrapper {
            width: 65%;
            display: flex;
            align-items: center;
            background-color: white;
            border-radius: 8px;
            padding: 8px 12px;
            box-shadow: inset 0 1px 2px rgba(0,0,0,0.02);
        }

        .card-input {
            border: none;
            outline: none;
            background: transparent;
            width: 100%;
            font-size: 0.85rem;
            color: #6c757d;
            font-weight: 600;
        }

        .edit-btn {
            background: none;
            border: none;
            color: var(--header-blue);
            font-weight: 800;
            font-size: 0.85rem;
            cursor: pointer;
            padding: 0 0 0 10px;
            border-left: 1px solid #e9ecef;
            margin-left: 10px;
            text-decoration: none;
            display: inline-block;
        }

        .logout-card {
            cursor: pointer;
            transition: transform 0.1s;
        }

        .logout-card:active {
            transform: scale(0.98);
        }

        .logout-icon {
            font-size: 28px;
            color: #000;
            margin-right: 15px;
            transform: scaleX(-1);
        }

        .logout-text {
            font-weight: 800;
            font-size: 1.05rem;
            color: var(--text-dark);
        }

        .footer-bar {
            width: 100%;
            height: 35px;
            background-color: var(--header-blue);
            margin-top: auto;
        }

        .modal-overlay {
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.4);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            backdrop-filter: blur(2px);
        }

        .custom-box {
            background: white;
            border-radius: 24px;
            padding: 30px;
            width: 320px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0,0,0,0.15);
        }

        .custom-box h3 {
            font-weight: 800;
            font-size: 1.4rem;
            margin-bottom: 10px;
            color: #000;
        }

        .custom-box p {
            color: #4a4a4a;
            font-size: 0.9rem;
            margin-bottom: 25px;
            line-height: 1.4;
        }

        .modal-actions {
            display: flex;
            justify-content: center;
            gap: 15px;
        }

        .modal-btn {
            border-radius: 12px;
            padding: 10px 30px;
            font-weight: 700;
            font-size: 1rem;
            border: none;
            cursor: pointer;
            text-decoration: none;
            flex: 1;
        }

        .btn-no { background-color: #f0f2f5; color: #333; }
        .btn-yes { background-color: var(--header-blue); color: white; }
    </style>
</head>

<body>

    <div class="top-app-bar">
        <a href="../conductor.php">
            <span class="material-symbols-rounded" style="font-size: 22px;">close</span>
        </a>
        <span>Profile</span>
    </div>

    <div class="profile-header-section">
        <div class="avatar-circle">
            <svg viewBox="0 0 24 24" fill="#000000">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
        </div>
        <h2 class="profile-name"><?php echo htmlspecialchars($displayName); ?></h2>
    </div>

    <div class="bottom-sheet">

        <?php if ($message): ?>
            <div class="alert alert-info py-2 text-center" style="border-radius: 10px; font-weight: 600;">
                <?php echo htmlspecialchars($message); ?>
            </div>
        <?php endif; ?>

        <div class="info-card">
            <div class="card-label">Email</div>
            <div class="card-input-wrapper">
                <input type="email" class="card-input" value="<?php echo htmlspecialchars($userEmail); ?>" readonly>
                <button type="button" class="edit-btn" onclick="openEmailModal()">Edit</button>
            </div>
        </div>

        <div class="info-card">
            <div class="card-label">Password</div>
            <div class="card-input-wrapper">
                <input type="password" class="card-input" placeholder="••••••••••" style="letter-spacing: 2px; color: #000;" readonly>
                <button type="button" class="edit-btn" onclick="openPasswordModal()">Edit</button>
            </div>
        </div>

        <div class="info-card logout-card" onclick="openLogoutModal()">
            <span class="material-symbols-rounded logout-icon">logout</span>
            <span class="logout-text">Logout</span>
        </div>

    </div>

    <div class="footer-bar"></div>

    <div id="emailModal" class="modal-overlay">
        <div class="custom-box">
            <h3>Edit Email</h3>
            <p>Enter your new email address below.</p>
            <form method="POST" action="profile.php">
                <input type="email" name="new_email" class="form-control mb-4" style="border-radius: 10px; padding: 10px;" placeholder="New email address" required>
                <div class="modal-actions">
                    <button type="button" class="modal-btn btn-no" onclick="closeEmailModal()">Cancel</button>
                    <button type="submit" name="update_email" class="modal-btn btn-yes">Save</button>
                </div>
            </form>
        </div>
    </div>

    <div id="passwordModal" class="modal-overlay">
        <div class="custom-box">
            <h3>Edit Password</h3>
            <p>Enter your current and new password below.</p>
            <form method="POST" action="profile.php">
                <input type="password" name="current_password" class="form-control mb-3" style="border-radius: 10px; padding: 10px;" placeholder="Current password" required>
                <input type="password" name="new_password" class="form-control mb-3" style="border-radius: 10px; padding: 10px;" placeholder="New password" required>
                <input type="password" name="confirm_new_password" class="form-control mb-4" style="border-radius: 10px; padding: 10px;" placeholder="Confirm new password" required>
                <div class="modal-actions">
                    <button type="button" class="modal-btn btn-no" onclick="closePasswordModal()">Cancel</button>
                    <button type="submit" name="update_password" class="modal-btn btn-yes">Save</button>
                </div>
            </form>
        </div>
    </div>

    <div id="logoutModal" class="modal-overlay">
        <div class="custom-box">
            <h3>Logout</h3>
            <p>Are you sure you want to logout from<br>ByaHero?</p>
            <div class="modal-actions">
                <button class="modal-btn btn-no" onclick="closeLogoutModal()">No</button>
                <a href="../../logout.php" class="modal-btn btn-yes d-flex align-items-center justify-content-center">Yes</a>
            </div>
        </div>
    </div>

    <script>
        function openEmailModal() { document.getElementById('emailModal').style.display = 'flex'; }
        function closeEmailModal() { document.getElementById('emailModal').style.display = 'none'; }

        function openPasswordModal() { document.getElementById('passwordModal').style.display = 'flex'; }
        function closePasswordModal() { document.getElementById('passwordModal').style.display = 'none'; }

        function openLogoutModal() { document.getElementById('logoutModal').style.display = 'flex'; }
        function closeLogoutModal() { document.getElementById('logoutModal').style.display = 'none'; }
    </script>
</body>
</html>