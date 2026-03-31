<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config/db.php'; // db(): PDO

function out(int $code, array $data): void {
  http_response_code($code);
  echo json_encode($data, JSON_UNESCAPED_SLASHES);
  exit;
}

$recipientUserId = isset($_GET['i']) ? (int)$_GET['i'] : 0;
if ($recipientUserId <= 0) {
  out(400, ['success' => false, 'message' => 'Missing/invalid recipient user id (?i=USER_ID).']);
}

try {
  $pdo = db();

  // Latest active token for recipient user
  $st = $pdo->prepare("
    SELECT player_id, updated_at
    FROM user_onesignal_tokens
    WHERE user_id = :uid
      AND (is_active = 1 OR is_active IS NULL)
    ORDER BY updated_at DESC, id DESC
    LIMIT 1
  ");
  $st->execute([':uid' => $recipientUserId]);
  $row = $st->fetch(PDO::FETCH_ASSOC);

  if (!$row || empty($row['player_id'])) {
    out(404, [
      'success' => false,
      'message' => "No Player ID found for User {$recipientUserId}.",
      'hint' => 'Log in on recipient device and ensure registerOnesignalToken.php saves token for this user_id.'
    ]);
  }

  $playerId = (string)$row['player_id'];

  // TODO: set these from secure config/env, not hardcoded
  $ONESIGNAL_APP_ID = 'b755dd29-1de2-4cf1-9381-6a9b436bc049';
  $ONESIGNAL_REST_API_KEY = 'os_v2_app_w5k52ki54jgpde4bnknug26ajffmpqdyhshutleosxotea2neg6pcnw6lqotnv67mcb7p3rr3d37pglprqyefcfihmdnqxbijny3pzi';

  if (!$ONESIGNAL_APP_ID || !$ONESIGNAL_REST_API_KEY ||
      str_contains($ONESIGNAL_APP_ID, 'REPLACE_') || str_contains($ONESIGNAL_REST_API_KEY, 'REPLACE_')) {
    out(500, [
      'success' => false,
      'message' => 'OneSignal credentials are not configured in test_push.php'
    ]);
  }

  $payload = [
    'app_id' => $ONESIGNAL_APP_ID,
    'include_player_ids' => [$playerId],
    'headings' => ['en' => 'ByaHero SOS Test'],
    'contents' => ['en' => 'This is a test SOS push notification.'],
    'data' => [
      'type' => 'sos_alert',
      'source' => 'test_push.php',
      'recipient_user_id' => $recipientUserId
    ]
  ];

  $ch = curl_init('https://onesignal.com/api/v1/notifications');
  curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
      'Content-Type: application/json; charset=utf-8',
      'Authorization: Basic ' . $ONESIGNAL_REST_API_KEY
    ],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POSTFIELDS => json_encode($payload),
    CURLOPT_TIMEOUT => 20
  ]);

  $resp = curl_exec($ch);
  $err = curl_error($ch);
  $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);

  if ($err) {
    out(502, ['success' => false, 'message' => 'cURL error', 'error' => $err]);
  }

  $json = json_decode((string)$resp, true);

  out($status >= 200 && $status < 300 ? 200 : 502, [
    'success' => $status >= 200 && $status < 300,
    'recipient_user_id' => $recipientUserId,
    'player_id' => $playerId,
    'onesignal_http' => $status,
    'onesignal_response' => $json ?? $resp
  ]);

} catch (Throwable $e) {
  out(500, ['success' => false, 'message' => 'Server error', 'error' => $e->getMessage()]);
}