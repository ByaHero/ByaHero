<?php
/**
 * sendSosAlert.php
 * ─────────────────────────────────────────────────────────────────────────
 * Sends an SOS alert to circle members AND triggers an instant real-time
 * alert via Firebase Realtime Database (replacing OneSignal).
 *
 * HOW IT WORKS:
 * 1. Validates session + input (unchanged from original)
 * 2. Inserts one sos_alerts row per valid recipient (unchanged)
 * 3. NEW: Pushes a JSON update to Firebase Realtime Database for each
 * recipient. The frontend app listens to this node and instantly 
 * triggers the UI banner without needing device tokens.
 *
 * SETUP CHECKLIST:
 * • Set FIREBASE_RTDB_URL below to your actual Firebase project URL.
 * ─────────────────────────────────────────────────────────────────────────
 */

session_start();
header('Content-Type: application/json');
require_once '../config/db_connection.php';

// ── Firebase Configuration ───────────────────────────────────────────────
// Replace with your real Firebase Realtime Database URL from the console.
// NOTE: Do not include a trailing slash (/) at the end of the URL.
define('FIREBASE_RTDB_URL', 'https://byahero-1e70c-default-rtdb.asia-southeast1.firebasedatabase.app/');
// ─────────────────────────────────────────────────────────────────────────

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Not logged in']);
    exit;
}

$userId = (int) $_SESSION['user_id'];
$userEmail = $_SESSION['user_email'] ?? '';
$userName = $_SESSION['user_name'] ?? $userEmail;

$input = json_decode(file_get_contents('php://input'), true);
$recipients = $input['recipients'] ?? [];
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

    $circleId = (int) $circle['id'];

    // ── 2. Validate recipients are active circle members ──────────────────
    $placeholders = implode(',', array_fill(0, count($recipients), '?'));
    $types = str_repeat('i', 1 + count($recipients));
    $sql = "SELECT member_user_id FROM circle_members
                     WHERE circle_id = ? AND status = 'active'
                       AND member_user_id IN ($placeholders)";
    $stmt = $conn->prepare($sql);

    $params = array_merge([$circleId], $recipients);
    $bindNames = [$types];
    for ($i = 0; $i < count($params); $i++) {
        $bindNames[] = &$params[$i];
    }
    call_user_func_array([$stmt, 'bind_param'], $bindNames);

    $stmt->execute();
    $res = $stmt->get_result();
    $valid = [];
    while ($row = $res->fetch_assoc()) {
        $valid[] = (int) $row['member_user_id'];
    }
    $stmt->close();

    if (count($valid) === 0) {
        throw new Exception("No valid recipients in your circle.");
    }

    // ── 3. Insert sos_alerts rows (MySQL Backup) ──────────────────────────
    $insert = $conn->prepare(
        "INSERT INTO sos_alerts (sender_user_id, recipient_user_id, location_text, status)
         VALUES (?, ?, ?, 'active')"
    );
    foreach ($valid as $rid) {
        $insert->bind_param("iis", $userId, $rid, $locationText);
        $insert->execute();
    }
    $insert->close();

    // ── 4. Send Firebase Realtime Database Alerts ─────────────────────────
    // We loop through each valid recipient and update their specific node 
    // in Firebase using a standard PHP cURL request.
    $firebaseResults = [];

    if (count($valid) > 0) {
        foreach ($valid as $rid) {
            // Target the specific user's alert node
            $firebaseUrl = FIREBASE_RTDB_URL . '/alerts/' . $rid . '.json';

            $firebaseData = [
                'is_emergency' => true,
                'sender_name' => $userName,
                'location' => $locationText,
                'timestamp' => time()
            ];

            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $firebaseUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "PATCH");
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($firebaseData));
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
            curl_setopt($ch, CURLOPT_TIMEOUT, 5);

            // 🚨 ADD THIS EXACT LINE TO FIX THE XAMPP SSL BLOCK 🚨
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

            $response = curl_exec($ch);
            $curlError = curl_error($ch);
            curl_close($ch);

            if ($curlError) {
                // Log the error but don't crash the script, the MySQL insert still worked
                error_log("Firebase cURL error for user $rid: $curlError");
                $firebaseResults[$rid] = ['status' => 'error', 'message' => $curlError];
            } else {
                $firebaseResults[$rid] = ['status' => 'success'];
            }
        }
    }

    // ── 5. Analytics log ──────────────────────────────────────────────────
    try {
        $a = $conn->prepare(
            "INSERT INTO analytics_events (user_id, event_type, event_data, page)
             VALUES (?, 'sos_sent', ?, '/sos')"
        );
        $eventData = json_encode([
            'email' => $userEmail,
            'recipients' => $valid,
            'location_text' => $locationText,
            'firebase_sent' => count($valid),
            'timestamp' => date('Y-m-d H:i:s'),
        ]);
        $a->bind_param("is", $userId, $eventData);
        $a->execute();
        $a->close();
    } catch (Exception $e) {
        error_log("SOS analytics failed: " . $e->getMessage());
    }

    $conn->commit();

    // Return the final success JSON to the frontend
    echo json_encode([
        'success' => true,
        'sent_to' => $valid,
        'firebase_result' => $firebaseResults,
    ]);

} catch (Exception $e) {
    $conn->rollback();
    error_log("sendSosAlert failed: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>