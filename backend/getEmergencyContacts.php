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

$stmt = $conn->prepare("
    SELECT id, first_name, last_name, phone, relative_type, created_at
    FROM emergency_contacts
    WHERE user_id = ?
    ORDER BY created_at DESC
");
$stmt->bind_param("i", $userId);
$stmt->execute();
$res = $stmt->get_result();

$contacts = [];
while ($row = $res->fetch_assoc()) {
    $contacts[] = [
        'id' => (int)$row['id'],
        'first_name' => $row['first_name'],
        'last_name' => $row['last_name'],
        'phone' => $row['phone'],
        'relative_type' => $row['relative_type'],
        'created_at' => $row['created_at'],
    ];
}
$stmt->close();
$conn->close();

echo json_encode(['success' => true, 'contacts' => $contacts]);