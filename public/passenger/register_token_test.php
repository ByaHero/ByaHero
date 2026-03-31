<?php
declare(strict_types=1);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/db.php'; // uses db(): PDO

function respond(int $status, array $payload): void {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

function validPlayerId(string $id): bool {
    // UUID-ish or OneSignal subscription id formats
    return (bool) preg_match('/^[A-Za-z0-9\-_]{8,191}$/', $id);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, [
        'success' => false,
        'code' => 'METHOD_NOT_ALLOWED',
        'retryable' => false,
        'message' => 'Use POST.'
    ]);
}

$userId = $_SESSION['user_id'] ?? null;
if (!$userId || !is_numeric((string)$userId) || (int)$userId <= 0) {
    respond(401, [
        'success' => false,
        'code' => 'AUTH_REQUIRED',
        'retryable' => true,
        'message' => 'Not logged in.'
    ]);
}
$userId = (int)$userId;

$raw = file_get_contents('php://input');
$data = json_decode($raw ?: '', true);

if (!is_array($data)) {
    respond(400, [
        'success' => false,
        'code' => 'INVALID_JSON',
        'retryable' => false,
        'message' => 'Invalid JSON body.'
    ]);
}

$playerId = trim((string)($data['player_id'] ?? ''));
if ($playerId === '') {
    respond(422, [
        'success' => false,
        'code' => 'PLAYER_ID_REQUIRED',
        'retryable' => false,
        'message' => 'player_id is required.'
    ]);
}
if (!validPlayerId($playerId)) {
    respond(422, [
        'success' => false,
        'code' => 'PLAYER_ID_INVALID',
        'retryable' => false,
        'message' => 'Invalid player_id format.'
    ]);
}

try {
    $pdo = db();
    $pdo->beginTransaction();

    // Ensure table exists with expected columns (safe no-op if already there)
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS user_onesignal_tokens (
            id INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id INT(10) UNSIGNED NOT NULL,
            player_id VARCHAR(191) NOT NULL,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_player_id (player_id),
            KEY idx_user_id (user_id),
            KEY idx_user_active (user_id, is_active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    ");

    // Check if token exists globally
    $q = $pdo->prepare("
        SELECT id, user_id, is_active
        FROM user_onesignal_tokens
        WHERE player_id = :player_id
        LIMIT 1
    ");
    $q->execute([':player_id' => $playerId]);
    $existing = $q->fetch(PDO::FETCH_ASSOC);

    if ($existing) {
        $existingId = (int)$existing['id'];
        $existingUserId = (int)$existing['user_id'];

        // Reassign or refresh existing token row
        $u = $pdo->prepare("
            UPDATE user_onesignal_tokens
            SET user_id = :user_id,
                is_active = 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
        ");
        $u->execute([
            ':user_id' => $userId,
            ':id' => $existingId
        ]);

        // Optional: deactivate other tokens for same user? keep multi-device = no
        // $pdo->prepare("UPDATE user_onesignal_tokens SET is_active=0 WHERE user_id=:u AND id<>:id")
        //     ->execute([':u' => $userId, ':id' => $existingId]);

        $pdo->commit();

        respond(200, [
            'success' => true,
            'code' => ($existingUserId === $userId ? 'ALREADY_REGISTERED' : 'REGISTERED_REASSIGNED'),
            'retryable' => false,
            'message' => ($existingUserId === $userId)
                ? 'Token already registered.'
                : 'Token reassigned to current user.',
            'user_id' => $userId,
            'player_id' => $playerId
        ]);
    }

    // Insert new token
    $ins = $pdo->prepare("
        INSERT INTO user_onesignal_tokens (user_id, player_id, is_active)
        VALUES (:user_id, :player_id, 1)
    ");
    $ins->execute([
        ':user_id' => $userId,
        ':player_id' => $playerId
    ]);

    $pdo->commit();

    respond(201, [
        'success' => true,
        'code' => 'REGISTERED',
        'retryable' => false,
        'message' => 'Token registered.',
        'user_id' => $userId,
        'player_id' => $playerId
    ]);

} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log('[registerOnesignalToken] ' . $e->getMessage());

    // Keep message generic to client, detailed in server logs
    respond(500, [
        'success' => false,
        'code' => 'DB_ERROR',
        'retryable' => true,
        'message' => 'Database error while registering token.'
    ]);
}