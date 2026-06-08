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

$isCapacitor = str_contains($_SERVER['HTTP_USER_AGENT'] ?? '', 'ByaHeroCapacitor');
$scriptName = $_SERVER['SCRIPT_NAME'] ?? '';
$publicDir = rtrim(str_replace('\\', '/', dirname($scriptName)), '/');
$baseUrl = preg_replace('~/public(/.*)?$~', '', $publicDir) ?: '';
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
    <style><?php include __DIR__ . '/../assets/css/auth/auth.css'; ?></style>
    
    <script><?php include __DIR__ . '/../assets/js/capacitor_firebase_bridge.js'; ?></script>
    <script><?php include __DIR__ . '/../assets/js/capacitor_back_button.js'; ?></script>
    <script src="https://accounts.google.com/gsi/client" async defer></script>
    <script><?php include __DIR__ . '/../assets/js/customAlerts.js'; ?></script>
</head>
<body>

    <div class="login-outer">
        <div class="login-card">
            <header class="brand-wrap">
                <img src="../assets/images/byaheroLogo.png" alt="ByaHero Logo" class="brand-logo" />
                <img src="../assets/images/ByaHero_rext_.svg" alt="BYAHERO" class="brand-title" style="height: 45px; width: auto;" />
            </header>

            <main class="form-card">
                <!-- STEP 1: Registration Form -->
                <div id="step-1" class="signup-step active">
                    <h2 class="form-heading text-center">CREATE NEW ACCOUNT</h2>
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
                                <img src="../assets/images/hash.svg" id="iconPass" style="width:18px; height:18px;" alt="Show password">
                            </button>
                            <div class="invalid-feedback ps-3">Password must be at least 6 characters.</div>
                        </div>
                        
                        <div class="mb-2 password-wrapper">
                            <input type="password" name="confirm_password" id="confirmInput" class="form-control input-pill pe-5" placeholder="Confirm Password" required minlength="6" autocomplete="new-password">
                            <button type="button" class="input-addon" onclick="togglePass('confirmInput', 'iconConfirm')">
                                <img src="../assets/images/hash.svg" id="iconConfirm" style="width:18px; height:18px;" alt="Show password">
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
                            <div id="gsi-web-container" style="<?= $isCapacitor ? 'display: none;' : 'display: flex; justify-content: center;' ?>">
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

                            <div id="gsi-native-container" style="<?= $isCapacitor ? 'display: flex; justify-content: center;' : 'display: none; justify-content: center;' ?>">
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
                    <h2 class="form-heading text-center">VERIFY EMAIL</h2>
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
    <script><?php include __DIR__ . '/../assets/js/auth/signUp.js'; ?></script>
</body>
</html>
