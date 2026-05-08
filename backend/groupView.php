<?php
session_start();
header('Content-Type: application/json');
require_once '../config/db.php';
$conn = db();

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Not logged in']);
    exit;
}

$userId = $_SESSION['user_id'];

// Find user’s circle (default: first one)
$circleStmt = $conn->prepare("SELECT id FROM circles WHERE owner_user_id = ? LIMIT 1");
$circleStmt->bind_param("i", $userId);
$circleStmt->execute();
$circleResult = $circleStmt->get_result();
$circle = $circleResult->fetch_assoc();
$circleStmt->close();

if (!$circle) {
    echo json_encode(['success' => true, 'friends' => []]);
    exit;
}

$circleId = $circle['id'];

// Fetch members + latest location
$sql = "
    SELECT 
        u.id,
        u.name,
        u.email,
        u.profile_picture,
        ul.latitude,
        ul.longitude,
        ul.accuracy,
        ul.updated_at
    FROM circle_members cm
    JOIN users u ON u.id = cm.member_user_id
    LEFT JOIN user_locations ul ON ul.user_id = u.id
    WHERE cm.circle_id = ? AND cm.status = 'active'
    ORDER BY u.name ASC
";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $circleId);
$stmt->execute();
$result = $stmt->get_result();

$friends = [];
while ($row = $result->fetch_assoc()) {
    $friends[] = [
        'id' => (int)$row['id'],
        'name' => $row['name'],
        'email' => $row['email'],
        'profile_picture' => $row['profile_picture'] ?? null,
        'latitude' => $row['latitude'],
        'longitude' => $row['longitude'],
        'accuracy' => $row['accuracy'],
        'updated_at' => $row['updated_at']
    ];
}

$stmt->close();
$conn->close();

echo json_encode(['success' => true, 'friends' => $friends]);