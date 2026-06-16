<?php
require_once __DIR__ . '/../auth_passenger.php';
require_once '../../../config/db.php';
$conn = db();
$userId = $_SESSION['user_id'];

$activities = [];
try {
    $stmt = $conn->prepare("
        SELECT id, event_type, event_data, page, created_at
        FROM analytics_events
        WHERE user_id = ? AND (event_type = 'login' OR event_type = 'logout' OR event_type = 'session_expired')
        ORDER BY created_at DESC
        LIMIT 20
    ");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $res = $stmt->get_result();
    $activities = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];
    $stmt->close();
} catch (Exception $e) {
    error_log("Analytics fetch error: " . $e->getMessage());
}

header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'success' => true,
    'activities' => $activities
]);
exit;
