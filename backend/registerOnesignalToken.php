<?php
/**
 * registerOnesignalToken.php
 * Saves OneSignal player_id for the logged-in user.
 *
 * CRITICAL: session_start() MUST be the very first line
 * before any output or headers. Custom cookie params can break
 * session reading on some servers.
 */

// ⚠️ MUST BE FIRST LINE (before any output/headers)
session_start();

header('Content-Type: application/json');

// CORS support for Median WebView
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

// Debug logging
error_log('[registerOnesignalToken] session_id=' . session_id() 
    . ' | user_id=' . ($_SESSION['user_id'] ?? 'NONE')
    . ' | method=' . $_SERVER['REQUEST_METHOD']);

// Check if logged in
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode([
        'success'    => false,
        'message'    => 'Not logged in',
        'session_id' => session_id(),
    ]);
    error_log('[registerOnesignalToken] User not logged in. Session ID: ' . session_id());
    exit;
}

require_once __DIR__ . '/../config/db_connection.php';

$userId   = (int)$_SESSION['user_id'];
$playerId = '';

if (isset($_POST['player_id'])) {
    $playerId = trim((string)$_POST['player_id']);
} else {
    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true);
    if (is_array($input) && isset($input['player_id'])) {
        $playerId = trim((string)$input['player_id']);
    }
}

if ($playerId !== '' && !preg_match('/^[A-Za-z0-9_-]{8,255}$/', $playerId)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'invalid player_id format']);
    error_log('[registerOnesignalToken] Invalid player_id format');
    exit;
}

error_log('[registerOnesignalToken] user_id=' . $userId . ' | player_id=' . $playerId);

if ($playerId === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'player_id required']);
    error_log('[registerOnesignalToken] Empty player_id');
    exit;
}

try {
    // ── THE FIX: Token Stealing (Exclusive Device Ownership) ──
    // 1. Delete this specific device ID from ANY other user accounts 
    // to ensure the device only rings for the person currently logged in.
    $cleanStmt = $conn->prepare("DELETE FROM user_onesignal_tokens WHERE player_id = ? AND user_id != ?");
    $cleanStmt->bind_param("si", $playerId, $userId);
    $cleanStmt->execute();
    $cleanStmt->close();

    // 2. Now insert or safely update the token for the CURRENT user.
    $stmt = $conn->prepare(
        "INSERT INTO user_onesignal_tokens (user_id, player_id)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP"
    );
    
    if (!$stmt) {
        throw new Exception('Prepare failed: ' . $conn->error);
    }
    
    $stmt->bind_param("is", $userId, $playerId);
    
    if (!$stmt->execute()) {
        throw new Exception('Execute failed: ' . $stmt->error);
    }
    
    $stmt->close();

    error_log('[registerOnesignalToken] ✓ Token secured for current user only: user_id=' . $userId . ' | player_id=' . $playerId);

    echo json_encode([
        'success'   => true,
        'user_id'   => $userId,
        'player_id' => $playerId,
    ]);
} catch (Exception $e) {
    error_log('[registerOnesignalToken] DB error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'DB error: ' . $e->getMessage()
    ]);
}
?>