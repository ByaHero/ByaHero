<?php
session_start();
header('Content-Type: application/json');
require_once '../config/db_connection.php';

// Auto-migration for Infinity Free: ensure the table exists in case no one registered a token yet
// UNIQUE on fcm_token (not user_id) so one user can have multiple devices
@$conn->query("CREATE TABLE IF NOT EXISTS user_fcm_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  fcm_token VARCHAR(255) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_token (fcm_token),
  INDEX idx_user (user_id)
)");

// Fix legacy schema: if old UNIQUE(user_id) exists, migrate to UNIQUE(fcm_token)
$legacyCheck = @$conn->query("SHOW INDEX FROM user_fcm_tokens WHERE Key_name = 'user_id'");
if ($legacyCheck && $legacyCheck->num_rows > 0) {
    @$conn->query("ALTER TABLE user_fcm_tokens DROP INDEX user_id");
    @$conn->query("ALTER TABLE user_fcm_tokens ADD UNIQUE KEY unique_token (fcm_token)");
}

// Infinity Free Bypass Strategy:
// Instead of sending the HTTP request from PHP (which might be blocked on Infinity Free),
// We sign the JWT using the Firebase Service Account locally in PHP.
// Then we return the FCM tokens AND the signed JWT to the frontend JS.
// The frontend (which has unrestricted internet) will exchange the JWT for an Access Token
// and dispatch the push notifications directly to Google's FCM API.

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Not logged in']);
    exit;
}

$senderId = (int)$_SESSION['user_id'];
$senderName = $_SESSION['user_name'] ?? ($_SESSION['user_email'] ?? 'A user');

$input = json_decode(file_get_contents('php://input'), true);
$recipients = $input['recipients'] ?? [];
$locationText = trim($input['location_text'] ?? '');

if (empty($recipients) || !is_array($recipients)) {
    echo json_encode(['success' => false, 'message' => 'No recipients provided.']);
    exit;
}

$recipients = array_values(array_unique(array_map('intval', $recipients)));

try {
    $conn->begin_transaction();

    $fcmTokens = [];
    $validRecipients = [];

    // 1. Insert the SOS into DB
    $insertStmt = $conn->prepare("INSERT INTO sos_alerts (sender_user_id, recipient_user_id, location_text, status) VALUES (?, ?, ?, 'active')");
    foreach ($recipients as $recipientId) {
        if ($recipientId <= 0) continue;
        $insertStmt->bind_param("iis", $senderId, $recipientId, $locationText);
        $insertStmt->execute();
        $validRecipients[] = $recipientId;
    }
    $insertStmt->close();

    // 2. Look up the physical device FCM tokens
    if (!empty($validRecipients)) {
        $placeholders = implode(',', array_fill(0, count($validRecipients), '?'));
        $types = str_repeat('i', count($validRecipients));
        
        $tokenSql = "SELECT fcm_token FROM user_fcm_tokens WHERE user_id IN ($placeholders) AND fcm_token != ''";
        $tokenStmt = $conn->prepare($tokenSql);
        
        $bindNames = [$types];
        foreach ($validRecipients as $key => $value) {
            $bindNames[] = &$validRecipients[$key];
        }
        call_user_func_array([$tokenStmt, 'bind_param'], $bindNames);
        
        $tokenStmt->execute();
        $tokenRes = $tokenStmt->get_result();
        
        while ($row = $tokenRes->fetch_assoc()) {
            $fcmTokens[] = $row['fcm_token'];
        }
        $tokenStmt->close();
    }

    $conn->commit();

    // 3. Generate the self-signed JWT for the Frontend Bypass!
    require_once __DIR__ . '/../config/bootstrap.php';

    // Try Environment Variables first
    $clientEmail = get_env_config('FIREBASE_CLIENT_EMAIL', '');
    $privateKey = get_env_config('FIREBASE_PRIVATE_KEY', '');
    $projectId = get_env_config('FIREBASE_PROJECT_ID', '');
    
    // Fallback to serviceAccountKey.json if env vars are missing
    if (!$clientEmail || !$privateKey || !$projectId) {
        $serviceAccountPath = __DIR__ . '/serviceAccountKey.json';
        if (file_exists($serviceAccountPath)) {
            $sa = json_decode(file_get_contents($serviceAccountPath), true);
            if ($sa) {
                $clientEmail = $clientEmail ?: ($sa['client_email'] ?? '');
                $privateKey = $privateKey ?: ($sa['private_key'] ?? '');
                $projectId = $projectId ?: ($sa['project_id'] ?? '');
            }
        }
    }

    $signedJwt = null;
    if ($clientEmail && $privateKey) {
        $header = json_encode(['alg' => 'RS256', 'typ' => 'JWT']);
        $now = time();
        $payload = json_encode([
            'iss' => $clientEmail,
            'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
            'aud' => 'https://oauth2.googleapis.com/token',
            'exp' => $now + 3600,
            'iat' => $now
        ]);
        
        // Base64Url encode
        $b64Header = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
        $b64Payload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));
        $signatureInput = $b64Header . "." . $b64Payload;
        
        // Sign the JWT
        @openssl_sign($signatureInput, $signature, $privateKey, "sha256WithRSAEncryption");
        $b64Signature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
        $signedJwt = $signatureInput . "." . $b64Signature;
    }

    echo json_encode([
        'success' => true,
        'sent_to' => $validRecipients,
        'fcm_tokens' => $fcmTokens,
        'jwt' => $signedJwt,
        'project_id' => $projectId,
        'sender_name' => $senderName,
        'location_text' => $locationText
    ]);

} catch (Exception $e) {
    if (isset($conn)) $conn->rollback();
    error_log("sendSosAlert failed: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'System error: ' . $e->getMessage()]);
}
?>