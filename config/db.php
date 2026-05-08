<?php
declare(strict_types=1);

// Set global timezone to Philippine Time
date_default_timezone_set('Asia/Manila');

function db(): mysqli {
    static $conn = null;
    if ($conn instanceof mysqli) return $conn;

    require_once __DIR__ . '/bootstrap.php';

    $is_cli = (php_sapi_name() === 'cli');
    $host_addr = $_SERVER['REMOTE_ADDR'] ?? '';
    $is_localhost = $is_cli || ($host_addr === '127.0.0.1' || $host_addr === '::1');

    if ($is_localhost) {
        $host = '127.0.0.1';
        $user = 'root';
        $pass = '';
        $dbname = 'byahero';
    } else {
        $host = get_env_config('DB_HOST', '');
        $user = get_env_config('DB_USER', '');
        $pass = get_env_config('DB_PASS', '');
        $dbname = get_env_config('DB_NAME', '');
    }

    $conn = new mysqli($host, $user, $pass, $dbname);

    if ($conn->connect_error) {
        die(json_encode([
            'success' => false,
            'message' => 'Database connection failed: ' . $conn->connect_error
        ]));
    }

    $conn->set_charset("utf8mb4");

    // Automatic Schema Update (Sync local structure with InfinityFree)
    require_once __DIR__ . '/schema_init.php';
    sync_schema($conn);

    // Ensure MySQL session is also in GMT+8
    $conn->query("SET time_zone = '+08:00'");

    return $conn;
}