<?php
$configPaths = [
    __DIR__ . '/config/db.php',
    __DIR__ . '/../config/db.php',
    __DIR__ . '/../../config/db.php',
];

$loaded = false;
foreach ($configPaths as $p) {
    if (file_exists($p)) {
        require_once $p;
        $loaded = true;
        break;
    }
}

if (!$loaded) {
    http_response_code(500);
    echo "Configuration error: db.php not found.";
    exit;
}

@session_start();

if (isset($_SESSION['user_id'])) {
    if (in_array($_SESSION['user_role'] ?? '', ['conductor', 'driver'], true)) {
        header("Location: conductor/conductor.php");
    } else {
        header("Location: passenger/index.php");
    }
    exit;
}
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <link rel="icon" href="../assets/images/byaheroLogoBlue.svg" type="image/svg+xml">
    <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
    <title>Sign Up | ByaHero - Join Real-Time Transport Tracker</title>

    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Material+Icons+Round&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
    
    <script src="../assets/js/capacitor_firebase_bridge.js"></script>
    <script src="../assets/js/capacitor_back_button.js"></script>
    <script src="https://accounts.google.com/gsi/client" async defer></script>
    <script src="../assets/js/customAlerts.js?v=1"></script>

    <style>
        :root {
            --brand: #2563eb;
            --bg: #ffffff;
            --muted: #6b7280;
        }

        html, body {
            height: 100%;
            background: #ffffff;
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
            padding: 0.6rem 1.2rem;
            height: 48px;
        }

        .input-pill:focus {
            outline: none;
            box-shadow: 0 8px 22px rgba(37, 99, 235, 0.12), 0 0 0 3px rgba(37, 99, 235, 0.06);
        }

        .password-wrapper {
            position: relative;
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
            justify-content: center;
            cursor: pointer;
            width: 32px;
            height: 32px;
            border-radius: 50%;
        }

        .submit-pill {
            width: 100px;
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
            font-size: 0.85rem;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .submit-pill:disabled {
            opacity: 0.7;
            cursor: not-allowed;
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
            margin-bottom: 1rem;
        }

        @media (max-width:420px) {
            .form-card { padding: 1.5rem; }
            .brand-logo { width: 110px; }
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
                <!-- STEP 1: Registration Form -->
                <div id="step-1" class="signup-step active">
                    <h2 class="form-heading">CREATE NEW ACCOUNT</h2>
                    <div id="signupAlert"></div>

                    <form id="signupForm" autocomplete="off">
                        <input type="hidden" name="action" value="signup_request_otp">
                        
                        <div class="mb-3">
                            <input type="text" name="name" class="form-control input-pill" placeholder="Full Name (optional)">
                        </div>
                        
                        <div class="mb-3">
                            <input type="email" name="email" id="signupEmail" class="form-control input-pill" placeholder="Email" required>
                            <div class="invalid-feedback ps-3">Please enter a valid email address.</div>
                        </div>
                        
                        <div class="mb-3">
                            <input type="tel" name="contacts" id="contactsInput" class="form-control input-pill" placeholder="Contact Number (e.g. 09123456789)" required 
                                inputmode="numeric" autocomplete="tel" maxlength="11" pattern="09[0-9]{9}"
                                oninput="this.value = this.value.replace(/[^0-9]/g, '');">
                            <div class="invalid-feedback ps-3">Please enter a valid Philippine mobile number (e.g., 09123456789).</div>
                        </div>
                        
                        <div class="mb-3 password-wrapper">
                            <input type="password" name="password" id="passInput" class="form-control input-pill pe-5" placeholder="Password" required minlength="6" autocomplete="new-password">
                            <button type="button" class="input-addon" onclick="togglePass('passInput', 'iconPass')">
                                <span class="material-icons-round" id="iconPass" style="font-size:18px;">visibility_off</span>
                            </button>
                            <div class="invalid-feedback ps-3">Password must be at least 6 characters.</div>
                        </div>
                        
                        <div class="mb-2 password-wrapper">
                            <input type="password" name="confirm_password" id="confirmInput" class="form-control input-pill pe-5" placeholder="Confirm Password" required minlength="6" autocomplete="new-password">
                            <button type="button" class="input-addon" onclick="togglePass('confirmInput', 'iconConfirm')">
                                <span class="material-icons-round" id="iconConfirm" style="font-size:18px;">visibility_off</span>
                            </button>
                            <div class="invalid-feedback ps-3">Passwords do not match.</div>
                        </div>
                        
                        <button type="submit" class="submit-pill">Sign Up</button>
                    </form>

                    <div class="mt-4 mb-2">
                        <div class="d-flex align-items-center mb-3">
                            <hr class="flex-grow-1">
                            <span class="mx-2 text-muted small">OR</span>
                            <hr class="flex-grow-1">
                        </div>

                        <div id="google-auth-container">
                            <div id="gsi-web-container">
                                <div id="g_id_onload"
                                    data-client_id="299495970056-35hqu1hnl0ugisp6270he24qugv24skl.apps.googleusercontent.com"
                                    data-context="signup"
                                    data-ux_mode="popup"
                                    data-callback="handleGoogleLogin"
                                    data-auto_prompt="false">
                                </div>
                                <div class="g_id_signin"
                                    data-type="standard"
                                    data-shape="pill"
                                    data-theme="outline"
                                    data-text="signup_with"
                                    data-size="large"
                                    data-logo_alignment="left"
                                    style="display: flex; justify-content: center;">
                                </div>
                            </div>

                            <div id="gsi-native-container" style="display: none; justify-content: center;">
                                <button type="button" id="native-google-btn" style="background: #fff; border: 1px solid #dadce0; border-radius: 999px; padding: 10px 24px; font-weight: 500; color: #3c4043; display: flex; align-items: center; gap: 12px; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
                                    <svg width="18" height="18" viewBox="0 0 48 48">
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
                </div>

                <!-- STEP 2: OTP Verification -->
                <div id="step-2" class="signup-step" style="display: none;">
                    <h2 class="form-heading">VERIFY EMAIL</h2>
                    <div class="small-muted mb-3">We sent a 6-digit code to <strong id="otpEmail"></strong></div>
                    
                    <div id="otpAlert"></div>

                    <!-- DEV MODE ALERT -->
                    <div id="devOtpAlert" class="alert alert-info alert-small" style="display: none;">
                        <strong>Dev Mode:</strong> Your code is <span id="devOtpCode" class="fw-bold"></span>
                    </div>

                    <form id="otpForm">
                        <div class="mb-3">
                            <input type="text" name="otp" id="otpInput" class="form-control input-pill text-center fw-bold fs-4" placeholder="000000" maxlength="6" pattern="[0-9]{6}" required>
                        </div>
                        <button type="submit" class="submit-pill">Verify</button>
                        <button type="button" class="btn btn-link w-100 mt-2 text-decoration-none text-muted small" onclick="showStep(1)">Change email</button>
                    </form>
                </div>

                <div class="small-muted">
                    Already have an account?
                    <a href="login.php" class="fw-bold text-primary text-decoration-none">Login</a>
                </div>
            </main>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>

    <script>
        function showStep(num) {
            document.querySelectorAll('.signup-step').forEach(s => s.style.display = 'none');
            document.getElementById(`step-${num}`).style.display = 'block';
        }

        function togglePass(inputId, iconId) {
            const input = document.getElementById(inputId);
            const icon = document.getElementById(iconId);
            if (input.type === 'password') {
                input.type = 'text';
                icon.textContent = 'visibility';
            } else {
                input.type = 'password';
                icon.textContent = 'visibility_off';
            }
            input.focus();
        }

        // STEP 1: Request OTP
        document.getElementById('signupForm').addEventListener('submit', async function (e) {
            e.preventDefault();
            const form = e.target;
            const btn = form.querySelector('button[type="submit"]');
            const alertBox = document.getElementById('signupAlert');
            const originalText = btn.innerHTML;

            // Clear previous validation states
            form.querySelectorAll('.form-control').forEach(el => {
                el.classList.remove('is-invalid');
            });
            alertBox.innerHTML = '';

            let hasError = false;

            // Validate Email
            const emailInput = document.getElementById('signupEmail');
            if (!emailInput.value.trim() || !emailInput.checkValidity()) {
                emailInput.classList.add('is-invalid');
                hasError = true;
            }

            // Validate Contact Number
            const contactInput = document.getElementById('contactsInput');
            const contactVal = contactInput.value.trim();
            if (!/^(09|639)\d{9}$/.test(contactVal)) {
                contactInput.classList.add('is-invalid');
                hasError = true;
            }

            // Validate Password Length
            const passInput = document.getElementById('passInput');
            if (passInput.value.length < 6) {
                passInput.classList.add('is-invalid');
                hasError = true;
            }

            // Validate Password Matching
            const confirmInput = document.getElementById('confirmInput');
            if (passInput.value !== confirmInput.value) {
                confirmInput.classList.add('is-invalid');
                hasError = true;
            }

            if (hasError) return;

            btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
            btn.disabled = true;
            alertBox.innerHTML = '';

            try {
                const fd = new FormData(form);
                const res = await fetch('auth_api.php', { method: 'POST', body: fd });
                const data = await res.json();

                if (data.success) {
                    document.getElementById('otpEmail').textContent = document.getElementById('signupEmail').value;
                    if (data.dev_otp) {
                        document.getElementById('devOtpCode').textContent = data.dev_otp;
                        document.getElementById('devOtpAlert').style.display = 'block';
                    } else {
                        document.getElementById('devOtpAlert').style.display = 'none';
                    }
                    showStep(2);
                } else {
                    throw new Error(data.message || 'Signup failed');
                }
            } catch (err) {
                alertBox.innerHTML = `<div class="alert alert-danger alert-small">${err.message}</div>`;
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });

        // STEP 2: Verify OTP
        document.getElementById('otpForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            const alertBox = document.getElementById('otpAlert');
            const originalText = btn.innerHTML;

            btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
            btn.disabled = true;
            alertBox.innerHTML = '';

            try {
                const formData = new FormData();
                formData.append('action', 'signup_verify_otp');
                formData.append('email', document.getElementById('signupEmail').value);
                formData.append('otp', document.getElementById('otpInput').value);

                const res = await fetch('auth_api.php', { method: 'POST', body: formData });
                const data = await res.json();

                if (data.success) {
                    alertBox.innerHTML = '<div class="alert alert-success alert-small">Success! Redirecting...</div>';
                    setTimeout(() => { window.location.href = data.redirect || 'passenger/showGuide/showGuide.php'; }, 1000);
                } else {
                    throw new Error(data.message || 'Verification failed');
                }
            } catch (err) {
                alertBox.innerHTML = `<div class="alert alert-danger alert-small">${err.message}</div>`;
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });

        function handleGoogleLogin(response) {
            const credential = response.credential;
            const formData = new FormData();
            formData.append('action', 'google_auth');
            formData.append('credential', credential);
            
            fetch('auth_api.php', { method: 'POST', body: formData })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    window.location.href = data.redirect || 'passenger/index.php';
                } else {
                    document.getElementById('signupAlert').innerHTML = `<div class="alert alert-danger alert-small">Google error: ${data.message}</div>`;
                }
            })
            .catch(err => {
                console.error(err);
                document.getElementById('signupAlert').innerHTML = `<div class="alert alert-danger alert-small">Server error.</div>`;
            });
        }

        function initNativeCapacitorGoogleAuth() {
            if (!window.Capacitor) return false;
            const isNative = window.Capacitor.isNative || (window.Capacitor.getPlatform && window.Capacitor.getPlatform() !== 'web');
            if (isNative) {
                document.getElementById('gsi-web-container').style.display = 'none';
                const nativeContainer = document.getElementById('gsi-native-container');
                nativeContainer.style.setProperty('display', 'flex', 'important');
                
                const nativeBtn = document.getElementById('native-google-btn');
                if (nativeBtn) {
                    nativeBtn.addEventListener('click', async function() {
                        try {
                            const googleUser = await window.Capacitor.Plugins.GoogleAuth.signIn();
                            if (googleUser?.authentication?.idToken) {
                                handleGoogleLogin({ credential: googleUser.authentication.idToken });
                            }
                        } catch (error) {
                            console.error('Native Google error:', error);
                        }
                    });
                }
                return true;
            }
            return true;
        }

        document.addEventListener('DOMContentLoaded', () => {
            let attempts = 0;
            const pollTimer = setInterval(() => {
                if (initNativeCapacitorGoogleAuth() || attempts > 20) clearInterval(pollTimer);
                attempts++;
            }, 100);
        });
    </script>
</body>
</html>
