<?php
session_start();
header('Content-Type: application/json');

// --- 1. SETUP THE DEBUG LOG ---
$log_path = 'onesignal_debug.txt';
$time = date('H:i:s');
file_put_contents($log_path, "\n[$time] --- NEW REQUEST TRIGGERED ---\n", FILE_APPEND);

require_once '../config/db_connection.php';

// --- 2. CHECK THE SESSION ---
if (!isset($_SESSION['user_id'])) {
    file_put_contents($log_path, "[$time] ERROR: No user_id in session. Cookie was blocked or lost.\n", FILE_APPEND);
    echo json_encode(['success' => false, 'message' => 'Not logged in']);
    exit;
}

$userId = (int)$_SESSION['user_id'];
$input  = json_decode(file_get_contents('php://input'), true);
$playerId = trim($input['player_id'] ?? '');

file_put_contents($log_path, "[$time] Session User ID: $userId | Player ID received: " . ($playerId ?: 'EMPTY') . "\n", FILE_APPEND);

// --- 3. CHECK THE PAYLOAD ---
if ($playerId === '') {
    file_put_contents($log_path, "[$time] ERROR: player_id was empty.\n", FILE_APPEND);
    echo json_encode(['success' => false, 'message' => 'player_id required']);
    exit;
}

// --- 4. EXECUTE THE DATABASE INSERT ---
try {
    $stmt = $conn->prepare("INSERT INTO user_onesignal_tokens (user_id, player_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP");
    
    if (!$stmt) {
        file_put_contents($log_path, "[$time] DB PREPARE ERROR: " . $conn->error . "\n", FILE_APPEND);
    } else {
        $stmt->bind_param("is", $userId, $playerId);
        
        if ($stmt->execute()) {
             file_put_contents($log_path, "[$time] SUCCESS: Token successfully saved to database!\n", FILE_APPEND);
             echo json_encode(['success' => true]);
        } else {
             file_put_contents($log_path, "[$time] DB EXECUTE ERROR: " . $stmt->error . "\n", FILE_APPEND);
             echo json_encode(['success' => false, 'message' => 'DB execution failed']);
        }
        $stmt->close();
    }
} catch (Exception $e) {
    file_put_contents($log_path, "[$time] PHP EXCEPTION: " . $e->getMessage() . "\n", FILE_APPEND);
    echo json_encode(['success' => false, 'message' => 'DB error']);
}