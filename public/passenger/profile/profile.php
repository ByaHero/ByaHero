<?php
require_once __DIR__ . '/../auth_passenger.php';
require_once '../../../config/db.php';
$conn = db();
$userId = $_SESSION['user_id'];

// Get user profile stats
$totalRides = 0;
$totalWaitTimes = 0;
$totalIncidents = 0;
try {
    $stmt = $conn->prepare("SELECT COUNT(*) FROM passenger_rides WHERE passenger_id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $stmt->bind_result($totalRides);
    $stmt->fetch();
    $stmt->close();

    $stmt = $conn->prepare("SELECT COUNT(*) FROM waiting_passengers WHERE passenger_id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $stmt->bind_result($totalWaitTimes);
    $stmt->fetch();
    $stmt->close();

    $stmt = $conn->prepare("SELECT COUNT(*) FROM reports WHERE user_id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $stmt->bind_result($totalIncidents);
    $stmt->fetch();
    $stmt->close();
} catch (Exception $e) {
    error_log("Profile stats load issue: " . $e->getMessage());
}

header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'success' => true,
    'stats' => [
        'total_rides' => $totalRides,
        'total_waits' => $totalWaitTimes,
        'total_reports' => $totalIncidents
    ],
    'user' => [
        'name' => $_SESSION['user_name'] ?? 'User',
        'email' => $_SESSION['user_email'] ?? '',
        'profile_picture' => $_SESSION['user_profile_picture'] ?? ''
    ]
]);
exit;
