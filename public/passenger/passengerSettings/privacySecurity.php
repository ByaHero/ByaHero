<?php
require_once __DIR__ . '/../auth_passenger.php';
$isLoggedIn = true;
?>
<!doctype html>
<html lang="en">

<head>
  <meta charset="utf-8">
    <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>Privacy and Security - ByaHero</title>

  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css">

  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0&display=swap" rel="stylesheet" media="print" onload="this.media='all'">

  <link rel="stylesheet" href="../../../assets/css/accessibility.css">

  <style>
    body {
      font-family: "Segoe UI", sans-serif;
      background-color: #f8f9fa;
      padding-bottom: 80px;
    }

    .privacy-container {
      margin-top: 70px;
    }

    .settings-section-header {
      font-weight: bold;
      padding: 8px 16px;
      color: #1e3a8a;
      margin-top: 1rem;
    }

    .privacy-item {
      padding: 14px 16px;
      background-color: white;
      margin: 0.5rem 0;
      border-radius: 10px;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      cursor: pointer;
      justify-content: space-between;
    }

    .privacy-item .privacy-icon {
      font-size: 1.2rem;
      margin-right: 12px;
      color: #4b5563;
    }

    .privacy-item .item-content {
      display: flex;
      align-items: center;
      flex: 1;
    }

    .privacy-item .item-text {
      display: flex;
      flex-direction: column;
    }

    .privacy-item .item-title {
      font-weight: 500;
      color: #1f2937;
    }

    .privacy-item .item-description {
      font-size: 0.85rem;
      color: #6b7280;
      margin-top: 2px;
    }

    .privacy-item:hover {
      background: #e8eaf6;
    }

    .privacy-item .chevron-icon {
      color: #9ca3af;
      margin-left: auto;
    }

    .toggle-switch {
      position: relative;
      width: 50px;
      height: 26px;
      background-color: #d1d5db;
      border-radius: 30px;
      cursor: pointer;
      transition: background-color 0.3s;
      margin-left: auto;
    }

    .toggle-switch.active {
      background-color: #1e3a8a;
    }

    .toggle-switch-handle {
      position: absolute;
      top: 3px;
      left: 3px;
      width: 20px;
      height: 20px;
      background-color: white;
      border-radius: 50%;
      transition: left 0.3s;
    }

    .toggle-switch.active .toggle-switch-handle {
      left: 27px;
    }

    .blue-box {
      padding: 16px;
      background: #1e3a8a;
      color: white;
      border-radius: 10px;
      margin-bottom: 1rem;
    }

    .blue-box h5 {
      margin-bottom: 8px;
      font-weight: bold;
    }

    .blue-box p {
      margin-bottom: 0;
      line-height: 1.5;
    }

    .blue-box a {
      color: #fbbf24;
      text-decoration: underline;
    }

    .blue-box a:hover {
      color: #fcd34d;
    }

    .login-notice {
      background-color: #dbeafe;
      border-left: 4px solid #3b82f6;
      padding: 12px 16px;
      border-radius: 8px;
      margin: 1rem 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .login-notice .material-symbols-rounded {
      color: #3b82f6;
    }

    .login-notice span {
      color: #1e40af;
      font-size: 0.9rem;
    }
  </style>
</head>

<body>
  <?php
  $pageType = 'settings';
  $backLink = 'settings.php';
  $pageDepth = "../../../";
  include "../../../components/navbarPassenger.php";
  ?>

  <div class="container privacy-container">

    <div class="blue-box">
      <h5>Privacy and Security</h5>
      <p class="small">
        Control which apps can access your data and location.
        <a href="privacyPolicy.php" style="color: #fbbf24; text-decoration: underline;">Learn more...</a>
      </p>
    </div>

    <?php if (!$isLoggedIn): ?>
      <div class="login-notice">
        <span class="material-symbols-rounded">info</span>
        <span>You're using privacy settings as a guest. <a href="../../../public/login.php" style="color: #1e3a8a; font-weight: bold;">Login</a> to save your preferences across devices.</span>
      </div>
    <?php endif; ?>

    <div class="privacy-section">
      <div class="settings-section-header">Permissions</div>

      <div class="privacy-item">
        <div class="item-content">
          <span class="material-symbols-rounded privacy-icon">location_on</span>
          <div class="item-text">
            <div class="item-title">Location Services</div>
            <div class="item-description">Allow ByaHero to access your location</div>
          </div>
        </div>
        <div class="toggle-switch active" id="locationToggle" onclick="toggleLocation()">
          <div class="toggle-switch-handle"></div>
        </div>
      </div>
    </div>

    <div class="privacy-section">
      <div class="settings-section-header">Additional Resources</div>

      <div class="privacy-item" onclick="window.location.href='privacyPolicy.php';">
        <div class="item-content">
          <span class="material-symbols-rounded privacy-icon">description</span>
          <div class="item-text">
            <div class="item-title">Privacy Policy</div>
            <div class="item-description">Read our privacy policy</div>
          </div>
        </div>
        <span class="material-symbols-rounded chevron-icon">chevron_right</span>
      </div>

      <div class="privacy-item" onclick="window.location.href='termsOfService.php';">
        <div class="item-content">
          <span class="material-symbols-rounded privacy-icon">gavel</span>
          <div class="item-text">
            <div class="item-title">Terms of Service</div>
            <div class="item-description">Read our terms and conditions</div>
          </div>
        </div>
        <span class="material-symbols-rounded chevron-icon">chevron_right</span>
      </div>
    </div>

  </div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
  <script src="../../../assets/js/accessibility.js"></script>
  <script>
    const isLoggedIn = <?php echo $isLoggedIn ? 'true' : 'false'; ?>;

    // Load settings on page load
    window.addEventListener('DOMContentLoaded', async () => {
      if (isLoggedIn) {
        // Load from database for logged-in users
        try {
          const response = await fetch('../../../backend/getPrivacySettings.php');
          const data = await response.json();
          
          if (data.success && data.settings) {
            applySettings(data.settings);
            // Sync to localStorage
            localStorage.setItem('byahero_location_services', data.settings.location_services);
          }
        } catch (error) {
          console.error('Error loading settings:', error);
          loadFromLocalStorage();
        }
      } else {
        // Load from localStorage for guests
        loadFromLocalStorage();
      }
    });

    function loadFromLocalStorage() {
      const locationEnabled = localStorage.getItem('byahero_location_services') !== '0';
      if (!locationEnabled) {
        document.getElementById('locationToggle').classList.remove('active');
      }
    }

    function applySettings(settings) {
      // Location Services
      if (settings.location_services == 1) {
        document.getElementById('locationToggle').classList.add('active');
      } else {
        document.getElementById('locationToggle').classList.remove('active');
      }
    }

    function toggleLocation() {
      const toggle = document.getElementById('locationToggle');
      const isActive = toggle.classList.toggle('active');
      
      localStorage.setItem('byahero_location_services', isActive ? '1' : '0');
      
      if (isLoggedIn) {
        saveToDatabase('location_services', isActive ? 1 : 0);
      }
      
      if (!isActive) {
        alert('Location services disabled. Bus tracking may not work properly.');
      }
    }

    function saveToDatabase(setting, value) {
      const formData = new FormData();
      formData.append('setting', setting);
      formData.append('value', value);

      fetch('../../../backend/updatePrivacySettings.php', {
        method: 'POST',
        body: formData
      })
      .then(response => response.json())
      .then(data => {
        if (!data.success) {
          console.error('Failed to save setting:', data.message);
        }
      })
      .catch(error => console.error('Error saving setting:', error));
    }
  </script>
</body>

</html>