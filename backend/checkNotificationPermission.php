<?php
/**
 * checkNotificationPermission.php
 * Returns user's notification permission status
 */

session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Not logged in']);
    exit;
}

require_once '../config/db_connection.php';

$userId = (int)$_SESSION['user_id'];

try {
    // Check if user has notification permission tracked
    $stmt = $conn->prepare(
        "SELECT notification_permission, permission_requested_at 
         FROM user_settings 
         WHERE user_id = ?"
    );
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result && $result->num_rows > 0) {
        $row = $result->fetch_assoc();
        echo json_encode([
            'success' => true,
            'permission' => $row['notification_permission'] ?? 'prompt', // 'granted', 'denied', 'prompt'
            'requested_at' => $row['permission_requested_at']
        ]);
    } else {
        echo json_encode([
            'success' => true,
            'permission' => 'prompt',
            'requested_at' => null
        ]);
    }
    
    $stmt->close();
    
} catch (Exception $e) {
    error_log('checkNotificationPermission error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error'
    ]);
}
?>