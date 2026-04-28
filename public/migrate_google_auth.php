<?php
require_once __DIR__ . '/../config/db_connection.php';

echo "<h2>Google Auth Migration</h2>";

try {
    // 1. Alter password column to allow NULL
    echo "Updating 'users' table to allow NULL passwords...<br>";
    $sql1 = "ALTER TABLE users MODIFY password VARCHAR(255) NULL";
    if ($conn->query($sql1)) {
        echo "<b style='color:green;'>Success:</b> Password column made nullable.<br>";
    } else {
        echo "<b style='color:red;'>Error:</b> " . $conn->error . "<br>";
    }

    // 2. Add auth_provider column
    echo "Adding 'auth_provider' column...<br>";
    $sql2 = "ALTER TABLE users ADD COLUMN auth_provider VARCHAR(50) DEFAULT 'local' AFTER email";
    if ($conn->query($sql2)) {
        echo "<b style='color:green;'>Success:</b> auth_provider column added.<br>";
    } else {
        // Will error if column already exists, that's fine
        echo "<b style='color:orange;'>Info:</b> auth_provider column may already exist. Note: " . $conn->error . "<br>";
    }

    // 3. Add google_id column
    echo "Adding 'google_id' column...<br>";
    $sql3 = "ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE DEFAULT NULL AFTER auth_provider";
    if ($conn->query($sql3)) {
        echo "<b style='color:green;'>Success:</b> google_id column added.<br>";
    } else {
        echo "<b style='color:orange;'>Info:</b> google_id column may already exist. Note: " . $conn->error . "<br>";
    }

} catch (Exception $e) {
    echo "<b style='color:red;'>Exception:</b> " . $e->getMessage() . "<br>";
}

echo "<br><a href='login.php'>Go to Login</a>";
$conn->close();
?>
