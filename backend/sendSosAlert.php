<?php
session_start();
header('Content-Type: application/json');
require_once '../config/db_connection.php';

// ── OneSignal Credentials (loaded from config/onesignal.php, never hard-coded) ──
require_once '../config/onesignal.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Not logged in']);
    exit;
}

$senderId = (int)$_SESSION['user_id'];
$senderName = $_SESSION['user_name'] ?? ($_SESSION['user_email'] ?? 'A user');

// 1. Get the payload from the frontend (the specific friends selected)
$input = json_decode(file_get_contents('php://input'), true);
$recipients = $input['recipients'] ?? [];
$locationText = trim($input['location_text'] ?? '');

if (empty($recipients) || !is_array($recipients)) {
    echo json_encode(['success' => false, 'message' => 'No recipients provided.']);
    exit;
}

// Clean the array to ensure they are valid integers
$recipients = array_values(array_unique(array_map('intval', $recipients)));

try {
    $conn->begin_transaction();

    $playerIds = [];
    $validRecipients = [];

    // 2. Insert the SOS into the database so it shows up in their in-app Notification Bell
    $insertStmt = $conn->prepare("INSERT INTO sos_alerts (sender_user_id, recipient_user_id, location_text, status) VALUES (?, ?, ?, 'active')");
    
    foreach ($recipients as $recipientId) {
        if ($recipientId <= 0) continue;
        
        $insertStmt->bind_param("iis", $senderId, $recipientId, $locationText);
        $insertStmt->execute();
        $validRecipients[] = $recipientId;
    }
    $insertStmt->close();

    // 3. Look up the physical device tokens for everyone in the recipient list
    if (!empty($validRecipients)) {
        $placeholders = implode(',', array_fill(0, count($validRecipients), '?'));
        $types = str_repeat('i', count($validRecipients));
        
        $tokenSql = "SELECT player_id FROM user_onesignal_tokens WHERE user_id IN ($placeholders) AND player_id != ''";
        $tokenStmt = $conn->prepare($tokenSql);
        
        $bindNames = [$types];
        foreach ($validRecipients as $key => $value) {
            $bindNames[] = &$validRecipients[$key];
        }
        call_user_func_array([$tokenStmt, 'bind_param'], $bindNames);
        
        $tokenStmt->execute();
        $tokenRes = $tokenStmt->get_result();
        
        while ($row = $tokenRes->fetch_assoc()) {
            $playerIds[] = $row['player_id'];
        }
        $tokenStmt->close();
    }

    // 4. Blast the push notification to all found devices via OneSignal
    $pushResult = ['skipped' => true];
    
    if (!empty($playerIds)) {
        $locSnippet = $locationText ? " at $locationText" : "";
        $payload = [
            'app_id' => ONESIGNAL_APP_ID,
            'target_channel' => 'push',
            'include_subscription_ids' => $playerIds, // <-- Changed this line to match test_push.php
            'headings' => ['en' => '🚨 SOS Alert'],
            'contents' => ['en' => "$senderName needs help$locSnippet!"],
            'data' => [
                'type' => 'sos_alert',
                'sender_name' => $senderName,
                'location_text' => $locationText
            ],
            'priority' => 10,
            'ttl' => 3600
        ];

        $ch = curl_init('https://onesignal.com/api/v1/notifications');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Basic ' . ONESIGNAL_REST_API_KEY
            ],
            CURLOPT_POSTFIELDS => json_encode($payload),
            CURLOPT_TIMEOUT => 10
        ]);

        $response = curl_exec($ch);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            error_log("OneSignal curl error: $error");
            $pushResult = ['error' => $error];
        } else {
            $pushResult = json_decode($response, true) ?? ['raw' => $response];
        }
    }

    $conn->commit();
    
    echo json_encode([
        'success' => true,
        'sent_to' => $validRecipients,
        'push_sent' => count($playerIds),
        'push_result' => $pushResult
    ]);

} catch (Exception $e) {
    $conn->rollback();
    error_log("sendSosAlert failed: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'System error: ' . $e->getMessage()]);
}
?>
