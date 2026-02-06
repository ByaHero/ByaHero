<?php
session_start();

// Destroy all session data
session_unset();
session_destroy();

// Clear any session cookies
if (isset($_COOKIE[session_name()])) {
    setcookie(session_name(), '', time() - 3600, '/');
}

// Redirect to passenger index (accessibility settings persist in localStorage)
header("Location: passenger/index.php");
exit;
?>