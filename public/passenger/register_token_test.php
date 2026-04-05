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
    try { return JSON.stringify(err); } catch (_) {}
    return String(err);
}

function extractTokenFromInfo(info) {
    if (!info) return null;
    return info.pushToken ||
           info.subscriptionId ||
           info.oneSignalId ||
           info.userId ||
           info.oneSignalUserId ||
           info.playerId ||
           info.id ||
           (info.subscription && (info.subscription.pushToken || info.subscription.id || info.subscription.subscriptionId || info.subscription.playerId)) ||
           null;
}

function registerToken(playerId) {
    document.getElementById('save-status').innerHTML = '<span class="text-primary">Saving to database...</span>';

    // We use a relative path here to avoid subfolder 404 errors
    fetch('../../backend/registerOnesignalToken.php', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: playerId })
    })
    .then(r => r.json())
    .then(d => {
        if (d.success) {
            document.getElementById('save-status').innerHTML = '<span class="text-success fw-bold">✓ Saved successfully! Refresh page to see it above.</span>';
        } else {
            document.getElementById('save-status').innerHTML = '<span class="text-danger">✗ Backend Error: ' + d.message + '</span>';
        }
    })
    .catch(e => {
        document.getElementById('save-status').innerHTML = '<span class="text-danger">✗ Network error: ' + e.message + '</span>';
    });
}

async function pullFromCapacitor() {
    document.getElementById('detected-id').innerHTML = '<span class="text-warning">Fetching token...</span>';
    const attempts = [];

    try {
        const OS = window.plugins && window.plugins.OneSignal;
        if (OS) {
            if (OS.User && OS.User.pushSubscription && typeof OS.User.pushSubscription.getIdAsync === 'function') {
                try {
                    const id = await OS.User.pushSubscription.getIdAsync();
                    if (id) {
                        document.getElementById('detected-id').textContent = id;
                        registerToken(id);
                        return;
                    }
                    attempts.push('Capacitor getIdAsync returned empty');
                } catch (err) {
                    attempts.push('Capacitor getIdAsync failed: ' + formatErrorMessage(err));
                }
            }

            if (OS.User && OS.User.pushSubscription) {
                const immediateId = OS.User.pushSubscription.token || OS.User.pushSubscription.id;
                if (immediateId) {
                    document.getElementById('detected-id').textContent = immediateId;
                    registerToken(immediateId);
                    return;
                }
                attempts.push('Capacitor pushSubscription token/id unavailable');
            }

            if (typeof OS.getUserId === 'function') {
                try {
                    const id = await OS.getUserId();
                    if (id) {
                        document.getElementById('detected-id').textContent = id;
                        registerToken(id);
                        return;
                    }
                    attempts.push('Capacitor getUserId returned empty');
                } catch (err) {
                    attempts.push('Capacitor getUserId failed: ' + formatErrorMessage(err));
                }
            }
        } else {
            attempts.push('window.plugins.OneSignal unavailable');
        }

        if (window.OneSignal) {
            try {
                if (window.OneSignal.User && window.OneSignal.User.PushSubscription
                    && typeof window.OneSignal.User.PushSubscription.getId === 'function') {
                    const id = await window.OneSignal.User.PushSubscription.getId();
                    if (id) {
                        document.getElementById('detected-id').textContent = id;
                        registerToken(id);
                        return;
                    }
                }
                const fallbackSdkId = (window.OneSignal.User && window.OneSignal.User.onesignalId)
                    || window.OneSignal.userId;
                if (fallbackSdkId) {
                    document.getElementById('detected-id').textContent = fallbackSdkId;
                    registerToken(fallbackSdkId);
                    return;
                }
                if (typeof window.OneSignal.getUserId === 'function') {
                    const id = await window.OneSignal.getUserId();
                    if (id) {
                        document.getElementById('detected-id').textContent = id;
                        registerToken(id);
                        return;
                    }
                }
                attempts.push('OneSignal web SDK did not return token');
            } catch (err) {
                attempts.push('OneSignal web SDK failed: ' + formatErrorMessage(err));
            }
        }

        if (window.gonative && window.gonative.onesignal && typeof window.gonative.onesignal.getInfo === 'function') {
            try {
                const info = await Promise.resolve(window.gonative.onesignal.getInfo());
                const id = extractTokenFromInfo(info);
                if (id) {
                    document.getElementById('detected-id').textContent = id;
                    registerToken(id);
                    return;
                }
                attempts.push('gonative.onesignal.getInfo returned no token fields');
            } catch (err) {
                attempts.push('gonative.onesignal.getInfo failed: ' + formatErrorMessage(err));
            }
        }

        const detail = attempts.length ? '<br><small class="text-muted">' + attempts.join(' | ') + '</small>' : '';
        document.getElementById('detected-id').innerHTML = '<span class="text-danger">No token available yet. Open push permission first and retry.</span>' + detail;
    } catch (e) {
        document.getElementById('detected-id').innerHTML = '<span class="text-danger">Error: ' + formatErrorMessage(e) + '</span>';
    }
}

// Auto-run when Capacitor is ready
document.addEventListener('deviceready', pullFromCapacitor, false);
document.addEventListener('DOMContentLoaded', function () {
    setTimeout(pullFromCapacitor, 700);
});
</script>
</body>
</html>
