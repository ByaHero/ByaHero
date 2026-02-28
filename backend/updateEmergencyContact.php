<?php
session_start();
header('Content-Type: application/json');
require_once '../config/db_connection.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Please sign in']);
    exit;
}

function normalize_ph_mobile(string $raw): ?string {
    $s = preg_replace('/[^\d\+]/', '', trim($raw));

    if (preg_match('/^\+639\d{9}$/', $s)) return $s;
    if (preg_match('/^09\d{9}$/', $s)) return '+63' . substr($s, 1);
    if (preg_match('/^9\d{9}$/', $s)) return '+63' . $s;

    return null;
}

$userId = (int)$_SESSION['user_id'];
$input = json_decode(file_get_contents('php://input'), true);

$contactId = (int)($input['id'] ?? 0);
$first = trim($input['first_name'] ?? '');
$last = trim($input['last_name'] ?? '');
$relative = trim($input['relative_type'] ?? '');
$phoneRaw = trim($input['phone'] ?? '');
$phone = normalize_ph_mobile($phoneRaw);

if ($contactId <= 0) {
    echo json_encode(['success' => false, 'message' => 'Invalid contact id']);
    exit;
}
if ($first === '' || $relative === '' || !$phone) {
    echo json_encode(['success' => false, 'message' => 'Invalid input (check name, relation, phone)']);
    exit;
}

$stmt = $conn->prepare("
    UPDATE emergency_contacts
    SET first_name = ?, last_name = ?, phone = ?, relative_type = ?
    WHERE id = ? AND user_id = ?
    LIMIT 1
");
$stmt->bind_param("ssssii", $first, $last, $phone, $relative, $contactId, $userId);

if ($stmt->execute()) {
    $updated = $stmt->affected_rows >= 0;
    $stmt->close();
    $conn->close();
    echo json_encode(['success' => $updated, 'message' => 'Updated']);
    exit;
}

$error = $stmt->error;
$stmt->close();
$conn->close();

error_log("updateEmergencyContact failed: " . $error);
echo json_encode(['success' => false, 'message' => 'Failed to update contact']);