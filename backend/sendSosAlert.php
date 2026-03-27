<?php
/**
 * sendSosAlert.php
 * ─────────────────────────────────────────────────────────────────────────
 * Sends an SOS alert to circle members AND triggers a OneSignal push
 * notification to each recipient's device (via Median.co / OneSignal).
 *
 * HOW IT WORKS:
 *  1. Validates session + input (unchanged from original)
 *  2. Inserts one sos_alerts row per valid recipient (unchanged)
 *  3. NEW: Calls OneSignal REST API to push a notification to each
 *     recipient. Recipients must have their OneSignal player_id stored
 *     in the `user_onesignal_tokens` table (populated client-side via
 *     the Median JS bridge – see sos.php script section).
 *
 * SETUP CHECKLIST:
 *  • Set ONESIGNAL_APP_ID and ONESIGNAL_REST_API_KEY below (or in a
 *    shared config file – never commit real keys to git).
 *  • Create the `user_onesignal_tokens` table (SQL at the bottom).
 *  • Add the Median + OneSignal JS snippet to your app layout (see sos.php).
 * ─────────────────────────────────────────────────────────────────────────
 */

session_start();
header('Content-Type: application/json');
require_once '../config/db_connection.php';

// ── OneSignal credentials ─────────────────────────────────────────────────
// Replace with your real values from https://app.onesignal.com
define('ONESIGNAL_APP_ID',       'YOUR_ONESIGNAL_APP_ID');
define('ONESIGNAL_REST_API_KEY', 'YOUR_ONESIGNAL_REST_API_KEY');
// ─────────────────────────────────────────────────────────────────────────

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Not logged in']);
    exit;
}

$userId    = (int)$_SESSION['user_id'];
$userEmail = $_SESSION['user_email'] ?? '';
$userName  = $_SESSION['user_name']  ?? $userEmail;

$input        = json_decode(file_get_contents('php://input'), true);
$recipients   = $input['recipients']    ?? [];
$locationText = trim($input['location_text'] ?? '');

if (!is_array($recipients) || count($recipients) === 0) {
    echo json_encode(['success' => false, 'message' => 'Recipients required']);
    exit;
}

$recipients = array_values(array_unique(array_map('intval', $recipients)));

try {
    $conn->begin_transaction();

    // ── 1. Find sender's circle ───────────────────────────────────────────
    $circleStmt = $conn->prepare("SELECT id FROM circles WHERE owner_user_id = ? LIMIT 1");
    $circleStmt->bind_param("i", $userId);
    $circleStmt->execute();
    $circle = $circleStmt->get_result()->fetch_assoc();
    $circleStmt->close();

    if (!$circle) {
        throw new Exception("No circle found for this user.");
    }

    $circleId = (int)$circle['id'];

    // ── 2. Validate recipients are active circle members ──────────────────
    $placeholders = implode(',', array_fill(0, count($recipients), '?'));
    $types        = str_repeat('i', 1 + count($recipients));
    $sql          = "SELECT member_user_id FROM circle_members
                     WHERE circle_id = ? AND status = 'active'
                       AND member_user_id IN ($placeholders)";
    $stmt = $conn->prepare($sql);

    $params = array_merge([$circleId], $recipients);
    $bindNames   = [$types];
    for ($i = 0; $i < count($params); $i++) {
        $bindNames[] = &$params[$i];
    }
    call_user_func_array([$stmt, 'bind_param'], $bindNames);

    $stmt->execute();
    $res   = $stmt->get_result();
    $valid = [];
    while ($row = $res->fetch_assoc()) {
        $valid[] = (int)$row['member_user_id'];
    }
    $stmt->close();

    if (count($valid) === 0) {
        throw new Exception("No valid recipients in your circle.");
    }

    // ── 3. Insert sos_alerts rows ─────────────────────────────────────────
    $insert = $conn->prepare(
        "INSERT INTO sos_alerts (sender_user_id, recipient_user_id, location_text, status)
         VALUES (?, ?, ?, 'active')"
    );
    foreach ($valid as $rid) {
        $insert->bind_param("iis", $userId, $rid, $locationText);
        $insert->execute();
    }
    $insert->close();

    // ── 4. Collect OneSignal player_ids for valid recipients ──────────────
    //    Each device registers its player_id via the Median JS bridge (see
    //    sos.php).  We look up all tokens for each valid recipient.
    $playerIds = [];

    if (count($valid) > 0) {
        $tokenPlaceholders = implode(',', array_fill(0, count($valid), '?'));
        $tokenTypes        = str_repeat('i', count($valid));
        $tokenSql          = "SELECT player_id FROM user_onesignal_tokens
                              WHERE user_id IN ($tokenPlaceholders)";
        $tokenStmt = $conn->prepare($tokenSql);

        $tokenBindNames = [$tokenTypes];
        for ($i = 0; $i < count($valid); $i++) {
            $tokenBindNames[] = &$valid[$i];
        }
        call_user_func_array([$tokenStmt, 'bind_param'], $tokenBindNames);
        $tokenStmt->execute();
        $tokenRes = $tokenStmt->get_result();
        while ($trow = $tokenRes->fetch_assoc()) {
            $playerIds[] = $trow['player_id'];
        }
        $tokenStmt->close();
    }

    // ── 5. Send OneSignal push notification ───────────────────────────────
    $pushResult = ['skipped' => true];

    if (!empty($playerIds)) {
        $locSnippet = $locationText ? " at $locationText" : "";
        $pushPayload = [
            'app_id'            => ONESIGNAL_APP_ID,
            'include_player_ids'=> $playerIds,
            'headings'          => ['en' => '🚨 SOS Alert'],
            'contents'          => ['en' => "$userName needs help$locSnippet!"],
            // Deep-link into the SOS / notifications page inside the app
            'url'               => '',          // leave blank → opens the app
            'data'              => [
                'type'          => 'sos_alert',
                'sender_name'   => $userName,
                'location_text' => $locationText,
            ],
            // Android channel – create "sos_alerts" in OneSignal dashboard
            // or remove this line to use the default channel
            'android_channel_id'=> 'sos_alerts',
            // Make it high-priority so it wakes the screen
            'priority'          => 10,
            'ttl'               => 3600,        // expire after 1 h if undelivered
        ];

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

        $osResponse = curl_exec($ch);
        $curlError  = curl_error($ch);
        curl_close($ch);

        if ($curlError) {
            // Log but don't fail the SOS – the DB row was already written
            error_log("OneSignal curl error: $curlError");
            $pushResult = ['error' => $curlError];
        } else {
            $pushResult = json_decode($osResponse, true) ?? ['raw' => $osResponse];
        }
    }

    // ── 6. Analytics log ──────────────────────────────────────────────────
    try {
        $a = $conn->prepare(
            "INSERT INTO analytics_events (user_id, event_type, event_data, page)
             VALUES (?, 'sos_sent', ?, '/sos')"
        );
        $eventData = json_encode([
            'email'         => $userEmail,
            'recipients'    => $valid,
            'location_text' => $locationText,
            'push_sent'     => count($playerIds),
            'timestamp'     => date('Y-m-d H:i:s'),
        ]);
        $a->bind_param("is", $userId, $eventData);
        $a->execute();
        $a->close();
    } catch (Exception $e) {
        error_log("SOS analytics failed: " . $e->getMessage());
    }

    $conn->commit();

    echo json_encode([
        'success'    => true,
        'sent_to'    => $valid,
        'push_sent'  => count($playerIds),
        'push_result'=> $pushResult,
    ]);

} catch (Exception $e) {
    $conn->rollback();
    error_log("sendSosAlert failed: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * REQUIRED SQL  –  run once on your InfinityFree MySQL database
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * CREATE TABLE IF NOT EXISTS `user_onesignal_tokens` (
 *   `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 *   `user_id`    INT UNSIGNED NOT NULL,
 *   `player_id`  VARCHAR(64)  NOT NULL,
 *   `updated_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
 *                                      ON UPDATE CURRENT_TIMESTAMP,
 *   UNIQUE KEY `uq_user_player` (`user_id`, `player_id`),
 *   KEY `idx_user_id` (`user_id`)
 * ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */