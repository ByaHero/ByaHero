<?php
declare(strict_types=1);

// Set global timezone to Philippine Time
date_default_timezone_set('Asia/Manila');

function db(): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;

    $is_cli = (php_sapi_name() === 'cli');
    $is_localhost = $is_cli || (isset($_SERVER['REMOTE_ADDR']) && ($_SERVER['REMOTE_ADDR'] === '127.0.0.1' || $_SERVER['REMOTE_ADDR'] === '::1'));

    require_once __DIR__ . '/bootstrap.php';

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

    $dsn = "mysql:host={$host};dbname={$dbname};charset=utf8mb4";
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    // Ensure MySQL session is also in GMT+8
    $pdo->exec("SET time_zone = '+08:00'");

    return $pdo;
}