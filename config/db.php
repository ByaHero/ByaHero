<?php
declare(strict_types=1);

// Set global timezone to Philippine Time
date_default_timezone_set('Asia/Manila');

// CORS Support & Session Cookie Security Configuration for HTTPS Environments
(function() {
    // 1. Dynamic CORS Headers for Credentials support (essential for cross-origin Capacitor/WebView app)
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if (!empty($origin)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Access-Control-Allow-Credentials: true');
    }
    
    // Always permit typical headers and methods for ByaHero API requests
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS'])) {
        header('Access-Control-Allow-Headers: ' . $_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']);
    } else {
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Cookie');
    }
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE');

    // Handle preflight OPTIONS requests immediately
    if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }

    // 2. Secure & Cross-Origin Session Cookie Setup (essential for HTTPS proxying)
    if (session_status() === PHP_SESSION_NONE) {
        // Disable session garbage collection to prevent "Permission Denied" notices on free hosting environments
        ini_set('session.gc_probability', '0');

        $is_https = (isset($_SERVER['HTTPS']) && ($_SERVER['HTTPS'] === 'on' || $_SERVER['HTTPS'] === 1))
            || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https')
            || (isset($_SERVER['HTTP_FRONT_END_HTTPS']) && $_SERVER['HTTP_FRONT_END_HTTPS'] === 'on')
            || (isset($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443);

        if ($is_https) {
            // Over HTTPS, session cookies must be Secure and SameSite=None so they work cross-origin in Capacitor/WebView
            if (PHP_VERSION_ID >= 70300) {
                session_set_cookie_params([
                    'lifetime' => 0,
                    'path' => '/',
                    'domain' => '',
                    'secure' => true,
                    'httponly' => true,
                    'samesite' => 'None'
                ]);
            } else {
                session_set_cookie_params(0, '/; SameSite=None; Secure', '', true, true);
            }
        }
    }
})();


function db(): mysqli {
    static $conn = null;
    if ($conn instanceof mysqli) return $conn;

    require_once __DIR__ . '/bootstrap.php';

    // Fall back to standard DB_* and any loaded .env / custom variables
    $env_host = get_env_config('DB_HOST', '');
    $env_user = get_env_config('DB_USER', '');
    $env_pass = get_env_config('DB_PASS', '');
    $env_name = get_env_config('DB_NAME', '');
    $env_port = (int)get_env_config('DB_PORT', '3306');

    $is_cli = (php_sapi_name() === 'cli');
    $host_addr = $_SERVER['REMOTE_ADDR'] ?? '';
    
    // Use localhost fallback ONLY if running locally, and database host is not defined in environments
    $is_localhost = ($is_cli || $host_addr === '127.0.0.1' || $host_addr === '::1');

    if ($is_localhost && empty($env_host)) {
        $host = '127.0.0.1';
        $user = 'root';
        $pass = '';
        $dbname = 'byahero';
        $port = 3306;
    } else {
        $host = $env_host;
        $user = $env_user;
        $pass = $env_pass;
        $dbname = $env_name;
        $port = $env_port;
    }

    $conn = new mysqli($host, $user, $pass, $dbname, $port);

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