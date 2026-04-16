<?php
session_start();
header('Content-Type: application/json');
require_once '../config/db_connection.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Not logged in']);
    exit;
}

$userId = $_SESSION['user_id'];
$input = json_decode(file_get_contents('php://input'), true);
$code = trim($input['invite_code'] ?? '');

if ($code === '') {
    echo json_encode(['success' => false, 'message' => 'Invite code required']);
    exit;
}

// Find circle by code
$circleStmt = $conn->prepare("SELECT id, owner_user_id FROM circles WHERE invite_code = ? LIMIT 1");
$circleStmt->bind_param("s", $code);
$circleStmt->execute();
$circleRes = $circleStmt->get_result();
$circle = $circleRes->fetch_assoc();
$circleStmt->close();

if (!$circle) {
    echo json_encode(['success' => false, 'message' => 'Invalid invite code']);
    exit;
}

$circleId = $circle['id'];

if ((int)$circle['owner_user_id'] === (int)$userId) {
    echo json_encode(['success' => false, 'message' => 'You cannot add yourself']);
    exit;
}

// Check duplicate
$checkStmt = $conn->prepare("SELECT id FROM circle_members WHERE circle_id = ? AND member_user_id = ? LIMIT 1");
$checkStmt->bind_param("ii", $circleId, $userId);
$checkStmt->execute();
$checkRes = $checkStmt->get_result();
$already = $checkRes->fetch_assoc();
$checkStmt->close();

if ($already) {
    echo json_encode(['success' => false, 'message' => 'Already in circle']);
    exit;
}

// Insert member (the user scanning the code into the owner's circle)
$insertStmt = $conn->prepare("INSERT INTO circle_members (circle_id, member_user_id, status) VALUES (?, ?, 'active')");
$insertStmt->bind_param("ii", $circleId, $userId);

if ($insertStmt->execute()) {
    $insertStmt->close();

    // Two-way logic: Find or create the scanning user's circle
    $myCircleStmt = $conn->prepare("SELECT id FROM circles WHERE owner_user_id = ? LIMIT 1");
    $myCircleStmt->bind_param("i", $userId);
    $myCircleStmt->execute();
    $myCircleRes = $myCircleStmt->get_result();
    $myCircle = $myCircleRes->fetch_assoc();
    $myCircleStmt->close();

    if (!$myCircle) {
        $createStmt = $conn->prepare("INSERT INTO circles (owner_user_id, name) VALUES (?, 'My Circle')");
        $createStmt->bind_param("i", $userId);
        $createStmt->execute();
        $myCircleId = $createStmt->insert_id;
        $createStmt->close();
    } else {
        $myCircleId = $myCircle['id'];
    }

    $ownerId = $circle['owner_user_id'];

    // Insert owner into scanning user's circle
    $checkMyStmt = $conn->prepare("SELECT id FROM circle_members WHERE circle_id = ? AND member_user_id = ? LIMIT 1");
    $checkMyStmt->bind_param("ii", $myCircleId, $ownerId);
    $checkMyStmt->execute();
    $myAlready = $checkMyStmt->get_result()->fetch_assoc();
    $checkMyStmt->close();

    if (!$myAlready) {
        $insertMyStmt = $conn->prepare("INSERT INTO circle_members (circle_id, member_user_id, status) VALUES (?, ?, 'active')");
        $insertMyStmt->bind_param("ii", $myCircleId, $ownerId);
        $insertMyStmt->execute();
        $insertMyStmt->close();
    }

    echo json_encode(['success' => true, 'message' => 'Joined circle successfully']);
} else {
    echo json_encode(['success' => false, 'message' => 'Failed to join circle']);
    $insertStmt->close();
}
$conn->close();