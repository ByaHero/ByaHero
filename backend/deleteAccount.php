<?php
session_start();

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    header("Location: ../public/login.php");
    exit;
}

require_once '../config/db_connection.php';

$userId = $_SESSION['user_id'];
$userEmail = $_SESSION['user_email'] ?? 'unknown';

try {
    // Begin transaction
    $conn->begin_transaction();
    
    // Log deletion attempt (before deleting analytics)
    try {
        $stmt = $conn->prepare("INSERT INTO analytics_events (user_id, event_type, event_data, page) VALUES (?, 'account_deleted', ?, ?)");
        $eventData = json_encode(['email' => $userEmail, 'timestamp' => date('Y-m-d H:i:s')]);
        $page = '/account_deletion';
        $stmt->bind_param("iss", $userId, $eventData, $page);
        $stmt->execute();
        $stmt->close();
    } catch (Exception $e) {
        // Continue even if logging fails
        error_log("Failed to log account deletion: " . $e->getMessage());
    }
    
    // Delete user settings
    $stmt = $conn->prepare("DELETE FROM user_settings WHERE user_id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $stmt->close();
    
    // Delete analytics events
    $stmt = $conn->prepare("DELETE FROM analytics_events WHERE user_id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $stmt->close();
    
    // Delete feedbacks
    $stmt = $conn->prepare("DELETE FROM feedbacks WHERE user_id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $stmt->close();
    
    // Delete user account (CASCADE should handle remaining foreign keys)
    $stmt = $conn->prepare("DELETE FROM users WHERE id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $stmt->close();
    
    // Commit transaction
    $conn->commit();
    
    // Destroy session
    session_unset();
    session_destroy();
    
    // Redirect to goodbye page
    header("Location: ../public/accountDeleted.php");
    exit;
    
} catch (Exception $e) {
    // Rollback transaction on error
    $conn->rollback();
    
    // Log error
    error_log("Account deletion failed for user $userId: " . $e->getMessage());
    
    // Set error message
    $_SESSION['error'] = "Failed to delete account. Please try again or contact support.";
    
    // Redirect back to account settings (FIXED PATH)
    header("Location: ../public/passenger/profile/accountSettings.php");
    exit;
}
?>