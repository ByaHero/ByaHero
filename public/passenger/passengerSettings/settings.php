<!doctype html>
<html lang="en">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>Passenger Settings - ByaHero</title>

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
      margin-top: 70px; /* Ensures no overlap with navbar */
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
    }

    .settings-item .settings-icon {
      font-size: 1.2rem;
      margin-right: 12px;
      color: #4b5563;
    }

    .settings-item:hover {
      background: #e8eaf6;
    }

    .back-button {
      position: fixed;
      top: 55px; /* Positioned below navbar */
      left: 16px;
      z-index: 1080;
      background: transparent;
      border: none;
      font-size: 1.5rem;
      color: #1e3a8a;
    }
  </style>
</head>

<body>

  <!-- Navbar (Bus logo and global topbar) -->
  <?php include "../../../components/navbarPassenger.php"; ?>

  <!-- Back Button (Top Left Below Navbar) -->
  <button class="back-button" onclick="window.location.href='/ByaHero-Prototype-V3/public/passenger/index.php';">
    <span class="material-symbols-rounded">arrow_back</span>
  </button>

  <!-- Main Content -->
  <div class="container settings-container">

    <!-- Settings Section -->
    <div class="settings-section">
      <div class="settings-section-header">Settings</div>

      <div class="settings-item">
        <span class="material-symbols-rounded settings-icon">notifications</span>
        Smart Notification
      </div>

      <div class="settings-item">
        <span class="material-symbols-rounded settings-icon">account_circle</span>
        Account Settings
      </div>

      <div class="settings-item">
        <span class="material-symbols-rounded settings-icon">accessibility</span>
        Accessibility
      </div>

      <div class="settings-item">
        <span class="material-symbols-rounded settings-icon">location_on</span>
        Share My Location
      </div>
    </div>

    <!-- Universal Settings -->
    <div class="settings-section">
      <div class="settings-section-header">Universal Settings</div>

      <div class="settings-item">
        <span class="material-symbols-rounded settings-icon">share</span>
        Share ByaHero
      </div>

      <!-- Privacy and Security Button -->
      <div class="settings-item" onclick="window.location.href='privacySecurity.php';">
        <span class="material-symbols-rounded settings-icon">lock</span>
        Privacy and Security
      </div>

      <!-- Feedback Button -->
      <div class="settings-item" onclick="window.location.href='feedback.php';">
        <span class="material-symbols-rounded settings-icon">help</span>
        Feedback
      </div>

      <div class="settings-item">
        <span class="material-symbols-rounded settings-icon">support_agent</span>
        Chat with Support
      </div>

      <div class="settings-item">
        <span class="material-symbols-rounded settings-icon">info</span>
        About
      </div>

      <!-- Logout -->
      <div class="settings-item">
        <span class="material-symbols-rounded settings-icon text-danger">logout</span>
        <a href="../logout.php" class="text-danger fw-semibold text-decoration-none">
          Logout
        </a>
      </div>
    </div>

  </div>

  <!-- Bootstrap JS -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>

</body>

</html>