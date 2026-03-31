<?php
/**
 * register_token_test.php
 * 
 * Visit this page on each device while logged in.
 * It shows the device's OneSignal token and lets you manually register it.
 * 
 * Place at: /public/passenger/register_token_test.php
 * Visit at: https://yourdomain.com/public/passenger/register_token_test.php
 * 
 * DELETE THIS FILE after tokens are working automatically.
 */
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
    <title>Token Debug</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">

    <!-- EARLY CATCHER -->
    <script>
    window._sosPendingToken = null;
    window._gonativeInfoLog = [];

    function _sosHandleInfo(info) {
        window._gonativeInfoLog.push({time: new Date().toISOString(), info: info});
        console.log('[OneSignal] Info received:', JSON.stringify(info));

        // Try all possible property names
        var id = info && (
            info.oneSignalId ||
            info.userId ||
            info.subscriptionId ||
            info.oneSignalUserId ||
            info.pushToken ||
            info.playerId ||
            info.id ||
            (info.subscription && info.subscription.id)
        );

        if (!id) {
            console.warn('[OneSignal] No ID found in info object');
            return;
        }

        console.log('[OneSignal] Token extracted:', id);
        window._sosPendingToken = id;
        document.getElementById('detected-id') && (document.getElementById('detected-id').textContent = id);
        if (window.sosBridge) window.sosBridge.saveToken(id);
    }

    window.gonative_onesignal_info = _sosHandleInfo;
    window.median_onesignal_info = _sosHandleInfo;
    </script>
    <script src="../../assets/js/median_onesignal_bridge.js"></script>
</head>
<body class="bg-light p-4">

<div class="container" style="max-width:500px">
    <h5 class="fw-bold mb-3">OneSignal Token Debug</h5>

    <!-- Session info -->
    <div class="card mb-3">
        <div class="card-body">
            <div class="small text-muted mb-1">Logged in as</div>
            <div class="fw-bold">
                <?= $userId ? htmlspecialchars($userName) . ' (ID: ' . $userId . ')' : '<span class="text-danger">NOT LOGGED IN</span>' ?>
            </div>
        </div>
    </div>

    <!-- Detected token -->
    <div class="card mb-3">
        <div class="card-body">
            <div class="small text-muted mb-1">Token detected from Median</div>
            <div class="fw-bold text-break" id="detected-id">
                <span class="text-muted">Waiting for Median callback...</span>
            </div>
            <div class="small text-muted mt-2" id="save-status"></div>
        </div>
    </div>

    <!-- Tokens in DB -->
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

    <!-- Manual register -->
    <div class="card mb-3">
        <div class="card-body">
            <div class="small text-muted mb-2">Manual register (paste token from OneSignal dashboard)</div>
            <input type="text" id="manual-token" class="form-control form-control-sm mb-2" placeholder="Paste OneSignal Subscription ID here">
            <button class="btn btn-primary btn-sm w-100" onclick="manualRegister()">Register This Token</button>
            <div id="manual-result" class="small mt-2"></div>
        </div>
    </div>

    <!-- Pull from Median API -->
    <button class="btn btn-outline-secondary btn-sm w-100 mb-2" onclick="pullFromMedian()">
        Pull token from Median JS API
    </button>

    <button class="btn btn-outline-danger btn-sm w-100" onclick="location.reload()">
        Refresh page
    </button>

    <!-- Log -->
    <div class="mt-3">
        <div class="small text-muted mb-1">Console log</div>
        <pre id="log" class="bg-white border rounded p-2 small" style="min-height:80px;font-size:11px;overflow-x:auto"></pre>
    </div>
</div>

<script>
function log(msg) {
    var el = document.getElementById('log');
    el.textContent += new Date().toLocaleTimeString() + ' ' + msg + '\n';
}

function pullFromMedian() {
    log('Pulling from gonative.onesignal.getInfo()...');
    if (window.gonative && window.gonative.onesignal) {
        window.gonative.onesignal.getInfo()
            .then(function(info) {
                log('getInfo() result: ' + JSON.stringify(info));
                var id = info && (info.oneSignalId || info.userId || info.subscriptionId
                       || (info.subscription && info.subscription.id));
                if (id) {
                    document.getElementById('detected-id').textContent = id;
                    window._sosPendingToken = id;
                    registerToken(id);
                } else {
                    log('No ID found in response');
                }
            })
            .catch(function(e) { log('getInfo() error: ' + e.message); });
    } else {
        log('window.gonative.onesignal not available (not in Median shell?)');
    }
}

function manualRegister() {
    var token = document.getElementById('manual-token').value.trim();
    if (!token) { alert('Paste a token first'); return; }
    registerToken(token);
}

function registerToken(playerId) {
    log('Registering token: ' + playerId);
    document.getElementById('save-status').textContent = 'Saving...';

    fetch('/backend/registerOnesignalToken.php', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: playerId })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
        log('Response: ' + JSON.stringify(d));
        if (d.success) {
            document.getElementById('save-status').textContent = '✓ Saved for user_id: ' + d.user_id;
            document.getElementById('manual-result').innerHTML = '<span class="text-success fw-bold">✓ Token saved! Refresh to see it in DB section above.</span>';
        } else {
            document.getElementById('save-status').textContent = '✗ ' + d.message;
            document.getElementById('manual-result').innerHTML = '<span class="text-danger">✗ ' + d.message + '</span>';
        }
    })
    .catch(function(e) {
        log('Fetch error: ' + e.message);
        document.getElementById('save-status').textContent = '✗ Network error: ' + e.message;
    });
}

document.addEventListener('DOMContentLoaded', function() {
    log('DOM ready. _sosPendingToken=' + (window._sosPendingToken || 'null'));
    log('gonative available: ' + !!(window.gonative && window.gonative.onesignal));
    log('gonativeInfoLog: ' + JSON.stringify(window._gonativeInfoLog));

    if (window._sosPendingToken) {
        document.getElementById('detected-id').textContent = window._sosPendingToken;
        registerToken(window._sosPendingToken);
    }
});
</script>
</body>
</html>