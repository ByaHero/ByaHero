<?php
session_start();
header('Content-Type: application/json');
require_once '../config/db_connection.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Not logged in']);
    exit;
}

$userId = (int)$_SESSION['user_id'];
$userEmail = $_SESSION['user_email'] ?? '';

$input = json_decode(file_get_contents('php://input'), true);
$recipients = $input['recipients'] ?? [];
$locationText = trim($input['location_text'] ?? '');

if (!is_array($recipients) || count($recipients) === 0) {
    echo json_encode(['success' => false, 'message' => 'Recipients required']);
    exit;
}

// Normalize recipients to ints
$recipients = array_values(array_unique(array_map('intval', $recipients)));

try {
    $conn->begin_transaction();

    // Find sender circle
    $circleStmt = $conn->prepare("SELECT id FROM circles WHERE owner_user_id = ? LIMIT 1");
    $circleStmt->bind_param("i", $userId);
    $circleStmt->execute();
    $circleRes = $circleStmt->get_result();
    $circle = $circleRes->fetch_assoc();
    $circleStmt->close();

    if (!$circle) {
        throw new Exception("No circle found for this user.");
    }

    $circleId = (int)$circle['id'];

    // Validate recipients are active members of sender's circle
    // Build placeholders
    $placeholders = implode(',', array_fill(0, count($recipients), '?'));
    $types = str_repeat('i', 1 + count($recipients));
    $sql = "SELECT member_user_id FROM circle_members WHERE circle_id = ? AND status = 'active' AND member_user_id IN ($placeholders)";
    $stmt = $conn->prepare($sql);

    // bind_param needs references; build dynamic array
    $params = array_merge([$circleId], $recipients);
    $bindNames = [];
    $bindNames[] = $types;
    for ($i = 0; $i < count($params); $i++) {
        $bindNames[] = &$params[$i];
    }
    call_user_func_array([$stmt, 'bind_param'], $bindNames);

    $stmt->execute();
    $res = $stmt->get_result();
    $valid = [];
    while ($row = $res->fetch_assoc()) $valid[] = (int)$row['member_user_id'];
    $stmt->close();

    if (count($valid) === 0) {
        throw new Exception("No valid recipients in your circle.");
    }

    // Create SOS alert (one per recipient) - simplest model
    // You need a table `sos_alerts` (see section 3)
    $insert = $conn->prepare("INSERT INTO sos_alerts (sender_user_id, recipient_user_id, location_text, status) VALUES (?, ?, ?, 'active')");
    foreach ($valid as $rid) {
        $insert->bind_param("iis", $userId, $rid, $locationText);
        $insert->execute();
    }
    $insert->close();

    // Analytics log (A)
    try {
        $a = $conn->prepare("INSERT INTO analytics_events (user_id, event_type, event_data, page) VALUES (?, 'sos_sent', ?, '/sos')");
        $eventData = json_encode([
            'email' => $userEmail,
            'recipients' => $valid,
            'location_text' => $locationText,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        $a->bind_param("is", $userId, $eventData);
        $a->execute();
        $a->close();
    } catch (Exception $e) {
        // Do not fail SOS send if analytics fails
        error_log("SOS analytics failed: " . $e->getMessage());
    }

    $conn->commit();

    echo json_encode(['success' => true, 'sent_to' => $valid]);

} catch (Exception $e) {
    $conn->rollback();
    error_log("sendSosAlert failed: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}