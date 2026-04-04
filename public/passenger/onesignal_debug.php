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

// Compute the application base URL the same way the rest of the app does
$scriptName = $_SERVER['SCRIPT_NAME'] ?? '';
$publicDir  = rtrim(str_replace('\\', '/', dirname($scriptName)), '/');
$baseUrl    = preg_replace('~/public/.*$~', '', $publicDir) ?: '';

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

    <!-- Set base URL for the bridge (PHP-generated, not hard-coded) -->
    <script>
        window.APP_BASE_URL = <?= json_encode($baseUrl, JSON_UNESCAPED_SLASHES) ?>;
    </script>

    <!-- Early catcher - MUST be before bridge script -->
    <script>
        window._sosPendingToken = null;
        window._callbackLog = [];
        window._getInfoLog = [];

        // Extracts the push subscription ID from any OneSignal info object.
        // pushToken (raw FCM/APNs token) is intentionally excluded because
        // it is not a subscription ID and cannot be used with include_subscription_ids.
        function _extractOSId(info) {
            if (!info) return null;
            return info.subscriptionId
                || info.oneSignalId
                || info.userId
                || info.oneSignalUserId
                || info.playerId
                || info.id
                || (info.subscription && (
                       info.subscription.id
                    || info.subscription.subscriptionId
                    || info.subscription.userId
                    || info.subscription.oneSignalId
                   ))
                || null;
        }

        function handleOneSignalInfo(info) {
            var entry = {
                time: new Date().toISOString(),
                info: JSON.parse(JSON.stringify(info || {}))
            };
            window._callbackLog.push(entry);
            console.log('[OS Callback] Received:', JSON.stringify(info));

            var id = _extractOSId(info);

            if (id) {
                console.log('[OS Callback] Extracted subscription ID:', id);
                window._sosPendingToken = id;
                updateDisplay();
                if (window.sosBridge) {
                    window.sosBridge.saveToken(id);
                }
            } else {
                console.warn('[OS Callback] No subscription ID found in:', JSON.stringify(info));
            }
        }

        window.gonative_onesignal_info = handleOneSignalInfo;
        window.median_onesignal_info   = handleOneSignalInfo;

        function updateDisplay() {
            var el = document.getElementById('pending-token');
            if (!el) return;
            if (window._sosPendingToken) {
                el.textContent = window._sosPendingToken;
                el.classList.remove('text-muted');
                el.classList.add('text-success', 'fw-bold');
            }
        }
    </script>

    <!-- Load the bridge script -->
    <script src="../../assets/js/median_onesignal_bridge.js"></script>

    <style>
        body { padding: 20px; background: #f5f5f5; }
        .debug-card { background: white; border-radius: 12px; padding: 16px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .log-entry { font-family: monospace; font-size: 11px; padding: 4px 8px; border-left: 3px solid #2563eb; background: #f8fafc; margin: 4px 0; word-break: break-all; }
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
            <span class="status-badge status-yes">Logged in as <?= htmlspecialchars($userName) ?> (ID: <?= (int)$userId ?>)</span>
        <?php else: ?>
            <span class="status-badge status-no">Not logged in – token cannot be saved until you log in</span>
        <?php endif; ?>
    </div>

    <div class="mb-3">
        <strong>SDK Available:</strong>
        <span id="sdk-status" class="status-badge status-no">Checking…</span>
    </div>

    <div class="mb-3">
        <strong>Subscription ID (from callback / SDK):</strong>
        <div id="pending-token" class="text-muted">Waiting for callback…</div>
    </div>

    <div class="mb-3">
        <strong>Subscription IDs in Database:</strong>
        <?php if (empty($existingTokens)): ?>
            <div class="text-danger">No subscription IDs registered for your account</div>
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
    <button class="btn btn-success btn-action" onclick="pullToken()">Pull Subscription ID</button>
    <button class="btn btn-info btn-action" onclick="savePendingToken()">Save Pending ID to Backend</button>
    <button class="btn btn-warning btn-action" onclick="location.reload()">Refresh Page</button>
</div>

<div class="debug-card">
    <h6 class="mb-2">Callback Log</h6>
    <div id="callback-log"></div>
</div>

<div class="debug-card">
    <h6 class="mb-2">SDK Query Results</h6>
    <div id="getinfo-log"></div>
</div>

<script>
    function log(elementId, message, type) {
        var el = document.getElementById(elementId);
        var entry = document.createElement('div');
        entry.className = 'log-entry' + (type ? ' ' + type : '');
        entry.textContent = new Date().toLocaleTimeString() + ' -- ' + message;
        el.appendChild(entry);
    }

    function checkSdk() {
        var medianAvail   = !!(window.gonative && window.gonative.onesignal);
        var capacitorAvail = !!(window.plugins && window.plugins.OneSignal);
        var webSdkAvail   = !!(window.OneSignal);
        var any = medianAvail || capacitorAvail || webSdkAvail;

        var label = [];
        if (medianAvail)    label.push('Median/gonative');
        if (capacitorAvail) label.push('Capacitor plugin');
        if (webSdkAvail)    label.push('window.OneSignal');
        if (!any)           label.push('NOT available (web browser — push notifications require the native app)');

        var el = document.getElementById('sdk-status');
        el.className = 'status-badge ' + (any ? 'status-yes' : 'status-no');
        el.textContent = label.join(' + ');

        log('getinfo-log', 'SDK check: Median=' + medianAvail + ', Capacitor=' + capacitorAvail + ', WebSDK=' + webSdkAvail, any ? 'success' : 'error');
    }

    function pullToken() {
        log('getinfo-log', 'Attempting to pull subscription ID…');

        // Path 1: Capacitor plugin (window.plugins.OneSignal)
        var capOS = window.plugins && window.plugins.OneSignal;
        if (capOS && capOS.User && capOS.User.pushSubscription) {
            if (typeof capOS.User.pushSubscription.getIdAsync === 'function') {
                log('getinfo-log', 'Trying Capacitor getIdAsync()…');
                capOS.User.pushSubscription.getIdAsync()
                    .then(function(id) {
                        if (id) {
                            log('getinfo-log', 'Capacitor subscription ID: ' + id, 'success');
                            window._sosPendingToken = id;
                            updateDisplay();
                        } else {
                            log('getinfo-log', 'Capacitor getIdAsync() returned null – FCM not ready yet?', 'error');
                        }
                    })
                    .catch(function(e) {
                        log('getinfo-log', 'Capacitor getIdAsync() failed: ' + e.message, 'error');
                    });
                return;
            }
            var capId = capOS.User.pushSubscription.id;
            if (capId) {
                log('getinfo-log', 'Capacitor pushSubscription.id: ' + capId, 'success');
                window._sosPendingToken = capId;
                updateDisplay();
                return;
            }
        }

        // Path 2: window.OneSignal (v5 web SDK or Median bridge)
        if (window.OneSignal) {
            if (OneSignal.User && OneSignal.User.PushSubscription && typeof OneSignal.User.PushSubscription.getId === 'function') {
                log('getinfo-log', 'Trying OneSignal.User.PushSubscription.getId()…');
                OneSignal.User.PushSubscription.getId()
                    .then(function(id) {
                        if (id) {
                            log('getinfo-log', 'PushSubscription.getId(): ' + id, 'success');
                            window._sosPendingToken = id;
                            updateDisplay();
                        } else {
                            log('getinfo-log', 'PushSubscription.getId() returned null', 'error');
                            tryMedianGetInfo();
                        }
                    })
                    .catch(function(e) {
                        log('getinfo-log', 'PushSubscription.getId() failed: ' + e.message, 'error');
                        tryMedianGetInfo();
                    });
                return;
            }
            if (typeof OneSignal.getUserId === 'function') {
                log('getinfo-log', 'Trying OneSignal.getUserId() (legacy)…');
                OneSignal.getUserId().then(function(id) {
                    if (id) {
                        log('getinfo-log', 'OneSignal.getUserId(): ' + id, 'success');
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
        }

        tryMedianGetInfo();
    }

    // Path 3: Median/gonative getInfo()
    function tryMedianGetInfo() {
        if (!window.gonative || !window.gonative.onesignal) {
            log('getinfo-log', 'No SDK found. Open this page inside the ByaHero native app.', 'error');
            return;
        }
        if (typeof window.gonative.onesignal.getInfo !== 'function') {
            log('getinfo-log', 'gonative.onesignal.getInfo() not available', 'error');
            return;
        }
        try {
            log('getinfo-log', 'Calling gonative.onesignal.getInfo()…');
            var result = window.gonative.onesignal.getInfo();
            Promise.resolve(result)
                .then(function(info) {
                    log('getinfo-log', 'getInfo() resolved: ' + JSON.stringify(info));
                    window._getInfoLog.push({ time: new Date().toISOString(), info: info });
                    var id = _extractOSId(info);
                    if (id) {
                        log('getinfo-log', 'Subscription ID extracted: ' + id, 'success');
                        window._sosPendingToken = id;
                        updateDisplay();
                    } else {
                        log('getinfo-log', 'No subscription ID found in getInfo() response – check FCM setup', 'error');
                    }
                })
                .catch(function(e) {
                    log('getinfo-log', 'getInfo() rejected: ' + e.message, 'error');
                });
        } catch (e) {
            log('getinfo-log', 'getInfo() threw: ' + e.message, 'error');
        }
    }

    function savePendingToken() {
        if (!window._sosPendingToken) {
            alert('No subscription ID available yet. Tap "Pull Subscription ID" first.');
            return;
        }
        if (!window.sosBridge) {
            alert('sosBridge not initialised yet. Try refreshing.');
            return;
        }
        log('callback-log', 'Manually saving: ' + window._sosPendingToken);
        window.sosBridge.saveToken(window._sosPendingToken);
        setTimeout(function() { location.reload(); }, 2000);
    }

    // Auto-check SDK on load
    document.addEventListener('DOMContentLoaded', function() {
        checkSdk();

        // Replay any callbacks that fired before DOMContentLoaded
        setInterval(function() {
            var el = document.getElementById('callback-log');
            if (window._callbackLog.length > el.children.length) {
                window._callbackLog.forEach(function(entry) {
                    log('callback-log', 'Callback: ' + JSON.stringify(entry.info));
                });
            }
        }, 500);

        // Auto-pull after 1.5 s to give the SDK time to initialise
        setTimeout(pullToken, 1500);
    });
</script>

</body>
</html>
