<?php
/**
 * auto-subscribe-check.php
 * Check subscription status and get debug info
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
    // Get all tokens for this user
    $stmt = $conn->prepare(
        "SELECT player_id, created_at, updated_at 
         FROM user_onesignal_tokens 
         WHERE user_id = ? 
         ORDER BY updated_at DESC"
    );
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $tokens = [];
    while ($row = $result->fetch_assoc()) {
        $tokens[] = [
            'player_id' => $row['player_id'],
            'created' => $row['created_at'],
            'updated' => $row['updated_at']
        ];
    }
    
    $stmt->close();

    // Get user subscription preference
    $stmt = $conn->prepare(
        "SELECT notification_permission, permission_requested_at 
         FROM user_settings 
         WHERE user_id = ?"
    );
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $settingsResult = $stmt->get_result();
    $settings = $settingsResult->fetch_assoc();
    $stmt->close();

    echo json_encode([
        'success' => true,
        'user_id' => $userId,
        'tokens' => $tokens,
        'token_count' => count($tokens),
        'subscribed' => count($tokens) > 0,
        'notification_permission' => $settings['notification_permission'] ?? 'unknown',
        'permission_requested_at' => $settings['permission_requested_at'] ?? null,
        'timestamp' => date('Y-m-d H:i:s')
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}
?>