<?php
require_once '../config/db.php';
@session_start();
header('Content-Type: application/json');
$conn = db();

$input = json_decode(file_get_contents('php://input'), true) ?? [];

// Hydrate session if email is provided and session is missing (Capacitor/WebView context)
$email = trim((string)($input['email'] ?? $_POST['email'] ?? $_GET['email'] ?? ''));
if (!isset($_SESSION['user_id']) && !empty($email)) {
    $cleanEmail = mb_strtolower($email);
    $roleTables = [
        'admin'     => 'admins',
        'driver'    => 'drivers',
        'conductor' => 'conductors',
        'passenger' => 'users',
    ];
    foreach ($roleTables as $role => $table) {
        try {
            $stmt = $conn->prepare("SELECT * FROM {$table} WHERE email = ? LIMIT 1");
            if ($stmt) {
                $stmt->bind_param("s", $cleanEmail);
                $stmt->execute();
                $db_user = $stmt->get_result()->fetch_assoc();
                $stmt->close();
                if ($db_user) {
                    $_SESSION['user_id'] = (int)$db_user['id'];
                    $_SESSION['user_email'] = $db_user['email'] ?? '';
                    $_SESSION['user_role'] = $role;
                    $_SESSION['user_name'] = $db_user['name'] ?? $db_user['email'] ?? '';
                    $_SESSION['user_contacts'] = $db_user['contacts'] ?? '';
                    $_SESSION['user_profile_picture'] = $db_user['profile_picture'] ?? null;
                    break;
                }
            }
        } catch (\Throwable $ignore) {}
    }
}

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Not logged in']);
    exit;
}

$userId = $_SESSION['user_id'];

$lat = $input['latitude'] ?? null;
$lng = $input['longitude'] ?? null;
$accuracy = $input['accuracy'] ?? null;

if ($lat === null || $lng === null) {
    echo json_encode(['success' => false, 'message' => 'Latitude/longitude required']);
    exit;
}

// [FIX] Allow location updates if either 'location_services' OR 'share_location' is enabled.
// This ensures SOS and internal tracking work even if social sharing is off.
$settingStmt = $conn->prepare("SELECT share_location, location_services FROM user_settings WHERE user_id = ?");
$settingStmt->bind_param("i", $userId);
$settingStmt->execute();
$settingResult = $settingStmt->get_result();
$setting = $settingResult->fetch_assoc();
$settingStmt->close();

$isLocationEnabled = true; // Default for new users if row doesn't exist yet
if ($setting) {
    $isLocationEnabled = ((int)$setting['location_services'] === 1 || (int)$setting['share_location'] === 1);
}

if (!$isLocationEnabled) {
    echo json_encode(['success' => false, 'message' => 'Location services disabled']);
    exit;
}

// Generate the exact current local time in PHP
$currentTime = date('Y-m-d H:i:s');

// Explicitly insert and update the timestamp to force MySQL to register the activity
$stmt = $conn->prepare("
    INSERT INTO user_locations (user_id, latitude, longitude, accuracy, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
        latitude = VALUES(latitude),
        longitude = VALUES(longitude),
        accuracy = VALUES(accuracy),
        updated_at = VALUES(updated_at)
");

// Bind parameters: i (integer), d (double), d (double), i (integer), s (string)
$stmt->bind_param("iddis", $userId, $lat, $lng, $accuracy, $currentTime);

if ($stmt->execute()) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'message' => 'Failed to update location']);
}

$stmt->close();
$conn->close();