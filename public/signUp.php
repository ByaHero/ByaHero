<?php
session_start();

// Robust config loader — tries likely locations to avoid fatal require() errors across environments.
$configPaths = [
    __DIR__ . '/config/db.php',       // public/config/db.php (if you keep config inside public/)
    __DIR__ . '/../config/db.php',    // project-root/config/db.php (your current location)
    __DIR__ . '/../../config/db.php', // alternate layouts
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
    // Friendly development error (avoid fatal). In production, log and show generic message.
    http_response_code(500);
    echo "Configuration error: db.php not found. Checked paths:<ul>";
    foreach ($configPaths as $p) {
        echo "<li>" . htmlspecialchars($p) . "</li>";
    }
    echo "</ul>";
    exit;
}

// If user is already logged in, redirect them
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

    <style>
        :root {
            --bs-primary: #1e40af;
            --bs-primary-hover: #172e6e;
        }
        body {
            font-family: 'Poppins', sans-serif;
            background-color: #ffffff;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .signup-container { width: 100%; max-width: 420px; }
        .form-control {
            background-color: #f3f4f6;
            border: none;
            padding: 12px 20px;
            font-size: 0.95rem;
            border-radius: 12px;
        }
        .form-control:focus {
            background-color: #fff;
            box-shadow: 0 0 0 3px rgba(30, 64, 175, 0.1);
        }
        .password-wrapper { position: relative; }
        .password-toggle {
            position: absolute;
            right: 15px;
            top: 50%;
            transform: translateY(-50%);
            cursor: pointer;
            color: #6c757d;
            border: none;
            background: none;
            padding: 0;
        }
        .btn-primary {
            background-color: var(--bs-primary);
            border: none;
            padding: 12px;
            font-weight: 600;
            border-radius: 50px;
            transition: all 0.3s ease;
        }
        .btn-primary:hover {
            background-color: var(--bs-primary-hover);
            transform: translateY(-1px);
        }
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

            <!-- Note: users CANNOT choose a role here. Admins create drivers/conductors. -->
            <form id="signupForm" autocomplete="off">
                <input type="hidden" name="action" value="signup">

                <div class="mb-3">
                    <input type="text" name="name" class="form-control" placeholder="Full Name (optional)">
                </div>

                <div class="mb-3">
                    <input type="email" name="email" class="form-control" placeholder="Email" required>
                </div>

                <!-- NEW: Contact Number -->
                <div class="mb-3">
                    <input
                        type="tel"
                        name="contacts"
                        class="form-control"
                        placeholder="Contact Number"
                        required
                        inputmode="tel"
                        autocomplete="tel"
                        minlength="7"
                        maxlength="20"
                    >
                </div>

                <div class="mb-3 password-wrapper">
                    <input type="password" name="password" id="passInput" class="form-control" placeholder="Password"
                        required minlength="6" autocomplete="new-password">
                    <button type="button" class="password-toggle" onclick="togglePass('passInput', 'iconPass')" aria-label="Toggle password">
                        <span class="material-symbols-rounded fs-5" id="iconPass">visibility_off</span>
                    </button>
                </div>

                <div class="mb-4 password-wrapper">
                    <input type="password" name="confirm_password" id="confirmInput" class="form-control"
                        placeholder="Confirm Password" required minlength="6" autocomplete="new-password">
                    <button type="button" class="password-toggle" onclick="togglePass('confirmInput', 'iconConfirm')" aria-label="Toggle confirm password">
                        <span class="material-symbols-rounded fs-5" id="iconConfirm">visibility_off</span>
                    </button>
                </div>

                <button type="submit" class="btn btn-primary w-100 mb-4 shadow-sm">
                    SIGN UP
                </button>
            </form>
        </div>

        <!-- Google signup section REMOVED -->

        <div class="text-center small-muted">
            <p class="text-muted small mb-0">Already have an account? <a href="login.php"
                    class="fw-bold text-primary text-decoration-none">Login</a></p>
        </div>

    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>

    <script>
        // Toggle Password Visibility
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

        // Handle Signup Submission
        document.getElementById('signupForm').addEventListener('submit', async function (e) {
            e.preventDefault();

            const form = e.target;
            const btn = form.querySelector('button[type="submit"]');
            const alertBox = document.getElementById('signupAlert');
            const originalText = btn.innerHTML;

            // Password Validation (Frontend)
            const p1 = document.getElementById('passInput').value;
            const p2 = document.getElementById('confirmInput').value;

            if (p1 !== p2) {
                alertBox.innerHTML = '<div class="alert alert-danger small py-2">Passwords do not match.</div>';
                return;
            }

            // Loading State
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating...';
            btn.disabled = true;
            alertBox.innerHTML = '';

            try {
                const fd = new FormData(form);

                // POST to auth_api.php in the same public directory
                const res = await fetch('auth_api.php', {
                    method: 'POST',
                    body: fd
                });

                const text = await res.text();
                let data;
                try {
                    data = JSON.parse(text);
                } catch (err) {
                    throw new Error("Server Error");
                }

                if (data.success) {
                    alertBox.innerHTML = '<div class="alert alert-success small py-2">Success! Redirecting...</div>';
                    form.reset();

                    // Use redirect returned by server (auth_api should return redirect on signup)
                    const redirect = data.redirect || 'passenger/index.php';
                    setTimeout(() => {
                        window.location.href = redirect;
                    }, 900);
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