<?php
session_start();
header('Content-Type: application/json');

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

require_once '../config/db_connection.php';

$userId = $_SESSION['user_id'];
$userEmail = $_SESSION['user_email'] ?? '';

try {
    // Log the data download request
    $stmt = $conn->prepare("
        INSERT INTO analytics_events (user_id, event_type, event_data, page, created_at) 
        VALUES (?, 'feature_used', ?, '/dataDownload', NOW())
    ");
    $eventData = json_encode(['feature' => 'Data Download Requested', 'email' => $userEmail]);
    $stmt->bind_param("is", $userId, $eventData);
    $stmt->execute();
    $stmt->close();
    
    // In a real implementation, you would:
    // 1. Queue a background job to prepare the data
    // 2. Generate a ZIP file with all user data
    // 3. Send an email with the download link
    
    // For now, we'll just log the request
    echo json_encode([
        'success' => true,
        'message' => 'Data download request submitted successfully'
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Failed to process request: ' . $e->getMessage()
    ]);
}
?>