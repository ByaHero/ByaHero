<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Not logged in']);
    exit;
}

require_once '../config/db_connection.php';

$user_id = $_SESSION['user_id'];
$setting = $_POST['setting'] ?? '';
$value = $_POST['value'] ?? 0;

// Validate setting name
$allowed_settings = ['location_services', 'tracking_enabled', 'stolen_device_protection'];
if (!in_array($setting, $allowed_settings)) {
    echo json_encode(['success' => false, 'message' => 'Invalid setting']);
    exit;
}

// Check if user settings exist
$checkStmt = $conn->prepare("SELECT id FROM user_settings WHERE user_id = ?");
$checkStmt->bind_param("i", $user_id);
$checkStmt->execute();
$result = $checkStmt->get_result();

if ($result->num_rows === 0) {
    // Create new settings row with default values
    $insertStmt = $conn->prepare("INSERT INTO user_settings (user_id, $setting) VALUES (?, ?)");
    $insertStmt->bind_param("ii", $user_id, $value);
    
    if ($insertStmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Setting saved']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to save setting']);
    }
    $insertStmt->close();
} else {
    // Update existing settings
    $updateStmt = $conn->prepare("UPDATE user_settings SET $setting = ? WHERE user_id = ?");
    $updateStmt->bind_param("ii", $value, $user_id);
    
    if ($updateStmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Setting updated']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to update setting']);
    }
    $updateStmt->close();
}

$checkStmt->close();
$conn->close();
?>