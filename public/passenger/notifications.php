<?php
session_start();
require __DIR__ . '/../../config/db_connection.php';

// Check if user is logged in
$user_id = $_SESSION['user_id'] ?? null;

// Fetch user's notification settings
$notify_bus_schedule = 0;
$notify_bus_arrival = 0;
$notify_seat_availability = 0;

if ($user_id && isset($conn)) {
  $stmt = $conn->prepare("
    SELECT notify_bus_schedule, notify_bus_arrival, notify_seat_availability
    FROM user_settings
    WHERE user_id = ?
  ");
  $stmt->bind_param("i", $user_id);
  $stmt->execute();
  $result = $stmt->get_result();

  if ($result->num_rows > 0) {
    $settings = $result->fetch_assoc();
    $notify_bus_schedule = (int) $settings['notify_bus_schedule'];
    $notify_bus_arrival = (int) $settings['notify_bus_arrival'];
    $notify_seat_availability = (int) $settings['notify_seat_availability'];
  }
  $stmt->close();
}

// --- Fetch incoming SOS alerts for this user (in-app alerts) ---
$sos_alerts = [];
if ($user_id && isset($conn)) {
  $sql = "
    SELECT
      sa.id,
      sa.location_text,
      sa.status,
      sa.created_at,
      u.name AS sender_name,
      u.email AS sender_email
    FROM sos_alerts sa
    JOIN users u ON u.id = sa.sender_user_id
    WHERE sa.recipient_user_id = ?
    ORDER BY sa.created_at DESC
    LIMIT 50
  ";
  $stmt = $conn->prepare($sql);
  $stmt->bind_param("i", $user_id);
  $stmt->execute();
  $result = $stmt->get_result();
  while ($row = $result->fetch_assoc()) {
    $sos_alerts[] = $row;
  }
  $stmt->close();
}

// --- Fetch notifications (NEW) ---
$notifications = [];
if ($user_id && isset($conn)) {
  // If table doesn't exist yet, this will error; create the table first.
  $stmt = $conn->prepare("
    SELECT id, type, title, message, meta, created_at, read_at
    FROM notifications
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  ");
  $stmt->bind_param("i", $user_id);
  $stmt->execute();
  $res = $stmt->get_result();
  while ($row = $res->fetch_assoc()) {
    $notifications[] = $row;
  }
  $stmt->close();
}

// Decide whether to show the empty state
$any_setting_enabled = ($notify_bus_schedule || $notify_bus_arrival || $notify_seat_availability);
$has_any_alerts = (!empty($sos_alerts) || !empty($notifications));
$any_notification_enabled = ($any_setting_enabled || $has_any_alerts);

// Small helper for icon rendering
function notification_icon(string $type): array
{
  $t = strtolower($type);
  if ($t === 'bus_arrival')
    return ['icon' => 'location_on', 'class' => 'text-primary'];
  if ($t === 'seat_full')
    return ['icon' => 'airline_seat_recline_normal', 'class' => 'text-danger'];
  return ['icon' => 'notifications', 'class' => 'text-secondary'];
}
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

  <link rel="stylesheet" href="../../assets/css/accessibility.css">
  <script src="../../assets/js/analytics.js"></script>

  <style>
    body {
      font-family: "Segoe UI", sans-serif;
      background-color: #fff;
      padding-top: 50px;
      padding-bottom: 90px;
    }

    :root {
      --bs-primary: #1e3a8a;
      --bs-primary-rgb: 30, 58, 138;
      --bs-bg-light: #f3f4f6;
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
  $pageTitle = 'Notifications';
  $backLink = 'index.php';
  include '../../components/navbarPassenger.php';
  ?>

  <?php if (!$any_notification_enabled): ?>
    <div class="no-notifications-container">
      <span class="material-symbols-rounded no-notifications-icon">notifications_off</span>
      <div class="no-notifications-title">Notifications Disabled</div>
      <p class="no-notifications-text">
        You haven't enabled any notifications yet. Turn on Smart Notifications to stay updated about bus schedules,
        arrivals, and seat availability.
      </p>
      <a href="passengerSettings/smartNotification.php" class="btn btn-primary">
        <span class="material-symbols-rounded me-2"
          style="vertical-align: middle; font-size: 1.2rem;">notifications_active</span>
        Enable Notifications
      </a>
    </div>
  <?php else: ?>

    <div class="list-group list-group-flush">
      <div class="px-4 py-3 pb-1">
        <h6 class="fw-bold text-dark small mb-0">Today</h6>
      </div>

      <?php if (!empty($sos_alerts)): ?>
        <div class="px-4 py-3 pb-1">
          <h6 class="fw-bold text-dark small mb-0">SOS Alerts</h6>
        </div>

        <?php foreach ($sos_alerts as $a): ?>
          <div class="list-group-item border-0 px-4 py-3 d-flex align-items-start gap-3">
            <div class="mt-1">
              <span class="material-symbols-rounded fs-2 text-danger">warning</span>
            </div>

            <div class="flex-grow-1">
              <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="fw-bold text-dark" style="font-size: 0.95rem;">
                  SOS from <?= htmlspecialchars($a['sender_name'] ?: $a['sender_email']) ?>
                </span>
                <small class="text-muted" style="font-size: 0.75rem;">
                  <?= htmlspecialchars($a['created_at']) ?>
                </small>
              </div>

              <p class="text-muted small mb-0" style="line-height: 1.4;">
                <?= htmlspecialchars($a['location_text'] ?: 'Location not provided') ?>
              </p>

              <hr class="mt-3 mb-0 text-secondary opacity-25">
            </div>

            <?php if (($a['status'] ?? '') === 'active'): ?>
              <div class="mt-2">
                <span class="d-inline-block rounded-circle bg-danger" style="width: 8px; height: 8px;"></span>
              </div>
            <?php endif; ?>
          </div>
        <?php endforeach; ?>
      <?php endif; ?>

      <?php if (!empty($notifications)): ?>
        <div class="px-4 py-3 pb-1">
          <h6 class="fw-bold text-dark small mb-0">Smart Notifications</h6>
        </div>

        <?php foreach ($notifications as $n): ?>
          <?php $ic = notification_icon((string) $n['type']); ?>
          <div class="list-group-item border-0 px-4 py-3 d-flex align-items-start gap-3">
            <div class="mt-1">
              <span class="material-symbols-rounded fs-2 <?= htmlspecialchars($ic['class']) ?>">
                <?= htmlspecialchars($ic['icon']) ?>
              </span>
            </div>

            <div class="flex-grow-1">
              <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="fw-bold text-dark" style="font-size: 0.95rem;"><?= htmlspecialchars($n['title']) ?></span>
                <small class="text-muted" style="font-size: 0.75rem;"><?= htmlspecialchars($n['created_at']) ?></small>
              </div>

              <p class="text-muted small mb-0" style="line-height: 1.4;">
                <?= htmlspecialchars($n['message']) ?>
              </p>

              <hr class="mt-3 mb-0 text-secondary opacity-25">
            </div>

            <?php if (empty($n['read_at'])): ?>
              <div class="mt-2">
                <span class="d-inline-block rounded-circle bg-primary" style="width: 8px; height: 8px;"></span>
              </div>
            <?php endif; ?>
          </div>
        <?php endforeach; ?>
      <?php else: ?>
        <div class="px-4 py-3">
          <div class="text-muted small">No smart notifications yet. Open the map and allow location to generate arrival and
            seat alerts.</div>
        </div>
      <?php endif; ?>

    </div>
  <?php endif; ?>

  <div class="nav-wrapper">
    <?php include '../../components/navbarPassenger.php'; ?>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
  <script src="../../assets/js/accessibility.js"></script>
  <script>
    function selectNav(element, tabName) {
      window.location.href = 'index.php';
    }
  </script>
</body>

</html>