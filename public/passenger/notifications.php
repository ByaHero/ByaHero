<?php
require_once __DIR__ . '/auth_passenger.php';
require_once __DIR__ . '/../../config/db.php';
$conn = db();
$user_id = $_SESSION['user_id'] ?? null;

if ($user_id && isset($conn) && $conn instanceof mysqli) {
  $stmt = $conn->prepare("UPDATE notifications SET read_at = NOW() WHERE user_id = ? AND read_at IS NULL");
  if ($stmt) {
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $stmt->close();
  }
  $stmt = $conn->prepare("UPDATE sos_alerts SET status = 'seen' WHERE recipient_user_id = ? AND status = 'active'");
  if ($stmt) {
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $stmt->close();
  }
}

$notify_bus_schedule = 0;
$notify_bus_arrival = 0;
$notify_seat_availability = 0;

if ($user_id && isset($conn) && $conn instanceof mysqli) {
  $stmt = $conn->prepare("SELECT notify_bus_schedule, notify_bus_arrival, notify_seat_availability FROM user_settings WHERE user_id = ?");
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

$sos_alerts = [];
if ($user_id && isset($conn) && $conn instanceof mysqli) {
  $sql = "SELECT sa.id, sa.location_text, sa.status, sa.created_at, u.name AS sender_name, u.email AS sender_email FROM sos_alerts sa JOIN users u ON u.id = sa.sender_user_id WHERE sa.recipient_user_id = ? ORDER BY sa.created_at DESC LIMIT 50";
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

$notifications = [];
if ($user_id && isset($conn) && $conn instanceof mysqli) {
  $stmt = $conn->prepare("SELECT id, type, title, message, meta, created_at, read_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50");
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

header('Content-Type: application/json; charset=utf-8');
echo json_encode([
  'success' => true,
  'sos_alerts' => $sos_alerts,
  'notifications' => $notifications,
  'notify_bus_schedule' => $notify_bus_schedule,
  'notify_bus_arrival' => $notify_bus_arrival,
  'notify_seat_availability' => $notify_seat_availability
]);
exit;
