<?php
@session_start();
require_once '../config/db.php';
$conn = db();

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'User not logged in']);
    exit;
}

$user_id = $_SESSION['user_id'];
$rating = $_POST['rating'] ?? '';
$feedback_text = $_POST['feedback'] ?? '';

// Validate rating
if (empty($rating) || intval($rating) < 1) {
    echo json_encode(['success' => false, 'message' => 'Please select at least 1 star rating']);
    exit;
}

// Insert feedback with rating
$stmt = $conn->prepare("INSERT INTO feedbacks (user_id, rating, feedback_text) VALUES (?, ?, ?)");
$stmt->bind_param("iss", $user_id, $rating, $feedback_text);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Feedback submitted successfully']);
} else {
    echo json_encode(['success' => false, 'message' => 'Failed to submit feedback: ' . $stmt->error]);
}

$stmt->close();
$conn->close();
?>