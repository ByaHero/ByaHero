<?php
session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/../config/db.php';
$pdo = db();

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$userId = $_SESSION['user_id'];
$data = json_decode(file_get_contents('php://input'), true);
$busId = isset($data['busId']) ? (int)$data['busId'] : 0;

if ($busId <= 0) {
    echo json_encode(['success' => false, 'message' => 'Invalid bus ID']);
    exit;
}

try {
    // 1. Get the current active operation for this bus
    $stmt = $pdo->prepare("SELECT id, route FROM bus_operations WHERE bus_id = ? AND status = 'active' ORDER BY id DESC LIMIT 1");
    $stmt->execute([$busId]);
    $operation = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$operation) {
        echo json_encode(['success' => false, 'message' => 'Bus is not currently tracking']);
        exit;
    }

    $operationId = $operation['id'];
    $route = $operation['route'];

    // 2. Check if the user is already on an active ride
    $stmt = $pdo->prepare("SELECT id, bus_id FROM passenger_rides WHERE user_id = ? AND status = 'active' LIMIT 1");
    $stmt->execute([$userId]);
    $currentRide = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($currentRide) {
        if ($currentRide['bus_id'] == $busId) {
            // Already on this bus
            echo json_encode(['success' => true, 'message' => 'Already boarded', 'operationId' => $operationId]);
            exit;
        } else {
            // On another bus, mark as completed (auto-depart from previous)
            $stmt = $pdo->prepare("UPDATE passenger_rides SET status = 'completed', departed_at = NOW() WHERE id = ?");
            $stmt->execute([$currentRide['id']]);
        }
    }

    // 3. Create the new ride record
    $stmt = $pdo->prepare("INSERT INTO passenger_rides (user_id, operation_id, bus_id, route, boarded_at, status) VALUES (?, ?, ?, ?, NOW(), 'active')");
    $stmt->execute([$userId, $operationId, $busId, $route]);

    echo json_encode([
        'success' => true, 
        'message' => 'Successfully boarded',
        'operationId' => $operationId,
        'route' => $route
    ]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
