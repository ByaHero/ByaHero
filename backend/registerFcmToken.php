<?php
/**
 * registerFcmToken.php
 * Saves FCM device token for the logged-in user.
 *
 * CRITICAL: session_start() MUST be the very first line
 * before any output or headers.
 */

session_start();
header('Content-Type: application/json');

// CORS support
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode([
        'success'    => false,
        'message'    => 'Not logged in',
        'session_id' => session_id(),
    ]);
    exit;
}

require_once '../config/db_connection.php';

// Auto-migration: ensure the table exists
$conn->query("CREATE TABLE IF NOT EXISTS user_fcm_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  fcm_token VARCHAR(255) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY (user_id),
  INDEX idx_token (fcm_token)
)");

$userId   = (int)$_SESSION['user_id'];
$input    = json_decode(file_get_contents('php://input'), true);
$fcmToken = trim($input['fcm_token'] ?? '');

if ($fcmToken === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'fcm_token required']);
    exit;
}

try {
    // 1. Delete this specific device token from ANY other user accounts
    $cleanStmt = $conn->prepare("DELETE FROM user_fcm_tokens WHERE fcm_token = ? AND user_id != ?");
    $cleanStmt->bind_param("si", $fcmToken, $userId);
    $cleanStmt->execute();
    $cleanStmt->close();

    // 2. Insert or update the token for the CURRENT user.
    $stmt = $conn->prepare(
        "INSERT INTO user_fcm_tokens (user_id, fcm_token)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE fcm_token = VALUES(fcm_token), updated_at = CURRENT_TIMESTAMP"
    );
    
    if (!$stmt) throw new Exception('Prepare failed: ' . $conn->error);
    
    $stmt->bind_param("is", $userId, $fcmToken);
    if (!$stmt->execute()) throw new Exception('Execute failed: ' . $stmt->error);
    $stmt->close();

    echo json_encode([
        'success'   => true,
        'user_id'   => $userId,
        'fcm_token' => $fcmToken,
    ]);
} catch (Exception $e) {
    error_log('[registerFcmToken] DB error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'DB error: ' . $e->getMessage()]);
}
?>
