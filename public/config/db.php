<?php
declare(strict_types=1);

/**
 * Central PDO connection for XAMPP MySQL/MariaDB.
 * Database: byahero
 * Default XAMPP user: root (often blank password)
 *
 * Save as: public/config/db.php
 */
function db(): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;

    $host = '127.0.0.1';
    $dbname = 'byahero';
    $user = 'root';
    $pass = '';

    $dsn = "mysql:host={$host};dbname={$dbname};charset=utf8mb4";
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    return $pdo;
}