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
    try { return JSON.stringify(err); } catch (jsonError) {}
    return String(err);
}

function extractTokenFromInfo(info) {
    if (!info) return null;
    const subscription = info.subscription || null;
    const subscriptionToken = subscription && (
        subscription.pushToken ||
        subscription.id ||
        subscription.subscriptionId ||
        subscription.playerId
    );
    return info.pushToken ||
           info.subscriptionId ||
           info.oneSignalId ||
           info.userId ||
           info.oneSignalUserId ||
           info.playerId ||
           info.id ||
           subscriptionToken ||
           null;
}

// Small delay to let Capacitor/OneSignal plugin finish bootstrapping on some devices.
const CAPACITOR_READY_DELAY_MS = 700;
const CAPACITOR_INIT_RETRY_DELAY_MS = 800;

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

function setDetectedTokenAndRegister(token) {
    setDetectedMessage(token, 'fw-bold text-break');
    registerToken(token);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function ensureCapacitorPushReady(OS, attempts) {
    if (!OS) return;

    try {
        if (OS.Notifications && typeof OS.Notifications.requestPermission === 'function') {
            await OS.Notifications.requestPermission(true);
            return;
        }
    } catch (err) {
        attempts && attempts.push('Capacitor requestPermission failed: ' + formatErrorMessage(err));
    }

    try {
        if (typeof OS.registerForPushNotifications === 'function') {
            OS.registerForPushNotifications();
            return;
        }
    } catch (err) {
        attempts && attempts.push('Capacitor registerForPushNotifications failed: ' + formatErrorMessage(err));
    }

    try {
        if (OS.User && OS.User.pushSubscription && typeof OS.User.pushSubscription.optIn === 'function') {
            OS.User.pushSubscription.optIn();
        }
    } catch (err) {
        attempts && attempts.push('Capacitor pushSubscription.optIn failed: ' + formatErrorMessage(err));
    }
}

function registerToken(playerId) {
    setStatusMessage('Saving to database...', 'text-primary');

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
            setStatusMessage('✓ Saved successfully! Refresh page to see it above.', 'text-success fw-bold');
        } else {
            setStatusMessage('✗ Backend Error: ' + (d.message || 'Unknown backend error'), 'text-danger');
        }
    })
    .catch(e => {
        setStatusMessage('✗ Network error: ' + formatErrorMessage(e), 'text-danger');
    });
}

async function pullFromCapacitor() {
    setDetectedMessage('Fetching token...', 'fw-bold text-break text-warning');
    const attempts = [];

    try {
        const OS = window.plugins && window.plugins.OneSignal;
        if (OS) {
            await ensureCapacitorPushReady(OS, attempts);

            if (OS.User && OS.User.pushSubscription && typeof OS.User.pushSubscription.getIdAsync === 'function') {
                try {
                    const id = await OS.User.pushSubscription.getIdAsync();
                    if (id) {
                        setDetectedTokenAndRegister(id);
                        return;
                    }
                    attempts.push('Capacitor getIdAsync returned empty');
                } catch (err) {
                    attempts.push('Capacitor getIdAsync failed: ' + formatErrorMessage(err));
                    // Some builds need registration/init context before getIdAsync can return.
                    await ensureCapacitorPushReady(OS, attempts);
                    await sleep(CAPACITOR_INIT_RETRY_DELAY_MS);
                    try {
                        const retryId = await OS.User.pushSubscription.getIdAsync();
                        if (retryId) {
                            setDetectedTokenAndRegister(retryId);
                            return;
                        }
                        attempts.push('Capacitor getIdAsync retry returned empty');
                    } catch (retryErr) {
                        attempts.push('Capacitor getIdAsync retry failed: ' + formatErrorMessage(retryErr));
                    }
                }
            }

            if (OS.User && OS.User.pushSubscription) {
                const tokenOrId = OS.User.pushSubscription.token || OS.User.pushSubscription.id;
                if (tokenOrId) {
                    setDetectedTokenAndRegister(tokenOrId);
                    return;
                }
                attempts.push('Capacitor pushSubscription token/id unavailable');
            }

            if (typeof OS.getUserId === 'function') {
                try {
                    const id = await OS.getUserId();
                    if (id) {
                        setDetectedTokenAndRegister(id);
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
                        setDetectedTokenAndRegister(id);
                        return;
                    }
                }
                const fallbackSdkId = (window.OneSignal.User && window.OneSignal.User.onesignalId)
                    || window.OneSignal.userId;
                if (fallbackSdkId) {
                    setDetectedTokenAndRegister(fallbackSdkId);
                    return;
                }
                if (typeof window.OneSignal.getUserId === 'function') {
                    const id = await window.OneSignal.getUserId();
                    if (id) {
                        setDetectedTokenAndRegister(id);
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
                    setDetectedTokenAndRegister(id);
                    return;
                }
                attempts.push('gonative.onesignal.getInfo returned no token fields');
            } catch (err) {
                attempts.push('gonative.onesignal.getInfo failed: ' + formatErrorMessage(err));
            }
        }

        const detected = document.getElementById('detected-id');
        detected.className = 'fw-bold text-break text-danger';
        detected.textContent = 'No token available yet. Open push permission first and retry.';
        if (attempts.length) {
            const detail = document.createElement('small');
            detail.className = 'text-muted d-block mt-1';
            detail.textContent = attempts.join(' | ');
            detected.appendChild(detail);
        }
    } catch (e) {
        const detected = document.getElementById('detected-id');
        detected.className = 'fw-bold text-break text-danger';
        detected.textContent = 'Error: ' + formatErrorMessage(e);
    }
}

// Auto-run when Capacitor is ready
document.addEventListener('deviceready', pullFromCapacitor, false);
document.addEventListener('DOMContentLoaded', function () {
    setTimeout(pullFromCapacitor, CAPACITOR_READY_DELAY_MS);
});
</script>
</body>
</html>
