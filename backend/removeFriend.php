<?php
session_start();
header('Content-Type: application/json');
require_once '../config/db.php';
$conn = db();

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
    $affected = $delStmt->affected_rows;
    $delStmt->close();

    // 2. Remove ME from the FRIEND'S circle
    $friendCircleStmt = $conn->prepare("SELECT id FROM circles WHERE owner_user_id = ? LIMIT 1");
    $friendCircleStmt->bind_param("i", $friendId);
    $friendCircleStmt->execute();
    $friendCircleRes = $friendCircleStmt->get_result();
    $friendCircle = $friendCircleRes->fetch_assoc();
    $friendCircleStmt->close();

    if ($friendCircle) {
        $friendCircleId = $friendCircle['id'];
        $delMeStmt = $conn->prepare("DELETE FROM circle_members WHERE circle_id = ? AND member_user_id = ?");
        $delMeStmt->bind_param("ii", $friendCircleId, $ownerId);
        $delMeStmt->execute();
        $delMeStmt->close();
    }

    if ($affected > 0) {
        echo json_encode(['success' => true, 'message' => 'Friend removed successfully']);
    } else {
        echo json_encode(['success' => true, 'message' => 'Friend was already removed']);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Failed to remove friend']);
    $delStmt->close();
}
$conn->close();
