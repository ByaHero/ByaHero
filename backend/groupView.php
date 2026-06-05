<?php
@session_start();
header('Content-Type: application/json');
require_once '../config/db.php';
$conn = db();

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Not logged in']);
    exit;
}

$userId = $_SESSION['user_id'];

// Find user’s circle (default: first one)
$circleStmt = $conn->prepare("SELECT id FROM circles WHERE owner_user_id = ? LIMIT 1");
$circleStmt->bind_param("i", $userId);
$circleStmt->execute();
$circleResult = $circleStmt->get_result();
$circle = $circleResult->fetch_assoc();
$circleStmt->close();

if (!$circle) {
    echo json_encode(['success' => true, 'friends' => []]);
    exit;
}

$circleId = $circle['id'];

// Check column names in passenger_rides to support both production and local dev schemas
$hasOperationId = false;
$columnsResult = $conn->query("SHOW COLUMNS FROM passenger_rides LIKE 'operation_id'");
if ($columnsResult && $columnsResult->num_rows > 0) {
    $hasOperationId = true;
}

if ($hasOperationId) {
    $joinSql = "
        LEFT JOIN passenger_rides pr ON pr.user_id = u.id AND pr.status = 'active'
        LEFT JOIN bus_operations bo ON bo.id = pr.operation_id
        LEFT JOIN busses b ON b.Bus_ID = bo.bus_id
    ";
} else {
    $joinSql = "
        LEFT JOIN passenger_rides pr ON pr.user_id = u.id AND pr.status = 'ongoing'
        LEFT JOIN busses b ON b.Bus_ID = pr.bus_id
    ";
}

// Fetch members + latest location + waiting & boarded status
$sql = "
    SELECT 
        u.id,
        u.name,
        u.email,
        u.profile_picture,
        ul.latitude,
        ul.longitude,
        ul.accuracy,
        ul.updated_at,
        wp.location_name AS waiting_location,
        wp.status AS waiting_status,
        pr.status AS ride_status,
        b.code AS boarded_bus_code
    FROM circle_members cm
    JOIN users u ON u.id = cm.user_id
    LEFT JOIN user_locations ul ON ul.user_id = u.id
    LEFT JOIN waiting_passengers wp ON wp.user_id = u.id AND wp.status = 'waiting'
    $joinSql
    WHERE cm.circle_id = ?
    ORDER BY u.name ASC
";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $circleId);
$stmt->execute();
$result = $stmt->get_result();

$friends = [];
while ($row = $result->fetch_assoc()) {
    // Normalize ride status 'ongoing' to 'active' for frontend compatibility
    $rideStatus = $row['ride_status'];
    if ($rideStatus === 'ongoing') {
        $rideStatus = 'active';
    }

    $friends[] = [
        'id' => (int)$row['id'],
        'name' => $row['name'],
        'email' => $row['email'],
        'profile_picture' => $row['profile_picture'] ?? null,
        'latitude' => $row['latitude'],
        'longitude' => $row['longitude'],
        'accuracy' => $row['accuracy'],
        'updated_at' => $row['updated_at'],
        'waiting_location' => $row['waiting_location'] ?? null,
        'waiting_status' => $row['waiting_status'] ?? null,
        'ride_status' => $rideStatus,
        'boarded_bus_code' => $row['boarded_bus_code'] ?? null
    ];
}

$stmt->close();
$conn->close();

echo json_encode(['success' => true, 'friends' => $friends]);