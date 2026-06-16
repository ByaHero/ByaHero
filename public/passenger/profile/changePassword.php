<?php
require_once __DIR__ . '/../auth_passenger.php';
require_once '../../../config/db.php';
$conn = db();
$userId = $_SESSION['user_id'];
$message = '';
$error = '';

$stmt = $conn->prepare("SELECT password FROM users WHERE id = ?");
$stmt->bind_param("i", $userId);
$stmt->execute();
$res = $stmt->get_result();
$userData = $res->fetch_assoc();
$stmt->close();

$hasPassword = !empty($userData['password']);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if ($input) {
        $_POST = array_merge($_POST, $input);
    }
    
    $currentPassword = $_POST['current_password'] ?? '';
    $newPassword = $_POST['new_password'] ?? '';
    $confirmPassword = $_POST['confirm_password'] ?? '';
    
    if ($hasPassword && empty($currentPassword)) {
        $error = "Current password is required.";
    } elseif (empty($newPassword) || empty($confirmPassword)) {
        $error = "New password fields are required.";
    } elseif (strlen($newPassword) < 6) {
        $error = "New password must be at least 6 characters long.";
    } elseif ($newPassword !== $confirmPassword) {
        $error = "New passwords do not match.";
    } else {
        if ($hasPassword && !password_verify($currentPassword, $userData['password'])) {
            $error = "Current password is incorrect.";
        } else {
            $newPasswordHash = password_hash($newPassword, PASSWORD_DEFAULT);
            $stmt = $conn->prepare("UPDATE users SET password = ? WHERE id = ?");
            $stmt->bind_param("si", $newPasswordHash, $userId);
            if ($stmt->execute()) {
                $message = $hasPassword ? "Password changed successfully!" : "Password set successfully!";
                $hasPassword = true;
                $stmt->close();
                try {
                    $stmt = $conn->prepare("INSERT INTO analytics_events (user_id, event_type, event_data, page) VALUES (?, 'setting_changed', ?, ?)");
                    $eventData = json_encode(['setting' => 'Password', 'value' => 'Changed/Set']);
                    $page = '/profile/changePassword';
                    $stmt->bind_param("iss", $userId, $eventData, $page);
                    $stmt->execute();
                    $stmt->close();
                } catch (Exception $e) {
                    error_log("Analytics error: " . $e->getMessage());
                }
            } else {
                $error = "Failed to update password. Please try again.";
                $stmt->close();
            }
        }
    }
}

header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'success' => empty($error),
    'message' => $message,
    'error' => $error,
    'hasPassword' => $hasPassword
]);
exit;
