<?php
session_start();

// Check if user is logged in (optional - for saving to database)
$isLoggedIn = isset($_SESSION['user_id']);
?>
<!doctype html>
<html lang="en">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>Accessibility - ByaHero</title>

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

    .accessibility-container {
      margin-top: 70px;
    }

    .accessibility-heading {
      font-weight: bold;
      font-size: 1.3rem;
      color: #1e3a8a;
      margin-bottom: 0.5rem;
      padding: 0 16px;
    }

    .accessibility-description {
      font-size: 0.9rem;
      color: #6b7280;
      margin-bottom: 1rem;
      padding: 0 16px;
    }

    .accessibility-item {
      padding: 14px 16px;
      background-color: white;
      margin: 0.5rem 0;
      border-radius: 10px;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .accessibility-item .item-content {
      display: flex;
      flex-direction: column;
    }

    .accessibility-item .item-title {
      font-weight: 600;
      color: #1f2937;
      font-size: 1rem;
    }

    .accessibility-item .item-description {
      font-size: 0.85rem;
      color: #6b7280;
      margin-top: 2px;
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

    .text-size-controls {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .text-size-btn {
      background-color: #e5e7eb;
      border: none;
      border-radius: 8px;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-weight: bold;
      color: #374151;
      transition: all 0.2s;
    }

    .text-size-btn:hover {
      background-color: #d1d5db;
    }

    .text-size-btn:active {
      transform: scale(0.95);
    }

    .text-size-display {
      font-weight: 600;
      color: #1e3a8a;
      min-width: 70px;
      text-align: center;
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

  <!-- Main Content -->
  <div class="container accessibility-container">
    <div class="accessibility-heading">Accessibility Settings</div>
    <p class="accessibility-description">
      Customize your experience to make ByaHero easier to use.
    </p>

    <?php if (!$isLoggedIn): ?>
      <div class="login-notice">
        <span class="material-symbols-rounded">info</span>
        <span>You're using accessibility as a guest. <a href="../../../public/login.php" style="color: #1e3a8a; font-weight: bold;">Login</a> to save your preferences.</span>
      </div>
    <?php endif; ?>

    <!-- Text Size -->
    <div class="accessibility-item">
      <div class="item-content">
        <div class="item-title">Text Size</div>
        <div class="item-description">Adjust text size for better readability</div>
      </div>
      <div class="text-size-controls">
        <button class="text-size-btn" onclick="decreaseTextSize()">A-</button>
        <div class="text-size-display" id="textSizeDisplay">Medium</div>
        <button class="text-size-btn" onclick="increaseTextSize()">A+</button>
      </div>
    </div>

    <!-- High Contrast Mode -->
    <div class="accessibility-item">
      <div class="item-content">
        <div class="item-title">High Contrast Mode</div>
        <div class="item-description">Increase contrast for better visibility</div>
      </div>
      <div class="toggle-switch" id="highContrastToggle" onclick="toggleHighContrast()">
        <div class="toggle-switch-handle"></div>
      </div>
    </div>

    <!-- Screen Reader Support -->
    <div class="accessibility-item">
      <div class="item-content">
        <div class="item-title">Screen Reader Support</div>
        <div class="item-description">Optimize for screen reader compatibility</div>
      </div>
      <div class="toggle-switch" id="screenReaderToggle" onclick="toggleScreenReader()">
        <div class="toggle-switch-handle"></div>
      </div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
  <script src="../../../assets/images/js/accessibility.js"></script>
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
      formData.append('setting', setting);
      formData.append('value', value);

      fetch('../../../backend/updateSettings.php', {
        method: 'POST',
        body: formData
      }).catch(error => console.error('Error saving setting:', error));
    }
  </script>
</body>

</html>