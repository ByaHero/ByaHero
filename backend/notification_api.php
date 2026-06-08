<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
@session_start();

include_once __DIR__ . '/../config/db.php';

function respond(bool $ok, string $msg = '', array $extra = []): void {
    echo json_encode(array_merge(['success' => $ok, 'message' => $msg], $extra));
    exit;
}

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    respond(false, 'Not logged in');
}

$userId = (int)$_SESSION['user_id'];
$action = $_GET['action'] ?? $_POST['action'] ?? '';

try {
    $conn = db();

    switch ($action) {
        case 'get_unread_count':
            $stmt = $conn->prepare("SELECT COUNT(*) FROM notifications WHERE user_id = ? AND read_at IS NULL");
            $stmt->bind_param("i", $userId);
            $stmt->execute();
            $count = 0;
            $stmt->bind_result($count);
            $stmt->fetch();
            respond(true, '', ['unread' => (int)$count]);
            break;

        case 'get_unread_status':
            $hasUnread = false;
            // Notifications
            $stmt = $conn->prepare("SELECT 1 FROM notifications WHERE user_id = ? AND read_at IS NULL LIMIT 1");
            $stmt->bind_param("i", $userId);
            $stmt->execute();
            if ($stmt->get_result()->fetch_assoc()) $hasUnread = true;

            // SOS Alerts
            if (!$hasUnread) {
                $stmt = $conn->prepare("SELECT 1 FROM sos_alerts WHERE recipient_user_id = ? AND status = 'active' LIMIT 1");
                $stmt->bind_param("i", $userId);
                $stmt->execute();
                if ($stmt->get_result()->fetch_assoc()) $hasUnread = true;
            }
            respond(true, '', ['has_unread' => $hasUnread]);
            break;

        case 'get_notifications':
            $stmt = $conn->prepare("SELECT id, type, title, message, meta, created_at, read_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50");
            $stmt->bind_param("i", $userId);
            $stmt->execute();
            $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
            respond(true, '', ['notifications' => $rows]);
            break;

        case 'mark_read':
            $notifId = (int)($_POST['id'] ?? 0);
            if ($notifId > 0) {
                $stmt = $conn->prepare("UPDATE notifications SET read_at = NOW() WHERE id = ? AND user_id = ?");
                $stmt->bind_param("ii", $notifId, $userId);
                $stmt->execute();
            } else {
                $stmt = $conn->prepare("UPDATE notifications SET read_at = NOW() WHERE user_id = ? AND read_at IS NULL");
                $stmt->bind_param("i", $userId);
                $stmt->execute();
            }
            respond(true, 'Marked as read');
            break;

        case 'create':
            $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
            $type = trim((string)($input['type'] ?? ''));
            $title = trim((string)($input['title'] ?? ''));
            $message = trim((string)($input['message'] ?? ''));
            $dedupeKey = trim((string)($input['dedupe_key'] ?? ''));
            $meta = $input['meta'] ?? null;

            if ($type === '' || $title === '' || $message === '' || $dedupeKey === '') {
                respond(false, 'Missing required fields');
            }

            $metaJson = $meta !== null ? (is_string($meta) ? $meta : json_encode($meta)) : null;
            $stmt = $conn->prepare("INSERT IGNORE INTO notifications (user_id, type, title, message, meta, dedupe_key) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("isssss", $userId, $type, $title, $message, $metaJson, $dedupeKey);
            $ok = $stmt->execute();
            respond($ok, $ok ? 'Notification created' : 'Failed to create');
            break;

        default:
            respond(false, 'Invalid action');
    }
} catch (Throwable $e) {
    error_log($e->getMessage());
    respond(false, 'Server error');
}
