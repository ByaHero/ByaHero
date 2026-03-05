<?php
declare(strict_types=1);
session_start();

/**
 * Conductor logout
 * - Clears session data
 * - Destroys session cookie
 * - Destroys session
 * - Redirects to login page
 *
 * NOTE: Preventing "back" is mostly handled by:
 * 1) Actually destroying the session (done here)
 * 2) Protecting conductor pages with session checks (you already do this)
 * 3) (Optional) Adding no-cache headers on protected pages
 */

// Clear all session variables
$_SESSION = [];

// Remove the session cookie (if used)
if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(
        session_name(),
        '',
        time() - 42000,
        $params['path'] ?? '/',
        $params['domain'] ?? '',
        (bool)($params['secure'] ?? false),
        (bool)($params['httponly'] ?? true)
    );
}

// Destroy the session
session_destroy();

// Redirect to login
header('Location: ../login.php');
exit;