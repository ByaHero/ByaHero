<?php
/**
 * registerOnesignalToken.php
 * ─────────────────────────────────────────────────────────────────────────
 * Called automatically by the Median JS bridge snippet in your app layout
 * whenever the app starts and OneSignal registers/refreshes the device token.
 *
 * Method : POST
 * Body   : { "player_id": "..." }
 * Auth   : session cookie (user must be logged in)
 * ─────────────────────────────────────────────────────────────────────────
 */

session_start();
header('Content-Type: application/json');
require_once '../config/db_connection.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Not logged in']);
    exit;
}

$userId = (int)$_SESSION['user_id'];
$input  = json_decode(file_get_contents('php://input'), true);
$playerId = trim($input['player_id'] ?? '');

if ($playerId === '') {
    echo json_encode(['success' => false, 'message' => 'player_id required']);
    exit;
}

try {
    // UPSERT: insert or update timestamp if already registered
    $stmt = $conn->prepare(
        "INSERT INTO user_onesignal_tokens (user_id, player_id)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP"
    );
    $stmt->bind_param("is", $userId, $playerId);
    $stmt->execute();
    $stmt->close();

    echo json_encode(['success' => true]);
} catch (Exception $e) {
    error_log("registerOnesignalToken error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'DB error']);
}