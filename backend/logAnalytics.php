<?php
session_start();
header('Content-Type: application/json');

// Check if analytics is enabled
$analyticsEnabled = true; // Default

if (isset($_SESSION['user_id'])) {
    // Check database for logged-in users
    require_once '../config/db_connection.php';
    $userId = $_SESSION['user_id'];
    
    $stmt = $conn->prepare("SELECT analytics_enabled FROM user_settings WHERE user_id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        $settings = $result->fetch_assoc();
        $analyticsEnabled = $settings['analytics_enabled'] == 1;
    }
    $stmt->close();
}

// Check localStorage value sent from client
$input = json_decode(file_get_contents('php://input'), true);
if (isset($input['analytics_enabled'])) {
    $analyticsEnabled = $analyticsEnabled && $input['analytics_enabled'];
}

if (!$analyticsEnabled) {
    echo json_encode(['success' => true, 'message' => 'Analytics disabled']);
    exit;
}

// Log the event
require_once '../config/db_connection.php';

$userId = $_SESSION['user_id'] ?? null;
$eventType = $input['event_type'] ?? 'unknown';
$eventData = json_encode($input['event_data'] ?? []);
$page = $input['page'] ?? $_SERVER['HTTP_REFERER'] ?? 'unknown';
$userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
$ipAddress = $_SERVER['REMOTE_ADDR'] ?? '';

$stmt = $conn->prepare("INSERT INTO analytics_events (user_id, event_type, event_data, page, user_agent, ip_address) VALUES (?, ?, ?, ?, ?, ?)");
$stmt->bind_param("isssss", $userId, $eventType, $eventData, $page, $userAgent, $ipAddress);

if ($stmt->execute()) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'message' => 'Failed to log event']);
}

$stmt->close();
$conn->close();
?>