<?php
require_once __DIR__ . '/../config/db.php';

try {
    $pdo = db();
    $pdo->exec("ALTER TABLE password_resets ADD COLUMN role VARCHAR(50) DEFAULT 'users'");
    echo "Successfully added role column.\n";
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
        echo "Column already exists.\n";
    } else {
        echo "Error: " . $e->getMessage() . "\n";
    }
}
?>
