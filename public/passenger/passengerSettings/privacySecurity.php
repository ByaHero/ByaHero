<?php
require_once __DIR__ . '/../auth_passenger.php';
$isLoggedIn = true;
?>
<!doctype html>
<html lang="en">

<head>
  <meta charset="utf-8">
    <link rel="icon" href="../../../assets/images/byaheroLogoBlue.svg" type="image/svg+xml">
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

    .privacy-item-hover:hover {
      background: #e8eaf6 !important;
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
  </style>
</head>

<body>
  <?php
  $pageType = 'settings';
  $backLink = 'settings.php';
  $pageDepth = "../../../";
  include "../../../components/navbarPassenger.php";
  ?>

  <div class="container mt-5 pt-3" style="margin-top: 70px !important;">

    <div class="p-4 bg-primary text-white mb-4 rounded-3" style="background-color: #1e3a8a !important;">
      <h5 class="mb-2 fw-bold">Privacy and Security</h5>
      <p class="mb-0 small">
        Control which apps can access your data and location.
        <a href="privacyPolicy" class="text-warning fw-semibold" style="text-decoration: underline;">Learn more...</a>
      </p>
    </div>

    <?php if (!$isLoggedIn): ?>
      <div class="alert alert-primary d-flex align-items-center gap-2 m-3 border-start border-4 border-primary rounded-3" style="background-color: #dbeafe;">
        <span class="material-symbols-rounded text-primary">info</span>
        <span class="small" style="color: #1e40af;">You're using privacy settings as a guest. <a href="../../../public/login" style="color: #1e3a8a; font-weight: bold;">Login</a> to save your preferences across devices.</span>
      </div>
    <?php endif; ?>

    <div>
      <div class="fw-bold text-primary mb-2 mt-3 px-3">Permissions</div>

      <div class="p-3 bg-white my-2 rounded-3 shadow-sm d-flex align-items-center justify-content-between privacy-item-hover" style="padding: 14px 16px !important; border-radius: 10px !important; cursor: pointer;">
        <div class="d-flex align-items-center flex-grow-1">
          <span class="material-symbols-rounded text-secondary me-3" style="font-size: 1.25rem;">location_on</span>
          <div class="d-flex flex-column">
            <div class="fw-semibold text-dark fs-6" style="color: #1f2937 !important;">Location Services</div>
            <div class="small text-secondary mt-1" style="font-size: 0.85rem !important;">Allow ByaHero to access your location</div>
          </div>
        </div>
        <div class="toggle-switch active" id="locationToggle" onclick="toggleLocation()">
          <div class="toggle-switch-handle"></div>
        </div>
      </div>
    </div>

    <div>
      <div class="fw-bold text-primary mb-2 mt-3 px-3">Additional Resources</div>

      <div class="p-3 bg-white my-2 rounded-3 shadow-sm d-flex align-items-center justify-content-between privacy-item-hover" onclick="location.href = "privacyPolicy";" style="padding: 14px 16px !important; border-radius: 10px !important; cursor: pointer;">
        <div class="d-flex align-items-center flex-grow-1">
          <span class="material-symbols-rounded text-secondary me-3" style="font-size: 1.25rem;">description</span>
          <div class="d-flex flex-column">
            <div class="fw-semibold text-dark fs-6" style="color: #1f2937 !important;">Privacy Policy</div>
            <div class="small text-secondary mt-1" style="font-size: 0.85rem !important;">Read our privacy policy</div>
          </div>
        </div>
        <span class="material-symbols-rounded text-muted ms-auto">chevron_right</span>
      </div>

      <div class="p-3 bg-white my-2 rounded-3 shadow-sm d-flex align-items-center justify-content-between privacy-item-hover" onclick="location.href = "termsOfService";" style="padding: 14px 16px !important; border-radius: 10px !important; cursor: pointer;">
        <div class="d-flex align-items-center flex-grow-1">
          <span class="material-symbols-rounded text-secondary me-3" style="font-size: 1.25rem;">gavel</span>
          <div class="d-flex flex-column">
            <div class="fw-semibold text-dark fs-6" style="color: #1f2937 !important;">Terms of Service</div>
            <div class="small text-secondary mt-1" style="font-size: 0.85rem !important;">Read our terms and conditions</div>
          </div>
        </div>
        <span class="material-symbols-rounded text-muted ms-auto">chevron_right</span>
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