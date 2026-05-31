<?php
declare(strict_types=1);
session_start();

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
    <meta name="description" content="Recover your ByaHero account password. Securely reset your credentials and resume real-time transit tracking." />
    <meta name="keywords" content="byahero, reset password, recover account, password recovery, transit portal" />
    <link rel="canonical" href="https://byahero.free.nf/public/forgotPassword.php" />
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://byahero.free.nf/public/forgotPassword.php" />
    <meta property="og:title" content="Reset Password | ByaHero Recovery Portal" />
    <meta property="og:description" content="Recover your ByaHero account password. Securely reset your credentials and resume real-time transit tracking." />
    <meta property="og:image" content="../assets/images/byaheroLogo.png" />

    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image" />
    <meta property="twitter:url" content="https://byahero.free.nf/public/forgotPassword.php" />
    <meta property="twitter:title" content="Reset Password | ByaHero Recovery Portal" />
    <meta property="twitter:description" content="Recover your ByaHero account password. Securely reset your credentials and resume real-time transit tracking." />
    <meta property="twitter:image" content="../assets/images/byaheroLogo.png" />

    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0&display=swap" rel="stylesheet" media="print" onload="this.media='all'" />
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" />
    <script src="../assets/js/customAlerts.js?v=1"></script>

    <style>
        :root {
            --brand: #2563eb;
            --bg: #ffffff;
            --muted: #6b7280;
        }

        html,
        body {
            height: 100%;
            background: linear-gradient(180deg, #ffffff 0%, #ffffff 100%);
            font-family: 'Poppins', "Segoe UI", system-ui, -apple-system, Arial;
            color: #0f172a;
            margin: 0;
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
            text-align: center;
            text-transform: uppercase;
        }

        .form-subheading {
            font-size: 0.85rem;
            color: var(--muted);
            text-align: center;
            margin-bottom: 1.5rem;
        }

        .input-pill {
            border-radius: 999px;
            background: #fff;
            box-shadow: 0 6px 18px rgba(2, 6, 23, 0.06);
            border: none;
            padding: 0.6rem 1rem;
            height: 48px;
            font-size: 0.95rem;
        }

        .input-pill:focus {
            outline: none;
            box-shadow: 0 8px 22px rgba(37, 99, 235, 0.12), 0 0 0 3px rgba(37, 99, 235, 0.06);
        }

        .submit-pill {
            width: auto;
            min-width: 120px;
            padding: 0 1.5rem;
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
            transition: transform 0.2s;
        }

        .submit-pill:active {
            transform: translateY(1px);
        }

        .alert-small {
            font-size: .9rem;
            padding: .45rem .75rem;
            border-radius: 8px;
            text-align: center;
            margin-bottom: 1rem;
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
                height: 36px;
                font-size: 0.85rem;
            }
        }
        
        .step {
            display: none;
            animation: fadeIn 0.4s ease-in-out;
        }
        
        .step.active {
            display: block;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .dev-alert {
            background-color: #dcfce7;
            border-left: 5px solid #22c55e;
            color: #166534;
            padding: 1rem;
            border-radius: 4px;
            margin-bottom: 1.5rem;
            font-size: 0.9rem;
        }

        .back-link {
            text-decoration: none;
            color: var(--muted);
            font-size: 0.85rem;
            display: inline-flex;
            align-items: center;
            gap: 5px;
            margin-top: 1.5rem;
            transition: color 0.2s;
            justify-content: center;
            width: 100%;
        }

        .back-link:hover {
            color: var(--brand);
        }
        
        .timer-text {
            font-weight: 600;
            color: var(--danger);
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

            <!-- STEP 1: Enter Email -->
            <div id="step-1" class="step active">
                <div class="form-heading">Password Recovery</div>
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
                <div class="form-heading">Enter Code</div>
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
                <div class="form-heading">Create New Password</div>
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
                <div class="form-heading">Password Reset Complete</div>
                <div class="form-subheading">Your account is now secure. You can log in using your new password.</div>
                
                <button type="button" class="submit-pill" onclick="window.location.href='login.php'">Go to Login</button>
            </div>

            </main>

        </div>
    </div>

    <script>
        const step1 = document.getElementById('step-1');
        const step2 = document.getElementById('step-2');
        const step3 = document.getElementById('step-3');
        const step4 = document.getElementById('step-4');

        let userEmail = '';
        let timerInterval = null;

        function showStep(stepId) {
            document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
            document.getElementById(stepId).classList.add('active');
        }

        function showError(num, msg) {
            const el = document.getElementById(`err-${num}`);
            el.textContent = msg;
            el.classList.remove('d-none');
        }
        
        function hideError(num) {
            document.getElementById(`err-${num}`).classList.add('d-none');
        }
        
        function setButtonLoading(btnId, isLoading, text) {
            const btn = document.getElementById(btnId);
            if (isLoading) {
                btn.disabled = true;
                btn.textContent = 'Please wait...';
            } else {
                btn.disabled = false;
                btn.textContent = text;
            }
        }

        function startTimer() {
            let timeLeft = 900; // 15 mins
            const timerEl = document.getElementById('timer');
            
            if (timerInterval) clearInterval(timerInterval);
            
            timerInterval = setInterval(() => {
                timeLeft--;
                if (timeLeft < 0) {
                    clearInterval(timerInterval);
                    timerEl.textContent = "00:00 - Expired";
                    return;
                }
                const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
                const s = (timeLeft % 60).toString().padStart(2, '0');
                timerEl.textContent = `${m}:${s}`;
            }, 1000);
        }

        // STEP 1: Request OTP
        document.getElementById('form-1').addEventListener('submit', async (e) => {
            e.preventDefault();
            hideError(1);
            
            const email = document.getElementById('email-input').value.trim();
            if (!email) return;

            setButtonLoading('btn-1', true, 'Send Recovery Code');

            try {
                const fd = new FormData();
                fd.append('action', 'request_otp');
                fd.append('email', email);

                const res = await fetch('auth_api.php', { method: 'POST', body: fd, credentials: 'same-origin' });
                const data = await res.json();

                if (data.success) {
                    userEmail = email;
                    document.getElementById('display-email').textContent = email;
                    
                    // Handle Dev Mode display
                    const devOtpBox = document.getElementById('dev-otp-display');
                    if (data.dev_otp) {
                        document.getElementById('dev-otp-code').textContent = data.dev_otp;
                        devOtpBox.style.display = 'block';
                    } else {
                        devOtpBox.style.display = 'none';
                    }
                    
                    showStep('step-2');
                    startTimer();
                } else {
                    showError(1, data.message || 'Failed to request OTP');
                }
            } catch (err) {
                showError(1, 'Network error. Please try again.');
            } finally {
                setButtonLoading('btn-1', false, 'Send Recovery Code');
            }
        });

        // STEP 2: Verify OTP
        document.getElementById('form-2').addEventListener('submit', async (e) => {
            e.preventDefault();
            hideError(2);
            
            const otp = document.getElementById('otp-input').value.trim();
            if (!otp) return;

            setButtonLoading('btn-2', true, 'Verify Code');

            try {
                const fd = new FormData();
                fd.append('action', 'verify_otp');
                fd.append('email', userEmail);
                fd.append('otp', otp);

                const res = await fetch('auth_api.php', { method: 'POST', body: fd, credentials: 'same-origin' });
                const data = await res.json();

                if (data.success) {
                    if (timerInterval) clearInterval(timerInterval);
                    showStep('step-3');
                } else {
                    showError(2, data.message || 'Invalid code');
                }
            } catch (err) {
                showError(2, 'Network error. Please try again.');
            } finally {
                setButtonLoading('btn-2', false, 'Verify Code');
            }
        });

        // STEP 3: Reset Password
        document.getElementById('form-3').addEventListener('submit', async (e) => {
            e.preventDefault();
            hideError(3);
            
            const password = document.getElementById('new-password').value;
            const confirm = document.getElementById('confirm-password').value;
            const otp = document.getElementById('otp-input').value.trim();

            if (password.length < 6) {
                showError(3, 'Password must be at least 6 characters');
                return;
            }
            if (password !== confirm) {
                showError(3, 'Passwords do not match');
                return;
            }

            setButtonLoading('btn-3', true, 'Reset Password');

            try {
                const fd = new FormData();
                fd.append('action', 'reset_password');
                fd.append('email', userEmail);
                fd.append('otp', otp);
                fd.append('new_password', password);

                const res = await fetch('auth_api.php', { method: 'POST', body: fd, credentials: 'same-origin' });
                const data = await res.json();

                if (data.success) {
                    showStep('step-4');
                } else {
                    showError(3, data.message || 'Failed to reset password');
                }
            } catch (err) {
                showError(3, 'Network error. Please try again.');
            } finally {
                setButtonLoading('btn-3', false, 'Reset Password');
            }
        });
    </script>
</body>
</html>
