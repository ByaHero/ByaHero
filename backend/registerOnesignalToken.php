<?php
declare(strict_types=1);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json; charset=utf-8');

// Optional but recommended if frontend is same-origin only
// header('X-Content-Type-Options: nosniff');

require_once __DIR__ . '/../config/db.php'; // expects db(): PDO

function respond(int $status, array $payload): void {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

function is_valid_player_id(string $id): bool {
    // OneSignal IDs are typically UUID-like. Keep slightly permissive.
    // Accept letters, digits, dash, underscore; length guard.
    return (bool) preg_match('/^[A-Za-z0-9\-_]{8,128}$/', $id);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, [
        'success' => false,
        'code' => 'METHOD_NOT_ALLOWED',
        'retryable' => false,
        'message' => 'Use POST.'
    ]);
}

// Require login/session
$userId = $_SESSION['user_id'] ?? null;
if (!$userId || !is_numeric((string)$userId)) {
    respond(401, [
        'success' => false,
        'code' => 'AUTH_REQUIRED',
        'retryable' => true, // client may retry after login/session restore
        'message' => 'Not logged in.'
    ]);
}

// Parse JSON body
$raw = file_get_contents('php://input');
if ($raw === false || $raw === '') {
    respond(400, [
        'success' => false,
        'code' => 'EMPTY_BODY',
        'retryable' => false,
        'message' => 'Request body is empty.'
    ]);
}

$data = json_decode($raw, true);
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
if (!is_valid_player_id($playerId)) {
    respond(422, [
        'success' => false,
        'code' => 'PLAYER_ID_INVALID',
        'retryable' => false,
        'message' => 'player_id format is invalid.'
    ]);
}

try {
    $pdo = db();
    $pdo->beginTransaction();

    // Ensure table exists (safe if already created)
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS onesignal_tokens (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            player_id VARCHAR(191) NOT NULL,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_player_id (player_id),
            KEY idx_user_active (user_id, is_active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // 1) If token already belongs to this user and active -> idempotent success
    $q = $pdo->prepare("
        SELECT id, user_id, is_active
        FROM onesignal_tokens
        WHERE player_id = :player_id
        LIMIT 1
    ");
    $q->execute([':player_id' => $playerId]);
    $existing = $q->fetch(PDO::FETCH_ASSOC);

    if ($existing) {
        $existingUserId = (int)$existing['user_id'];
        $existingActive = (int)$existing['is_active'] === 1;

        if ($existingUserId === (int)$userId) {
            // Ensure active
            if (!$existingActive) {
                $u = $pdo->prepare("
                    UPDATE onesignal_tokens
                    SET is_active = 1, updated_at = NOW()
                    WHERE id = :id
                ");
                $u->execute([':id' => (int)$existing['id']]);
            }

            $pdo->commit();
            respond(200, [
                'success' => true,
                'code' => 'ALREADY_REGISTERED',
                'retryable' => false,
                'message' => 'Token already registered for this user.',
                'user_id' => (int)$userId,
                'player_id' => $playerId
            ]);
        }

        // Token exists but linked to another user:
        // Reassign token to current user (device/account switch case).
        $u = $pdo->prepare("
            UPDATE onesignal_tokens
            SET user_id = :user_id, is_active = 1, updated_at = NOW()
            WHERE id = :id
        ");
        $u->execute([
            ':user_id' => (int)$userId,
            ':id' => (int)$existing['id']
        ]);

        // Optional: deactivate other active tokens for this same user? (keep multiple devices by default)
        // If you prefer one-device-per-user, uncomment below:
        /*
        $d = $pdo->prepare("
            UPDATE onesignal_tokens
            SET is_active = 0, updated_at = NOW()
            WHERE user_id = :user_id AND player_id <> :player_id
        ");
        $d->execute([':user_id' => (int)$userId, ':player_id' => $playerId]);
        */

        $pdo->commit();
        respond(200, [
            'success' => true,
            'code' => 'REGISTERED_REASSIGNED',
            'retryable' => false,
            'message' => 'Token reassigned to current user.',
            'user_id' => (int)$userId,
            'player_id' => $playerId
        ]);
    }

    // 2) Insert new token
    $ins = $pdo->prepare("
        INSERT INTO onesignal_tokens (user_id, player_id, is_active, created_at)
        VALUES (:user_id, :player_id, 1, NOW())
    ");
    $ins->execute([
        ':user_id' => (int)$userId,
        ':player_id' => $playerId
    ]);

    // Optional one-device-per-user behavior (commented; multi-device is usually better)
    /*
    $d = $pdo->prepare("
        UPDATE onesignal_tokens
        SET is_active = 0, updated_at = NOW()
        WHERE user_id = :user_id AND player_id <> :player_id
    ");
    $d->execute([':user_id' => (int)$userId, ':player_id' => $playerId]);
    */

    $pdo->commit();

    respond(201, [
        'success' => true,
        'code' => 'REGISTERED',
        'retryable' => false,
        'message' => 'Token registered.',
        'user_id' => (int)$userId,
        'player_id' => $playerId
    ]);

} catch (PDOException $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    // Avoid leaking DB internals in prod response
    error_log('[registerOnesignalToken] PDOException: ' . $e->getMessage());

    // Usually transient-ish from client perspective
    respond(500, [
        'success' => false,
        'code' => 'DB_ERROR',
        'retryable' => true,
        'message' => 'Database error while registering token.'
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log('[registerOnesignalToken] Throwable: ' . $e->getMessage());

    respond(500, [
        'success' => false,
        'code' => 'SERVER_ERROR',
        'retryable' => true,
        'message' => 'Unexpected server error.'
    ]);
}