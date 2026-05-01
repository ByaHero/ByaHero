<?php
// Set global timezone to Philippine Time
date_default_timezone_set('Asia/Manila');

require_once __DIR__ . '/bootstrap.php';
$is_localhost = (PHP_SAPI === 'cli' || (isset($_SERVER['REMOTE_ADDR']) && ($_SERVER['REMOTE_ADDR'] === '127.0.0.1' || $_SERVER['REMOTE_ADDR'] === '::1')));

if ($is_localhost) {
    // Localhost Settings (XAMPP/WAMP)
    define('DB_HOST', '127.0.0.1');
    define('DB_USER', 'root');
    define('DB_PASS', '');
    define('DB_NAME', 'byahero');
} else {
    // InfinityFree Settings
    define('DB_HOST', get_env_config('DB_HOST', ''));
    define('DB_USER', get_env_config('DB_USER', ''));
    define('DB_PASS', get_env_config('DB_PASS', ''));
    define('DB_NAME', get_env_config('DB_NAME', ''));
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

// Ensure MySQL session is also in GMT+8
$conn->query("SET time_zone = '+08:00'");
?>