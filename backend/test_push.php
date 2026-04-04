<?php
session_start();
header('Content-Type: application/json');
require_once '../config/db_connection.php';
require_once '../config/firebase_push.php';

// Force the test to use your User ID (12)
$testUserId = 12; 

// 1. Grab your Player ID from the database
$stmt = $conn->prepare("SELECT player_id FROM user_onesignal_tokens WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1");
$stmt->bind_param("i", $testUserId);
$stmt->execute();
$result = $stmt->get_result();
$tokenRow = $result->fetch_assoc();

if (!$tokenRow) {
    echo json_encode(['success' => false, 'message' => 'No Player ID found for User 12.']);
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
        'firebase_function_response' => json_decode($response, true)
    ]);
}
?>
