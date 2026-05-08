<?php
declare(strict_types=1);
session_start();

require_once __DIR__ . '/../../config/db.php';
$conn = db();

$userId = isset($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : 0;

if ($userId > 0) {
    // Free any buses currently assigned to this conductor
    $stmt = $conn->prepare("
        UPDATE busses
        SET 
            current_location = NULL,
            status = 'unavailable',
            route = NULL,
            seat_availability = NULL,
            updated = NULL,
            current_conductor_id = NULL
        WHERE current_conductor_id = ?
    ");
    $stmt->bind_param("i", $userId);
    $stmt->execute();

    // Clear conductor's current_bus_id
    $stmt2 = $conn->prepare("
        UPDATE conductors
        SET current_bus_id = NULL
        WHERE id = ?
    ");
    $stmt2->bind_param("i", $userId);
    $stmt2->execute();
}

// Now do your existing logout cleanup
$_SESSION = [];
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params["path"], $params["domain"],
        $params["secure"], $params["httponly"]
    );
}
session_destroy();
header('Location: ../passenger/index.php');
exit;