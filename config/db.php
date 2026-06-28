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
        // Set session lifetime to 30 days (2592000 seconds)
        ini_set('session.gc_maxlifetime', '2592000');
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
                    'lifetime' => 2592000,
                    'path' => '/',
                    'domain' => '',
                    'secure' => true,
                    'httponly' => true,
                    'samesite' => 'None'
                ]);
            } else {
                session_set_cookie_params(2592000, '/; SameSite=None; Secure', '', true, true);
            }
        } else {
            // Over HTTP (e.g. localhost / developer testing)
            if (PHP_VERSION_ID >= 70300) {
                session_set_cookie_params([
                    'lifetime' => 2592000,
                    'path' => '/',
                    'domain' => '',
                    'secure' => false,
                    'httponly' => true
                ]);
            } else {
                session_set_cookie_params(2592000, '/', '', false, true);
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
    $is_localhost = ($is_cli || $host_addr === '127.0.0.1' || $host_addr === '::1' || strpos($host_addr, '192.168.') === 0 || strpos($host_addr, '10.') === 0);

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

// Dynamic Session Hydration for WebView/Capacitor cookie-less cross-origin environments
(function() {
    if (session_status() === PHP_SESSION_NONE) {
        @session_start();
    }
    
    if (!isset($_SESSION['user_id'])) {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $email = trim((string)($input['email'] ?? $_POST['email'] ?? $_GET['email'] ?? ''));
        if (!empty($email)) {
            try {
                $conn = db();
                $cleanEmail = mb_strtolower($email);
                $roleTables = [
                    'admin'     => 'admins',
                    'driver'    => 'drivers',
                    'conductor' => 'conductors',
                    'passenger' => 'users',
                ];
                foreach ($roleTables as $role => $table) {
                    $stmt = $conn->prepare("SELECT * FROM {$table} WHERE email = ? LIMIT 1");
                    if ($stmt) {
                        $stmt->bind_param("s", $cleanEmail);
                        $stmt->execute();
                        $db_user = $stmt->get_result()->fetch_assoc();
                        $stmt->close();
                        if ($db_user) {
                            $_SESSION['user_id'] = (int)$db_user['id'];
                            $_SESSION['user_email'] = $db_user['email'] ?? '';
                            $_SESSION['user_role'] = $role;
                            $_SESSION['user_name'] = $db_user['name'] ?? $db_user['email'] ?? '';
                            $_SESSION['user_contacts'] = $db_user['contacts'] ?? '';
                            $_SESSION['user_profile_picture'] = $db_user['profile_picture'] ?? null;
                            break;
                        }
                    }
                }
            } catch (\Throwable $ignore) {}
        }
    }
})();