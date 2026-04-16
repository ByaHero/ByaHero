<?php
// Set global timezone to Philippine Time
date_default_timezone_set('Asia/Manila');

// Auto-detect if running on localhost or CLI
$is_localhost = (PHP_SAPI === 'cli' || $_SERVER['REMOTE_ADDR'] === '127.0.0.1' || $_SERVER['REMOTE_ADDR'] === '::1');

if ($is_localhost) {
    // Localhost Settings (XAMPP/WAMP)
    define('DB_HOST', '127.0.0.1');
    define('DB_USER', 'root');
    define('DB_PASS', '');
    define('DB_NAME', 'byahero');
} else {
    // InfinityFree Settings
    define('DB_HOST', 'sql311.infinityfree.com'); // Check your client area for the exact SQL Host
    define('DB_USER', 'if0_41271108');
    define('DB_PASS', 'Bb1ToMvkTf');
    define('DB_NAME', 'if0_41271108_byahero'); // Usually starts with your username
}

// Create connection
$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

// Check connection
if ($conn->connect_error) {
    die(json_encode([
        'success' => false,
        'message' => 'Database connection failed: ' . $conn->connect_error
    ]));
}

$conn->set_charset("utf8mb4");
?>