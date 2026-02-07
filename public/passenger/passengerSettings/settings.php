<?php
session_start();

// Check if user is logged in
$isLoggedIn = isset($_SESSION['user_id']);
?>
<!doctype html>
<html lang="en">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>Settings - ByaHero</title>

  <!-- Bootstrap -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css">

  <!-- Material Icons -->
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded" rel="stylesheet">

  <!-- Global Accessibility -->
  <link rel="stylesheet" href="../../../assets/images/css/accessibility.css">

  <script src="../../assets/images/js/analytics.js"></script>

  <style>
    body {
      font-family: "Segoe UI", sans-serif;
      background-color: #f8f9fa;
      padding-bottom: 80px;
    }

    .settings-container {
      margin-top: 70px;
    }

    .settings-section-header {
      font-weight: bold;
      padding: 8px 16px;
      color: #1e3a8a;
    }

    .settings-item {
      padding: 12px 16px;
      background-color: white;
      margin: 0.5rem 0;
      border-radius: 10px;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      cursor: pointer;
      justify-content: space-between;
    }

    .settings-item:hover {
      background: #e8eaf6;
    }

    .settings-item .settings-icon {
      font-size: 1.2rem;
      margin-right: 12px;
      color: #4b5563;
    }

    .settings-item .chevron-icon {
      color: #6b7280;
    }

    .login-prompt {
      width: 90%;
      margin: 1rem auto;
      padding: 16px;
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .login-prompt .prompt-icon {
      color: #f59e0b;
      font-size: 2rem;
    }

    .login-prompt .prompt-text {
      flex: 1;
    }

    .login-prompt .prompt-title {
      font-weight: bold;
      color: #92400e;
      margin-bottom: 4px;
    }

    .login-prompt .prompt-description {
      font-size: 0.9rem;
      color: #78350f;
      margin-bottom: 8px;
    }

    .login-prompt .btn-login {
      background-color: #1e3a8a;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 0.9rem;
      cursor: pointer;
    }

    .login-prompt .btn-login:hover {
      background-color: #1a2f6b;
    }
  </style>
</head>

<body>
  <?php
  $pageType = 'settings';
  $backLink = '../index.php';
  $pageDepth = "../../../";
  include "../../../components/navbarPassenger.php";
  ?>

  <!-- Main Content -->
  <div class="container settings-container">

    <!-- Universal Settings (Available to Everyone) -->
    <div class="settings-section">
      <div class="settings-section-header">Universal Settings</div>

      <!-- Accessibility (Top of Universal Settings) -->
      <div class="settings-item" onclick="window.location.href='accessibilitySettings.php';">
        <span class="material-symbols-rounded settings-icon">accessibility</span>
        Accessibility
        <span class="material-symbols-rounded chevron-icon">chevron_right</span>
      </div>

      <!-- Share ByaHero -->
      <div class="settings-item" onclick="window.location.href='share.php';">
        <span class="material-symbols-rounded settings-icon">share</span>
        Share ByaHero
        <span class="material-symbols-rounded chevron-icon">chevron_right</span>
      </div>

      <!-- Privacy and Security -->
      <div class="settings-item" onclick="window.location.href='privacySecurity.php';">
        <span class="material-symbols-rounded settings-icon">lock</span>
        Privacy and Security
        <span class="material-symbols-rounded chevron-icon">chevron_right</span>
      </div>

      <!-- Feedback -->
      <div class="settings-item" onclick="window.location.href='feedback.php';">
        <span class="material-symbols-rounded settings-icon">help</span>
        Feedback
        <span class="material-symbols-rounded chevron-icon">chevron_right</span>
      </div>

      <!-- Chat Support -->
      <div class="settings-item" onclick="window.location.href='chatSupport.php';">
        <span class="material-symbols-rounded settings-icon">support_agent</span>
        Chat with Support
        <span class="material-symbols-rounded chevron-icon">chevron_right</span>
      </div>

      <!-- About -->
      <div class="settings-item" onclick="window.location.href='about.php';">
        <span class="material-symbols-rounded settings-icon">info</span>
        About
        <span class="material-symbols-rounded chevron-icon">chevron_right</span>
      </div>
    </div>

    <?php if ($isLoggedIn): ?>
      <!-- Account Settings (Only for Logged-in Users) -->
      <div class="settings-section">
        <div class="settings-section-header">Account Settings</div>

        <!-- Account Settings -->
        <div class="settings-item" onclick="window.location.href='accountSettings.php';">
          <span class="material-symbols-rounded settings-icon">account_circle</span>
          My Account
          <span class="material-symbols-rounded chevron-icon">chevron_right</span>
        </div>

        <!-- Smart Notification -->
        <div class="settings-item" onclick="window.location.href='smartNotification.php';">
          <span class="material-symbols-rounded settings-icon">notifications</span>
          Smart Notification
          <span class="material-symbols-rounded chevron-icon">chevron_right</span>
        </div>

        <!-- Share Location -->
        <div class="settings-item" onclick="window.location.href='shareLocation.php';">
          <span class="material-symbols-rounded settings-icon">location_on</span>
          Share My Location
          <span class="material-symbols-rounded chevron-icon">chevron_right</span>
        </div>

        <!-- Logout -->
        <div class="settings-item" onclick="window.location.href='logout.php';">
          <span class="material-symbols-rounded settings-icon text-danger">logout</span>
          Logout
          <span class="material-symbols-rounded chevron-icon"></span>
        </div>
      </div>
    <?php else: ?>
      <!-- Login Prompt (For Guest Users) -->
      <div class="settings-section">
        <div class="settings-section-header">Account Settings</div>
        <div class="login-prompt">
          <span class="material-symbols-rounded prompt-icon">info</span>
          <div class="prompt-text">
            <div class="prompt-title">Sign in to access personalized settings</div>
            <div class="prompt-description">
              Login to manage your account, notifications, and location sharing preferences.
            </div>
            <button class="btn-login" onclick="window.location.href='../../../public/login.php';">
              <span class="material-symbols-rounded" style="vertical-align: middle; font-size: 1rem; margin-right: 4px;">login</span>
              Login Now
            </button>
          </div>
        </div>
      </div>
    <?php endif; ?>

  </div>

  <!-- Bootstrap JS -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
  <script src="../../../assets/images/js/accessibility.js"></script>
</body>

</html>