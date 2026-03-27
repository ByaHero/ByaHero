<?php
/**
 * registerOnesignalToken.php
 * Saves the OneSignal player_id for the logged-in user.
 *
 * FIX: Added session_set_cookie_params() before session_start()
 * so the cookie is sent correctly on InfinityFree subdomains.
 */

// Allow cross-path session sharing on InfinityFree
ini_set('session.cookie_path', '/');
session_set_cookie_params([
    'lifetime' => 0,
    'path'     => '/',
    'secure'   => true,
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();

header('Content-Type: application/json');

// CORS header in case Median WebView treats it as cross-origin
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Headers: Content-Type');
}

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Debug: log session state (remove after fix is confirmed)
error_log('registerOnesignalToken: session_id=' . session_id()
    . ' user_id=' . ($_SESSION['user_id'] ?? 'NONE')
    . ' method=' . $_SERVER['REQUEST_METHOD']);

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

$userId   = (int)$_SESSION['user_id'];
$input    = json_decode(file_get_contents('php://input'), true);
$playerId = trim($input['player_id'] ?? '');

if ($playerId === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'player_id required']);
    exit;
}

try {
    $stmt = $conn->prepare(
        "INSERT INTO user_onesignal_tokens (user_id, player_id)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP"
    );
    $stmt->bind_param("is", $userId, $playerId);
    $stmt->execute();
    $stmt->close();

    echo json_encode([
        'success'   => true,
        'user_id'   => $userId,
        'player_id' => $playerId,
    ]);
} catch (Exception $e) {
    error_log('registerOnesignalToken DB error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'DB error']);
}