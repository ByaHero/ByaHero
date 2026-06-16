<?php
require_once __DIR__ . '/../auth_passenger.php';
require_once '../../../config/db.php';
$conn = db();
$userId = $_SESSION['user_id'];
$message = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if ($input) {
        $_POST = array_merge($_POST, $input);
    }
    
    $password = $_POST['password'] ?? '';
    
    $stmt = $conn->prepare("SELECT password FROM users WHERE id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $res = $stmt->get_result();
    $userData = $res->fetch_assoc();
    $stmt->close();
    
    $hasPassword = !empty($userData['password']);
    
    if ($hasPassword && !password_verify($password, $userData['password'])) {
        $error = "Incorrect password. Verification failed.";
    } else {
        $conn->begin_transaction();
        try {
            $stmt = $conn->prepare("DELETE FROM analytics_events WHERE user_id = ?");
            $stmt->bind_param("i", $userId);
            $stmt->execute();
            $stmt->close();
            
            $stmt = $conn->prepare("DELETE FROM lost_and_found WHERE user_id = ?");
            $stmt->bind_param("i", $userId);
            $stmt->execute();
            $stmt->close();
            
            $stmt = $conn->prepare("DELETE FROM users WHERE id = ?");
            $stmt->bind_param("i", $userId);
            $stmt->execute();
            $stmt->close();
            
            $conn->commit();
            @session_destroy();
            $message = "Account successfully deleted.";
        } catch (Exception $e) {
            $conn->rollback();
            $error = $e->getMessage();
        }
    }
}

header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'success' => empty($error),
    'message' => $message,
    'error' => $error
]);
exit;
