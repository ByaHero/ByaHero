<?php
session_start();
require __DIR__ . '../config/db.php';

// If user is already logged in, redirect them to their specific area
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
    <title>Login - ByaHero</title>
    
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded" rel="stylesheet" />

    <style>
        :root {
            /* Matching the blue from your logo/image */
            --bs-primary: #1e40af; 
            --bs-primary-hover: #172e6e;
        }
        body {
            font-family: 'Poppins', sans-serif;
            background-color: #ffffff; /* Clean white background per image */
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .login-container {
            width: 100%;
            max-width: 420px;
            padding: 20px;
        }
        /* Custom Input Styling to match the rounded gray look */
        .form-control {
            background-color: #f3f4f6; /* Light gray bg */
            border: none;
            padding: 12px 20px;
            font-size: 0.95rem;
            border-radius: 12px; /* Rounded corners */
        }
        .form-control:focus {
            background-color: #fff;
            box-shadow: 0 0 0 3px rgba(30, 64, 175, 0.1);
        }
        /* Password Eye Icon Wrapper */
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
        .btn-primary {
            background-color: var(--bs-primary);
            border: none;
            padding: 12px;
            font-weight: 600;
            border-radius: 50px; /* Pill shape button */
            transition: all 0.3s ease;
        }
        .btn-primary:hover {
            background-color: var(--bs-primary-hover);
            transform: translateY(-1px);
        }
        .logo-img {
            /* Adjust width to match your actual logo file */
            width: 180px; 
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
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        }
        .google-btn:hover {
            background-color: #f8f9fa;
            transform: translateY(-2px);
        }
    </style>
</head>
<body>

    <div class="container login-container text-center">
        
        <div class="mb-4">
            <img src="images/byaheroLogoBlue.svg" alt="ByaHero Logo" class="logo-img">
            <h5 class="fw-bold text-dark mt-2" style="letter-spacing: 1px; font-size: 14px;">BYAHERO</h5>
        </div>

        <div class="text-start mb-4">
            <h6 class="fw-bold text-primary mb-3">LOG IN TO YOUR ACCOUNT</h6>
            
            <div id="loginAlert"></div>

            <form id="mainLoginForm">
                <input type="hidden" name="action" value="login">

                <div class="mb-3">
                    <input type="email" name="email" class="form-control" placeholder="Email" required>
                </div>

                <div class="mb-2 password-wrapper">
                    <input type="password" name="password" id="passwordInput" class="form-control" placeholder="Password" required>
                    <button type="button" class="password-toggle" onclick="togglePassword()">
                        <span class="material-symbols-rounded fs-5" id="toggleIcon">visibility_off</span>
                    </button>
                </div>

                <div class="mb-4">
                    <a href="#" class="text-secondary small text-decoration-none">Forgot Password?</a>
                </div>

                <button type="submit" class="btn btn-primary w-100 mb-4 shadow-sm">
                    LOGIN
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
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width="24" height="24">
            </a>
        </div>

        <div class="text-center">
            <p class="text-muted small mb-0">Don't have an account? <a href="signup.php" class="fw-bold text-primary text-decoration-none">Signup</a></p>
        </div>

    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>

    <script>
        // Password Visibility Toggle
        function togglePassword() {
            const passwordInput = document.getElementById('passwordInput');
            const toggleIcon = document.getElementById('toggleIcon');
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                toggleIcon.textContent = 'visibility'; // Material Icon name change
            } else {
                passwordInput.type = 'password';
                toggleIcon.textContent = 'visibility_off';
            }
        }

        // Existing Login Logic
        document.getElementById('mainLoginForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const form = e.target;
            const btn = form.querySelector('button[type="submit"]');
            const alertBox = document.getElementById('loginAlert');
            const originalText = btn.innerHTML;

            // Loading State
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Logging in...';
            btn.disabled = true;
            alertBox.innerHTML = '';

            try {
                const fd = new FormData(form);
                const res = await fetch('auth_api.php', {
                    method: 'POST',
                    body: fd
                });

                const data = await res.json();

                if (data.success) {
                    alertBox.innerHTML = '<div class="alert alert-success d-flex align-items-center small py-2 border-0 bg-success-subtle text-success fw-bold">Success! Redirecting...</div>';
                    
                    setTimeout(() => {
                        if (data.redirect) {
                            window.location.href = data.redirect;
                        } else {
                            window.location.href = '/passenger/index.php';
                        }
                    }, 800);
                } else {
                    throw new Error(data.message || 'Login failed');
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