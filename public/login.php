<?php

require __DIR__ . '/../config/db.php';

@session_start();

$err = '';
$redirectAfter = $_GET['redirect'] ?? ($_POST['redirect'] ?? 'passenger/index.php');

$scriptName = $_SERVER['SCRIPT_NAME'] ?? '';
$publicDir = rtrim(str_replace('\\', '/', dirname($scriptName)), '/');
$baseUrl = preg_replace('~/public(/.*)?$~', '', $publicDir) ?: '';

if ($redirectAfter !== '' && $redirectAfter[0] !== '/' && !preg_match('~^https?://~i', $redirectAfter)) {
    $redirectAfter = $baseUrl . '/public/' . ltrim($redirectAfter, '/');
} elseif ($redirectAfter !== '' && $redirectAfter[0] === '/') {
    $redirectAfter = $baseUrl . $redirectAfter;
}

$roleTables = [
    'admins' => ['role' => 'admin', 'redirect' => $baseUrl . '/public/admin/admin.php'],
    'drivers' => ['role' => 'driver', 'redirect' => $baseUrl . '/public/driver/dashboard.php'],
    'conductors' => ['role' => 'conductor', 'redirect' => $baseUrl . '/public/conductor/conductor.php'],
    'users' => ['role' => 'passenger', 'redirect' => $baseUrl . '/public/passenger/index.php'],
];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = mb_strtolower(trim((string) ($_POST['email'] ?? '')));
    $password = (string) ($_POST['password'] ?? '');

    if ($email === '' || $password === '') {
        $err = 'Email and password are required.';
    } else {
        try {
            $conn = db();
            $authenticated = false;
            $userRecord = null;
            $userRole = null;
            $targetRedirect = $redirectAfter;

            foreach ($roleTables as $table => $info) {
                $stmt = $conn->prepare("SELECT * FROM {$table} WHERE email = ? LIMIT 1");
                $stmt->bind_param("s", $email);
                $stmt->execute();
                $row = $stmt->get_result()->fetch_assoc();
                
                if (!$row) continue;

                $hash = $row['password'] ?? '';

                if ($hash && password_verify($password, $hash)) {
                    $authenticated = true;
                } elseif ($hash === $password) {
                    $authenticated = true;
                    $newHash = password_hash($password, PASSWORD_DEFAULT);
                    try {
                        $up = $conn->prepare("UPDATE {$table} SET password = ? WHERE id = ? LIMIT 1");
                        $up->bind_param("si", $newHash, $row['id']);
                        $up->execute();
                    } catch (Exception $ignore) {}
                }

                if ($authenticated) {
                    $userRecord = $row;
                    $userRole = $info['role'];
                    $targetRedirect = $info['redirect'] ?? $targetRedirect;
                    break;
                }
            }

            if ($authenticated && $userRecord) {
                $_SESSION['user_id'] = $userRecord['id'];
                $_SESSION['user_email'] = $userRecord['email'];
                $_SESSION['user_role'] = $userRole;
                $_SESSION['user_name'] = $userRecord['name'] ?? $userRecord['email'];
                $_SESSION['user_profile_picture'] = array_key_exists('profile_picture', $userRecord) ? $userRecord['profile_picture'] : null;
                $_SESSION['user_contacts'] = array_key_exists('contacts', $userRecord) ? $userRecord['contacts'] : '';

?>
                <!DOCTYPE html>
                <html lang="en">

                <head>
                    <meta charset="utf-8">
                    <link rel="icon" href="../assets/images/byaheroLogoBlue.svg" type="image/svg+xml">
                    <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
                    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
                    <meta name="viewport" content="width=device-width,initial-scale=1">
                    <title>Logging in...</title>
                    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
                    <style>
                        body {
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            height: 100vh;
                            margin: 0;
                            font-family: "Segoe UI", sans-serif;
                            background: #fff;
                        }
                        .spinner {
                            width: 40px;
                            height: 40px;
                            border: 4px solid #f3f3f3;
                            border-top: 4px solid #2563eb;
                            border-radius: 50%;
                            animation: spin 1s linear infinite;
                            margin-bottom: 20px;
                        }
                        @keyframes spin {
                            0% { transform: rotate(0deg) }
                            100% { transform: rotate(360deg) }
                        }
                        h3 {
                            color: #111827;
                            font-size: 1.1rem;
                        }
                    </style>
                </head>
                <body>
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <h3>Logging in...</h3>
                    <script>
                        const target = "<?= addslashes($targetRedirect) ?>";
                        if (window.Capacitor || navigator.userAgent.includes('Capacitor') || navigator.userAgent.includes('ByaHeroCapacitor')) {
                            const platform = window.Capacitor && window.Capacitor.getPlatform ? window.Capacitor.getPlatform() : 'web';
                            const localOrigin = (platform === 'ios') ? 'capacitor://localhost' : 'http://localhost';
                            const role = "<?= addslashes($userRole) ?>";
                            const email = "<?= addslashes($userRecord['email']) ?>";
                            const name = "<?= addslashes($userRecord['name'] ?? $userRecord['email']) ?>";
                            const contacts = "<?= addslashes(array_key_exists('contacts', $userRecord) ? $userRecord['contacts'] : '') ?>";
                            const profilePic = "<?= addslashes(array_key_exists('profile_picture', $userRecord) ? $userRecord['profile_picture'] : '') ?>";
                            
                            window.location.replace(`${localOrigin}/sync.html?role=${encodeURIComponent(role)}&email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}&contacts=${encodeURIComponent(contacts)}&profile_picture=${encodeURIComponent(profilePic)}&redirect=${encodeURIComponent(target)}`);
                        } else {
                            window.location.replace(target);
                        }
                    </script>
                </body>
                </html>
<?php
                exit;
            } else {
                $err = 'Invalid email or password.';
            }
        } catch (Exception $e) {
            $err = 'Server error. Please try again later.';
        }
    }
}
?>
<?php
$isCapacitor = str_contains($_SERVER['HTTP_USER_AGENT'] ?? '', 'ByaHeroCapacitor');
?>
<!doctype html>
<html lang="en">

<head>
    <meta charset="utf-8" />
    <link rel="icon" href="../assets/images/byaheroLogoBlue.svg" type="image/svg+xml">
    <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
    <title>Login | ByaHero - Real-Time Public Transport Tracking Portal</title>
    <meta name="viewport" content="width=device-width,initial-scale=1" />

    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Material+Icons+Round&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
    <style><?php include __DIR__ . '/../assets/css/auth/auth.css'; ?></style>

    <script><?php include __DIR__ . '/../assets/js/capacitor_firebase_bridge.js'; ?></script>
    <script><?php include __DIR__ . '/../assets/js/capacitor_back_button.js'; ?></script>
    <script src="https://accounts.google.com/gsi/client" async defer></script>
    <script><?php include __DIR__ . '/../assets/js/customAlerts.js'; ?></script>
    <script>
        // If inside Capacitor, clear local credentials when landing on the remote login screen
        if (navigator.userAgent.includes('Capacitor') || navigator.userAgent.includes('ByaHeroCapacitor') || window.Capacitor || (window.android && window.android.bridge)) {
            const urlParams = new URLSearchParams(window.location.search);
            if (!urlParams.get('sync_done')) {
                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                const localOrigin = isIOS ? 'capacitor://localhost' : 'http://localhost';
                const nextUrl = window.location.href + (window.location.href.includes('?') ? '&' : '?') + 'sync_done=1';
                window.location.replace(`${localOrigin}/sync.html?action=logout&redirect=${encodeURIComponent(nextUrl)}`);
            }
        }
    </script>
</head>

<body>
    <div class="login-outer">
        <div class="login-card">
            <header class="brand-wrap">
                <img src="../assets/images/byaheroLogo.png" alt="ByaHero Logo" class="brand-logo" />
                <img src="../assets/images/ByaHero_rext_.svg" alt="BYAHERO" class="brand-title" style="height: 45px; width: auto;" />
            </header>

            <main class="form-card">
                <h2 class="form-heading text-center">LOG IN TO YOUR ACCOUNT</h2>

                <?php if ($err): ?>
                    <div class="alert alert-danger alert-small"><?= htmlspecialchars($err) ?></div>
                <?php endif; ?>

                <form method="POST" novalidate>
                    <div class="mb-3">
                        <input name="email" type="email" inputmode="email" autocomplete="username" placeholder="Email"
                             class="form-control input-pill" required
                             value="<?= isset($_POST['email']) ? htmlspecialchars($_POST['email']) : '' ?>" />
                    </div>

                    <div class="mb-2 input-group-pill">
                        <input id="password" name="password" type="password" autocomplete="current-password"
                             placeholder="Password" class="form-control input-pill" required />
                        <button type="button" id="togglePwd" class="input-addon" aria-pressed="false"
                             aria-label="Show password" title="Show password">
                            <img src="../assets/images/hash.svg" id="eyeIcon" style="width:18px; height:18px;" alt="Show password">
                        </button>
                    </div>

                    <div class="d-flex justify-content-start">
                        <a class="forgot" href="forgotPassword.php" tabindex="-1">Forgot Password?</a>
                    </div>

                    <input type="hidden" name="redirect" value="<?= htmlspecialchars($redirectAfter) ?>" />
                    <button type="submit" class="submit-pill">Login</button>
                </form>

                <div class="mt-4 mb-2">
                    <div class="d-flex align-items-center mb-3">
                        <hr class="flex-grow-1">
                        <span class="mx-2 text-muted small">OR</span>
                        <hr class="flex-grow-1">
                    </div>
                    <div id="google-auth-container">
                        <!-- Standard Web Flow -->
                        <div id="gsi-web-container" style="<?= $isCapacitor ? 'display: none;' : 'display: flex; justify-content: center;' ?>">
                            <div id="g_id_onload"
                                data-client_id="299495970056-35hqu1hnl0ugisp6270he24qugv24skl.apps.googleusercontent.com"
                                data-context="signin"
                                data-ux_mode="popup"
                                data-callback="handleGoogleLogin"
                                data-auto_prompt="false">
                            </div>
                            <div class="g_id_signin"
                                data-type="standard"
                                data-shape="pill"
                                data-theme="outline"
                                data-text="signin_with"
                                data-size="large"
                                data-logo_alignment="left"
                                style="display: flex; justify-content: center;">
                            </div>
                        </div>

                        <!-- Native Capacitor Button (Hidden by default) -->
                        <div id="gsi-native-container" style="<?= $isCapacitor ? 'display: flex; justify-content: center;' : 'display: none; justify-content: center;' ?>">
                            <button type="button" id="native-google-btn" style="background: #fff; border: 1px solid #dadce0; border-radius: 999px; padding: 10px 24px; font-weight: 500; color: #3c4043; display: flex; align-items: center; gap: 12px; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.06); transition: all 0.2s;">
                                <svg width="18" height="18" viewBox="0 0 48 48" style="display: block;">
                                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.7 17.74 9.5 24 9.5z"/>
                                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                                </svg>
                                Continue with Google
                            </button>
                        </div>
                    </div>
                </div>

                <div class="small-muted">
                    Don't have an account?
                    <a href="signUp.php" class="fw-bold text-primary text-decoration-none">Sign up</a>
                </div>
            </main>
        </div>
    </div>

    <script><?php include __DIR__ . '/../assets/js/auth/login.js'; ?></script>
</body>

</html>
