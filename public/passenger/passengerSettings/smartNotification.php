<!doctype html>
<html lang="en">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>Smart Notifications - ByaHero</title>

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

    .notification-container {
      margin-top: 70px; /* Ensures spacing between navbar and content */
    }

    .section-heading {
      font-weight: bold;
      font-size: 1.2rem;
      color: #1e3a8a;
    }

    .notification-description {
      background-color: white;
      padding: 16px;
      border-radius: 10px;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
      margin-top: 1rem;
      margin-bottom: 1rem;
      font-size: 0.9rem;
      color: #6b7280;
    }

    .notification-item {
      padding: 12px 16px;
      background-color: #f3f4f6;
      margin-bottom: 0.5rem;
      border-radius: 10px;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .notification-item .icon-wrapper {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background-color: #1e3a8a;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 1.5rem;
    }

    .form-check .form-check-input[type='checkbox'] {
      width: 1.5em;
      height: 1.5em;
    }
  </style>
</head>

<body>
  <?php
  $pageType = 'settings';        // Configures navbar for Smart Notifications page
  $backLink = 'settings.php';    // Correct back navigation to `settings.php` in the same directory
  $pageDepth = "../../../";      // Fixes the logo path if needed
  include "../../../components/navbarPassenger.php";
  ?>

  <!-- Main Content -->
  <div class="container notification-container">
    <!-- Heading -->
    <div class="section-heading">Smart Notifications</div>

    <!-- Description -->
    <div class="notification-description">
      Stay informed about the most relevant updates while tracking buses. Enable Smart Notifications to receive alerts for bus schedule changes, arrivals, and seat availability. These notifications ensure you never miss important updates while using the ByaHero app.
    </div>

    <!-- Notification Settings -->
    <div class="notification-item">
      <div class="d-flex align-items-center">
        <div class="icon-wrapper">
          <span class="material-symbols-rounded">schedule</span>
        </div>
        <span class="ms-2">Bus Schedule Update</span>
      </div>
      <div class="form-check form-switch">
        <input class="form-check-input" type="checkbox" checked>
      </div>
    </div>

    <div class="notification-item">
      <div class="d-flex align-items-center">
        <div class="icon-wrapper">
          <span class="material-symbols-rounded">directions_bus</span>
        </div>
        <span class="ms-2">Bus Arrival</span>
      </div>
      <div class="form-check form-switch">
        <input class="form-check-input" type="checkbox" checked>
      </div>
    </div>

    <div class="notification-item">
      <div class="d-flex align-items-center">
        <div class="icon-wrapper">
          <span class="material-symbols-rounded">event_seat</span>
        </div>
        <span class="ms-2">Seat Availability</span>
      </div>
      <div class="form-check form-switch">
        <input class="form-check-input" type="checkbox" checked>
      </div>
    </div>
  </div>

  <!-- Bootstrap JS -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>

</html>