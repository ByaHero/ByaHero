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

// CORS support - Allow app origins (including Capacitor mobile)
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$server_origin = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? '');
$allowed_origins = ['http://localhost', 'capacitor://localhost', $server_origin];

if (in_array($origin, $allowed_origins)) {
    header('Access-Control-Allow-Origin: ' . $origin);
} else {
    // Fallback to server origin if no match (standard security)
    header('Access-Control-Allow-Origin: ' . $server_origin);
}

header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: POST, OPTIONS');

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

require_once '../config/db.php';
$conn = db();

// Auto-migration: ensure the table exists
// UNIQUE on fcm_token (not user_id) so one user can have multiple devices
@$conn->query("CREATE TABLE IF NOT EXISTS user_fcm_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  fcm_token VARCHAR(255) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_token (fcm_token),
  INDEX idx_user (user_id)
)");

// Fix legacy schema: if old UNIQUE(user_id) exists, migrate to UNIQUE(fcm_token)
$legacyCheck = @$conn->query("SHOW INDEX FROM user_fcm_tokens WHERE Key_name = 'user_id'");
if ($legacyCheck && $legacyCheck->num_rows > 0) {
    @$conn->query("ALTER TABLE user_fcm_tokens DROP INDEX user_id");
    @$conn->query("ALTER TABLE user_fcm_tokens ADD UNIQUE KEY unique_token (fcm_token)");
}

$userId   = (int)$_SESSION['user_id'];
// Check standard POST first to bypass InfinityFree JSON filtering
$fcmToken = trim($_POST['fcm_token'] ?? '');

// Fallback to JSON payload if empty
if (empty($fcmToken)) {
    $input    = json_decode(file_get_contents('php://input'), true);
    $fcmToken = trim($input['fcm_token'] ?? '');
}
if ($fcmToken === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'fcm_token required']);
    exit;
}

try {
    // 1. If this device token was previously attached to a DIFFERENT user, reassign it
    $cleanStmt = $conn->prepare("DELETE FROM user_fcm_tokens WHERE fcm_token = ? AND user_id != ?");
    $cleanStmt->bind_param("si", $fcmToken, $userId);
    $cleanStmt->execute();
    $cleanStmt->close();

    // 2. Insert or update: keyed on fcm_token (unique per device)
    //    This allows the SAME user to have MULTIPLE devices registered.
    $stmt = $conn->prepare(
        "INSERT INTO user_fcm_tokens (user_id, fcm_token)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), updated_at = CURRENT_TIMESTAMP"
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
    echo json_encode(['success' => false, 'message' => 'Internal server error occurred.']);
}
?>
