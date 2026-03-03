<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config/db_connection.php';

if (!isset($_SESSION['user_id'])) {
  http_response_code(401);
  echo json_encode(['success' => false, 'message' => 'Not logged in']);
  exit;
}

$userId = (int) $_SESSION['user_id'];

$stmt = $conn->prepare("SELECT share_location FROM user_settings WHERE user_id = ? LIMIT 1");
$stmt->bind_param("i", $userId);
$stmt->execute();
$res = $stmt->get_result();
$row = $res->fetch_assoc();
$stmt->close();
$conn->close();

echo json_encode([
  'success' => true,
  'share_location' => isset($row['share_location']) ? (int)$row['share_location'] : 0
]);