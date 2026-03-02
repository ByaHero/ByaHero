<?php
declare(strict_types=1);

function db(): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;

    $is_localhost = ($_SERVER['REMOTE_ADDR'] === '127.0.0.1' || $_SERVER['REMOTE_ADDR'] === '::1');

    if ($is_localhost) {
        $host = '127.0.0.1';
        $user = 'root';
        $pass = '';
        $dbname = 'byahero';
    } else {
        $host = 'sql304.infinityfree.com'; // Update this to match your hosting panel
        $user = 'if0_41271108';
        $pass = 'Bb1ToMvkTf';
        $dbname = 'if0_41271108_byahero'; 
    }

    $dsn = "mysql:host={$host};dbname={$dbname};charset=utf8mb4";
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    return $pdo;
}