<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config/db_connection.php';

if (!isset($_SESSION['user_id'])) {
  http_response_code(401);
  echo json_encode(['success' => false, 'message' => 'Not logged in']);
  exit;
}

$userId = (int)$_SESSION['user_id'];

if (!isset($conn) || !($conn instanceof mysqli)) {
  http_response_code(500);
  echo json_encode(['success' => false, 'message' => 'DB connection not available']);
  exit;
}

$stmt = $conn->prepare("
  SELECT id, type, title, message, meta, created_at, read_at
  FROM notifications
  WHERE user_id = ?
  ORDER BY created_at DESC
  LIMIT 50
");
if (!$stmt) {
  http_response_code(500);
  echo json_encode(['success' => false, 'message' => 'Failed to prepare statement']);
  exit;
}

$stmt->bind_param("i", $userId);
$stmt->execute();

$stmt->bind_result($id, $type, $title, $message, $meta, $created_at, $read_at);

$rows = [];
while ($stmt->fetch()) {
  $rows[] = [
    'id' => $id,
    'type' => $type,
    'title' => $title,
    'message' => $message,
    'meta' => $meta,
    'created_at' => $created_at,
    'read_at' => $read_at,
  ];
}

$stmt->close();
$conn->close();

echo json_encode(['success' => true, 'notifications' => $rows]);