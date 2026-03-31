<?php
session_start();

// 1. Erase the user's push notification connection BEFORE destroying the session
if (isset($_SESSION['user_id'])) {
    // Make sure to adjust this path if your db connection file is named differently!
    require_once '../config/db_connection.php'; 
    
    try {
        $userId = (int)$_SESSION['user_id'];
        
        // Delete all token associations for this user so they stop receiving pushes
        $stmt = $conn->prepare("DELETE FROM user_onesignal_tokens WHERE user_id = ?");
        if ($stmt) {
            $stmt->bind_param("i", $userId);
            $stmt->execute();
            $stmt->close();
        }
    } catch (Exception $e) {
        // We log the error but don't stop the script, so the user still gets logged out
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

// 4. Redirect to passenger index (accessibility settings persist in localStorage)
$host     = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' ? 'https' : 'http')
          . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost');
// Resolve the app base so the redirect works in both root and subdirectory installs
$script   = $_SERVER['SCRIPT_NAME'] ?? '/public/logout.php';
$base     = preg_replace('~/public/.*$~', '', $script); // e.g. '' or '/byahero'
header('Location: ' . $host . $base . '/public/passenger/index.php');
exit;
?>