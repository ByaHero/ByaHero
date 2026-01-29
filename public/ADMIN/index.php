<?php
declare(strict_types=1);
session_start();

// Credentials from env with sensible defaults
$envUser = getenv('ADMIN_USER');
$envPass = getenv('ADMIN_PASS');
$ADMIN_USER = $envUser !== false ? $envUser : 'admin';
$ADMIN_PASS = $envPass !== false ? $envPass : 'password';

$err = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';

    if ($username === $ADMIN_USER && $password === $ADMIN_PASS) {
        $_SESSION['admin_logged_in'] = true;
        $_SESSION['admin_user'] = $ADMIN_USER;
        header('Location: admin.php');
        exit;
    } else {
        $err = 'Invalid username or password.';
    }
}
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <title>ByaHero — Admin Login</title>
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet">
    <style>
        :root{
            --brand: #2563eb;
            --bg: #ffffff;
            --muted: #6b7280;
        }
        html,body{
            height:100%;
            background: linear-gradient(180deg, #ffffff 0%, #ffffff 100%);
            font-family: "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial;
            color:#0f172a;
        }

        /* Center column */
        .login-outer{
            min-height:100vh;
            display:flex;
            align-items:center;
            justify-content:center;
            padding: 2rem 1rem;
        }

        .login-card{
            width:100%;
            max-width:420px;
            background: transparent;
        }

        .brand-wrap{
            text-align:center;
            margin-bottom: 1.25rem;
        }

        .brand-logo{
            width:132px;
            height:auto;
            display:block;
            margin: 0 auto 0.75rem;
        }

        .brand-title{
            font-size:0.85rem;
            letter-spacing:1px;
            color: #111827;
        }

        .form-card{
            background: var(--bg);
            padding: 2rem;
            border-radius: 14px;
            box-shadow: 0 10px 30px rgba(2,6,23,0.06);
        }

        .form-heading{
            font-size:0.9rem;
            font-weight:700;
            color:var(--brand);
            margin-bottom:1rem;
            letter-spacing:.6px;
        }

        /* pill inputs */
        .input-pill{
            border-radius: 999px;
            background: #fff;
            box-shadow: 0 6px 18px rgba(2,6,23,0.06);
            border: none;
            padding: 0.6rem 1rem;
            padding-right: 3rem; /* space for the eye button */
            height:48px;
        }

        .input-group-pill{
            position:relative;
        }

        .input-pill:focus{
            outline:none;
            box-shadow: 0 8px 22px rgba(37,99,235,0.12), 0 0 0 3px rgba(37,99,235,0.06);
        }

        .input-addon{
            position:absolute;
            right:12px;
            top:50%;
            transform:translateY(-50%);
            border:none;
            background:transparent;
            color:#374151;
            display:flex;
            align-items:center;
            gap:.25rem;
            padding:4px;
            cursor:pointer;
            height:28px;
            width:28px;
            justify-content:center;
            border-radius:6px;
        }
        .input-addon:focus{ outline:none; box-shadow: none; }

        .input-addon:active{ transform: translateY(-50%) scale(.98); }

        .forgot{
            display:inline-block;
            margin-top:.5rem;
            color:var(--muted);
            text-decoration:none;
            font-size:.875rem;
        }

        .submit-pill{
            width:88px;
            height:40px;
            border-radius:999px;
            background:var(--brand);
            border:none;
            margin:1.6rem auto 0;
            box-shadow: 0 8px 22px rgba(37,99,235,0.18);
            color: #ffffff;
            font-weight:700;
            text-transform:uppercase;
            letter-spacing: .6px;
            font-size:0.9rem;
            display:flex;
            align-items:center;
            justify-content:center;
        }

        .submit-pill:active{ transform:translateY(1px); }

        .small-muted{
            font-size:.85rem;
            color:var(--muted);
            text-align:center;
            margin-top:.75rem;
        }

        /* error */
        .alert-small{
            font-size:.9rem;
            padding:.45rem .75rem;
            border-radius:8px;
        }

        @media (max-width:420px){
            .brand-logo{ width:110px; }
            .form-card{ padding:1.25rem; border-radius:12px; }
            .submit-pill{ width:72px; height:36px; font-size:0.85rem; }
            .input-addon{ right:10px; width:26px; height:26px; }
            .input-pill{ padding-right:2.5rem; }
        }
    </style>
</head>
<body>
    <div class="login-outer">
        <div class="login-card">
            <div class="brand-wrap">
                <!-- logo path relative to admin/ directory -->
                <img src="../../images/byaheroLogo.png" alt="ByaHero Logo" class="brand-logo" />
                <div class="brand-title">BYAHERO ADMIN</div>
            </div>

            <div class="form-card">
                <div class="form-heading">LOG IN TO YOUR ACCOUNT</div>

                <?php if ($err): ?>
                    <div class="alert alert-danger alert-small"><?= htmlspecialchars($err) ?></div>
                <?php endif; ?>

                <form method="POST" novalidate>
                    <div class="mb-3">
                        <input name="username" type="email" inputmode="email" autocomplete="username" placeholder="Email" class="form-control input-pill" required />
                    </div>

                    <div class="mb-2 input-group-pill">
                        <input id="password" name="password" type="password" autocomplete="current-password" placeholder="Password" class="form-control input-pill" required />
                        <button type="button" id="togglePwd" class="input-addon" aria-pressed="false" aria-label="Show password" title="Show password">
                            <span id="eyeIcon" class="material-icons-round" style="font-size:18px;line-height:1;">visibility_off</span>
                        </button>
                    </div>

                    <div class="d-flex justify-content-start">
                        <a class="forgot" href="#" tabindex="-1">Forgot Password?</a>
                    </div>

                    <button type="submit" class="submit-pill">Login</button>

                    <!-- <div class="small-muted">Username: <strong>admin</strong> • Password: <strong>password</strong></div> -->
                </form>
            </div>
        </div>
    </div>

<script>
document.addEventListener('DOMContentLoaded', function () {
    const pwd = document.getElementById('password');
    const toggle = document.getElementById('togglePwd');
    const eye = document.getElementById('eyeIcon');

    // Initialize icon based on input type
    function syncIcon() {
        if (pwd.type === 'password') {
            eye.textContent = 'visibility_off'; // closed eye when hidden
            toggle.setAttribute('aria-pressed', 'false');
            toggle.setAttribute('title', 'Show password');
            toggle.setAttribute('aria-label', 'Show password');
        } else {
            eye.textContent = 'visibility'; // open eye when revealed
            toggle.setAttribute('aria-pressed', 'true');
            toggle.setAttribute('title', 'Hide password');
            toggle.setAttribute('aria-label', 'Hide password');
        }
    }

    syncIcon();

    toggle.addEventListener('click', function (e) {
        // Toggle password visibility
        if (pwd.type === 'password') {
            pwd.type = 'text';
        } else {
            pwd.type = 'password';
        }
        syncIcon();
        // keep focus on password field for convenience
        pwd.focus();
        // keep cursor at end
        const val = pwd.value;
        pwd.value = '';
        pwd.value = val;
    });

    // Allow pressing Enter in either field to submit naturally.
});
</script>
</body>
</html>