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
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'resolve') {
    $ticketId = $_POST['ticket_id'] ?? null;
    if ($ticketId) {
        $stmt = $conn->prepare("UPDATE lost_and_found SET status = 'resolved' WHERE id = ? AND user_id = ? AND status = 'open'");
        $stmt->bind_param("ii", $ticketId, $userId);
        if ($stmt->execute()) {
            if ($stmt->affected_rows > 0) {
                $message = "Report successfully marked as resolved!";
            } else {
                $error = "Action failed. Either the report was already resolved or you lack permission.";
            }
        } else {
            $error = "A database error occurred while updating the status.";
        }
    }
}

$stmt = $conn->prepare("SELECT * FROM lost_and_found WHERE user_id = ? ORDER BY created_at DESC");
$stmt->bind_param("i", $userId);
$stmt->execute();
$res = $stmt->get_result();
$reports = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];

header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'success' => empty($error),
    'reports' => $reports,
    'message' => $message,
    'error' => $error
]);
exit;
