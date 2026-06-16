<?php
declare(strict_types=1);
require_once __DIR__ . '/../../../config/db.php';
@session_start();

if (!isset($_SESSION['user_id']) || !in_array($_SESSION['user_role'] ?? '', ['conductor', 'driver'])) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

$conn = db();
$userId = $_SESSION['user_id'];
$message = '';
$error = '';

$role = $_SESSION['user_role'] ?? '';
$table = $role === 'driver' ? 'drivers' : 'conductors';

// Handle POST profile update
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if ($input) {
        $_POST = array_merge($_POST, $input);
    }
    
    $name = trim($_POST['name'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $currentPassword = $_POST['current_password'] ?? '';
    $newPassword = $_POST['new_password'] ?? '';
    $confirmPassword = $_POST['confirm_password'] ?? '';

    $stmt = $conn->prepare("SELECT password, name, email FROM `{$table}` WHERE id = ? LIMIT 1");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $userData = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!empty($newPassword)) {
        if (empty($currentPassword)) {
            $error = "Current password is required to change password.";
        } elseif (!password_verify($currentPassword, $userData['password'])) {
            $error = "Current password is incorrect.";
        } elseif ($newPassword !== $confirmPassword) {
            $error = "New passwords do not match.";
        } elseif (strlen($newPassword) < 6) {
            $error = "Password must be at least 6 characters.";
        } else {
            $newPasswordHash = password_hash($newPassword, PASSWORD_DEFAULT);
            $stmt = $conn->prepare("UPDATE `{$table}` SET name = ?, email = ?, password = ? WHERE id = ?");
            $stmt->bind_param("sssi", $name, $email, $newPasswordHash, $userId);
            if ($stmt->execute()) {
                $message = "Profile and password updated successfully!";
            } else {
                $error = "Failed to update profile.";
            }
            $stmt->close();
        }
    } else {
        $stmt = $conn->prepare("UPDATE `{$table}` SET name = ?, email = ? WHERE id = ?");
        $stmt->bind_param("ssi", $name, $email, $userId);
        if ($stmt->execute()) {
            $message = "Profile updated successfully!";
        } else {
            $error = "Failed to update profile.";
        }
        $stmt->close();
    }
}

// Fetch fresh details
$stmt = $conn->prepare("SELECT name, email FROM `{$table}` WHERE id = ? LIMIT 1");
$stmt->bind_param("i", $userId);
$stmt->execute();
$userData = $stmt->get_result()->fetch_assoc();
$stmt->close();

header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'success' => empty($error),
    'message' => $message,
    'error' => $error,
    'user' => [
        'name' => $userData['name'] ?? '',
        'email' => $userData['email'] ?? ''
    ]
]);
exit;
