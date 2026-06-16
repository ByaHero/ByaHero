<?php
@session_start();
require_once __DIR__ . '/../../config/db.php';
header('Content-Type: application/json; charset=utf-8');

if (isset($_GET['stopped']) && $_GET['stopped'] == '1') {
    unset($_SESSION['current_bus']);
}

if (!isset($_SESSION['user_id']) || !in_array($_SESSION['user_role'] ?? '', ['conductor', 'driver'])) {
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

$conn = db();
$userId = (int)($_SESSION['user_id'] ?? 0);
$userName = $_SESSION['user_name'] ?? 'User';

// Auto-resume check
$currentBusId = 0;
$stmt = $conn->prepare("SELECT current_bus_id FROM conductors WHERE id = ? LIMIT 1");
if ($stmt) {
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $currentBusId = isset($row['current_bus_id']) ? (int)$row['current_bus_id'] : 0;
    $stmt->close();
}

$autoResume = false;
if ($currentBusId > 0) {
    $stmtBus = $conn->prepare("SELECT Bus_ID FROM busses WHERE Bus_ID = ? AND current_conductor_id = ? LIMIT 1");
    if ($stmtBus) {
        $stmtBus->bind_param("ii", $currentBusId, $userId);
        $stmtBus->execute();
        if ($stmtBus->get_result()->fetch_assoc()) {
            $autoResume = true;
        }
        $stmtBus->close();
    }
}

echo json_encode([
    'success' => true,
    'user_id' => $userId,
    'user_name' => $userName,
    'current_bus_id' => $currentBusId,
    'auto_resume' => $autoResume
]);
exit;
