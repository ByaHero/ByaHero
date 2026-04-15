<?php
session_start();

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

if (isset($_SESSION['user_id'])) {
    if (in_array($_SESSION['user_role'] ?? '', ['conductor', 'driver'], true)) {
        header("Location: /conductor/conductor.php");
    } else {
        header("Location: /passenger/index.php");
    }
    exit;
}
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Sign Up - ByaHero</title>

    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded" rel="stylesheet" />
    
    <script src="../assets/js/capacitor_firebase_bridge.js"></script>
    <script src="../assets/js/capacitor_back_button.js"></script>

    <style>
        /* Your existing CSS remains the same */
        :root { --bs-primary: #1e40af; --bs-primary-hover: #172e6e; }
        body { font-family: 'Poppins', sans-serif; background-color: #ffffff; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .signup-container { width: 100%; max-width: 420px; }
        .form-control { background-color: #f3f4f6; border: none; padding: 12px 20px; font-size: 0.95rem; border-radius: 12px; }
        .form-control:focus { background-color: #fff; box-shadow: 0 0 0 3px rgba(30, 64, 175, 0.1); }
        .password-wrapper { position: relative; }
        .password-toggle { position: absolute; right: 15px; top: 50%; transform: translateY(-50%); cursor: pointer; color: #6c757d; border: none; background: none; padding: 0; }
        .btn-primary { background-color: var(--bs-primary); border: none; padding: 12px; font-weight: 600; border-radius: 50px; transition: all 0.3s ease; }
        .btn-primary:hover { background-color: var(--bs-primary-hover); transform: translateY(-1px); }
        .logo-img { width: 150px; height: auto; margin-bottom: 5px; }
        .small-muted { margin-top: 0.75rem; }
    </style>
</head>
<body>

    <div class="container signup-container text-center">
        <div class="mb-3">
            <img src="../assets/images/byaheroLogoBlue.svg" alt="ByaHero Logo" class="logo-img">
            <h5 class="fw-bold text-dark mt-1" style="letter-spacing: 1px; font-size: 14px;">BYAHERO</h5>
        </div>

        <div class="text-start mb-4">
            <h6 class="fw-bold text-primary mb-3">CREATE NEW ACCOUNT</h6>
            <div id="signupAlert"></div>

            <form id="signupForm" autocomplete="off">
                <input type="hidden" name="action" value="signup">
                <div class="mb-3">
                    <input type="text" name="name" class="form-control" placeholder="Full Name (optional)">
                </div>
                <div class="mb-3">
                    <input type="email" name="email" class="form-control" placeholder="Email" required>
                </div>
                <div class="mb-3">
                    <input type="tel" name="contacts" class="form-control" placeholder="Contact Number" required inputmode="tel" autocomplete="tel" minlength="7" maxlength="20">
                </div>
                <div class="mb-3 password-wrapper">
                    <input type="password" name="password" id="passInput" class="form-control" placeholder="Password" required minlength="6" autocomplete="new-password">
                    <button type="button" class="password-toggle" onclick="togglePass('passInput', 'iconPass')">
                        <span class="material-symbols-rounded fs-5" id="iconPass">visibility_off</span>
                    </button>
                </div>
                <div class="mb-4 password-wrapper">
                    <input type="password" name="confirm_password" id="confirmInput" class="form-control" placeholder="Confirm Password" required minlength="6" autocomplete="new-password">
                    <button type="button" class="password-toggle" onclick="togglePass('confirmInput', 'iconConfirm')">
                        <span class="material-symbols-rounded fs-5" id="iconConfirm">visibility_off</span>
                    </button>
                </div>
                <button type="submit" class="btn btn-primary w-100 mb-4 shadow-sm">SIGN UP</button>
            </form>
        </div>

        <div class="text-center small-muted">
            <p class="text-muted small mb-0">Already have an account? <a href="login.php" class="fw-bold text-primary text-decoration-none">Login</a></p>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>

    <script>
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

        document.getElementById('signupForm').addEventListener('submit', async function (e) {
            e.preventDefault();

            const form = e.target;
            const btn = form.querySelector('button[type="submit"]');
            const alertBox = document.getElementById('signupAlert');
            const originalText = btn.innerHTML;

            const p1 = document.getElementById('passInput').value;
            const p2 = document.getElementById('confirmInput').value;

            if (p1 !== p2) {
                alertBox.innerHTML = '<div class="alert alert-danger small py-2">Passwords do not match.</div>';
                return;
            }

            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating...';
            btn.disabled = true;
            alertBox.innerHTML = '';

            try {
                const fd = new FormData(form);
                const res = await fetch('auth_api.php', { method: 'POST', body: fd });
                const text = await res.text();
                let data;
                try { data = JSON.parse(text); } catch (err) { throw new Error("Server Error"); }

                if (data.success) {
                    alertBox.innerHTML = '<div class="alert alert-success small py-2">Success! Syncing connection...</div>';
                    form.reset();

                    // ── TRIGGER ONESIGNAL SYNC NOW THAT SESSION IS ACTIVE ──
                    function trySaveToken() {
                        if (window.sosBridge && window._sosPendingToken) {
                            console.log('[Signup] Using pending token:', window._sosPendingToken);
                            window.sosBridge.saveToken(window._sosPendingToken);
                        } else if (window.gonative && window.gonative.onesignal) {
                            console.log('[Signup] Calling gonative.onesignal.getInfo()...');
                            window.gonative.onesignal.getInfo()
                                .then(function(info) {
                                    console.log('[Signup] getInfo() result:', JSON.stringify(info));
                                    // Try ALL possible property names
                                    var id = info && (
                                        info.oneSignalId ||
                                        info.userId ||
                                        info.subscriptionId ||
                                        info.oneSignalUserId ||
                                        info.pushToken ||
                                        info.playerId ||
                                        info.id ||
                                        (info.subscription && (info.subscription.id || info.subscription.subscriptionId || info.subscription.pushToken))
                                    );
                                    if (id && window.sosBridge) {
                                        console.log('[Signup] Token found:', id);
                                        window.sosBridge.saveToken(id);
                                    } else {
                                        console.warn('[Signup] No token yet, retrying in 500ms...');
                                        setTimeout(trySaveToken, 500);
                                    }
                                })
                                .catch(function(e) {
                                    console.warn('[Signup] getInfo() error:', e);
                                    setTimeout(trySaveToken, 500);
                                });
                        }
                    }
                    trySaveToken();

                    // Delay slightly longer (1.2s instead of 0.9s) to allow fetch to fire before page unloads
                    setTimeout(() => {
                        window.location.href = 'passenger/showGuide/showGuide.php';
                    }, 1200);
                } else {
                    throw new Error(data.message || 'Signup failed');
                }

            } catch (err) {
                alertBox.innerHTML = `<div class="alert alert-danger small py-2">${err.message}</div>`;
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    </script>
</body>
</html>