<?php
/**
 * Check what OneSignal tokens are in the database
 * Visit: /backend/check_tokens.php
 */
require_once '../config/db_connection.php';

header('Content-Type: text/html; charset=utf-8');
?>
<!doctype html>
<html>
<head>
    <title>Token Check</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <style>
        body { font-family: monospace; padding: 20px; background: #1a1a2e; color: #eee; }
        .row { padding: 8px; border-bottom: 1px solid #333; }
        .valid { color: #4ade80; }
        .invalid { color: #f87171; }
        .empty { color: #fbbf24; }
        h2 { color: #60a5fa; }
    </style>
</head>
<body>
    <h2>OneSignal Tokens in Database</h2>
    <p>Check the user_onesignal_tokens table</p>

    <?php
    // Check if table exists
    $checkTable = $conn->query("SHOW TABLES LIKE 'user_onesignal_tokens'");
    if ($checkTable->num_rows === 0) {
        echo '<p style="color:#f87171">ERROR: Table user_onesignal_tokens does not exist!</p>';
        echo '<p>Create it with:</p><pre style="background:#222;padding:10px;">';
        echo htmlspecialchars("CREATE TABLE user_onesignal_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    player_id VARCHAR(255) NOT NULL UNIQUE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_player_id (player_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
        echo '</pre>';
        exit;
    }

    // Get all tokens
    $result = $conn->query("SELECT t.id, t.user_id, t.player_id, t.updated_at, u.email, u.name
        FROM user_onesignal_tokens t
        LEFT JOIN users u ON t.user_id = u.id
        ORDER BY t.updated_at DESC");

    if ($result->num_rows === 0) {
        echo '<p style="color:#fbbf24">No tokens found in database. Your phone never registered.</p>';
    } else {
        echo '<p>Found ' . $result->num_rows . ' token(s):</p>';

        while ($row = $result->fetch_assoc()) {
            $playerId = $row['player_id'] ?? '';
            $isValid = false;
            $statusClass = 'invalid';
            $statusText = 'INVALID';

            // OneSignal Subscription IDs are typically 36 chars (UUID format)
            // Format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
            if (strlen($playerId) >= 30 && preg_match('/^[a-f0-9-]+$/i', $playerId)) {
                $isValid = true;
                $statusClass = 'valid';
                $statusText = 'VALID';
            } elseif (empty($playerId) || strlen($playerId) < 10) {
                $statusClass = 'empty';
                $statusText = 'EMPTY/TOO SHORT';
            }

            echo '<div class="row">';
            echo '<div>ID: ' . (int)$row['id'] . '</div>';
            echo '<div>User ID: ' . (int)$row['user_id'] . ' (' . htmlspecialchars($row['email'] ?? 'unknown') . ')</div>';
            echo '<div>Player ID: <span class="' . $statusClass . '">' . htmlspecialchars($playerId) . '</span></div>';
            echo '<div>Status: <span class="' . $statusClass . '">' . $statusText . '</span></div>';
            echo '<div>Updated: ' . htmlspecialchars($row['updated_at']) . '</div>';
            echo '</div>';
        }
    }

    // Test OneSignal API directly
    echo '<h2 style="margin-top:30px">OneSignal API Test</h2>';

    define('ONESIGNAL_APP_ID', 'b755dd29-1de2-4cf1-9381-6a9b436bc049');
    define('ONESIGNAL_REST_API_KEY', 'os_v2_app_w5k52ki54jgpde4bnknug26ajffmpqdyhshutleosxotea2neg6pcnw6lqotnv67mcb7p3rr3d37pglprqyefcfihmdnqxbijny3pzi');

    // Get a valid player ID to test with
    $validTokens = $conn->query("SELECT player_id FROM user_onesignal_tokens WHERE LENGTH(player_id) >= 30 LIMIT 1");
    if ($validTokens->num_rows > 0) {
        $testRow = $validTokens->fetch_assoc();
        $testPlayerId = $testRow['player_id'];

        echo '<p>Testing with player ID: <code>' . htmlspecialchars($testPlayerId) . '</code></p>';

        // Try to get subscription info from OneSignal
        $ch = curl_init('https://onesignal.com/api/v1/players/' . urlencode($testPlayerId) . '?app_id=' . ONESIGNAL_APP_ID);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: Basic ' . ONESIGNAL_REST_API_KEY,
            ],
            CURLOPT_TIMEOUT => 10,
        ]);

        $response = curl_exec($ch);
        $error = curl_error($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        echo '<div style="background:#222;padding:10px;border-radius:8px;">';
        echo '<div>HTTP Code: ' . $httpCode . '</div>';
        if ($error) {
            echo '<div style="color:#f87171">cURL Error: ' . htmlspecialchars($error) . '</div>';
        }
        echo '<div>Response: <pre style="overflow:auto;max-height:200px;">' . htmlspecialchars($response) . '</pre></div>';
        echo '</div>';

        if ($httpCode === 200) {
            echo '<p style="color:#4ade80">This player ID is VALID in OneSignal!</p>';
        } elseif ($httpCode === 400 || $httpCode === 404) {
            echo '<p style="color:#f87171">This player ID is INVALID or not found in OneSignal.</p>';
        }
    } else {
        echo '<p style="color:#fbbf24">No valid-looking tokens to test with.</p>';
    }
    ?>

    <p style="margin-top:30px"><a href="check_tokens.php" style="color:#60a5fa">Refresh</a></p>
</body>
</html>
