<?php

declare(strict_types=1);
session_start();

/**
 * public/login.php
 *
 * Login page that authenticates against the role tables:
 * - admins, drivers, conductors, users
 */

require __DIR__ . '/../config/db.php';

$err = '';
$redirectAfter = $_GET['redirect'] ?? ($_POST['redirect'] ?? 'passenger/index.php');

$host = $_SERVER['HTTP_HOST'] ?? '';
$isLocal =
    $host === 'localhost' ||
    str_starts_with($host, 'localhost:') ||
    $host === '127.0.0.1' ||
    str_starts_with($host, '127.0.0.1:');

$baseUrl = $isLocal ? '/Byahero-prototype-v3' : '';

if ($redirectAfter !== '' && $redirectAfter[0] !== '/' && !preg_match('~^https?://~i', $redirectAfter)) {
    $redirectAfter = $baseUrl . '/public/' . ltrim($redirectAfter, '/');
} elseif ($redirectAfter !== '' && $redirectAfter[0] === '/') {
    $redirectAfter = $baseUrl . $redirectAfter;
}

$roleTables = [
    'admins' => ['role' => 'admin', 'redirect' => $baseUrl . '/public/ADMIN/admin.php'],
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
                        window.location.replace("<?= addslashes($targetRedirect) ?>");
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
    <meta name="description" content="ByaHero - Log in to access real-time public transit tracking, check bus locations, estimated arrival times, and passenger capacities in your area." />
    <meta name="keywords" content="byahero, bus tracker, public transport tracking, commuter map, passenger count, live bus location, transit portal" />
    <link rel="canonical" href="https://byahero.free.nf/public/login.php" />
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://byahero.free.nf/public/login.php" />
    <meta property="og:title" content="Login | ByaHero - Real-Time Public Transport Tracking Portal" />
    <meta property="og:description" content="ByaHero - Log in to access real-time public transit tracking, check bus locations, estimated arrival times, and passenger capacities in your area." />
    <meta property="og:image" content="../assets/images/byaheroLogo.png" />

    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image" />
    <meta property="twitter:url" content="https://byahero.free.nf/public/login.php" />
    <meta property="twitter:title" content="Login | ByaHero - Real-Time Public Transport Tracking Portal" />
    <meta property="twitter:description" content="ByaHero - Log in to access real-time public transit tracking, check bus locations, estimated arrival times, and passenger capacities in your area." />
    <meta property="twitter:image" content="../assets/images/byaheroLogo.png" />

    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Material+Icons+Round&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
    <script src="../assets/js/capacitor_firebase_bridge.js"></script>
    <script src="../assets/js/capacitor_back_button.js"></script>
    <script src="https://accounts.google.com/gsi/client" async defer></script>
    <style>
        /* ... Your existing CSS remains exactly the same ... */
        :root {
            --brand: #2563eb;
            --bg: #ffffff;
            --muted: #6b7280;
        }

        html,
        body {
            height: 100%;
            background: linear-gradient(180deg, #ffffff 0%, #ffffff 100%);
            font-family: "Segoe UI", system-ui, -apple-system, Arial;
            color: #0f172a;
        }

        .login-outer {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem 1rem;
        }

        .login-card {
            width: 100%;
            max-width: 420px;
            background: transparent;
        }

        .brand-wrap {
            text-align: center;
            margin-bottom: 1.25rem;
        }

        .brand-logo {
            width: 132px;
            height: auto;
            display: block;
            margin: 0 auto 0.75rem;
        }

        .brand-title {
            font-size: 0.85rem;
            letter-spacing: 1px;
            color: #111827;
            font-weight: bold;
        }

        .form-card {
            background: var(--bg);
            padding: 2rem;
            border-radius: 14px;
            box-shadow: 0 10px 30px rgba(2, 6, 23, 0.06);
        }

        .form-heading {
            font-size: 0.9rem;
            font-weight: 700;
            color: var(--brand);
            margin-bottom: 1rem;
            letter-spacing: .6px;
        }

        .input-pill {
            border-radius: 999px;
            background: #fff;
            box-shadow: 0 6px 18px rgba(2, 6, 23, 0.06);
            border: none;
            padding: 0.6rem 1rem;
            padding-right: 3rem;
            height: 48px;
        }

        .input-group-pill {
            position: relative;
        }

        .input-pill:focus {
            outline: none;
            box-shadow: 0 8px 22px rgba(37, 99, 235, 0.12), 0 0 0 3px rgba(37, 99, 235, 0.06);
        }

        .input-addon {
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            border: none;
            background: transparent;
            color: #374151;
            display: flex;
            align-items: center;
            gap: .25rem;
            padding: 4px;
            cursor: pointer;
            height: 28px;
            width: 28px;
            justify-content: center;
            border-radius: 6px;
        }

        .input-addon:focus {
            outline: none;
            box-shadow: none;
        }

        .input-addon:active {
            transform: translateY(-50%) scale(.98);
        }

        .forgot {
            display: inline-block;
            margin-top: .5rem;
            color: var(--muted);
            text-decoration: none;
            font-size: .875rem;
        }

        .submit-pill {
            width: 88px;
            height: 40px;
            border-radius: 999px;
            background: var(--brand);
            border: none;
            margin: 1.6rem auto 0;
            box-shadow: 0 8px 22px rgba(37, 99, 235, 0.18);
            color: #ffffff;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: .6px;
            font-size: 0.9rem;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .submit-pill:active {
            transform: translateY(1px);
        }

        .small-muted {
            font-size: .85rem;
            color: var(--muted);
            text-align: center;
            margin-top: .75rem;
        }

        .alert-small {
            font-size: .9rem;
            padding: .45rem .75rem;
            border-radius: 8px;
        }

        @media (max-width:420px) {
            .brand-logo {
                width: 110px;
            }

            .form-card {
                padding: 1.25rem;
                border-radius: 12px;
            }

            .submit-pill {
                width: 72px;
                height: 36px;
                font-size: 0.85rem;
            }

            .input-addon {
                right: 10px;
                width: 26px;
                height: 26px;
            }

            .input-pill {
                padding-right: 2.5rem;
            }
        }
    </style>
</head>

<body>
    <div class="login-outer">
        <div class="login-card">
            <header class="brand-wrap">
                <img src="../assets/images/byaheroLogo.png" alt="ByaHero Logo" class="brand-logo" />
                <h1 class="brand-title">BYAHERO</h1>
            </header>

            <main class="form-card">
                <h2 class="form-heading">LOG IN TO YOUR ACCOUNT</h2>

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
                            <span id="eyeIcon" class="material-icons-round"
                                style="font-size:18px;line-height:1;">visibility_off</span>
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
                        <div id="gsi-web-container">
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
                        <div id="gsi-native-container" style="display: none; justify-content: center;">
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

    <script>
        document.addEventListener('DOMContentLoaded', function() {
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

            toggle.addEventListener('click', function() {
                pwd.type = (pwd.type === 'password') ? 'text' : 'password';
                syncIcon();
                pwd.focus();
                const val = pwd.value;
                pwd.value = '';
                pwd.value = val;
            });
        });

        // Google Sign-In Callback Handler
        function handleGoogleLogin(response) {
            const credential = response.credential;
            const redirectUrl = document.querySelector('input[name="redirect"]').value;

            // Submit the credential to our backend
            const formData = new FormData();
            formData.append('action', 'google_auth');
            formData.append('credential', credential);
            formData.append('redirect', redirectUrl);

            fetch('auth_api.php', {
                method: 'POST',
                body: formData
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    window.location.href = data.redirect || redirectUrl;
                } else {
                    alert('Google login failed: ' + data.message);
                }
            })
            .catch(err => {
                console.error(err);
                alert('An error occurred during Google sign in.');
            });
        }

        // Capacitor Native Google Auth integration
        function initNativeCapacitorGoogleAuth() {
            if (!window.Capacitor) return false;
            
            // Determine if it's running natively via Capacitor
            const isNative = window.Capacitor.isNative || 
                            (window.Capacitor.getPlatform && window.Capacitor.getPlatform() !== 'web') ||
                            navigator.userAgent.includes('Capacitor') ||
                            window.location.href.includes('capacitor://');
                            
            if (isNative) {
                const webContainer = document.getElementById('gsi-web-container');
                const nativeContainer = document.getElementById('gsi-native-container');
                
                if (webContainer) webContainer.style.display = 'none';
                if (nativeContainer) {
                    nativeContainer.style.setProperty('display', 'flex', 'important');
                    nativeContainer.style.opacity = '1';
                    nativeContainer.style.visibility = 'visible';
                }
                
                if (window.Capacitor.Plugins && window.Capacitor.Plugins.GoogleAuth) {
                    try {
                        window.Capacitor.Plugins.GoogleAuth.initialize({
                            clientId: '299495970056-35hqu1hnl0ugisp6270he24qugv24skl.apps.googleusercontent.com',
                            scopes: ['profile', 'email'],
                            grantOfflineAccess: true,
                        });
                    } catch (e) {
                        console.warn('GoogleAuth initialize issue:', e);
                    }
                }
                
                const nativeBtn = document.getElementById('native-google-btn');
                if (nativeBtn) {
                    nativeBtn.addEventListener('click', async function() {
                        if (!window.Capacitor.Plugins || !window.Capacitor.Plugins.GoogleAuth) {
                            alert('Google Auth plugin not loaded properly.');
                            return;
                        }
                        try {
                            const googleUser = await window.Capacitor.Plugins.GoogleAuth.signIn();
                            if (googleUser && googleUser.authentication && googleUser.authentication.idToken) {
                                handleGoogleLogin({ credential: googleUser.authentication.idToken });
                            } else {
                                alert('Google login failed: Could not retrieve ID token.');
                            }
                        } catch (error) {
                            console.error('Native Google Sign-In error:', error);
                            alert('Google Sign-In Error: ' + (error.message || JSON.stringify(error)));
                        }
                    });
                }
                return true;
            }
            return true; // Stop polling if Capacitor is found but not native
        }

        document.addEventListener('DOMContentLoaded', function() {
            // Because login.php is loaded remotely over the internet, the Capacitor 
            // bridge might inject milliseconds after the DOM is ready. We poll for it.
            let attempts = 0;
            const pollTimer = setInterval(() => {
                if (initNativeCapacitorGoogleAuth() || attempts > 20) { // Try for 2 seconds
                    clearInterval(pollTimer);
                }
                attempts++;
            }, 100);
        });
    </script>
</body>

</html>