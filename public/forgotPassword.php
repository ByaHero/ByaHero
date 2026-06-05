<?php
declare(strict_types=1);
@session_start();

$pageTitle = 'Forgot Password';
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <link rel="icon" href="../assets/images/byaheroLogoBlue.svg" type="image/svg+xml">
    <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Reset Password | ByaHero Recovery Portal</title>

    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0&display=swap" rel="stylesheet" media="print" onload="this.media='all'" />
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" />
    <link rel="stylesheet" href="../assets/css/auth/auth.css">
    
    <script src="../assets/js/customAlerts.js?v=1"></script>
</head>

<body>
    <div class="login-outer">
        <div class="login-card">
            <header class="brand-wrap">
                <img src="../assets/images/byaheroLogo.png" alt="ByaHero Logo" class="brand-logo" />
                <h1 class="brand-title">BYAHERO</h1>
            </header>

            <main class="form-card">

                <!-- STEP 1: Enter Email -->
                <div id="step-1" class="step active">
                    <div class="form-heading text-center">Password Recovery</div>
                    <div class="form-subheading">Enter your email address to receive a 6-digit confirmation code.</div>
                    
                    <div id="err-1" class="alert alert-danger alert-small d-none"></div>

                    <form id="form-1">
                        <div class="mb-3">
                            <input id="email-input" type="email" placeholder="Email Address" class="form-control input-pill" required />
                        </div>
                        <button type="submit" class="submit-pill" id="btn-1">Send Recovery Code</button>
                    </form>
                    <a href="login.php" class="back-link"><span class="material-symbols-rounded" style="font-size: 18px;">arrow_back</span> Back to Login</a>
                </div>

                <!-- STEP 2: Enter OTP -->
                <div id="step-2" class="step">
                    <div class="form-heading text-center">Enter Code</div>
                    <div class="form-subheading">We sent a 6-digit code to <strong id="display-email"></strong></div>
                    
                    <div id="err-2" class="alert alert-danger alert-small d-none"></div>
                    
                    <!-- DEV ALERT ONLY -->
                    <div class="dev-alert" id="dev-otp-display" style="display: none;">
                        <strong>[Dev Mode Intercept]</strong><br>
                        Email transmission bypassed.<br>
                        Your reset code is: <strong style="font-size: 1.2rem; letter-spacing: 2px;" id="dev-otp-code">000000</strong>
                    </div>

                    <form id="form-2">
                        <div class="mb-3">
                            <input id="otp-input" type="text" placeholder="6-Digit Code" class="form-control input-pill text-center fs-4 fw-bold" maxlength="6" style="letter-spacing: 5px;" required />
                        </div>
                        <button type="submit" class="submit-pill" id="btn-2">Verify Code</button>
                    </form>
                    <div class="text-center mt-3 small text-muted">
                        Code expires in <span id="timer" class="timer-text">15:00</span>
                    </div>
                </div>

                <!-- STEP 3: Enter New Password -->
                <div id="step-3" class="step">
                    <div class="form-heading text-center">Create New Password</div>
                    <div class="form-subheading">Your identity has been verified. Please enter your new password below.</div>
                    
                    <div id="err-3" class="alert alert-danger alert-small d-none"></div>

                    <form id="form-3">
                        <div class="mb-3">
                            <input id="new-password" type="password" placeholder="New Password" class="form-control input-pill" required />
                        </div>
                        <div class="mb-3">
                            <input id="confirm-password" type="password" placeholder="Confirm Password" class="form-control input-pill" required />
                        </div>
                        <button type="submit" class="submit-pill" id="btn-3">Reset Password</button>
                    </form>
                </div>
                
                <!-- STEP 4: Success -->
                <div id="step-4" class="step">
                    <div class="text-center">
                        <span class="material-symbols-rounded text-success mb-3" style="font-size: 80px;">check_circle</span>
                    </div>
                    <div class="form-heading text-center">Password Reset Complete</div>
                    <div class="form-subheading">Your account is now secure. You can log in using your new password.</div>
                    
                    <button type="button" class="submit-pill" onclick="window.location.href='login.php'">Go to Login</button>
                </div>

            </main>

        </div>
    </div>

    <script src="../assets/js/auth/forgotPassword.js"></script>
</body>
</html>
