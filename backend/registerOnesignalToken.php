<?php
/**
 * registerOnesignalToken.php
 * Saves the OneSignal player_id for the currently logged-in user.
 *
 * KEY FIX: Use plain session_start() — no custom cookie params.
 * Custom params (especially secure:true) cause PHP to start a NEW
 * session instead of reading the existing login session, making
 * $_SESSION['user_id'] always empty here even when logged in.
 */

session_start();
header('Content-Type: application/json');

// Allow Median WebView to send credentials cross-origin if needed
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
}

// Handle CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Not logged in
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Not logged in']);
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