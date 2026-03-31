<?php
/**
 * OneSignal Debug Page
 *
 * Visit this page on your phone to see what OneSignal data is available.
 * This will help diagnose why your phone isn't subscribing.
 */
session_start();
require_once '../../config/db_connection.php';

$userId   = $_SESSION['user_id'] ?? null;
$userName = $_SESSION['user_name'] ?? $_SESSION['user_email'] ?? 'Not logged in';

// Fetch existing tokens for this user
$existingTokens = [];
if ($userId && isset($conn)) {
    $stmt = $conn->prepare("SELECT player_id, updated_at FROM user_onesignal_tokens WHERE user_id = ?");
    if ($stmt) {
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        $result = $stmt->get_result();
        while ($row = $result->fetch_assoc()) {
            $existingTokens[] = $row;
        }
        $stmt->close();
    }
}
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>OneSignal Debug - ByaHero</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">

    <!-- Set base URL for the bridge -->
    <script>
        window.APP_BASE_URL = window.location.origin + '/Byahero-prototype-v3';
    </script>

    <!-- Early catcher - MUST be before bridge script -->
    <script>
        window._sosPendingToken = null;
        window._callbackLog = [];
        window._getInfoLog = [];

        function handleOneSignalInfo(info) {
            var entry = {
                time: new Date().toISOString(),
                info: JSON.parse(JSON.stringify(info || {}))
            };
            window._callbackLog.push(entry);
            console.log('[OS Callback] Received:', JSON.stringify(info));

            // Try to extract ID using all known property names
            var id = info && (
                info.oneSignalId ||
                info.userId ||
                info.subscriptionId ||
                info.oneSignalUserId ||
                info.pushToken ||
                info.playerId ||
                info.id ||
                (info.subscription && (info.subscription.id || info.subscription.subscriptionId || info.subscription.pushToken))
            );

            if (id) {
                console.log('[OS Callback] Extracted ID:', id);
                window._sosPendingToken = id;
                updateDisplay();
                if (window.sosBridge) {
                    window.sosBridge.saveToken(id);
                }
            } else {
                console.warn('[OS Callback] No ID found in:', JSON.stringify(info));
            }
        }

        window.gonative_onesignal_info = handleOneSignalInfo;
        window.median_onesignal_info = handleOneSignalInfo;

        function updateDisplay() {
            if (window._sosPendingToken) {
                document.getElementById('pending-token').textContent = window._sosPendingToken;
                document.getElementById('pending-token').classList.remove('text-muted');
                document.getElementById('pending-token').classList.add('text-success', 'fw-bold');
            }
        }
    </script>

    <!-- Load the bridge script -->
    <script src="../../assets/js/median_onesignal_bridge.js"></script>

    <style>
        body { padding: 20px; background: #f5f5f5; }
        .debug-card { background: white; border-radius: 12px; padding: 16px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .log-entry { font-family: monospace; font-size: 11px; padding: 4px 8px; border-left: 3px solid #2563eb; background: #f8fafc; margin: 4px 0; }
        .log-entry.error { border-left-color: #dc3545; background: #fef2f2; }
        .log-entry.success { border-left-color: #10b981; background: #f0fdf4; }
        .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .status-yes { background: #dcfce7; color: #166534; }
        .status-no { background: #fee2e2; color: #991b1b; }
        .btn-action { margin: 4px; }
    </style>
</head>
<body>

<div class="debug-card">
    <h5 class="mb-3">OneSignal Debug Tool</h5>

    <div class="mb-3">
        <strong>Login Status:</strong>
        <?php if ($userId): ?>
            <span class="status-badge status-yes">Logged in as <?= htmlspecialchars($userName) ?> (ID: <?= $userId ?>)</span>
        <?php else: ?>
            <span class="status-badge status-no">Not logged in</span>
        <?php endif; ?>
    </div>

    <div class="mb-3">
        <strong>Median SDK Available:</strong>
        <span id="sdk-status" class="status-badge status-no">Checking...</span>
    </div>

    <div class="mb-3">
        <strong>Pending Token (from callback):</strong>
        <div id="pending-token" class="text-muted">Waiting for callback...</div>
    </div>

    <div class="mb-3">
        <strong>Tokens in Database:</strong>
        <?php if (empty($existingTokens)): ?>
            <div class="text-danger">No tokens registered for your account</div>
        <?php else: ?>
            <?php foreach ($existingTokens as $t): ?>
                <div class="text-success">
                    <strong>Saved:</strong> <?= htmlspecialchars($t['player_id']) ?>
                    <br><small class="text-muted">Updated: <?= htmlspecialchars($t['updated_at']) ?></small>
                </div>
            <?php endforeach; ?>
        <?php endif; ?>
    </div>
</div>

<div class="debug-card">
    <h6 class="mb-2">Actions</h6>

    <button class="btn btn-primary btn-action" onclick="checkSdk()">Check SDK Status</button>
    <button class="btn btn-success btn-action" onclick="pullToken()">Pull Token from SDK</button>
    <button class="btn btn-info btn-action" onclick="savePendingToken()">Save Pending Token</button>
    <button class="btn btn-warning btn-action" onclick="location.reload()">Refresh Page</button>
</div>

<div class="debug-card">
    <h6 class="mb-2">Callback Log</h6>
    <div id="callback-log"></div>
</div>

<div class="debug-card">
    <h6 class="mb-2">getInfo() Results</h6>
    <div id="getinfo-log"></div>
</div>

<script>
    function log(elementId, message, type) {
        var el = document.getElementById(elementId);
        var entry = document.createElement('div');
        entry.className = 'log-entry' + (type ? ' ' + type : '');
        entry.textContent = new Date().toLocaleTimeString() + ' - ' + message;
        el.appendChild(entry);
    }

    function checkSdk() {
        var sdkAvailable = !!(window.gonative && window.gonative.onesignal);
        var oneSignalAvailable = !!(window.OneSignal);

        document.getElementById('sdk-status').className = 'status-badge ' + (sdkAvailable || oneSignalAvailable ? 'status-yes' : 'status-no');
        document.getElementById('sdk-status').textContent = (sdkAvailable ? 'Median SDK' : '') + (oneSignalAvailable ? ' + OneSignal SDK' : '') || 'NOT available';

        log('getinfo-log', 'SDK check: Median=' + sdkAvailable + ', OneSignal=' + oneSignalAvailable, sdkAvailable || oneSignalAvailable ? 'success' : 'error');

        var methods = [];
        if (sdkAvailable) {
            if (typeof window.gonative.onesignal.getInfo === 'function') methods.push('gonative.getInfo()');
            if (typeof window.gonative.onesignal.getPermissionSubscriptionState === 'function') methods.push('gonative.getPermissionSubscriptionState()');
        }
        if (oneSignalAvailable) {
            if (typeof OneSignal.getUserId === 'function') methods.push('OneSignal.getUserId()');
            if (typeof OneSignal.getUserSubscriptionState === 'function') methods.push('OneSignal.getUserSubscriptionState()');
        }
        log('getinfo-log', 'Available methods: ' + (methods.join(', ') || 'none'));
    }

    function pullToken() {
        log('getinfo-log', 'Attempting to pull token...');

        // Method 1: OneSignal SDK directly (best for Android 15+)
        if (window.OneSignal && typeof OneSignal.getUserId === 'function') {
            log('getinfo-log', 'Using OneSignal.getUserId()...', 'success');
            OneSignal.getUserId().then(function(id) {
                if (id) {
                    log('getinfo-log', 'OneSignal.getUserId() returned: ' + id, 'success');
                    window._sosPendingToken = id;
                    updateDisplay();
                } else {
                    log('getinfo-log', 'OneSignal.getUserId() returned null', 'error');
                    tryMedianGetInfo();
                }
            }).catch(function(e) {
                log('getinfo-log', 'OneSignal.getUserId() failed: ' + e.message, 'error');
                tryMedianGetInfo();
            });
            return;
        }

        // Method 2: Median's getInfo
        function tryMedianGetInfo() {
            if (!window.gonative || !window.gonative.onesignal) {
                log('getinfo-log', 'Median SDK not available', 'error');
                return;
            }

            if (typeof window.gonative.onesignal.getInfo !== 'function') {
                log('getinfo-log', 'getInfo() method not found', 'error');
                return;
            }

            try {
                var result = window.gonative.onesignal.getInfo();

                if (result && typeof result.then === 'function') {
                    log('getinfo-log', 'getInfo() returned a promise, waiting...');
                    result
                        .then(function(info) {
                            log('getinfo-log', 'getInfo() resolved: ' + JSON.stringify(info));
                            window._getInfoLog.push({ time: new Date().toISOString(), info: info });

                            // Try to extract ID
                            var id = info && (
                                info.oneSignalId ||
                                info.userId ||
                                info.subscriptionId ||
                                info.oneSignalUserId ||
                                info.pushToken ||
                                info.playerId ||
                                info.id ||
                                (info.subscription && (info.subscription.id || info.subscription.subscriptionId || info.subscription.pushToken))
                            );

                            if (id) {
                                log('getinfo-log', 'Token extracted: ' + id, 'success');
                                window._sosPendingToken = id;
                                updateDisplay();
                            } else {
                                log('getinfo-log', 'No token found in response', 'error');
                            }
                        })
                        .catch(function(e) {
                            log('getinfo-log', 'getInfo() rejected: ' + e.message, 'error');
                        });
                } else {
                    log('getinfo-log', 'getInfo() returned non-promise: ' + typeof result);
                }
            } catch (e) {
                log('getinfo-log', 'getInfo() threw: ' + e.message, 'error');
            }
        }
        tryMedianGetInfo();
    }

    function savePendingToken() {
        if (!window._sosPendingToken) {
            alert('No pending token to save. Try "Pull Token" first.');
            return;
        }

        if (!window.sosBridge) {
            alert('sosBridge not available yet');
            return;
        }

        log('callback-log', 'Manually saving pending token...');
        window.sosBridge.saveToken(window._sosPendingToken);

        setTimeout(function() {
            location.reload();
        }, 2000);
    }

    // Auto-check SDK on load
    document.addEventListener('DOMContentLoaded', function() {
        checkSdk();

        // Show any callbacks that fired
        setInterval(function() {
            var el = document.getElementById('callback-log');
            if (window._callbackLog.length > el.children.length) {
                window._callbackLog.forEach(function(entry) {
                    log('callback-log', 'Callback fired: ' + JSON.stringify(entry.info));
                });
            }
        }, 500);

        // Auto-pull after 1 second
        setTimeout(pullToken, 1000);
    });
</script>

</body>
</html>
