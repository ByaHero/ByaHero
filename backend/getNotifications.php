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

$stmt = $conn->prepare("
  SELECT id, type, title, message, meta, created_at, read_at
  FROM notifications
  WHERE user_id = ?
  ORDER BY created_at DESC
  LIMIT 50
");
$stmt->bind_param("i", $userId);
$stmt->execute();
$res = $stmt->get_result();

$rows = [];
while ($r = $res->fetch_assoc()) $rows[] = $r;

$stmt->close();
$conn->close();

echo json_encode(['success' => true, 'notifications' => $rows]);