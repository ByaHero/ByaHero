<?php
// Try local DB directly
try {
    $conn = new mysqli('127.0.0.1', 'root', '', 'byahero', 3306);
    if ($conn->connect_error) {
        throw new Exception($conn->connect_error);
    }
} catch (Throwable $e) {
    // If that fails, try using db() default
    try {
        require 'config/db.php';
        $conn = db();
    } catch (Throwable $ex) {
        die(json_encode(['success' => false, 'error' => $ex->getMessage()]));
    }
}

$data = [];

// 1. Fetch busStopsTerminal
try {
    $res = $conn->query("SELECT id, name, type, location_name, location_landmark, lat, lng, route FROM busStopsTerminal ORDER BY name ASC");
    $data['stops'] = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];
} catch(Throwable $e) {
    $data['stops'] = [];
}

// 2. Fetch bus_schedule
try {
    $res = $conn->query("SELECT terminal_name, time_open, time_close, is_suspended, suspend_message FROM bus_schedule ORDER BY terminal_name ASC");
    $data['schedules'] = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];
} catch(Throwable $e) {
    $data['schedules'] = [];
}

// 3. Fetch bus_stops
try {
    $res = $conn->query("SELECT stop_id, location_name, km_marker, lat, lng FROM bus_stops ORDER BY km_marker ASC");
    $data['bus_stops'] = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];
} catch(Throwable $e) {
    $data['bus_stops'] = [];
}

echo json_encode($data, JSON_PRETTY_PRINT);
