<?php
require_once __DIR__ . '/auth_passenger.php';
require_once __DIR__ . '/../../config/db.php';
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
<?php
if (isset($_GET['json']) || (isset($_SERVER['HTTP_ACCEPT']) && str_contains($_SERVER['HTTP_ACCEPT'], 'application/json'))) {
  echo json_encode([
    'success' => true,
    'sos_alerts' => $sos_alerts,
    'notifications' => $notifications,
    'notify_bus_schedule' => $notify_bus_schedule,
    'notify_bus_arrival' => $notify_bus_arrival,
    'notify_seat_availability' => $notify_seat_availability
  ]);
  exit;
}

$html = file_get_contents(__DIR__ . '/notifications.html');
$html = str_replace('../css/bootstrap.min.css', 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css', $html);
$html = str_replace('../js/bootstrap.bundle.min.js', 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js', $html);
echo $html;
exit;