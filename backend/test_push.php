<?php
session_start();
header('Content-Type: application/json');
require_once '../config/db_connection.php';

// ── OneSignal Credentials (loaded from config/onesignal.php, never hard-coded) ──
require_once '../config/onesignal.php';

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

// 2. Build the Push Notification Payload
// 2. Build the Push Notification Payload
$pushPayload = [
    'app_id'          => ONESIGNAL_APP_ID,
    
    'target_channel'  => 'push',
    // Use subscription/player IDs directly for targeting
    'include_subscription_ids' => [$playerId],
    
    'headings'        => ['en' => '🚨 ByaHero SOS Test'],
    'contents'        => ['en' => 'This is a test alert! If you see this, the bridge works perfectly.'],
    'data'            => [
        'type'          => 'sos_alert',
        'sender_name'   => 'Test System',
        'location_text' => 'Calamba Test Coordinates',
    ]
];

// 3. Send it to OneSignal via cURL
$ch = curl_init('https://onesignal.com/api/v1/notifications');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json',
        'Authorization: Basic ' . ONESIGNAL_REST_API_KEY,
    ],
    CURLOPT_POSTFIELDS     => json_encode($pushPayload),
    CURLOPT_TIMEOUT        => 10,
]);

$response = curl_exec($ch);
$error = curl_error($ch);
curl_close($ch);

if ($error) {
    echo json_encode(['success' => false, 'error' => $error]);
} else {
    echo json_encode(['success' => true, 'player_id_used' => $playerId, 'onesignal_response' => json_decode($response)]);
}
?>
