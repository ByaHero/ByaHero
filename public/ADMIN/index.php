<?php
declare(strict_types=1);
session_start();

// If already logged in, redirect to admin dashboard
if (!empty($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in'] === true) {
    header('Location: admin.php');
    exit;
}

$err = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';

    // Hard-coded credentials as requested
    $validUser = 'admin';
    $validPass = 'password';

    if ($username === $validUser && $password === $validPass) {
        // Successful login -> set session and redirect
        $_SESSION['admin_logged_in'] = true;
        $_SESSION['admin_user'] = $validUser;
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
    <meta charset="utf-8">
    <title>ByaHero — Admin Login</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body { background: #f8fafc; color: #1e293b; font-family: "Segoe UI", system-ui, sans-serif; }
        .brand { color:#2563eb; font-weight:700; letter-spacing:0.2px; }
        .login-card { max-width:420px; margin: 6vh auto; border-radius:12px; box-shadow:0 6px 20px rgba(18,38,76,0.08); }
        .logo-mark { width:48px; height:48px; border-radius:10px; background: linear-gradient(135deg,#1e3a8a,#2563eb); display:inline-flex; align-items:center; justify-content:center; color:white; font-weight:700; }
        @media (max-width:420px) {
            .login-card { margin: 4vh 1rem; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="card login-card p-3">
            <div class="card-body">
                <div class="d-flex align-items-center gap-3 mb-3">
                    <div class="logo-mark">BH</div>
                    <div>
                        <div class="brand h5 mb-0">ByaHero Admin</div>
                        <small class="text-muted">Sign in to manage fleet & staff</small>
                    </div>
                </div>

                <?php if ($err): ?>
                    <div class="alert alert-danger small py-2" role="alert"><?=htmlspecialchars($err)?></div>
                <?php endif; ?>

                <form method="POST" novalidate>
                    <div class="mb-3">
                        <label class="form-label small fw-bold">Username</label>
                        <input type="text" name="username" class="form-control form-control-lg" placeholder="admin" required autofocus>
                    </div>
                    <div class="mb-3">
                        <label class="form-label small fw-bold">Password</label>
                        <input type="password" name="password" class="form-control form-control-lg" placeholder="password" required>
                    </div>

                    <div class="d-grid">
                        <button class="btn btn-primary btn-lg">Sign in</button>
                    </div>
                </form>

                <div class="text-center mt-3 small text-muted">
                    Username: <strong>admin</strong> &nbsp;•&nbsp; Password: <strong>password</strong>
                </div>
            </div>
        </div>
    </div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>