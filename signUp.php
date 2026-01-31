<?php
session_start();
// [Path] Config is inside public/config/
require __DIR__ . '../config/db.php';

// If user is already logged in, redirect them
if (isset($_SESSION['user_id'])) {
    if (in_array($_SESSION['user_role'] ?? '', ['conductor', 'driver'])) {
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
            /* Matching the blue from your logo */
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

        .signup-container {
            width: 100%;
            max-width: 420px;
        }

        /* Rounded Gray Inputs */
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

        /* Password Eye Icon */
        .password-wrapper {
            position: relative;
        }

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

        /* Pill Button */
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

        .logo-img {
            width: 150px;
            height: auto;
            margin-bottom: 5px;
        }

        .google-btn {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            border: 1px solid #dee2e6;
            display: flex;
            align-items: center;
            justify-content: center;
            background: white;
            transition: all 0.2s;
            margin: 0 auto;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }

        .google-btn:hover {
            background-color: #f8f9fa;
            transform: translateY(-2px);
        }
    </style>
</head>

<body>

    <div class="container signup-container text-center">

        <div class="mb-3">
            <img src="images/byaheroLogoBlue.svg" alt="ByaHero Logo" class="logo-img">
            <h5 class="fw-bold text-dark mt-1" style="letter-spacing: 1px; font-size: 14px;">BYAHERO</h5>
        </div>

        <div class="text-start mb-4">
            <h6 class="fw-bold text-primary mb-3">CREATE NEW ACCOUNT</h6>

            <div id="signupAlert"></div>

            <form id="signupForm">
                <input type="hidden" name="action" value="signup">

                <div class="mb-3">
                    <input type="text" name="name" class="form-control" placeholder="Full Name" required>
                </div>

                <div class="mb-3">
                    <input type="email" name="email" class="form-control" placeholder="Email" required>
                </div>

                <div class="mb-3 password-wrapper">
                    <input type="password" name="password" id="passInput" class="form-control" placeholder="Password"
                        required minlength="6">
                    <button type="button" class="password-toggle" onclick="togglePass('passInput', 'iconPass')">
                        <span class="material-symbols-rounded fs-5" id="iconPass">visibility_off</span>
                    </button>
                </div>

                <div class="mb-4 password-wrapper">
                    <input type="password" name="confirm_password" id="confirmInput" class="form-control"
                        placeholder="Confirm Password" required minlength="6">
                    <button type="button" class="password-toggle" onclick="togglePass('confirmInput', 'iconConfirm')">
                        <span class="material-symbols-rounded fs-5" id="iconConfirm">visibility_off</span>
                    </button>
                </div>

                <button type="submit" class="btn btn-primary w-100 mb-4 shadow-sm">
                    SIGN UP
                </button>
            </form>
        </div>

        <div class="position-relative mb-4">
            <hr class="text-secondary opacity-25">
            <span class="position-absolute top-50 start-50 translate-middle bg-white px-3 text-muted small">
                Or sign up with
            </span>
        </div>

        <div class="d-flex justify-content-center mb-4">
            <a href="#" class="google-btn text-decoration-none">
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width="24"
                    height="24">
            </a>
        </div>

        <div class="text-center">
            <p class="text-muted small mb-0">Already have an account? <a href="index.php"
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
                alertBox.innerHTML = '<div class="alert alert-danger d-flex align-items-center small py-2 border-0 bg-danger-subtle text-danger fw-bold">Passwords do not match.</div>';
                return;
            }

            // Loading State
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating...';
            btn.disabled = true;
            alertBox.innerHTML = '';

            try {
                const fd = new FormData(form);
                const res = await fetch('public/auth_api.php', {
                    method: 'POST',
                    body: fd
                });

                const text = await res.text();
                let data;
                try {
                    data = JSON.parse(text);
                } catch (e) {
                    throw new Error("Server Error");
                }

                if (data.success) {
                    alertBox.innerHTML = '<div class="alert alert-success d-flex align-items-center small py-2 border-0 bg-success-subtle text-success fw-bold">Success! Redirecting to login...</div>';
                    form.reset();
                    setTimeout(() => {
                        window.location.href = 'index.php';
                    }, 1500)
                } else {
                    throw new Error(data.message || 'Signup failed');
                }

            } catch (err) {
                alertBox.innerHTML = `<div class="alert alert-danger d-flex align-items-center small py-2 border-0 bg-danger-subtle text-danger fw-bold">${err.message}</div>`;
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    </script>
</body>

</html>