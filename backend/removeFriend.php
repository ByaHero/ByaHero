<?php
session_start();
header('Content-Type: application/json');
require_once '../config/db_connection.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Not logged in']);
    exit;
}

$ownerId = $_SESSION['user_id'];
$input = json_decode(file_get_contents('php://input'), true);
$friendId = intval($input['friend_id'] ?? 0);

if ($friendId <= 0) {
    echo json_encode(['success' => false, 'message' => 'Invalid friend ID']);
    exit;
}

// Ensure the user owns a circle
$circleStmt = $conn->prepare("SELECT id FROM circles WHERE owner_user_id = ? LIMIT 1");
$circleStmt->bind_param("i", $ownerId);
$circleStmt->execute();
$circleRes = $circleStmt->get_result();
$circle = $circleRes->fetch_assoc();
$circleStmt->close();

if (!$circle) {
    echo json_encode(['success' => false, 'message' => 'You do not own a circle']);
    exit;
}

$circleId = $circle['id'];

// Remove the friend from this circle
$delStmt = $conn->prepare("DELETE FROM circle_members WHERE circle_id = ? AND member_user_id = ?");
$delStmt->bind_param("ii", $circleId, $friendId);

if ($delStmt->execute()) {
    if ($delStmt->affected_rows > 0) {
        echo json_encode(['success' => true, 'message' => 'Friend removed successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Friend not found in your circle']);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Failed to remove friend']);
}

$delStmt->close();
$conn->close();
