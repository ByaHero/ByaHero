<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
@session_start();

require_once __DIR__ . '/../config/db.php';

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
        case 'fetch':
            $stmt = $conn->prepare("SELECT * FROM user_settings WHERE user_id = ?");
            $stmt->bind_param("i", $userId);
            $stmt->execute();
            $result = $stmt->get_result();
            if ($row = $result->fetch_assoc()) {
                respond(true, '', ['settings' => $row]);
            } else {
                // Insert default settings
                $ins = $conn->prepare("INSERT IGNORE INTO user_settings (user_id) VALUES (?)");
                $ins->bind_param("i", $userId);
                $ins->execute();
                
                // Return defaults
                respond(true, '', ['settings' => [
                    'notify_bus_schedule' => 1,
                    'notify_bus_arrival' => 1,
                    'notify_seat_availability' => 1,
                    'text_size' => 'medium',
                    'high_contrast_mode' => 0,
                    'screen_reader_support' => 0,
                    'share_location' => 0,
                    'privacy_mode' => 'public',
                    'location_services' => 1,
                    'tracking_enabled' => 0,
                    'stolen_device_protection' => 0
                ]]);
            }
            break;

        case 'update':
            $name = $_POST['setting_name'] ?? $_GET['setting_name'] ?? $_POST['setting'] ?? $_GET['setting'] ?? '';
            $val = $_POST['setting_value'] ?? $_GET['setting_value'] ?? $_POST['value'] ?? $_GET['value'] ?? '';

            $allowed = [
                'notify_bus_schedule', 'notify_bus_arrival', 'notify_seat_availability',
                'text_size', 'high_contrast_mode', 'screen_reader_support',
                'share_location', 'privacy_mode', 'location_services',
                'tracking_enabled', 'stolen_device_protection'
            ];

            if (!in_array($name, $allowed, true)) {
                respond(false, 'Invalid setting name');
            }

            // Ensure settings row exists
            $conn->query("INSERT IGNORE INTO user_settings (user_id) VALUES ($userId)");

            $stmt = $conn->prepare("UPDATE user_settings SET `$name` = ? WHERE user_id = ?");
            $stmt->bind_param("si", $val, $userId);
            if ($stmt->execute()) {
                respond(true, 'Setting updated');
            } else {
                respond(false, 'Update failed');
            }
            break;

        case 'get_privacy':
            $stmt = $conn->prepare("SELECT location_services, share_location, tracking_enabled, stolen_device_protection FROM user_settings WHERE user_id = ?");
            $stmt->bind_param("i", $userId);
            $stmt->execute();
            $res = $stmt->get_result()->fetch_assoc();
            respond(true, '', ['settings' => $res ?: [
                'location_services' => 1,
                'share_location' => 0,
                'tracking_enabled' => 0,
                'stolen_device_protection' => 0
            ]]);
            break;

        case 'get_share_location':
            $stmt = $conn->prepare("SELECT share_location FROM user_settings WHERE user_id = ?");
            $stmt->bind_param("i", $userId);
            $stmt->execute();
            $res = $stmt->get_result()->fetch_assoc();
            respond(true, '', ['share_location' => (int)($res['share_location'] ?? 0)]);
            break;

        default:
            respond(false, 'Invalid action');
    }

} catch (Throwable $e) {
    error_log($e->getMessage());
    respond(false, 'Server error');
}
