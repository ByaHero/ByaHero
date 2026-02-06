<?php
session_start();
require_once '../config/db_connection.php';

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'User not logged in']);
    exit;
}

$user_id = $_SESSION['user_id'];

// Get POST data
$setting_name = $_POST['setting_name'] ?? '';
$setting_value = $_POST['setting_value'] ?? '';

// Validate input
if (empty($setting_name)) {
    echo json_encode(['success' => false, 'message' => 'Invalid setting name']);
    exit;
}

// Allowed settings (whitelist for security)
$allowed_settings = [
    'notify_bus_schedule',
    'notify_bus_arrival',
    'notify_seat_availability',
    'text_size',
    'high_contrast_mode',
    'screen_reader_support',
    'share_location',
    'privacy_mode'
];

if (!in_array($setting_name, $allowed_settings)) {
    echo json_encode(['success' => false, 'message' => 'Invalid setting']);
    exit;
}

// Check if user settings exist
$check_stmt = $conn->prepare("SELECT id FROM user_settings WHERE user_id = ?");
$check_stmt->bind_param("i", $user_id);
$check_stmt->execute();
$check_result = $check_stmt->get_result();

if ($check_result->num_rows === 0) {
    // Create default settings first
    $insert_stmt = $conn->prepare("INSERT INTO user_settings (user_id) VALUES (?)");
    $insert_stmt->bind_param("i", $user_id);
    $insert_stmt->execute();
    $insert_stmt->close();
}
$check_stmt->close();

// Update setting using prepared statement with dynamic column
$stmt = $conn->prepare("UPDATE user_settings SET `$setting_name` = ? WHERE user_id = ?");
$stmt->bind_param("si", $setting_value, $user_id);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Setting updated successfully']);
} else {
    echo json_encode(['success' => false, 'message' => 'Failed to update setting']);
}

$stmt->close();
$conn->close();
?>