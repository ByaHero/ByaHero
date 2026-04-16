<?php
require_once __DIR__ . '/../config/db_connection.php';

echo "<h2>ByaHero Database Migration</h2>";

// Check if profile_picture column exists
$checkColumn = $conn->query("SHOW COLUMNS FROM users LIKE 'profile_picture'");

if ($checkColumn->num_rows == 0) {
    echo "Adding 'profile_picture' column to 'users' table...<br>";
    $sql = "ALTER TABLE users ADD COLUMN profile_picture VARCHAR(255) DEFAULT NULL AFTER name";
    
    if ($conn->query($sql)) {
        echo "<b style='color:green;'>Success:</b> Column added successfully.<br>";
    } else {
        echo "<b style='color:red;'>Error:</b> Failed to add column: " . $conn->error . "<br>";
    }
} else {
    echo "Column 'profile_picture' already exists in 'users' table.<br>";
}

echo "<br><a href='passenger/profile/profile.php'>Go to Profile</a>";

$conn->close();
?>
