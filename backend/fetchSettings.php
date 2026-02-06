<?php
session_start();
require_once '../config/db_connection.php';

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'User not logged in']);
    exit;
}

$user_id = $_SESSION['user_id'];

// Fetch user settings
$stmt = $conn->prepare("SELECT * FROM user_settings WHERE user_id = ?");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    $settings = $result->fetch_assoc();
    echo json_encode(['success' => true, 'settings' => $settings]);
} else {
    // Create default settings if none exist
    $stmt_insert = $conn->prepare("INSERT INTO user_settings (user_id) VALUES (?)");
    $stmt_insert->bind_param("i", $user_id);
    
    if ($stmt_insert->execute()) {
        // Return default settings
        echo json_encode(['success' => true, 'settings' => [
            'notify_bus_schedule' => 1,
            'notify_bus_arrival' => 1,
            'notify_seat_availability' => 1,
            'text_size' => 'medium',
            'high_contrast_mode' => 0,
            'screen_reader_support' => 0,
            'share_location' => 0,
            'privacy_mode' => 'public'
        ]]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to create default settings']);
    }
    $stmt_insert->close();
}

$stmt->close();
$conn->close();
?>