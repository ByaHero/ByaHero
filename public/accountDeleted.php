<?php
session_start();
session_unset();
session_destroy();
// Clear session cookie if it exists
if (isset($_COOKIE[session_name()])) {
    setcookie(session_name(), '', time() - 3600, '/');
}
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
    <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Account Deleted - ByaHero</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css">
  <link href="https://fonts.googleapis.com/css2?family=Material+Icons+Round&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
  
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
      padding: 2.5rem 2rem;
      border-radius: 14px;
      box-shadow: 0 10px 30px rgba(2, 6, 23, 0.06);
      text-align: center;
    }

    .form-heading {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--brand);
      margin-bottom: 1rem;
      letter-spacing: .6px;
      text-transform: uppercase;
    }

    .status-icon {
      font-size: 4rem;
      color: #10b981;
      margin-bottom: 1.5rem;
    }

    .info-box {
      background: #f0fdf4;
      border: 1px solid #86efac;
      border-radius: 10px;
      padding: 1rem;
      margin: 1.5rem 0;
    }

    .info-box p {
      margin: 0;
      color: #15803d;
      font-size: 0.85rem;
    }

    .submit-pill {
      width: auto;
      min-width: 140px;
      height: 48px;
      border-radius: 999px;
      background: var(--brand);
      border: none;
      margin: 1.5rem auto 0;
      box-shadow: 0 8px 22px rgba(37, 99, 235, 0.18);
      color: #ffffff;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .6px;
      font-size: 0.9rem;
      display: flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
      transition: all 0.2s;
    }

    .submit-pill:hover {
      background: #1d4ed8;
      color: white;
      transform: translateY(-1px);
    }

    .submit-pill:active {
      transform: translateY(1px);
    }

    .small-muted {
      font-size: .85rem;
      color: var(--muted);
      text-align: center;
      margin-top: 1.25rem;
    }

    @media (max-width:420px) {
      .brand-logo { width: 110px; }
      .form-card { padding: 1.5rem; border-radius: 12px; }
    }
  </style>
</head>
<body>
  <div class="login-outer">
    <div class="login-card">
      <div class="brand-wrap">
        <!-- Path is from public/ so assets/images/byaheroLogo.png is assets/... -->
        <img src="../assets/images/byaheroLogo.png" alt="ByaHero Logo" class="brand-logo" />
        <div class="brand-title">BYAHERO</div>
      </div>

      <div class="form-card">
        <span class="material-icons-round status-icon">check_circle</span>
        <div class="form-heading">Account Deleted</div>
        
        <p class="text-muted small mb-3">
          Your ByaHero account has been permanently deleted.
        </p>

        <p class="small text-muted mb-0" style="font-size: 0.8rem; line-height: 1.4;">
          All your personal data, settings, and activity have been removed from our system.
        </p>
        
        <div class="info-box">
          <p>
            <strong>Thank you for using ByaHero.</strong> We hope to serve you again in the future!
          </p>
        </div>

        <a href="login.php" class="submit-pill">Go to Login</a>
        
        <div class="small-muted">
          Want to join us again?
          <a href="signUp.php" class="fw-bold text-primary text-decoration-none">Create a new account</a>
        </div>
      </div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>