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
$input = json_decode(file_get_contents('php://input'), true);

$type = trim((string)($input['type'] ?? ''));
$title = trim((string)($input['title'] ?? ''));
$message = trim((string)($input['message'] ?? ''));
$dedupeKey = trim((string)($input['dedupe_key'] ?? ''));
$meta = $input['meta'] ?? null;

if ($type === '' || $title === '' || $message === '' || $dedupeKey === '') {
  http_response_code(400);
  echo json_encode(['success' => false, 'message' => 'Missing required fields']);
  exit;
}

$metaJson = $meta !== null ? json_encode($meta) : null;

$stmt = $conn->prepare("
  INSERT IGNORE INTO notifications (user_id, type, title, message, meta, dedupe_key)
  VALUES (?, ?, ?, ?, ?, ?)
");
$stmt->bind_param("isssss", $userId, $type, $title, $message, $metaJson, $dedupeKey);

$ok = $stmt->execute();
$inserted = $stmt->affected_rows > 0;

$stmt->close();
$conn->close();

echo json_encode(['success' => $ok, 'inserted' => $inserted]);