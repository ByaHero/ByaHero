<?php
require_once __DIR__ . '/auth_passenger.php';
require __DIR__ . '/../../config/db.php';
$conn = db();

// Check if user is logged in
$user_id = $_SESSION['user_id'] ?? null;

/**
 * Mark all unread notifications as read when user opens this page.
 * This requires notifications.read_at to exist in your DB.
 */
if ($user_id && isset($conn) && $conn instanceof mysqli) {
  $stmt = $conn->prepare("
    UPDATE notifications
    SET read_at = NOW()
    WHERE user_id = ?
      AND read_at IS NULL
  ");
  if ($stmt) {
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $stmt->close();
  }
}

/**
 * Mark all active SOS alerts as seen when user opens this page
 * (so the red dot disappears after revisiting Notifications).
 */
if ($user_id && isset($conn) && $conn instanceof mysqli) {
  $stmt = $conn->prepare("
    UPDATE sos_alerts
    SET status = 'seen'
    WHERE recipient_user_id = ?
      AND status = 'active'
  ");
  if ($stmt) {
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $stmt->close();
  }
}

// Fetch user's notification settings
$notify_bus_schedule = 0;
$notify_bus_arrival = 0;
$notify_seat_availability = 0;

if ($user_id && isset($conn) && $conn instanceof mysqli) {
  $stmt = $conn->prepare("
    SELECT notify_bus_schedule, notify_bus_arrival, notify_seat_availability
    FROM user_settings
    WHERE user_id = ?
  ");
  if ($stmt) {
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result && $result->num_rows > 0) {
      $settings = $result->fetch_assoc();
      $notify_bus_schedule = (int) ($settings['notify_bus_schedule'] ?? 0);
      $notify_bus_arrival = (int) ($settings['notify_bus_arrival'] ?? 0);
      $notify_seat_availability = (int) ($settings['notify_seat_availability'] ?? 0);
    }
    $stmt->close();
  }
}

// --- Fetch incoming SOS alerts for this user (in-app alerts) ---
$sos_alerts = [];
if ($user_id && isset($conn) && $conn instanceof mysqli) {
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
  if ($stmt) {
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    while ($result && ($row = $result->fetch_assoc())) {
      $sos_alerts[] = $row;
    }
    $stmt->close();
  }
}

// --- Fetch notifications (NEW) ---
$notifications = [];
if ($user_id && isset($conn) && $conn instanceof mysqli) {
  $stmt = $conn->prepare("
    SELECT id, type, title, message, meta, created_at, read_at
    FROM notifications
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  ");
  if ($stmt) {
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $res = $stmt->get_result();
    while ($res && ($row = $res->fetch_assoc())) {
      $notifications[] = $row;
    }
    $stmt->close();
  }
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
    <link rel="icon" href="../../assets/images/byaheroLogoBlue.svg" type="image/svg+xml">
    <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
  <title>Notifications - ByaHero</title>

  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0&display=swap" rel="stylesheet" media="print" onload="this.media='all'" />
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
  <meta name="theme-color" content="#1e3a8a">

  <link rel="stylesheet" href="../../assets/css/accessibility.css">

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
                  SOS from <?= htmlspecialchars((string)(($a['sender_name'] ?: $a['sender_email']) ?? 'Unknown')) ?>
                </span>
                <small class="text-muted" style="font-size: 0.75rem;">
                  <?= date('M j, g:i A', strtotime($a['created_at'])) ?>
                </small>
              </div>

              <p class="text-muted small mb-0" style="line-height: 1.4;">
                <?= htmlspecialchars((string)(($a['location_text'] ?: 'Location not provided') ?? '')) ?>
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
          <?php $ic = notification_icon((string) ($n['type'] ?? '')); ?>
          <div class="list-group-item border-0 px-4 py-3 d-flex align-items-start gap-3">
            <div class="mt-1">
              <span class="material-symbols-rounded fs-2 <?= htmlspecialchars($ic['class']) ?>">
                <?= htmlspecialchars($ic['icon']) ?>
              </span>
            </div>

            <div class="flex-grow-1">
              <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="fw-bold text-dark" style="font-size: 0.95rem;">
                  <?= htmlspecialchars((string) ($n['title'] ?? '')) ?>
                </span>
                <small class="text-muted" style="font-size: 0.75rem;">
                  <?= date('M j, g:i A', strtotime($n['created_at'])) ?>
                </small>
              </div>

              <p class="text-muted small mb-0" style="line-height: 1.4;">
                <?= htmlspecialchars((string) ($n['message'] ?? '')) ?>
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
          <div class="text-muted small">
            No smart notifications yet. Open the map and allow location to generate arrival and seat alerts.
          </div>
        </div>
      <?php endif; ?>

    </div>
  <?php endif; ?>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
  <script src="../../assets/js/accessibility.js"></script>

  <script>
    function selectNav(element, tabName) {
      window.location.href = 'index.php';
    }
  </script>

  <script>
    // --- SOS polling (Option 3: "push-like" while app is open) ---

    let _pollSosIntervalId = null;
    let lastSosId = (function () {
      <?php
      $maxId = 0;
      if (!empty($sos_alerts)) {
        foreach ($sos_alerts as $a) {
          $id = (int) ($a['id'] ?? 0);
          if ($id > $maxId)
            $maxId = $id;
        }
      }
      ?>
      return <?= (int) $maxId ?>;
    })();

    function ensureToastContainer() {
      let c = document.getElementById('toast-container');
      if (c) return c;

      c = document.createElement('div');
      c.id = 'toast-container';
      c.className = 'toast-container position-fixed top-0 end-0 p-3';
      c.style.zIndex = 3000;
      document.body.appendChild(c);
      return c;
    }

    function showSosToast(title, message) {
      const container = ensureToastContainer();
      const toastEl = document.createElement('div');
      toastEl.className = 'toast align-items-center text-bg-danger border-0';
      toastEl.setAttribute('role', 'alert');
      toastEl.setAttribute('aria-live', 'assertive');
      toastEl.setAttribute('aria-atomic', 'true');

      toastEl.innerHTML = `
        <div class="d-flex">
          <div class="toast-body">
            <div class="fw-bold">${title}</div>
            <div class="small">${message}</div>
          </div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
      `;

      container.appendChild(toastEl);
      const t = new bootstrap.Toast(toastEl, { delay: 7000 });
      t.show();

      toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
    }

    function notifyUserNow() {
      try { if (navigator.vibrate) navigator.vibrate([200, 80, 200]); } catch (e) { }

      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = 880;
        g.gain.value = 0.05;
        o.connect(g); g.connect(ctx.destination);
        o.start();
        setTimeout(() => { o.stop(); ctx.close(); }, 150);
      } catch (e) { }
    }

    async function pollSosAlerts() {
      try {
        const res = await fetch(`../../backend/getSosAlerts.php?since_id=${encodeURIComponent(lastSosId)}`, {
          credentials: 'include'
        });
        const data = await res.json();
        if (!data.success) return;

        const alerts = Array.isArray(data.alerts) ? data.alerts : [];
        if (alerts.length === 0) return;

        const newestId = Math.max(...alerts.map(a => parseInt(a.id, 10) || 0));
        if (newestId > lastSosId) lastSosId = newestId;

        alerts.slice().reverse().forEach(a => {
          const sender = a.sender_name || a.sender_email || 'Someone';
          const loc = a.location_text || 'Location not provided';
          showSosToast('SOS Alert', `SOS from ${sender} • ${loc}`);
        });

        notifyUserNow();

        setTimeout(() => location.reload(), 600);
      } catch (e) {
        console.warn(e);
      }
    }

    function scheduleNextSosPoll() {
        _pollSosIntervalId = setTimeout(async () => {
            await pollSosAlerts();
            scheduleNextSosPoll();
        }, 10000);
    }

    scheduleNextSosPoll();

    function _cleanup() {
        if (_pollSosIntervalId) { clearTimeout(_pollSosIntervalId); _pollSosIntervalId = null; }
            _pollSosInProgress = false;
    }
    window.addEventListener('beforeunload', _cleanup);
    window.addEventListener('pagehide', _cleanup);
  </script>
</body>

</html>