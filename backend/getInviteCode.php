<?php
session_start();
header('Content-Type: application/json');
require_once '../config/db_connection.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Not logged in']);
    exit;
}

$userId = $_SESSION['user_id'];

// 1) Find or create circle
$circleStmt = $conn->prepare("SELECT id FROM circles WHERE owner_user_id = ? LIMIT 1");
$circleStmt->bind_param("i", $userId);
$circleStmt->execute();
$circleRes = $circleStmt->get_result();
$circle = $circleRes->fetch_assoc();
$circleStmt->close();

if (!$circle) {
    $createStmt = $conn->prepare("INSERT INTO circles (owner_user_id, name) VALUES (?, 'My Circle')");
    $createStmt->bind_param("i", $userId);
    $createStmt->execute();
    $circleId = $createStmt->insert_id;
    $createStmt->close();
} else {
    $circleId = $circle['id'];
}

// 2) Generate numeric code (6 digits) each time user opens
$inviteCode = strval(random_int(100000, 999999));

// 3) Save it
$updateStmt = $conn->prepare("UPDATE circles SET invite_code = ? WHERE id = ?");
$updateStmt->bind_param("si", $inviteCode, $circleId);

if ($updateStmt->execute()) {
    echo json_encode(['success' => true, 'invite_code' => $inviteCode]);
} else {
    echo json_encode(['success' => false, 'message' => 'Failed to generate code']);
}

$updateStmt->close();
$conn->close();