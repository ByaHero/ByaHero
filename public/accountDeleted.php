<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Account Deleted - ByaHero</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css">
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded" rel="stylesheet">
  
  <style>
    body {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: "Segoe UI", sans-serif;
    }
    .deleted-card {
      background: white;
      border-radius: 20px;
      padding: 3rem 2rem;
      text-align: center;
      max-width: 500px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      animation: fadeIn 0.5s ease-out;
    }
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    .deleted-icon {
      font-size: 5rem;
      color: #10b981;
      margin-bottom: 1rem;
    }
    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      padding: 0.75rem 2rem;
      border-radius: 10px;
      font-weight: 600;
    }
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
    }
  </style>
</head>
<body>
  <div class="deleted-card">
    <span class="material-symbols-rounded deleted-icon">check_circle</span>
    <h2 class="fw-bold mb-3">Account Deleted</h2>
    <p class="text-muted mb-4">
      Your ByaHero account has been permanently deleted. We're sorry to see you go!
    </p>
    <p class="small text-muted mb-4">
      All your personal data, settings, and activity have been removed from our system in compliance with data protection regulations.
    </p>
    <div class="d-grid gap-2 mb-3">
      <a href="login.php" class="btn btn-primary">Go to Login</a>
    </div>
    <div class="mt-3">
      <a href="register.php" class="text-decoration-none small fw-bold" style="color: #667eea;">
        Create a new account
      </a>
    </div>
    <div class="mt-4 pt-3 border-top">
      <p class="text-muted small mb-0">
        Changed your mind? Contact us within 30 days at <strong>support@byahero.com</strong>
      </p>
    </div>
  </div>
</body>
</html>