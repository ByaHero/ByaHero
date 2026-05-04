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

if (!$data || empty($data['bus_id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing bus_id']);
    exit;
}

$busId = (int)$data['bus_id'];
$route = $data['route'] ?? 'Unknown';
$startLocation = $data['location_name'] ?? 'Unknown';

$pdo = db();

// Check if user is already on a ride (ongoing)
$check = $pdo->prepare("SELECT id FROM passenger_rides WHERE user_id = ? AND status = 'ongoing' LIMIT 1");
$check->execute([$userId]);
if ($check->fetch()) {
    echo json_encode(['success' => true, 'message' => 'Already on a ride']);
    exit;
}

try {
    $stmt = $pdo->prepare("INSERT INTO passenger_rides (user_id, bus_id, route, boarded_at, start_location, status) VALUES (?, ?, ?, NOW(), ?, 'ongoing')");
    $stmt->execute([$userId, $busId, $route, $startLocation]);
    
    echo json_encode(['success' => true, 'message' => 'Boarded successfully']);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
