<?php
/**
 * Token Status Debug Page
 * For testing OneSignal push token registration on Android devices
 */
session_start();

if (!isset($_SESSION['user_id'])) {
    header('Location: ../login.php');
    exit;
}

require_once '../config/db_connection.php';

$userId = (int)$_SESSION['user_id'];
$displayName = $_SESSION['user_name'] ?? $_SESSION['user_email'] ?? 'User #' . $userId;

// Fetch all tokens for this user
$stmt = $conn->prepare("
    SELECT player_id, updated_at 
    FROM user_onesignal_tokens 
    WHERE user_id = ? 
    ORDER BY updated_at DESC
");
$stmt->bind_param("i", $userId);
$stmt->execute();
$result = $stmt->get_result();

$tokens = [];
while ($row = $result->fetch_assoc()) {
    $tokens[] = $row;
}
$stmt->close();

// Check exclusivity (should always be 1 user per player_id because of registerOnesignalToken.php)
$exclusivity = [];
if (!empty($tokens)) {
    foreach ($tokens as $t) {
        $pId = $t['player_id'];
        $check = $conn->prepare("SELECT COUNT(*) as cnt FROM user_onesignal_tokens WHERE player_id = ?");
        $check->bind_param("s", $pId);
        $check->execute();
        $row = $check->get_result()->fetch_assoc();
        $exclusivity[$pId] = (int)$row['cnt'];
        $check->close();
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Token Status Debug</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet">
    <style>
        body { background: #f8f9fa; font-family: system-ui, -apple-system, sans-serif; }
        .card { border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
        .debug-header { background: #1e3a8a; color: white; padding: 1rem; border-radius: 16px 16px 0 0; }
        .token-box { font-family: monospace; background: #f1f3f5; padding: 12px; border-radius: 8px; word-break: break-all; }
    </style>
</head>
<body class="pb-5">

<div class="debug-header text-center">
    <h4 class="mb-0">🔍 Token Status Debug</h4>
    <small>OneSignal Push Token Tester</small>
</div>

<div class="container mt-3">

    <div class="card mb-4">
        <div class="card-body">
            <h5>👤 Logged-in User</h5>
            <p class="mb-1"><strong>Name:</strong> <?= htmlspecialchars($displayName) ?></p>
            <p class="mb-0"><strong>User ID:</strong> <span class="badge bg-primary"><?= $userId ?></span></p>
        </div>
    </div>

    <?php if (empty($tokens)): ?>
        <div class="alert alert-warning">
            <h5>No token registered yet</h5>
            <p>Open the Android app → it should auto-register the token within a few seconds.</p>
        </div>
    <?php else: ?>
        <div class="card mb-4">
            <div class="card-header bg-white fw-bold">📱 Registered Token(s) for this user</div>
            <div class="card-body">
                <?php foreach ($tokens as $token): ?>
                    <div class="mb-4 border-bottom pb-3">
                        <div class="token-box mb-2">
                            <?= htmlspecialchars($token['player_id']) ?>
                        </div>
                        <small class="text-muted">
                            Last updated: <?= date('M d, Y • h:i:s A', strtotime($token['updated_at'])) ?>
                        </small>
                        <?php if (isset($exclusivity[$token['player_id']])): ?>
                            <span class="badge bg-<?= $exclusivity[$token['player_id']] === 1 ? 'success' : 'danger' ?>">
                                <?= $exclusivity[$token['player_id']] === 1 ? '✅ Exclusive (correct)' : '⚠️ Shared with ' . ($exclusivity[$token['player_id']]-1) . ' other user(s)' ?>
                            </span>
                        <?php endif; ?>
                    </div>
                <?php endforeach; ?>
            </div>
        </div>
    <?php endif; ?>

    <!-- Quick Actions -->
    <div class="card mb-4">
        <div class="card-body">
            <h5>🧪 Quick Test Actions</h5>
            
            <button onclick="forceRegisterToken()" class="btn btn-primary w-100 mb-3 py-3 rounded-4 fw-bold">
                🔄 Force Register Token (from localStorage / Bridge)
            </button>

            <a href="../logout.php" class="btn btn-outline-danger w-100 py-3 rounded-4 fw-bold">
                Log Out &amp; Test Fresh Login
            </a>
        </div>
    </div>

    <div class="text-center text-muted small">
        Refresh this page after opening the Android app.<br>
        The token should appear automatically within 5–10 seconds.
    </div>
</div>

<script src="../assets/js/capacitor_onesignal_bridge.js"></script>
<script>
function forceRegisterToken() {
    const pending = localStorage.getItem('byahero_pending_fcm_token');
    const bridgeToken = window._sosPendingToken || null;

    let playerId = pending || bridgeToken;

    if (!playerId) {
        alert('No token found in localStorage or bridge yet.\n\nOpen the Android app first!');
        return;
    }

    if (confirm('Register token:\n' + playerId + '\n\nContinue?')) {
        fetch('../backend/registerOnesignalToken.php', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ player_id: playerId })
        })
        .then(r => r.json())
        .then(d => {
            if (d.success) {
                alert('✅ Token registered successfully!');
                location.reload();
            } else {
                alert('⚠️ ' + (d.message || 'Failed'));
            }
        })
        .catch(() => alert('Network error – check your connection'));
    }
}

// Auto-refresh every 8 seconds while debugging
setTimeout(() => location.reload(), 8000);
</script>

</body>
</html>