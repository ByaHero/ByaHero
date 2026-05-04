<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/db.php';
session_start();

header('Content-Type: application/json');

if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

$userId = (int)$_SESSION['user_id'];
$data = json_decode(file_get_contents('php://input'), true);

$pdo = db();

$endLocation = $data['location_name'] ?? 'Unknown';

try {
    // Mark the ongoing ride as completed
    $stmt = $pdo->prepare("UPDATE passenger_rides SET departed_at = NOW(), end_location = ?, status = 'completed' WHERE user_id = ? AND status = 'ongoing'");
    $stmt->execute([$endLocation, $userId]);
    
    echo json_encode(['success' => true, 'message' => 'Departed successfully']);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
