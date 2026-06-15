<?php
@session_start();

// 1. Remove ONLY the FCM token for this specific device (not all devices)
// 1. Remove ONLY the FCM token for this specific device (not all devices)
require_once '../config/db.php';
$conn = db();

try {
    // The navbar sends the device's active token via POST
    $fcmToken = trim($_POST['fcm_token'] ?? '');
    if ($fcmToken === '') {
        $input = json_decode(file_get_contents('php://input'), true);
        $fcmToken = trim($input['fcm_token'] ?? '');
    }

    if ($fcmToken !== '') {
        if (isset($_SESSION['user_id'])) {
            $userId = (int)$_SESSION['user_id'];
            // Device-specific delete: only removes this device's token for this user
            $stmt = $conn->prepare("DELETE FROM user_fcm_tokens WHERE user_id = ? AND fcm_token = ?");
            if ($stmt) {
                $stmt->bind_param("is", $userId, $fcmToken);
                $stmt->execute();
                $stmt->close();
            }
        } else {
            // Session lost/absent: delete the device token unconditionally to unregister the device
            $stmt = $conn->prepare("DELETE FROM user_fcm_tokens WHERE fcm_token = ?");
            if ($stmt) {
                $stmt->bind_param("s", $fcmToken);
                $stmt->execute();
                $stmt->close();
            }
        }
    }
} catch (Exception $e) {
    error_log("[Logout] Token cleanup failed: " . $e->getMessage());
}

// 2. Destroy all session data
session_unset();
session_destroy();

// 3. Clear any session cookies
if (isset($_COOKIE[session_name()])) {
    setcookie(session_name(), '', time() - 3600, '/');
}

// 4. Redirect to login page
header("Location: login.php?action=logout");
exit;
?>