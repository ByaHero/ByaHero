<!doctype html>
<html lang="en">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>Accessibility Settings - ByaHero</title>

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

    .accessibility-container {
      margin-top: 70px; /* Ensures spacing between navbar and content */
    }

    .accessibility-heading {
      font-weight: bold;
      font-size: 1.5rem;
      color: #1e3a8a;
      margin-top: 0.5rem;
      text-align: center;
    }

    .accessibility-item {
      padding: 12px 16px;
      background-color: white;
      margin: 0.5rem 0;
      border-radius: 10px;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items-center;
      justify-content: space-between;
    }

    .accessibility-item:hover {
      background: #e8eaf6;
    }

    .accessibility-item .accessibility-icon {
      font-size: 1.2rem;
      margin-right: 12px;
      color: #4b5563;
    }

    .form-check .form-check-input[type='checkbox'] {
      width: 1.5em;
      height: 1.5em;
    }
  </style>
</head>

<body>
  <?php
  $pageType = 'settings';        // Configures navbar for Accessibility Settings page
  $backLink = 'settings.php';    // Back button navigates to settings.php
  $pageDepth = "../../../";      // Fixes the logo path if needed
  include "../../../components/navbarPassenger.php";
  ?>

  <!-- Main Content -->
  <div class="container accessibility-container">

    <!-- Heading -->
    <div class="accessibility-heading">Accessibility Settings</div>
    <p class="text-center text-muted">Enhance the app usability with accessibility options tailored for you.</p>

    <!-- Accessibility Options -->
    <div class="accessibility-item">
      <div class="d-flex align-items-center">
        <span class="material-symbols-rounded accessibility-icon">text_fields</span>
        <span class="ms-2">Adjust Text Size</span>
      </div>
      <div>
        <button class="btn btn-outline-primary btn-sm me-2">A-</button>
        <button class="btn btn-primary btn-sm">A+</button>
      </div>
    </div>

    <div class="accessibility-item">
      <div class="d-flex align-items-center">
        <span class="material-symbols-rounded accessibility-icon">invert_colors</span>
        <span class="ms-2">High Contrast Mode</span>
      </div>
      <div class="form-check form-switch">
        <input class="form-check-input" type="checkbox">
      </div>
    </div>

    <div class="accessibility-item">
      <div class="d-flex align-items-center">
        <span class="material-symbols-rounded accessibility-icon">speaker</span>
        <span class="ms-2">Screen Reader Support</span>
      </div>
      <div class="form-check form-switch">
        <input class="form-check-input" type="checkbox">
      </div>
    </div>

  </div>

  <!-- Bootstrap JS -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>

</html>