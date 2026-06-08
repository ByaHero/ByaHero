<?php
/**
 * auth_passenger.php
 * Centralized authentication and role-based access control for passenger pages.
 */

include_once __DIR__ . '/../../config/db.php';

if (session_status() === PHP_SESSION_NONE) {
    @session_start();
}

/**
 * Base URL detection for redirects
 */
$scriptName = $_SERVER['SCRIPT_NAME'] ?? '';
$publicDir = rtrim(str_replace('\\', '/', dirname($scriptName)), '/');
$baseUrl = preg_replace('~/public/.*$~', '', $publicDir) ?: '';

// 1. Check if logged in
if (!isset($_SESSION['user_id'])) {
    // Save the current URI for redirect after login
    $redirect = urlencode($_SERVER['REQUEST_URI']);
    header('Location: ' . $baseUrl . '/public/login.php?redirect=' . $redirect, true, 302);
    exit;
}

// 2. Check if the role is 'passenger'
if (($_SESSION['user_role'] ?? '') !== 'passenger') {
    // Unauthorized access: redirect to their respective dashboard
    $role = $_SESSION['user_role'] ?? '';
    $redirectPath = $baseUrl . '/public/login.php'; // Default

    if ($role === 'admin') {
        $redirectPath = $baseUrl . '/public/admin/admin.php';
    } elseif ($role === 'conductor') {
        $redirectPath = $baseUrl . '/public/conductor/conductor.php';
    } elseif ($role === 'driver') {
        $redirectPath = $baseUrl . '/public/driver/dashboard.php';
    }

    header('Location: ' . $redirectPath, true, 302);
    exit;
}
