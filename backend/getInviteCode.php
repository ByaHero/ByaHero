<?php
@session_start();
header('Content-Type: application/json');
require_once '../config/db.php';
$conn = db();

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Not logged in']);
    exit;
}

$userId = $_SESSION['user_id'];

// 1) Find or create circle
$circleStmt = $conn->prepare("SELECT id, invite_code FROM circles WHERE owner_user_id = ? LIMIT 1");
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
    $existingCode = null;
} else {
    $circleId = $circle['id'];
    $existingCode = $circle['invite_code'];
}

// 2) Generate numeric code (6 digits) ONLY if missing or reset requested
$isReset = isset($_GET['reset']) && $_GET['reset'] == '1';
if (!$existingCode || $isReset) {
    $inviteCode = strval(random_int(100000, 999999));
    
    // 3) Save it
    $updateStmt = $conn->prepare("UPDATE circles SET invite_code = ? WHERE id = ?");
    $updateStmt->bind_param("si", $inviteCode, $circleId);
    if (!$updateStmt->execute()) {
        echo json_encode(['success' => false, 'message' => 'Failed to save code']);
        exit;
    }
    $updateStmt->close();
} else {
    $inviteCode = $existingCode;
}

echo json_encode(['success' => true, 'invite_code' => $inviteCode]);
$conn->close();