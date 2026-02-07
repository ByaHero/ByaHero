<?php
session_start();

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    header("Location: ../public/login.php");
    exit;
}

require_once '../config/db_connection.php';

$userId = $_SESSION['user_id'];

try {
    // Begin transaction
    $conn->begin_transaction();
    
    // Delete user settings
    $stmt = $conn->prepare("DELETE FROM user_settings WHERE user_id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    
    // Delete analytics events
    $stmt = $conn->prepare("DELETE FROM analytics_events WHERE user_id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    
    // Delete feedbacks
    $stmt = $conn->prepare("DELETE FROM feedbacks WHERE user_id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    
    // Delete user account
    $stmt = $conn->prepare("DELETE FROM users WHERE id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    
    // Commit transaction
    $conn->commit();
    
    // Destroy session
    session_destroy();
    
    // Redirect to goodbye page
    header("Location: ../public/accountDeleted.php");
    exit;
    
} catch (Exception $e) {
    $conn->rollback();
    $_SESSION['error'] = "Failed to delete account. Please try again or contact support.";
    header("Location: ../public/passenger/passengerSettings/accountSettings.php");
    exit;
}
?>