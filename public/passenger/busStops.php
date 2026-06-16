<?php
require_once __DIR__ . '/auth_passenger.php';
require_once __DIR__ . '/../config/db.php';
$conn = db();
header('Content-Type: application/json; charset=utf-8');
try {
    $result = $conn->query("
        SELECT id, name, type, location_name, location_landmark, lat, lng
        FROM busStopsTerminal
        ORDER BY FIELD(type,'terminal','bus_stop','pickup_point'), name ASC
    ");
    $stops = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
    echo json_encode(['success' => true, 'stops' => $stops]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
exit;
