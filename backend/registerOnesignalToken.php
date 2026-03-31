<?php
declare(strict_types=1);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json; charset=utf-8');

// Optional: enable during debugging only
// ini_set('display_errors', '1');
// error_reporting(E_ALL);

function out(array $data, int $status = 200): void {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_SLASHES);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    out(['success' => false, 'message' => 'Method not allowed'], 405);
}

$raw = file_get_contents('php://input');
if ($raw === false) {
    out(['success' => false, 'message' => 'Failed to read request body'], 400);
}

$payload = json_decode($raw, true);
if (!is_array($payload)) {
    out(['success' => false, 'message' => 'Invalid JSON payload'], 400);
}

$playerId = trim((string)($payload['player_id'] ?? ''));
if ($playerId === '') {
    out(['success' => false, 'message' => 'Missing player_id'], 400);
}

// Make sure user is logged in
$userId = (int)($_SESSION['user_id'] ?? 0);
if ($userId <= 0) {
    out(['success' => false, 'message' => 'User not logged in (no session)'], 401);
}

// DB connection (PDO)
require_once __DIR__ . '/../config/db.php';

try {
    $pdo = db();

    // Create table if not exists (safe bootstrap)
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS onesignal_subscriptions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            player_id VARCHAR(191) NOT NULL UNIQUE,
            platform VARCHAR(50) DEFAULT 'android',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_user_id (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    // Upsert: same player_id updates user_id
    $stmt = $pdo->prepare("
        INSERT INTO onesignal_subscriptions (user_id, player_id, platform)
        VALUES (:user_id, :player_id, 'android')
        ON DUPLICATE KEY UPDATE
            user_id = VALUES(user_id),
            updated_at = CURRENT_TIMESTAMP
    ");
    $stmt->execute([
        ':user_id' => $userId,
        ':player_id' => $playerId
    ]);

    out([
        'success' => true,
        'message' => 'Token saved',
        'user_id' => $userId,
        'player_id' => $playerId
    ]);
} catch (Throwable $e) {
    error_log('[registerOnesignalToken] ' . $e->getMessage());
    out([
        'success' => false,
        'message' => 'Server error while saving token'
    ], 500);
}