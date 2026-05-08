<?php
session_start();
header('Content-Type: application/json');
require_once '../config/db.php';
$conn = db();

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Not logged in']);
    exit;
}

$userId = $_SESSION['user_id'];

$input = json_decode(file_get_contents('php://input'), true);
$lat = $input['latitude'] ?? null;
$lng = $input['longitude'] ?? null;
$accuracy = $input['accuracy'] ?? null;

if ($lat === null || $lng === null) {
    echo json_encode(['success' => false, 'message' => 'Latitude/longitude required']);
    exit;
}

// Optional: enforce share_location flag
$settingStmt = $conn->prepare("SELECT share_location FROM user_settings WHERE user_id = ?");
$settingStmt->bind_param("i", $userId);
$settingStmt->execute();
$settingResult = $settingStmt->get_result();
$setting = $settingResult->fetch_assoc();
$settingStmt->close();

if ($setting && (int)$setting['share_location'] !== 1) {
    echo json_encode(['success' => false, 'message' => 'Location sharing disabled']);
    exit;
}

// Generate the exact current local time in PHP
$currentTime = date('Y-m-d H:i:s');

// Explicitly insert and update the timestamp to force MySQL to register the activity
$stmt = $conn->prepare("
    INSERT INTO user_locations (user_id, latitude, longitude, accuracy, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
        latitude = VALUES(latitude),
        longitude = VALUES(longitude),
        accuracy = VALUES(accuracy),
        updated_at = VALUES(updated_at)
");

// Bind parameters: i (integer), d (double), d (double), i (integer), s (string)
$stmt->bind_param("iddis", $userId, $lat, $lng, $accuracy, $currentTime);

if ($stmt->execute()) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'message' => 'Failed to update location']);
}

$stmt->close();
$conn->close();