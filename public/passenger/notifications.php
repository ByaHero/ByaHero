<?php
session_start();
// Adjust path to config based on your folder structure
require __DIR__ . '/../../config/db_connection.php';

// Check if user is logged in
$user_id = $_SESSION['user_id'] ?? null;

// Fetch user's notification settings
$notify_bus_schedule = 0;
$notify_bus_arrival = 0;
$notify_seat_availability = 0;

if ($user_id && isset($conn)) {
  $stmt = $conn->prepare("SELECT notify_bus_schedule, notify_bus_arrival, notify_seat_availability FROM user_settings WHERE user_id = ?");
  $stmt->bind_param("i", $user_id);
  $stmt->execute();
  $result = $stmt->get_result();
  
  if ($result->num_rows > 0) {
    $settings = $result->fetch_assoc();
    $notify_bus_schedule = $settings['notify_bus_schedule'];
    $notify_bus_arrival = $settings['notify_bus_arrival'];
    $notify_seat_availability = $settings['notify_seat_availability'];
  }
  $stmt->close();
}

// Check if any notification is enabled
$any_notification_enabled = $notify_bus_schedule || $notify_bus_arrival || $notify_seat_availability;
?>
<!doctype html>
<html lang="en">

<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
  <title>Notifications - ByaHero</title>

  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded" rel="stylesheet" />
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
  <meta name="theme-color" content="#1e3a8a">

  <!-- Global Accessibility -->
  <link rel="stylesheet" href="../../assets/images/css/accessibility.css">

  <style>
    /* Padding to prevent content from being hidden behind fixed bars */
    body {
      font-family: "Segoe UI", sans-serif;
      background-color: #fff;
      padding-top: 50px;
      /* Space for top navbar */
      padding-bottom: 90px;
      /* Space for bottom navbar */
    }

    :root {
      --bs-primary: #1e3a8a;
      --bs-primary-rgb: 30, 58, 138;
      --bs-bg-light: #f3f4f6;
    }

    .hover-bg-white-10:hover {
      background-color: rgba(255, 255, 255, 0.1);
    }

    .no-notifications-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 60vh;
      text-align: center;
      padding: 2rem;
    }

    .no-notifications-icon {
      font-size: 5rem;
      color: #6b7280;
      margin-bottom: 1rem;
    }

    .no-notifications-title {
      font-size: 1.5rem;
      font-weight: bold;
      color: #1e3a8a;
      margin-bottom: 0.5rem;
    }

    .no-notifications-text {
      color: #6b7280;
      margin-bottom: 1.5rem;
      max-width: 400px;
    }
  </style>
</head>

<body>

  <?php
  $pageTitle = 'notifications';
  $backLink = 'index.php';
  include '../../components/navbarPassenger.php';
  ?>

  <?php if (!$any_notification_enabled): ?>
    <!-- No Notifications Enabled Message -->
    <div class="no-notifications-container">
      <span class="material-symbols-rounded no-notifications-icon">notifications_off</span>
      <div class="no-notifications-title">Notifications Disabled</div>
      <p class="no-notifications-text">
        You haven't enabled any notifications yet. Turn on Smart Notifications to stay updated about bus schedules, arrivals, and seat availability.
      </p>
      <a href="passengerSettings/smartNotification.php" class="btn btn-primary">
        <span class="material-symbols-rounded me-2" style="vertical-align: middle; font-size: 1.2rem;">notifications_active</span>
        Enable Notifications
      </a>
    </div>
  <?php else: ?>
    <!-- Display Notifications -->
    <div class="list-group list-group-flush">
      <div class="px-4 py-3 pb-1">
        <h6 class="fw-bold text-dark small mb-0">Today</h6>
      </div>

      <?php if ($notify_bus_schedule): ?>
        <div class="list-group-item border-0 px-4 py-3 d-flex align-items-start gap-3">
          <div class="mt-1"><span class="material-symbols-rounded fs-2">campaign</span></div>
          <div class="flex-grow-1">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <span class="fw-bold text-dark" style="font-size: 0.95rem;">Magnificat Update</span>
              <small class="text-muted" style="font-size: 0.75rem;">3 mins ago</small>
            </div>
            <p class="text-muted small mb-0" style="line-height: 1.4;">Updated bus schedule available — tap to view.</p>
            <hr class="mt-3 mb-0 text-secondary opacity-25">
          </div>
          <div class="mt-2"><span class="d-inline-block rounded-circle bg-primary" style="width: 8px; height: 8px;"></span></div>
        </div>
      <?php endif; ?>

      <?php if ($notify_bus_arrival): ?>
        <div class="list-group-item border-0 px-4 py-0 d-flex align-items-start gap-3">
          <div class="mt-1"><span class="material-symbols-rounded fs-2 text-primary">location_on</span></div>
          <div class="flex-grow-1">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <span class="fw-bold text-dark" style="font-size: 0.95rem;">Bus Arrival</span>
              <small class="text-muted" style="font-size: 0.75rem;">3 mins ago</small>
            </div>
            <p class="text-muted small mb-0" style="line-height: 1.4;">Bus 00002 is approaching your stop in 3 mins.</p>
            <hr class="mt-3 mb-0 text-secondary opacity-25">
          </div>
          <div class="mt-2"><span class="d-inline-block rounded-circle bg-primary" style="width: 8px; height: 8px;"></span></div>
        </div>
      <?php endif; ?>

      <?php if ($notify_seat_availability): ?>
        <div class="list-group-item border-0 px-4 py-3 d-flex align-items-start gap-3">
          <div class="mt-1"><span class="material-symbols-rounded fs-2">airline_seat_recline_normal</span></div>
          <div class="flex-grow-1">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <span class="fw-bold text-dark" style="font-size: 0.95rem;">Seat Availability</span>
              <small class="text-muted" style="font-size: 0.75rem;">5 mins ago</small>
            </div>
            <p class="text-muted small mb-0" style="line-height: 1.4;">Bus 00003 is full — next bus in 12 minutes.</p>
            <hr class="mt-3 mb-0 text-secondary opacity-25">
          </div>
          <div class="mt-2"><span class="d-inline-block rounded-circle bg-primary" style="width: 8px; height: 8px;"></span></div>
        </div>
      <?php endif; ?>

      <div class="px-4 py-2 pt-4">
        <h6 class="fw-bold text-dark small mb-0">This Week</h6>
      </div>

      <?php if ($notify_bus_schedule): ?>
        <div class="list-group-item border-0 px-4 py-3 d-flex align-items-start gap-3 bg-light bg-opacity-25">
          <div class="mt-1"><span class="material-symbols-rounded fs-2 opacity-75">campaign</span></div>
          <div class="flex-grow-1">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <span class="fw-bold text-dark opacity-75" style="font-size: 0.95rem;">Magnificat Update</span>
              <small class="text-muted" style="font-size: 0.75rem;">Tue 00:00</small>
            </div>
            <p class="text-muted small mb-0" style="line-height: 1.4;">Updated bus schedule available — tap to view.</p>
            <hr class="mt-3 mb-0 text-secondary opacity-25">
          </div>
        </div>
      <?php endif; ?>
    </div>
  <?php endif; ?>

  <div class="nav-wrapper">
    <?php include '../../components/navbarPassenger.php'; ?>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
  <script src="../../assets/images/js/accessibility.js"></script>
  <script>
    // Ensure clicking bottom nav buttons redirects back to home/index
    function selectNav(element, tabName) {
      window.location.href = 'index.php';
    }
  </script>
</body>

</html>