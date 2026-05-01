<?php
session_start();

// 1. Remove ONLY the FCM token for this specific device (not all devices)
if (isset($_SESSION['user_id'])) {
    require_once '../config/db_connection.php';

    try {
        $userId   = (int)$_SESSION['user_id'];
        // The navbar sends the device's active token via POST
        $fcmToken = trim($_POST['fcm_token'] ?? '');

        if ($fcmToken !== '') {
            // Device-specific delete: only removes this device's token
            $stmt = $conn->prepare("DELETE FROM user_fcm_tokens WHERE user_id = ? AND fcm_token = ?");
            if ($stmt) {
                $stmt->bind_param("is", $userId, $fcmToken);
                $stmt->execute();
                $stmt->close();
            }
        }
        // If no token was sent (e.g. a direct GET request or very old client),
        // we intentionally do NOT delete all tokens — other devices keep their tokens.
    } catch (Exception $e) {
        error_log("[Logout] Token cleanup failed: " . $e->getMessage());
    }
}

// 2. Destroy all session data
session_unset();
session_destroy();

// 3. Clear any session cookies
if (isset($_COOKIE[session_name()])) {
    setcookie(session_name(), '', time() - 3600, '/');
}

// 4. Redirect to login page
header("Location: passenger/index.php");
exit;
?>