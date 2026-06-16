<?php
require_once __DIR__ . '/../auth_passenger.php';
$success = false;
$message = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_once '../../../config/db.php';
    try {
        $conn = db();
        $user_id = $_SESSION['user_id'] ?? 0;
        $type = $_POST['itemType'] ?? 'lost';
        $item_description = $_POST['description'] ?? '';
        $bus_number = $_POST['bus_number'] ?? null;
        if (trim((string)$bus_number) === '') {
            $bus_number = null;
        }
        $uploadDir = '../../../assets/images/uploads/lost_and_found/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }
        $image1_path = null;
        $image2_path = null;
        if (isset($_FILES['images']) && is_array($_FILES['images']['name'])) {
            $files = $_FILES['images'];
            for ($i = 0; $i < min(2, count($files['name'])); $i++) {
                if ($files['error'][$i] === UPLOAD_ERR_OK) {
                    $ext = strtolower(pathinfo($files['name'][$i], PATHINFO_EXTENSION));
                    $filename = uniqid('lf_') . '.' . $ext;
                    $dest = $uploadDir . $filename;
                    if (move_uploaded_file($files['tmp_name'][$i], $dest)) {
                        $dbPath = 'assets/images/uploads/lost_and_found/' . $filename;
                        if ($i === 0) {
                            $image1_path = $dbPath;
                        } else {
                            $image2_path = $dbPath;
                        }
                    }
                }
            }
        }
        $stmt = $conn->prepare("INSERT INTO `lost_and_found` (`user_id`, `type`, `item_description`, `image1_path`, `image2_path`, `bus_number`) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("isssss", $user_id, $type, $item_description, $image1_path, $image2_path, $bus_number);
        $stmt->execute();
        $success = true;
    } catch (Exception $e) {
        error_log("DB Insert Error (lost_and_found): " . $e->getMessage());
        $message = $e->getMessage();
    }
}
header('Content-Type: application/json; charset=utf-8');
echo json_encode(['success' => $success, 'message' => $message]);
exit;
