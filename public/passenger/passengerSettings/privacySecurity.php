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

  <style>
    body {
      font-family: "Segoe UI", sans-serif;
      background-color: #f8f9fa;
      padding-bottom: 80px;
    }

    .privacy-container {
      margin-top: 70px; /* Ensures spacing between navbar and content */
    }

    .settings-section-header {
      font-weight: bold;
      padding: 8px 16px;
      color: #1e3a8a;
    }

    .privacy-item {
      padding: 12px 16px;
      background-color: white;
      margin: 0.5rem 0;
      border-radius: 10px;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      cursor: pointer;
    }

    .privacy-item .privacy-icon {
      font-size: 1.2rem;
      margin-right: 12px;
      color: #4b5563;
    }

    .privacy-item:hover {
      background: #e8eaf6;
    }

    .back-button {
      position: fixed;
      top: 55px; /* Positioned below navbarPassenger */
      left: 16px; /* Aligns horizontally to match settings.php */
      z-index: 1080;
      background: transparent;
      border: none;
      font-size: 1.5rem;
      color: #1e3a8a;
    }

    .blue-box {
      padding: 16px;
      background: #1e3a8a;
      color: white;
      border-radius: 10px;
      margin-bottom: 1.5rem; /* Adds spacing between blue box and next section */
    }

    .blue-box a {
      color: #ffc107;
    }
  </style>
</head>

<body>
  <!-- Navbar -->
  <?php include "../../../components/navbarPassenger.php"; ?>

<!-- Back Button -->
<button class="back-button" onclick="window.location.href='settings.php';">
  <span class="material-symbols-rounded">arrow_back</span>
</button>

  <!-- Main Content -->
  <div class="container privacy-container">

    <!-- Blue Info Box -->
    <div class="blue-box">
      <h5 class="m-0">Privacy and Security</h5>
      <p class="m-0 small">
        Control which apps can access your data, location, camera, and manage safety protections. <a href="#" class="text-decoration-underline">Learn more...</a>
      </p>
    </div>

    <!-- Privacy Settings -->
    <div class="privacy-section">
      <div class="privacy-item">
        <span class="material-symbols-rounded privacy-icon">location_on</span>Location Services
      </div>
      <div class="privacy-item">
        <span class="material-symbols-rounded privacy-icon">share</span>Tracking
      </div>
      <div class="privacy-item">
        <span class="material-symbols-rounded privacy-icon">shield</span>Safety Check
      </div>
      <div class="privacy-item">
        <span class="material-symbols-rounded privacy-icon">analytics</span>Analytics and Improvements
      </div>
      <div class="privacy-item">
        <span class="material-symbols-rounded privacy-icon">security</span>Stolen Device Protection <span class="ms-auto">Off</span>
      </div>
    </div>

    <!-- Additional Resources -->
    <div class="privacy-section">
      <div class="settings-section-header">Additional Resources</div>
      <div class="privacy-item">
        <span class="material-symbols-rounded privacy-icon">support_agent</span>Safety Center
      </div>
      <div class="privacy-item">
        <span class="material-symbols-rounded privacy-icon">shield</span>Privacy Center
      </div>
    </div>
  </div>

  <!-- Bootstrap JS -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>

</html>