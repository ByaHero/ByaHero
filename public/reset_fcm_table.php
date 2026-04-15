<?php
require_once '../config/db_connection.php';
echo "<h2>FCM Token Table Reset</h2>";

// Drop old table
$conn->query("DROP TABLE IF EXISTS user_fcm_tokens");
echo "<p>Old table dropped.</p>";

// Create new table with correct schema
$sql = "CREATE TABLE user_fcm_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  fcm_token VARCHAR(255) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_token (fcm_token),
  INDEX idx_user (user_id)
)";

if ($conn->query($sql)) {
    echo "<p style='color:green;font-weight:bold;'>✅ New table created with UNIQUE(fcm_token) schema!</p>";
} else {
    echo "<p style='color:red;'>Error: " . $conn->error . "</p>";
}

echo "<p>Delete this file after running it once.</p>";
?>
