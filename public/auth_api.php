<?php
session_start();
require __DIR__ . '/config/db.php';
header('Content-Type: application/json');

$action = $_POST['action'] ?? '';
$response = ['success' => false, 'message' => 'Invalid action'];

try {
    $pdo = db();

    if ($action === 'login') {
        $email = trim($_POST['email'] ?? '');
        $password = $_POST['password'] ?? '';
        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if ($user && password_verify($password, $user['password'])) {
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['user_name'] = $user['name'];
            $_SESSION['user_role'] = $user['role'];
            
            // Check role and set redirect URL if necessary
            $redirect = null;
            if (in_array($user['role'], ['conductor', 'driver'])) {
                $redirect = 'conductor.php';
            }

            $response = [
                'success' => true, 
                'message' => 'Login successful',
                'redirect' => $redirect
            ];
        } else {
            $response['message'] = 'Invalid email or password.';
        }
    } 
    elseif ($action === 'signup') {
        $name = trim($_POST['name'] ?? '');
        $email = trim($_POST['email'] ?? '');
        $password = $_POST['password'] ?? '';
        $confirm = $_POST['confirm_password'] ?? '';

        if ($password !== $confirm) {
            $response['message'] = 'Passwords do not match.';
        } else {
            $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
            $stmt->execute([$email]);
            if ($stmt->fetch()) {
                $response['message'] = 'Email already registered.';
            } else {
                $hashed = password_hash($password, PASSWORD_DEFAULT);
                $stmt = $pdo->prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'passenger')");
                if ($stmt->execute([$name, $email, $hashed])) {
                    $response = ['success' => true, 'message' => 'Account created! Please login.'];
                } else {
                    $response['message'] = 'Database error.';
                }
            }
        }
    }
    elseif ($action === 'update_profile' && isset($_SESSION['user_id'])) {
        $name = trim($_POST['name'] ?? '');
        if ($name) {
            $stmt = $pdo->prepare("UPDATE users SET name = ? WHERE id = ?");
            $stmt->execute([$name, $_SESSION['user_id']]);
            $_SESSION['user_name'] = $name;
            $response = ['success' => true, 'message' => 'Profile updated.'];
        }
    }
    elseif ($action === 'change_password' && isset($_SESSION['user_id'])) {
        $current = $_POST['current_password'] ?? '';
        $new = $_POST['new_password'] ?? '';
        $confirm = $_POST['confirm_password'] ?? '';
        
        if ($new !== $confirm) {
            $response['message'] = 'New passwords do not match.';
        } else {
            $stmt = $pdo->prepare("SELECT password FROM users WHERE id = ?");
            $stmt->execute([$_SESSION['user_id']]);
            $user = $stmt->fetch();
            if ($user && password_verify($current, $user['password'])) {
                $hashed = password_hash($new, PASSWORD_DEFAULT);
                $stmt = $pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
                $stmt->execute([$hashed, $_SESSION['user_id']]);
                $response = ['success' => true, 'message' => 'Password changed.'];
            } else {
                $response['message'] = 'Incorrect current password.';
            }
        }
    }
} catch (Exception $e) {
    $response['message'] = 'Server error: ' . $e->getMessage();
}
echo json_encode($response);