<?php
session_start();
require_once '../../config/db_connection.php';

$userId   = $_SESSION['user_id'] ?? null;
$userName = $_SESSION['user_name'] ?? $_SESSION['user_email'] ?? 'Unknown';

// Show existing tokens for this user
$existingTokens = [];
if ($userId) {
    $s = $conn->prepare("SELECT player_id, updated_at FROM user_onesignal_tokens WHERE user_id = ?");
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
    <title>Capacitor Token Debug</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light p-4">

<div class="container" style="max-width:500px">
    <h5 class="fw-bold mb-3">Capacitor OneSignal Debug</h5>

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
            <div class="small text-muted mb-1">Capacitor Push Token</div>
            <div class="fw-bold text-break" id="detected-id">
                <span class="text-muted">Waiting for Capacitor...</span>
            </div>
            <div class="small text-muted mt-2" id="save-status"></div>
        </div>
    </div>

    <div class="card mb-3">
        <div class="card-body">
            <div class="small text-muted mb-2">Tokens saved in database for your account</div>
            <?php if (empty($existingTokens)): ?>
                <div class="text-danger fw-bold">None — no token registered yet</div>
            <?php else: ?>
                <?php foreach ($existingTokens as $t): ?>
                    <div class="small text-break mb-1">
                        <span class="badge bg-success">Saved</span>
                        <?= htmlspecialchars($t['player_id']) ?>
                        <span class="text-muted">(<?= $t['updated_at'] ?>)</span>
                    </div>
                <?php endforeach; ?>
            <?php endif; ?>
        </div>
    </div>

    <button class="btn btn-primary btn-sm w-100 mb-2" onclick="pullFromCapacitor()">
        Pull token from Capacitor
    </button>

    <button class="btn btn-outline-danger btn-sm w-100" onclick="location.reload()">
        Refresh page
    </button>
</div>

<script>
function formatErrorMessage(err) {
    if (!err) return 'Unknown error';
    if (typeof err === 'string') return err;
    if (err.message) return err.message;
    try { return JSON.stringify(err); } catch (e) {}
    return String(err);
}

const CAPACITOR_ONESIGNAL_APP_ID = 'b755dd29-1de2-4cf1-9381-6a9b436bc049';

function setStatusMessage(text, className) {
    const el = document.getElementById('save-status');
    el.className = className || '';
    el.textContent = text || '';
}

function setDetectedMessage(text, className) {
    const el = document.getElementById('detected-id');
    el.className = className || '';
    el.textContent = text || '';
}

function registerToken(playerId) {
    setStatusMessage('Saving to database...', 'text-primary');
    fetch('../../backend/registerOnesignalToken.php', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: playerId })
    })
    .then(r => r.json())
    .then(d => {
        if (d.success) setStatusMessage('✓ Saved successfully! Refresh page to see it.', 'text-success fw-bold');
        else setStatusMessage('✗ Backend Error: ' + (d.message || 'Unknown error'), 'text-danger');
    })
    .catch(e => setStatusMessage('✗ Network error: ' + formatErrorMessage(e), 'text-danger'));
}

async function checkTokenOnce(OS) {
    // Try v5 API
    if (OS.User && OS.User.pushSubscription) {
        if (typeof OS.User.pushSubscription.getIdAsync === 'function') {
            try { 
                let id = await OS.User.pushSubscription.getIdAsync(); 
                if (id) return id;
            } catch(e) {}
        }
        if (OS.User.pushSubscription.token) return OS.User.pushSubscription.token;
        if (OS.User.pushSubscription.id) return OS.User.pushSubscription.id;
    }
    
    // Try v4 API
    if (typeof OS.getDeviceState === 'function') {
        return new Promise(resolve => {
            OS.getDeviceState(state => resolve((state && state.userId) ? state.userId : null));
        });
    }

    // Try v3 API
    if (typeof OS.getIds === 'function') {
        return new Promise(resolve => {
            OS.getIds(ids => resolve((ids && ids.userId) ? ids.userId : null));
        });
    }
    
    // Try generic wrapper
    if (typeof OS.getUserId === 'function') {
        try { return await OS.getUserId(); } catch(e) {}
    }
    return null;
}

async function pullFromCapacitor() {
    setDetectedMessage('Initializing OneSignal...', 'fw-bold text-break text-warning');
    const OS = window.plugins && window.plugins.OneSignal;
    
    if (!OS) {
        setDetectedMessage('window.plugins.OneSignal unavailable. Are you in the Capacitor app?', 'text-danger');
        return;
    }

    // Ensure Init
    try {
        if (typeof OS.initialize === 'function') OS.initialize(CAPACITOR_ONESIGNAL_APP_ID);
        else if (typeof OS.setAppId === 'function') OS.setAppId(CAPACITOR_ONESIGNAL_APP_ID);
        
        if (OS.Notifications && typeof OS.Notifications.requestPermission === 'function') {
            await OS.Notifications.requestPermission(true);
        } else if (typeof OS.registerForPushNotifications === 'function') {
            OS.registerForPushNotifications();
        }
    } catch(e) {}

    // Polling Loop: Try every 2 seconds, up to 8 times (16 seconds total)
    let attempts = 0;
    const maxAttempts = 8;
    
    const pollInterval = setInterval(async () => {
        attempts++;
        setDetectedMessage(`Waiting for Google FCM Token... (Attempt ${attempts}/${maxAttempts})`, 'text-warning fw-bold');
        
        let token = await checkTokenOnce(OS);
        
        if (token) {
            clearInterval(pollInterval);
            setDetectedMessage(token, 'fw-bold text-break text-success');
            registerToken(token);
        } else if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            setDetectedMessage('No token returned after 16 seconds. Check device network or Google Play Services.', 'text-danger fw-bold');
        }
    }, 2000);
}

// Start immediately
document.addEventListener('deviceready', pullFromCapacitor, false);
</script>
</body>
</html>
