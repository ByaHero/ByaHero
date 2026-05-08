<?php
session_start();
header('Content-Type: application/json');
require_once '../config/db.php';
$conn = db();

$userId = (int)($_SESSION['user_id'] ?? 0);
if (!$userId) {
  echo json_encode(['success' => false, 'message' => 'Not logged in']);
  exit;
}

$sinceId = (int)($_GET['since_id'] ?? 0);
$limit = 20;

try {
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
      AND sa.id > ?
    ORDER BY sa.id DESC
    LIMIT $limit
  ";

  $stmt = $conn->prepare($sql);
  $stmt->bind_param("ii", $userId, $sinceId);
  $stmt->execute();
  $res = $stmt->get_result();

  $alerts = [];
  while ($row = $res->fetch_assoc()) {
    $alerts[] = $row;
  }
  $stmt->close();

  echo json_encode([
    'success' => true,
    'alerts' => $alerts
  ]);
} catch (Exception $e) {
  error_log("getSosAlerts error: " . $e->getMessage());
  echo json_encode(['success' => false, 'message' => 'Failed to fetch alerts']);
}