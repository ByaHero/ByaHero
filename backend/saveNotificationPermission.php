<?php
/**
 * saveNotificationPermission.php
 * Saves user's notification permission choice
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
$permission = trim($input['permission'] ?? '');

// Validate permission value
if (!in_array($permission, ['granted', 'denied', 'prompt'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid permission value']);
    exit;
}

try {
    // Update or insert user settings
    $stmt = $conn->prepare(
        "INSERT INTO user_settings (user_id, notification_permission, permission_requested_at)
         VALUES (?, ?, NOW())
         ON DUPLICATE KEY UPDATE 
         notification_permission = VALUES(notification_permission),
         permission_requested_at = NOW()"
    );
    
    $stmt->bind_param("is", $userId, $permission);
    
    if (!$stmt->execute()) {
        throw new Exception('Execute failed: ' . $stmt->error);
    }
    
    error_log("[saveNotificationPermission] user_id=$userId | permission=$permission");
    
    echo json_encode([
        'success' => true,
        'message' => 'Permission saved'
    ]);
    
    $stmt->close();
    
} catch (Exception $e) {
    error_log('saveNotificationPermission error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error'
    ]);
}
?>