<?php
session_start();
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/db_connection.php';

if (!isset($_SESSION['user_id'])) {
  echo json_encode(['success' => true, 'unread' => 0]);
  exit;
}

$userId = (int)$_SESSION['user_id'];

if (!isset($conn) || !($conn instanceof mysqli)) {
  http_response_code(500);
  echo json_encode(['success' => false, 'message' => 'DB connection not available']);
  exit;
}

$stmt = $conn->prepare("
  SELECT COUNT(*) AS c
  FROM notifications
  WHERE user_id = ?
    AND read_at IS NULL
");
$stmt->bind_param("i", $userId);
$stmt->execute();
$res = $stmt->get_result();
$row = $res->fetch_assoc();
$stmt->close();

echo json_encode(['success' => true, 'unread' => (int)($row['c'] ?? 0)]);