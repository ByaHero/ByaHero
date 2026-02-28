<?php
session_start();
header('Content-Type: application/json');
require_once '../config/db_connection.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Please sign in']);
    exit;
}

$userId = (int)$_SESSION['user_id'];

$input = json_decode(file_get_contents('php://input'), true);
$contactId = (int)($input['id'] ?? 0);

if ($contactId <= 0) {
    echo json_encode(['success' => false, 'message' => 'Invalid contact id']);
    exit;
}

$stmt = $conn->prepare("DELETE FROM emergency_contacts WHERE id = ? AND user_id = ? LIMIT 1");
$stmt->bind_param("ii", $contactId, $userId);

if ($stmt->execute()) {
    $deleted = $stmt->affected_rows > 0;
    $stmt->close();
    $conn->close();

    echo json_encode(['success' => $deleted, 'message' => $deleted ? 'Deleted' : 'Not found']);
    exit;
}

$error = $stmt->error;
$stmt->close();
$conn->close();

error_log("deleteEmergencyContact failed: " . $error);
echo json_encode(['success' => false, 'message' => 'Failed to delete contact']);