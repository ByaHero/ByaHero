<?php
session_start();
require_once '../../config/db_connection.php';

$userId   = $_SESSION['user_id'] ?? null;
$userName = $_SESSION['user_name'] ?? $_SESSION['user_email'] ?? 'Unknown';

// Auto-migration
$conn->query("CREATE TABLE IF NOT EXISTS user_fcm_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  fcm_token VARCHAR(255) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY (user_id),
  INDEX idx_token (fcm_token)
)");

$existingTokens = [];
if ($userId) {
    $s = $conn->prepare("SELECT fcm_token, updated_at FROM user_fcm_tokens WHERE user_id = ?");
    $s->bind_param("i", $userId);
    $s->execute();
    $r = $s->get_result();
    while ($row = $r->fetch_assoc()) $existingTokens[] = $row;
    $s->close();
}
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Capacitor FCM Token Debug</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <script src="../../assets/js/capacitor_firebase_bridge.js"></script>
</head>
<body class="bg-light p-4">

<div class="container" style="max-width:500px">
    <h5 class="fw-bold mb-3">Capacitor FCM Debugger</h5>

    <div class="card mb-3">
        <div class="card-body">
            <div class="small text-muted mb-1">Logged in as</div>
            <div class="fw-bold">
                <?= $userId ? htmlspecialchars($userName) . ' (ID: ' . $userId . ')' : '<span class="text-danger">NOT LOGGED IN</span>' ?>
            </div>
        </div>
    </div>

    <div class="card mb-3">
        <div class="card-body">
            <div class="small text-muted mb-1">Live FCM Token (from device)</div>
            <div class="fw-bold text-break" id="detected-id">
                <span class="text-muted">Waiting...</span>
            </div>
            <div class="small text-muted mt-2" id="save-status"></div>
        </div>
    </div>

    <div class="card mb-3">
        <div class="card-body">
            <div class="small text-muted mb-2">Tokens saved in database for your account</div>
            <?php if (empty($existingTokens)): ?>
                <div class="text-danger fw-bold">None — no token registered yet!</div>
            <?php else: ?>
                <?php foreach ($existingTokens as $t): ?>
                    <div class="small text-break mb-1">
                        <span class="badge bg-success">Saved</span>
                        <?= htmlspecialchars($t['fcm_token']) ?>
                        <br><span class="text-muted" style="font-size:0.75rem;">(<?= $t['updated_at'] ?>)</span>
                    </div>
                <?php endforeach; ?>
            <?php endif; ?>
        </div>
    </div>

    <button class="btn btn-primary btn-sm w-100 mb-2" onclick="pullFromCapacitor()">
        Force Pull Token from Capacitor
    </button>

    <button class="btn btn-outline-secondary btn-sm w-100" onclick="location.reload()">
        Refresh Database Check
    </button>
</div>

<script>
function setStatusMessage(msg, cls) {
    const el = document.getElementById('save-status');
    el.className = 'small mt-2 ' + (cls || '');
    el.textContent = msg;
}

function setDetectedMessage(msg, cls) {
    const el = document.getElementById('detected-id');
    el.className = 'fw-bold text-break ' + (cls || '');
    el.innerHTML = msg;
}

async function pullFromCapacitor() {
    if (!window.Capacitor || !window.Capacitor.Plugins.PushNotifications) {
        setDetectedMessage('<span class="text-danger">Capacitor PushNotifications plugin NOT FOUND! Ensure you compiled the APK.</span>', '');
        return;
    }
    
    setDetectedMessage('<span class="text-warning">Requesting permissions and registering...</span>', '');
    
    const PN = window.Capacitor.Plugins.PushNotifications;
    
    // Set up listeners just for debugging
    PN.removeAllListeners();
    
    PN.addListener('registration', (obj) => {
        setDetectedMessage('<span class="text-success">' + obj.value + '</span>', '');
        setStatusMessage('Token captured natively. Sending to PHP...', 'text-primary');
        window.sosBridge.saveToken(obj.value);
        setTimeout(() => setStatusMessage('PHP should have saved it. Refresh page to verify.', 'text-success fw-bold'), 2000);
    });

    PN.addListener('registrationError', (err) => {
        setDetectedMessage('<span class="text-danger">Registration Error: ' + JSON.stringify(err) + '</span>', '');
        setStatusMessage('The Android Emulator failed to get an FCM token from Google.', 'text-danger');
    });

    try {
        let permStatus = await PN.checkPermissions();
        if (permStatus.receive === 'prompt') {
            permStatus = await PN.requestPermissions();
        }
        
        if (permStatus.receive !== 'granted') {
            setDetectedMessage('<span class="text-danger">Permission denied by user or OS.</span>', '');
            return;
        }
        
        setStatusMessage('Calling PN.register()... waiting for Google Play Services...', 'text-warning');
        await PN.register();
    } catch (e) {
        setDetectedMessage('<span class="text-danger">Fatal error: ' + String(e) + '</span>', '');
    }
}
</script>
</body>
</html>
