<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config/db_connection.php';

if (!isset($_SESSION['user_id'])) {
  echo json_encode(['success' => true, 'has_unread' => false]);
  exit;
}

$userId = (int)$_SESSION['user_id'];

if (!isset($conn) || !($conn instanceof mysqli)) {
  http_response_code(500);
  echo json_encode(['success' => false, 'message' => 'DB connection not available']);
  exit;
}

$hasUnread = false;

// 1) unread notifications
$stmt = $conn->prepare("
  SELECT 1
  FROM notifications
  WHERE user_id = ?
    AND read_at IS NULL
  LIMIT 1
");
if ($stmt) {
  $stmt->bind_param("i", $userId);
  $stmt->execute();
  $stmt->store_result();
  if ($stmt->num_rows > 0) $hasUnread = true;
  $stmt->close();
}

// 2) active sos alerts (only check if none found yet)
if (!$hasUnread) {
  $stmt = $conn->prepare("
    SELECT 1
    FROM sos_alerts
    WHERE recipient_user_id = ?
      AND status = 'active'
    LIMIT 1
  ");
  if ($stmt) {
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $stmt->store_result();
    if ($stmt->num_rows > 0) $hasUnread = true;
    $stmt->close();
  }
}

$conn->close();
echo json_encode(['success' => true, 'has_unread' => $hasUnread]);