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
  <title>Accessibility - ByaHero</title>

  <!-- Bootstrap -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css">

  <!-- Material Icons -->
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0&display=swap" rel="stylesheet" media="print" onload="this.media='all'">

  <!-- Global Accessibility -->
  <link rel="stylesheet" href="../../../assets/css/accessibility.css">

  <style>
    body {
      font-family: "Segoe UI", sans-serif;
      background-color: #f8f9fa;
      padding-bottom: 80px;
    }

    .toggle-switch {
      position: relative;
      width: 50px;
      height: 26px;
      background-color: #d1d5db;
      border-radius: 30px;
      cursor: pointer;
      transition: background-color 0.3s;
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

    .text-size-btn-hover:hover {
      background-color: #d1d5db !important;
    }

    .text-size-btn-hover:active {
      transform: scale(0.95);
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
  <div class="container mt-5 pt-3" style="margin-top: 70px !important;">
    <div class="fw-bold fs-5 text-primary mb-1 px-3" style="font-size: 1.3rem !important;">Accessibility Settings</div>
    <p class="small text-secondary mb-3 px-3">
      Customize your experience to make ByaHero easier to use.
    </p>

    <?php if (!$isLoggedIn): ?>
      <div class="alert alert-primary d-flex align-items-center gap-2 m-3 border-start border-4 border-primary rounded-3" style="background-color: #dbeafe;">
        <span class="material-symbols-rounded text-primary">info</span>
        <span class="small" style="color: #1e40af;">You're using accessibility as a guest. <a href="../../../public/login" style="color: #1e3a8a; font-weight: bold;">Login</a> to save your preferences.</span>
      </div>
    <?php endif; ?>

    <!-- Text Size -->
    <div class="p-3 bg-white my-2 rounded-3 shadow-sm d-flex align-items-center justify-content-between" style="padding: 14px 16px !important; border-radius: 10px !important;">
      <div class="d-flex flex-column">
        <div class="fw-semibold text-dark fs-6" style="color: #1f2937 !important;">Text Size</div>
        <div class="small text-secondary mt-1" style="font-size: 0.85rem !important;">Adjust text size for better readability</div>
      </div>
      <div class="d-flex align-items-center gap-2">
        <button class="btn btn-light d-flex align-items-center justify-content-center fw-bold text-size-btn-hover" onclick="decreaseTextSize()" style="width: 44px; height: 44px; background-color: #e5e7eb; border-radius: 8px; border: none;">A-</button>
        <div class="fw-semibold text-primary text-center" id="textSizeDisplay" style="min-width: 70px;">Medium</div>
        <button class="btn btn-light d-flex align-items-center justify-content-center fw-bold text-size-btn-hover" onclick="increaseTextSize()" style="width: 44px; height: 44px; background-color: #e5e7eb; border-radius: 8px; border: none;">A+</button>
      </div>
    </div>

    <!-- High Contrast Mode -->
    <div class="p-3 bg-white my-2 rounded-3 shadow-sm d-flex align-items-center justify-content-between" style="padding: 14px 16px !important; border-radius: 10px !important;">
      <div class="d-flex flex-column">
        <div class="fw-semibold text-dark fs-6" style="color: #1f2937 !important;">High Contrast Mode</div>
        <div class="small text-secondary mt-1" style="font-size: 0.85rem !important;">Increase contrast for better visibility</div>
      </div>
      <div class="toggle-switch" id="highContrastToggle" onclick="toggleHighContrast()">
        <div class="toggle-switch-handle"></div>
      </div>
    </div>

    <!-- Screen Reader Support -->
    <div class="p-3 bg-white my-2 rounded-3 shadow-sm d-flex align-items-center justify-content-between" style="padding: 14px 16px !important; border-radius: 10px !important;">
      <div class="d-flex flex-column">
        <div class="fw-semibold text-dark fs-6" style="color: #1f2937 !important;">Screen Reader Support</div>
        <div class="small text-secondary mt-1" style="font-size: 0.85rem !important;">Optimize for screen reader compatibility</div>
      </div>
      <div class="toggle-switch" id="screenReaderToggle" onclick="toggleScreenReader()">
        <div class="toggle-switch-handle"></div>
      </div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
  <script src="../../../assets/js/accessibility.js"></script>
  <script>
    const isLoggedIn = <?php echo $isLoggedIn ? 'true' : 'false'; ?>;
    let currentTextSize = localStorage.getItem('byahero_text_size') || 'medium';

    // Load settings on page load
    window.addEventListener('DOMContentLoaded', () => {
      // Load text size
      updateTextSizeDisplay();
      document.body.classList.add('text-' + currentTextSize);

      // Load high contrast
      const highContrast = localStorage.getItem('byahero_high_contrast');
      if (highContrast === '1') {
        document.getElementById('highContrastToggle').classList.add('active');
        document.body.classList.add('high-contrast-mode');
      }

      // Load screen reader
      const screenReader = localStorage.getItem('byahero_screen_reader');
      if (screenReader === '1') {
        document.getElementById('screenReaderToggle').classList.add('active');
      }
    });

    function decreaseTextSize() {
      if (currentTextSize === 'large') currentTextSize = 'medium';
      else if (currentTextSize === 'medium') currentTextSize = 'small';
      
      updateTextSize();
    }

    function increaseTextSize() {
      if (currentTextSize === 'small') currentTextSize = 'medium';
      else if (currentTextSize === 'medium') currentTextSize = 'large';
      
      updateTextSize();
    }

    function updateTextSize() {
      document.body.classList.remove('text-small', 'text-medium', 'text-large');
      document.body.classList.add('text-' + currentTextSize);
      localStorage.setItem('byahero_text_size', currentTextSize);
      updateTextSizeDisplay();
      
      // Save to database if logged in
      if (isLoggedIn) {
        saveToDatabase('text_size', currentTextSize);
      }
    }

    function updateTextSizeDisplay() {
      const display = document.getElementById('textSizeDisplay');
      display.textContent = currentTextSize.charAt(0).toUpperCase() + currentTextSize.slice(1);
    }

    function toggleHighContrast() {
      const toggle = document.getElementById('highContrastToggle');
      const isActive = toggle.classList.toggle('active');
      
      if (isActive) {
        document.body.classList.add('high-contrast-mode');
        localStorage.setItem('byahero_high_contrast', '1');
        
        if (isLoggedIn) saveToDatabase('high_contrast_mode', 1);
      } else {
        document.body.classList.remove('high-contrast-mode');
        localStorage.setItem('byahero_high_contrast', '0');
        
        if (isLoggedIn) saveToDatabase('high_contrast_mode', 0);
      }
    }

    function toggleScreenReader() {
      const toggle = document.getElementById('screenReaderToggle');
      const isActive = toggle.classList.toggle('active');
      
      localStorage.setItem('byahero_screen_reader', isActive ? '1' : '0');
      
      if (isLoggedIn) {
        saveToDatabase('screen_reader_support', isActive ? 1 : 0);
      }
    }

    function saveToDatabase(setting, value) {
      const formData = new FormData();
      formData.append('setting_name', setting);  // ✅ FIXED
      formData.append('setting_value', value);   // ✅ FIXED

      fetch('../../../backend/updateSettings.php', {
        method: 'POST',
        body: formData
      }).catch(error => console.error('Error saving setting:', error));
    }
  </script>
</body>

</html>