<?php
require_once __DIR__ . '/../auth_passenger.php';
require_once __DIR__ . '/../../../config/db.php';
$conn = db();
$userId = $_SESSION['user_id'];
$message = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'update_profile') {
    $name = trim($_POST['name'] ?? '');
    $email = trim($_POST['email'] ?? '');
    
    $stmt = $conn->prepare("SELECT profile_picture FROM users WHERE id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $userData = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    
    if (empty($name)) {
        $error = "Name is required.";
    } elseif (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $error = "Valid email is required.";
    } else {
        $stmt = $conn->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
        $stmt->bind_param("si", $email, $userId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            $error = "Email is already in use by another account.";
        } else {
            $conn->begin_transaction();
            try {
                $stmt = $conn->prepare("UPDATE users SET name = ?, email = ? WHERE id = ?");
                $stmt->bind_param("ssi", $name, $email, $userId);
                $stmt->execute();
                $stmt->close();

                if (isset($_POST['remove_image']) && $_POST['remove_image'] === '1') {
                    if (!empty($userData['profile_picture'])) {
                        $oldPath = __DIR__ . '/../../../' . $userData['profile_picture'];
                        if (file_exists($oldPath)) {
                            @unlink($oldPath);
                        }
                        $updateImgStmt = $conn->prepare("UPDATE users SET profile_picture = NULL WHERE id = ?");
                        $updateImgStmt->bind_param("i", $userId);
                        $updateImgStmt->execute();
                        $updateImgStmt->close();
                        $userData['profile_picture'] = null;
                    }
                }
                elseif (isset($_POST['profile_image_data']) && !empty($_POST['profile_image_data'])) {
                    $imgData = $_POST['profile_image_data'];
                    if (strpos($imgData, 'data:image/') === 0) {
                        $updateImgStmt = $conn->prepare("UPDATE users SET profile_picture = ? WHERE id = ?");
                        $updateImgStmt->bind_param("si", $imgData, $userId);
                        $updateImgStmt->execute();
                        $updateImgStmt->close();
                        if (!empty($userData['profile_picture']) && strpos($userData['profile_picture'], 'data:') !== 0) {
                            $oldPath = __DIR__ . '/../../../' . $userData['profile_picture'];
                            if (file_exists($oldPath)) {
                                @unlink($oldPath);
                            }
                        }
                        $userData['profile_picture'] = $imgData;
                    } else {
                        throw new Exception("Invalid image data format.");
                    }
                }

                $conn->commit();
                
                $_SESSION['user_name'] = $name;
                $_SESSION['user_email'] = $email;
                $_SESSION['user_profile_picture'] = $userData['profile_picture'] ?? null;
                
                $message = "Profile updated successfully!";
            } catch (Exception $e) {
                $conn->rollback();
                $error = $e->getMessage();
            }
        }
    }
}

$stmt = $conn->prepare("SELECT name, email, profile_picture FROM users WHERE id = ?");
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
        'email' => $userData['email'] ?? '',
        'profile_picture' => $userData['profile_picture'] ?? ''
    ]
]);
exit;
