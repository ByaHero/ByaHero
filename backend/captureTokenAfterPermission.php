<?php
/**
 * captureTokenAfterPermission.php
 * Triggered after user grants notification permission
 * Helps ensure OneSignal token is captured
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
$input = json_decode(file_get_contents('php://input'), true);
$playerId = trim($input['player_id'] ?? '');

// Log the permission grant event
try {
    $stmt = $conn->prepare(
        "INSERT INTO analytics_events (user_id, event_type, event_data, page)
         VALUES (?, 'notification_permission_granted', ?, '/notifications')"
    );
    
    $eventData = json_encode([
        'player_id' => $playerId,
        'timestamp' => date('Y-m-d H:i:s'),
        'platform' => $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown'
    ]);
    
    $stmt->bind_param("is", $userId, $eventData);
    $stmt->execute();
    $stmt->close();
    
    // Update permission status
    $stmt = $conn->prepare(
        "INSERT INTO user_settings (user_id, notification_permission, permission_requested_at)
         VALUES (?, 'granted', NOW())
         ON DUPLICATE KEY UPDATE 
         notification_permission = 'granted',
         permission_requested_at = NOW()"
    );
    
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $stmt->close();
    
    error_log("[captureTokenAfterPermission] user_id=$userId | player_id=$playerId");
    
    echo json_encode([
        'success' => true,
        'message' => 'Permission granted and token captured'
    ]);
    
} catch (Exception $e) {
    error_log('captureTokenAfterPermission error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error'
    ]);
}
?>