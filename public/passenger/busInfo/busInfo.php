<?php
require_once __DIR__ . '/../auth_passenger.php';
require_once __DIR__ . '/../../../config/db.php';
$conn = db();
$stops = [];
$schedules = [];
try {
    $result = $conn->query("SELECT stop_id, location_name FROM bus_stops ORDER BY km_marker ASC");
    $stops = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
    $resSched = $conn->query("SELECT terminal_name, time_open, time_close, is_suspended, suspend_message FROM bus_schedule ORDER BY terminal_name ASC");
    $schedules = $resSched ? $resSched->fetch_all(MYSQLI_ASSOC) : [];
} catch (Throwable $e) {
    error_log("Database error: " . $e->getMessage());
}
header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'success' => true,
    'stops' => $stops,
    'schedules' => $schedules
]);
exit;
