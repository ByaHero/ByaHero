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

  <style>
    body {
      font-family: "Segoe UI", sans-serif;
      background-color: #f8f9fa;
      padding-bottom: 80px;
    }

    .settings-container {
      margin-top: 70px;
      /* Ensures spacing between navbar and content */
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
  </style>
</head>

<body>
  <?php
  $pageTitle = 'settings';
  $backLink = '../index.php'; // Optional: defaults to index
  include '../../../components/navbarPassenger.php';
  ?>

  <!-- Main Content -->
  <div class="container settings-container">

    <!-- Settings Section -->
    <div class="settings-section">
      <div class="settings-section-header">Settings</div>

      <!-- Navigates to Account Settings -->
      <div class="settings-item" onclick="window.location.href='accountSettings.php';">
        <span class="material-symbols-rounded settings-icon">account_circle</span>
        Account Settings
        <span class="material-symbols-rounded chevron-icon">chevron_right</span>
      </div>

      <!-- Navigates to Smart Notification -->
      <div class="settings-item" onclick="window.location.href='smartNotification.php';">
        <span class="material-symbols-rounded settings-icon">notifications</span>
        Smart Notification
        <span class="material-symbols-rounded chevron-icon">chevron_right</span>
      </div>

      <div class="settings-item">
        <span class="material-symbols-rounded settings-icon">accessibility</span>
        Accessibility
        <span class="material-symbols-rounded chevron-icon">chevron_right</span>
      </div>

      <div class="settings-item">
        <span class="material-symbols-rounded settings-icon">location_on</span>
        Share My Location
        <span class="material-symbols-rounded chevron-icon">chevron_right</span>
      </div>
    </div>

    <!-- Universal Settings -->
    <div class="settings-section">
      <div class="settings-section-header">Universal Settings</div>

      <div class="settings-item">
        <span class="material-symbols-rounded settings-icon">share</span>
        Share ByaHero
        <span class="material-symbols-rounded chevron-icon">chevron_right</span>
      </div>

      <!-- Navigates to Privacy and Security -->
      <div class="settings-item" onclick="window.location.href='privacySecurity.php';">
        <span class="material-symbols-rounded settings-icon">lock</span>
        Privacy and Security
        <span class="material-symbols-rounded chevron-icon">chevron_right</span>
      </div>

      <!-- Navigates to Feedback -->
      <div class="settings-item" onclick="window.location.href='feedback.php';">
        <span class="material-symbols-rounded settings-icon">help</span>
        Feedback
        <span class="material-symbols-rounded chevron-icon">chevron_right</span>
      </div>

      <div class="settings-item">
        <span class="material-symbols-rounded settings-icon">support_agent</span>
        Chat with Support
        <span class="material-symbols-rounded chevron-icon">chevron_right</span>
      </div>

      <div class="settings-item">
        <span class="material-symbols-rounded settings-icon">info</span>
        About
        <span class="material-symbols-rounded chevron-icon">chevron_right</span>
      </div>

      <div class="settings-item">
        <span class="material-symbols-rounded settings-icon text-danger">logout</span>
        <a href="../logout.php" class="text-danger fw-semibold text-decoration-none">Logout</a>
      </div>
    </div>

  </div>

  <!-- Bootstrap JS -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>

</html>