<?php
/**
 * ONE-TIME MIGRATION SCRIPT
 * Run this once on your InfinityFree server to create the passenger_rides table.
 * After running, please delete this file for security.
 */

require_once __DIR__ . '/../config/db.php';
$pdo = db();

try {
    $sql = "CREATE TABLE IF NOT EXISTS passenger_rides (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        operation_id INT UNSIGNED NOT NULL,
        bus_id INT NOT NULL,
        route VARCHAR(100) NOT NULL,
        boarded_at DATETIME NOT NULL,
        departed_at DATETIME DEFAULT NULL,
        status ENUM('active', 'completed') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user (user_id),
        INDEX idx_operation (operation_id),
        INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

    $pdo->exec($sql);
    echo "<div style='font-family: sans-serif; padding: 20px; color: green;'>
            <h2>✅ Migration Successful</h2>
            <p>The <b>passenger_rides</b> table has been created on your InfinityFree database.</p>
            <p style='color: red;'><b>IMPORTANT:</b> Please delete this file (<code>public/migrate_rides.php</code>) immediately for security.</p>
          </div>";
} catch (Exception $e) {
    echo "<div style='font-family: sans-serif; padding: 20px; color: red;'>
            <h2>❌ Migration Failed</h2>
            <p>Error: " . htmlspecialchars($e->getMessage()) . "</p>
          </div>";
}
