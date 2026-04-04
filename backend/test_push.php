<?php
session_start();
header('Content-Type: application/json');
require_once '../config/db_connection.php';
require_once '../config/firebase_push.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Not logged in']);
    exit;
}

$testUserId = (int) $_SESSION['user_id'];

// 1. Grab your Player ID from the database
$stmt = $conn->prepare("SELECT player_id FROM user_onesignal_tokens WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1");
$stmt->bind_param("i", $testUserId);
$stmt->execute();
$result = $stmt->get_result();
$tokenRow = $result->fetch_assoc();

if (!$tokenRow) {
    echo json_encode(['success' => false, 'message' => 'No push token found for current user.']);
    exit;
}

$playerId = $tokenRow['player_id'];

if (trim((string) FIREBASE_FUNCTIONS_PUSH_URL) === '') {
    echo json_encode([
        'success' => false,
        'message' => 'Push endpoint is not configured. Set FIREBASE_FUNCTIONS_PUSH_URL.'
    ]);
    exit;
}

// 2. Build the Push Notification Payload
$pushPayload = [
    'tokens'          => [$playerId],
    'title'           => '🚨 ByaHero SOS Test',
    'body'            => 'This is a test alert! If you see this, the bridge works perfectly.',
    'data'            => [
        'type'          => 'sos_alert',
        'sender_name'   => 'Test System',
        'location_text' => 'Calamba Test Coordinates',
    ]
];

// 3. Send it to Firebase Cloud Function via cURL
$headers = ['Content-Type: application/json'];
if (trim((string) FIREBASE_FUNCTIONS_AUTH_SECRET) !== '') {
    $headers[] = 'Authorization: Bearer ' . FIREBASE_FUNCTIONS_AUTH_SECRET;
}

$ch = curl_init(FIREBASE_FUNCTIONS_PUSH_URL);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_HTTPHEADER     => $headers,
    CURLOPT_POSTFIELDS     => json_encode($pushPayload),
    CURLOPT_TIMEOUT        => 10,
]);

$response = curl_exec($ch);
$error = curl_error($ch);
curl_close($ch);

if ($error) {
    echo json_encode(['success' => false, 'error' => $error]);
} else {
    echo json_encode([
        'success' => true,
        'player_id_used' => $playerId,
        'firebase_function_response' => json_decode($response, true) ?? ['raw' => $response]
    ]);
}
?>
