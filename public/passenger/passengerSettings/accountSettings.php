<!doctype html>
<html lang="en">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>Account Settings - ByaHero</title>

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

    .account-container {
      margin-top: 70px; /* Ensures spacing between navbar and content */
    }

    .account-heading {
      font-weight: bold;
      font-size: 1.2rem;
      color: #1e3a8a;
    }

    .account-section {
      margin-top: 1.5rem;
    }

    .account-section-header {
      font-weight: bold;
      color: #1e3a8a;
      margin-bottom: 0.5rem;
    }

    .settings-item {
      padding: 12px 16px;
      background-color: white;
      margin: 0.5rem 0;
      border-radius: 10px;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
    }

    .settings-item .settings-icon {
      font-size: 1.2rem;
      margin-right: 12px;
      color: #4b5563;
    }

    .settings-item:hover {
      background: #e8eaf6;
    }

    .search-bar {
      margin-top: 1rem;
      margin-bottom: 1rem;
    }

    .search-input-wrapper {
      display: flex;
      align-items: center;
      padding: 8px 12px;
      border-radius: 10px;
      background-color: #f3f3f5;
      box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .search-input-wrapper .material-symbols-rounded {
      color: #6b7280;
      font-size: 1.2rem;
    }

    .search-input-wrapper input {
      border: none;
      outline: none;
      background: none;
      margin-left: 8px;
      color: #6b7280;
      font-size: 1rem;
      flex-grow: 1;
    }
  </style>
</head>

<body>
  <?php
  $pageType = 'settings';        // Configures navbar for Account Settings page with back button
  $backLink = 'settings.php';    // Navigates back to `settings.php` in the same directory
  include "../../../components/navbarPassenger.php";
  ?>

  <!-- Main Content -->
  <div class="container account-container">

    <!-- Heading -->
    <div class="account-heading">Account Settings</div>

    <!-- Search Bar -->
    <div class="search-bar">
      <div class="search-input-wrapper">
        <span class="material-symbols-rounded">menu</span>
        <input type="text" placeholder="Search">
        <span class="material-symbols-rounded">search</span>
      </div>
    </div>

    <p class="text-muted">Update your info to keep your account.</p>

    <!-- Account Section -->
    <div class="account-section">
      <div class="settings-item">
        <span class="material-symbols-rounded settings-icon">person</span>Account
        <span class="material-symbols-rounded text-muted">chevron_right</span>
      </div>
      <div class="settings-item">
        <span class="material-symbols-rounded settings-icon">groups</span>Friends
        <span class="material-symbols-rounded text-muted">chevron_right</span>
      </div>
      <div class="settings-item">
        <span class="material-symbols-rounded settings-icon">notifications</span>Notifications
        <span class="material-symbols-rounded text-muted">chevron_right</span>
      </div>
    </div>

    <!-- Privacy Section -->
    <div class="account-section">
      <div class="account-section-header">Privacy</div>
      <p class="text-muted">Customize privacy to make experience better.</p>
      <div class="settings-item">
        <span class="material-symbols-rounded settings-icon">lock</span>Security
        <span class="material-symbols-rounded text-muted">chevron_right</span>
      </div>
      <div class="settings-item">
        <span class="material-symbols-rounded settings-icon">login</span>Login Details
        <span class="material-symbols-rounded text-muted">chevron_right</span>
      </div>
      <div class="settings-item">
        <span class="material-symbols-rounded settings-icon">key</span>Change Password
        <span class="material-symbols-rounded text-muted">chevron_right</span>
      </div>
    </div>

  </div>

  <!-- Bootstrap JS -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>

</html>