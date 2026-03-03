<?php
declare(strict_types=1);
session_start();

/**
 * public/login.php
 *
 * Login page that authenticates against the role tables:
 * - admins
 * - drivers
 * - conductors
 * - users
 *
 * Requires config/db.php (expects a db() function that returns a PDO instance).
 *
 * Works on:
 * - Localhost where the project is under: /Byahero-prototype-v3
 * - InfinityFree where htdocs is the web root: /
 */

require __DIR__ . '/../config/db.php';

$err = '';
$redirectAfter = $_GET['redirect'] ?? ($_POST['redirect'] ?? 'passenger/index.php');

/**
 * Base URL prefix:
 * - Localhost: http://localhost/Byahero-prototype-v3/...
 * - InfinityFree: http(s)://yourdomain/...
 */
$host = $_SERVER['HTTP_HOST'] ?? '';
$isLocal =
    $host === 'localhost' ||
    str_starts_with($host, 'localhost:') ||
    $host === '127.0.0.1' ||
    str_starts_with($host, '127.0.0.1:');

$baseUrl = $isLocal ? '/Byahero-prototype-v3' : '';

/**
 * Safety: if redirectAfter is passed as a relative path like "admin/admin.php",
 * convert it to an absolute path using $baseUrl.
 * If it's already absolute (starts with "/") or a full URL, keep it.
 */
if ($redirectAfter !== '' && $redirectAfter[0] !== '/' && !preg_match('~^https?://~i', $redirectAfter)) {
    $redirectAfter = $baseUrl . '/public/' . ltrim($redirectAfter, '/');
} elseif ($redirectAfter !== '' && $redirectAfter[0] === '/') {
    $redirectAfter = $baseUrl . $redirectAfter;
}

// Map table => role info (role name + default redirect)
$roleTables = [
    'admins'     => ['role' => 'admin',     'redirect' => $baseUrl . '/public/ADMIN/admin.php'],
    'drivers'    => ['role' => 'driver',    'redirect' => $baseUrl . '/public/driver/dashboard.php'],
    'conductors' => ['role' => 'conductor', 'redirect' => $baseUrl . '/public/conductor/conductor.php'],
    'users'      => ['role' => 'user',      'redirect' => $baseUrl . '/public/passenger/index.php'],
];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = mb_strtolower(trim((string)($_POST['email'] ?? '')));
    $password = (string)($_POST['password'] ?? '');

    if ($email === '' || $password === '') {
        $err = 'Email and password are required.';
    } else {
        try {
            $pdo = db();

            $authenticated = false;
            $userRecord = null;
            $userRole = null;
            $targetRedirect = $redirectAfter;

            foreach ($roleTables as $table => $info) {
                $stmt = $pdo->prepare("SELECT * FROM {$table} WHERE email = ? LIMIT 1");
                $stmt->execute([$email]);
                $row = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$row) continue;

                $hash = $row['password'] ?? '';

                // Prefer secure verification (password_verify for hashed passwords)
                if ($hash && password_verify($password, $hash)) {
                    $authenticated = true;
                } elseif ($hash === $password) {
                    // Legacy fallback: password stored in plaintext (NOT recommended).
                    // Authenticate but immediately re-hash and store the secure hash.
                    $authenticated = true;
                    $newHash = password_hash($password, PASSWORD_DEFAULT);
                    try {
                        $up = $pdo->prepare("UPDATE {$table} SET password = ? WHERE id = ? LIMIT 1");
                        $up->execute([$newHash, $row['id']]);
                    } catch (Exception $ignore) {
                        // If update fails, continue without breaking login.
                    }
                }

                if ($authenticated) {
                    $userRecord = $row;
                    $userRole = $info['role'];
                    $targetRedirect = $info['redirect'] ?? $targetRedirect;
                    break;
                }
            }

            if ($authenticated && $userRecord) {
                // Set session values (keep minimal info)
                $_SESSION['user_id'] = $userRecord['id'];
                $_SESSION['user_email'] = $userRecord['email'];
                $_SESSION['user_role'] = $userRole;
                $_SESSION['user_name'] = $userRecord['name'] ?? $userRecord['email'];

                header('Location: ' . $targetRedirect);
                exit;
            } else {
                $err = 'Invalid email or password.';
            }
        } catch (Exception $e) {
            // Don't reveal DB errors to users
            $err = 'Server error. Please try again later.';
        }
    }
}
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <title>ByaHero — Login</title>
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet">
    <style>
        :root{
            --brand: #2563eb;
            --bg: #ffffff;
            --muted: #6b7280;
        }
        html,body{
            height:100%;
            background: linear-gradient(180deg, #ffffff 0%, #ffffff 100%);
            font-family: "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial;
            color:#0f172a;
        }
        .login-outer{
            min-height:100vh;
            display:flex;
            align-items:center;
            justify-content:center;
            padding: 2rem 1rem;
        }
        .login-card{
            width:100%;
            max-width:420px;
            background: transparent;
        }
        .brand-wrap{
            text-align:center;
            margin-bottom: 1.25rem;
        }
        .brand-logo{
            width:132px;
            height:auto;
            display:block;
            margin: 0 auto 0.75rem;
        }
        .brand-title{
            font-size:0.85rem;
            letter-spacing:1px;
            color: #111827;
            font-weight: bold;
        }
        .form-card{
            background: var(--bg);
            padding: 2rem;
            border-radius: 14px;
            box-shadow: 0 10px 30px rgba(2,6,23,0.06);
        }
        .form-heading{
            font-size:0.9rem;
            font-weight:700;
            color:var(--brand);
            margin-bottom:1rem;
            letter-spacing:.6px;
        }
        .input-pill{
            border-radius: 999px;
            background: #fff;
            box-shadow: 0 6px 18px rgba(2,6,23,0.06);
            border: none;
            padding: 0.6rem 1rem;
            padding-right: 3rem;
            height:48px;
        }
        .input-group-pill{
            position:relative;
        }
        .input-pill:focus{
            outline:none;
            box-shadow: 0 8px 22px rgba(37,99,235,0.12), 0 0 0 3px rgba(37,99,235,0.06);
        }
        .input-addon{
            position:absolute;
            right:12px;
            top:50%;
            transform:translateY(-50%);
            border:none;
            background:transparent;
            color:#374151;
            display:flex;
            align-items:center;
            gap:.25rem;
            padding:4px;
            cursor:pointer;
            height:28px;
            width:28px;
            justify-content:center;
            border-radius:6px;
        }
        .input-addon:focus{ outline:none; box-shadow: none; }
        .input-addon:active{ transform: translateY(-50%) scale(.98); }
        .forgot{
            display:inline-block;
            margin-top:.5rem;
            color:var(--muted);
            text-decoration:none;
            font-size:.875rem;
        }
        .submit-pill{
            width:88px;
            height:40px;
            border-radius:999px;
            background:var(--brand);
            border:none;
            margin:1.6rem auto 0;
            box-shadow: 0 8px 22px rgba(37,99,235,0.18);
            color: #ffffff;
            font-weight:700;
            text-transform:uppercase;
            letter-spacing: .6px;
            font-size:0.9rem;
            display:flex;
            align-items:center;
            justify-content:center;
        }
        .submit-pill:active{ transform:translateY(1px); }
        .small-muted{
            font-size:.85rem;
            color:var(--muted);
            text-align:center;
            margin-top:.75rem;
        }
        .alert-small{
            font-size:.9rem;
            padding:.45rem .75rem;
            border-radius:8px;
        }
        @media (max-width:420px){
            .brand-logo{ width:110px; }
            .form-card{ padding:1.25rem; border-radius:12px; }
            .submit-pill{ width:72px; height:36px; font-size:0.85rem; }
            .input-addon{ right:10px; width:26px; height:26px; }
            .input-pill{ padding-right:2.5rem; }
        }
    </style>
</head>
<body>
    <div class="login-outer">
        <div class="login-card">
            <div class="brand-wrap">
                <img src="../assets/images/byaheroLogo.png" alt="ByaHero Logo" class="brand-logo" />
                <div class="brand-title">BYAHERO</div>
            </div>

            <div class="form-card">
                <div class="form-heading">LOG IN TO YOUR ACCOUNT</div>

                <?php if ($err): ?>
                    <div class="alert alert-danger alert-small"><?= htmlspecialchars($err) ?></div>
                <?php endif; ?>

                <form method="POST" novalidate>
                    <div class="mb-3">
                        <input
                            name="email"
                            type="email"
                            inputmode="email"
                            autocomplete="username"
                            placeholder="Email"
                            class="form-control input-pill"
                            required
                            value="<?= isset($_POST['email']) ? htmlspecialchars($_POST['email']) : '' ?>"
                        />
                    </div>

                    <div class="mb-2 input-group-pill">
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autocomplete="current-password"
                            placeholder="Password"
                            class="form-control input-pill"
                            required
                        />
                        <button
                            type="button"
                            id="togglePwd"
                            class="input-addon"
                            aria-pressed="false"
                            aria-label="Show password"
                            title="Show password"
                        >
                            <span id="eyeIcon" class="material-icons-round" style="font-size:18px;line-height:1;">visibility_off</span>
                        </button>
                    </div>

                    <div class="d-flex justify-content-start">
                        <a class="forgot" href="#" tabindex="-1">Forgot Password?</a>
                    </div>

                    <input type="hidden" name="redirect" value="<?= htmlspecialchars($redirectAfter) ?>" />

                    <button type="submit" class="submit-pill">Login</button>
                </form>

                <div class="small-muted">
                    Don't have an account?
                    <a href="signUp.php" class="fw-bold text-primary text-decoration-none">Sign up</a>
                </div>
            </div>
        </div>
    </div>

<script>
document.addEventListener('DOMContentLoaded', function () {
    const pwd = document.getElementById('password');
    const toggle = document.getElementById('togglePwd');
    const eye = document.getElementById('eyeIcon');

    function syncIcon() {
        if (pwd.type === 'password') {
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

    toggle.addEventListener('click', function () {
        pwd.type = (pwd.type === 'password') ? 'text' : 'password';
        syncIcon();
        pwd.focus();

        // keep cursor at end (mobile friendly)
        const val = pwd.value;
        pwd.value = '';
        pwd.value = val;
    });
});
</script>
</body>
</html>