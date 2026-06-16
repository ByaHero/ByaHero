<?php
@session_start();
require_once __DIR__ . '/../../config/db.php';

if (!isset($_SESSION['user_id']) || !in_array($_SESSION['user_role'] ?? '', ['conductor', 'driver'])) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

$conn = db();
$userId = (int)($_SESSION['user_id'] ?? 0);
$success = true;
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && !empty($_POST['bus_id'])) {
    $busId = (int)$_POST['bus_id'];
    $code = htmlspecialchars($_POST['code'] ?? ("BUS-" . $busId), ENT_QUOTES, 'UTF-8');
    $route = htmlspecialchars($_POST['route'] ?? '', ENT_QUOTES, 'UTF-8');
    $seats_total = (int)($_POST['seats_total'] ?? 25);
    $initial_available_seats = isset($_POST['initial_available_seats']) ? (int)$_POST['initial_available_seats'] : $seats_total;
    $pre_departure_count = isset($_POST['pre_departure_count']) ? (int)$_POST['pre_departure_count'] : 0;

    $checkStmt = $conn->prepare("SELECT current_conductor_id FROM busses WHERE Bus_ID = ?");
    $checkStmt->bind_param("i", $busId);
    $checkStmt->execute();
    $resCheck = $checkStmt->get_result();
    $busOwner = ($resCheck && $resCheck->num_rows > 0) ? $resCheck->fetch_row()[0] : false;

    if ($busOwner !== false && $busOwner !== null && $busOwner != $userId) {
        unset($_SESSION['current_bus']);
        $success = false;
        $error = 'bus_taken';
    } else {
        $stmt = $conn->prepare("UPDATE busses SET current_conductor_id = ? WHERE Bus_ID = ?");
        $stmt->bind_param("ii", $userId, $busId);
        $stmt->execute();
        
        $stmt2 = $conn->prepare("UPDATE conductors SET current_bus_id = ? WHERE id = ?");
        $stmt2->bind_param("ii", $busId, $userId);
        $stmt2->execute();

        $_SESSION['current_bus'] = [
            'id'          => $busId,
            'code'        => $code,
            'route'       => $route,
            'seats_total' => $seats_total,
            'seats_available' => $initial_available_seats,
            'pre_departure_count' => $pre_departure_count,
            'is_new_session' => true
        ];
    }
}

header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'success' => $success,
    'error' => $error,
    'current_bus' => $_SESSION['current_bus'] ?? null
]);
exit;
