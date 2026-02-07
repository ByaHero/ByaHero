<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Not logged in']);
    exit;
}

require_once '../config/db_connection.php';

$user_id = $_SESSION['user_id'];

$stmt = $conn->prepare("SELECT location_services, tracking_enabled, analytics_enabled, stolen_device_protection FROM user_settings WHERE user_id = ?");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    $settings = $result->fetch_assoc();
    echo json_encode(['success' => true, 'settings' => $settings]);
} else {
    // Return defaults if no settings exist yet
    echo json_encode([
        'success' => true,
        'settings' => [
            'location_services' => 1,
            'tracking_enabled' => 0,
            'analytics_enabled' => 1,
            'stolen_device_protection' => 0
        ]
    ]);
}

$stmt->close();
$conn->close();
?>