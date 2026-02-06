<?php
session_start();

// Check if user is logged in (for future account-specific features)
$isLoggedIn = isset($_SESSION['user_id']);
?>
<!doctype html>
<html lang="en">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>Privacy and Security - ByaHero</title>

  <!-- Bootstrap -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css">

  <!-- Material Icons -->
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded" rel="stylesheet">

  <!-- Global Accessibility -->
  <link rel="stylesheet" href="../../../assets/images/css/accessibility.css">

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

    .status-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.85rem;
      font-weight: 600;
      margin-left: auto;
    }

    .status-badge.on {
      background-color: #d1fae5;
      color: #065f46;
    }

    .status-badge.off {
      background-color: #fee2e2;
      color: #991b1b;
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

  <!-- Main Content -->
  <div class="container privacy-container">

    <!-- Blue Info Box -->
    <div class="blue-box">
      <h5>Privacy and Security</h5>
      <p class="small">
        Control which apps can access your data, location, camera, and manage safety protections. 
        <a href="https://byahero.com/privacy" target="_blank">Learn more...</a>
      </p>
    </div>

    <!-- Privacy Settings -->
    <div class="privacy-section">
      <div class="settings-section-header">Permissions</div>

      <!-- Location Services -->
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

      <!-- Tracking -->
      <div class="privacy-item">
        <div class="item-content">
          <span class="material-symbols-rounded privacy-icon">share</span>
          <div class="item-text">
            <div class="item-title">Tracking</div>
            <div class="item-description">Allow tracking across apps and websites</div>
          </div>
        </div>
        <div class="toggle-switch" id="trackingToggle" onclick="toggleTracking()">
          <div class="toggle-switch-handle"></div>
        </div>
      </div>

      <!-- Analytics and Improvements -->
      <div class="privacy-item">
        <div class="item-content">
          <span class="material-symbols-rounded privacy-icon">analytics</span>
          <div class="item-text">
            <div class="item-title">Analytics and Improvements</div>
            <div class="item-description">Share usage data to improve ByaHero</div>
          </div>
        </div>
        <div class="toggle-switch active" id="analyticsToggle" onclick="toggleAnalytics()">
          <div class="toggle-switch-handle"></div>
        </div>
      </div>
    </div>

    <!-- Security Settings -->
    <div class="privacy-section">
      <div class="settings-section-header">Security</div>

      <!-- Safety Check -->
      <div class="privacy-item" onclick="window.location.href='../safety/safety.php';">
        <div class="item-content">
          <span class="material-symbols-rounded privacy-icon">shield</span>
          <div class="item-text">
            <div class="item-title">Safety Check</div>
            <div class="item-description">Emergency features and contacts</div>
          </div>
        </div>
        <span class="material-symbols-rounded chevron-icon">chevron_right</span>
      </div>

      <!-- Stolen Device Protection -->
      <div class="privacy-item">
        <div class="item-content">
          <span class="material-symbols-rounded privacy-icon">security</span>
          <div class="item-text">
            <div class="item-title">Stolen Device Protection</div>
            <div class="item-description">Protect your data if device is lost</div>
          </div>
        </div>
        <div class="toggle-switch" id="stolenDeviceToggle" onclick="toggleStolenDevice()">
          <div class="toggle-switch-handle"></div>
        </div>
      </div>
    </div>

    <!-- Additional Resources -->
    <div class="privacy-section">
      <div class="settings-section-header">Additional Resources</div>

      <!-- Safety Center -->
      <div class="privacy-item" onclick="alert('Safety Center - Coming Soon!');">
        <div class="item-content">
          <span class="material-symbols-rounded privacy-icon">support_agent</span>
          <div class="item-text">
            <div class="item-title">Safety Center</div>
            <div class="item-description">Learn about safety features</div>
          </div>
        </div>
        <span class="material-symbols-rounded chevron-icon">chevron_right</span>
      </div>

      <!-- Privacy Policy -->
      <div class="privacy-item" onclick="window.open('https://byahero.com/privacy', '_blank');">
        <div class="item-content">
          <span class="material-symbols-rounded privacy-icon">description</span>
          <div class="item-text">
            <div class="item-title">Privacy Policy</div>
            <div class="item-description">Read our privacy policy</div>
          </div>
        </div>
        <span class="material-symbols-rounded chevron-icon">chevron_right</span>
      </div>

      <!-- Terms of Service -->
      <div class="privacy-item" onclick="window.open('https://byahero.com/terms', '_blank');">
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
  <script src="../../../assets/images/js/accessibility.js"></script>
  <script>
    // Load settings on page load
    window.addEventListener('DOMContentLoaded', () => {
      // Load location services
      const locationEnabled = localStorage.getItem('byahero_location_services') !== '0';
      if (!locationEnabled) {
        document.getElementById('locationToggle').classList.remove('active');
      }

      // Load tracking
      const trackingEnabled = localStorage.getItem('byahero_tracking') === '1';
      if (trackingEnabled) {
        document.getElementById('trackingToggle').classList.add('active');
      }

      // Load analytics
      const analyticsEnabled = localStorage.getItem('byahero_analytics') !== '0';
      if (!analyticsEnabled) {
        document.getElementById('analyticsToggle').classList.remove('active');
      }

      // Load stolen device protection
      const stolenDeviceEnabled = localStorage.getItem('byahero_stolen_device') === '1';
      if (stolenDeviceEnabled) {
        document.getElementById('stolenDeviceToggle').classList.add('active');
      }
    });

    function toggleLocation() {
      const toggle = document.getElementById('locationToggle');
      const isActive = toggle.classList.toggle('active');
      
      localStorage.setItem('byahero_location_services', isActive ? '1' : '0');
      
      if (!isActive) {
        alert('Location services disabled. Bus tracking may not work properly.');
      }
    }

    function toggleTracking() {
      const toggle = document.getElementById('trackingToggle');
      const isActive = toggle.classList.toggle('active');
      
      localStorage.setItem('byahero_tracking', isActive ? '1' : '0');
    }

    function toggleAnalytics() {
      const toggle = document.getElementById('analyticsToggle');
      const isActive = toggle.classList.toggle('active');
      
      localStorage.setItem('byahero_analytics', isActive ? '1' : '0');
    }

    function toggleStolenDevice() {
      const toggle = document.getElementById('stolenDeviceToggle');
      const isActive = toggle.classList.toggle('active');
      
      localStorage.setItem('byahero_stolen_device', isActive ? '1' : '0');
      
      if (isActive) {
        alert('Stolen Device Protection enabled. Your data will be protected if device is lost.');
      }
    }
  </script>
</body>

</html>