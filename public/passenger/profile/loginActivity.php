<?php
session_start();

// Redirect to login if not logged in
if (!isset($_SESSION['user_id'])) {
    header("Location: ../../../public/login.php?redirect=" . urlencode($_SERVER['REQUEST_URI']));
    exit;
}

require_once '../../../config/db_connection.php';

$userId = $_SESSION['user_id'];

// Fetch login activity from analytics_events
$stmt = $conn->prepare("
    SELECT 
        event_data,
        page,
        user_agent,
        ip_address,
        created_at
    FROM analytics_events 
    WHERE user_id = ? AND event_type = 'page_view' AND page LIKE '%login%'
    ORDER BY created_at DESC 
    LIMIT 20
");
$stmt->bind_param("i", $userId);
$stmt->execute();
$result = $stmt->get_result();
$loginActivity = $result->fetch_all(MYSQLI_ASSOC);
$stmt->close();

// If no login activity in analytics, create sample data from current session
if (empty($loginActivity)) {
    $loginActivity = [[
        'event_data' => json_encode(['device' => 'Current Device']),
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown',
        'ip_address' => $_SERVER['REMOTE_ADDR'] ?? 'Unknown',
        'created_at' => date('Y-m-d H:i:s')
    ]];
}

// Function to parse user agent
function parseUserAgent($userAgent) {
    if (stripos($userAgent, 'Chrome') !== false) return 'Chrome';
    if (stripos($userAgent, 'Firefox') !== false) return 'Firefox';
    if (stripos($userAgent, 'Safari') !== false) return 'Safari';
    if (stripos($userAgent, 'Edge') !== false) return 'Edge';
    return 'Unknown Browser';
}

function getDeviceType($userAgent) {
    if (stripos($userAgent, 'Mobile') !== false || stripos($userAgent, 'Android') !== false) {
        return 'Mobile';
    }
    if (stripos($userAgent, 'Tablet') !== false || stripos($userAgent, 'iPad') !== false) {
        return 'Tablet';
    }
    return 'Desktop';
}
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>Login Activity - ByaHero</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css">
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded" rel="stylesheet">
  <link rel="stylesheet" href="../../../assets/images/css/accessibility.css">
  
  <style>
    body {
      font-family: "Segoe UI", sans-serif;
      background-color: #f8f9fa;
      padding-bottom: 80px;
    }
    .activity-container {
      margin-top: 70px;
    }
    .activity-card {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .activity-item {
      padding: 1rem;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      align-items: start;
      gap: 1rem;
    }
    .activity-item:last-child {
      border-bottom: none;
    }
    .activity-icon {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      flex-shrink: 0;
    }
    .activity-details {
      flex: 1;
    }
    .activity-title {
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 0.25rem;
    }
    .activity-meta {
      color: #6b7280;
      font-size: 0.85rem;
    }
    .current-session {
      background: #dbeafe;
      border: 1px solid #93c5fd;
      border-radius: 8px;
      padding: 0.5rem 1rem;
      display: inline-block;
      font-size: 0.75rem;
      font-weight: 600;
      color: #1e40af;
    }
  </style>
</head>
<body>
  <?php
  $pageType = 'settings';
  $backLink = 'accountSettings.php';
  $pageDepth = "../../../";
  include "../../../components/navbarPassenger.php";
  ?>

  <div class="container activity-container">
    <div class="activity-card">
      <h4 class="fw-bold mb-1">Login Activity</h4>
      <p class="text-muted mb-4">Recent sessions where your account was accessed</p>

      <div class="activity-list">
        <?php 
        $isFirst = true;
        foreach ($loginActivity as $activity): 
          $browser = parseUserAgent($activity['user_agent']);
          $device = getDeviceType($activity['user_agent']);
          $timestamp = strtotime($activity['created_at']);
          $timeAgo = time() - $timestamp;
          
          if ($timeAgo < 60) {
            $timeDisplay = 'Just now';
          } elseif ($timeAgo < 3600) {
            $timeDisplay = floor($timeAgo / 60) . ' minutes ago';
          } elseif ($timeAgo < 86400) {
            $timeDisplay = floor($timeAgo / 3600) . ' hours ago';
          } else {
            $timeDisplay = date('M j, Y g:i A', $timestamp);
          }
        ?>
          <div class="activity-item">
            <div class="activity-icon">
              <span class="material-symbols-rounded">
                <?= $device === 'Mobile' ? 'smartphone' : ($device === 'Tablet' ? 'tablet' : 'computer') ?>
              </span>
            </div>
            <div class="activity-details">
              <div class="activity-title">
                <?= htmlspecialchars($browser) ?> on <?= htmlspecialchars($device) ?>
                <?php if ($isFirst): ?>
                  <span class="current-session ms-2">Current Session</span>
                <?php endif; ?>
              </div>
              <div class="activity-meta">
                <span class="material-symbols-rounded" style="font-size:14px; vertical-align:middle">schedule</span>
                <?= $timeDisplay ?>
                <span class="mx-2">•</span>
                <span class="material-symbols-rounded" style="font-size:14px; vertical-align:middle">location_on</span>
                <?= htmlspecialchars($activity['ip_address']) ?>
              </div>
            </div>
          </div>
        <?php 
          $isFirst = false;
        endforeach; 
        ?>

        <?php if (empty($loginActivity)): ?>
          <div class="text-center py-5">
            <span class="material-symbols-rounded text-muted" style="font-size:4rem">history</span>
            <p class="text-muted mt-3">No login activity to display</p>
          </div>
        <?php endif; ?>
      </div>

      <div class="alert alert-info mt-4" role="alert">
        <span class="material-symbols-rounded" style="font-size:20px; vertical-align:middle">info</span>
        <strong>Security Tip:</strong> If you see suspicious activity, change your password immediately.
      </div>

      <div class="d-grid gap-2 mt-3">
        <button class="btn btn-outline-primary" onclick="window.location.href='accountSettings.php'">
          Back to Account Settings
        </button>
      </div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
  <script src="../../../assets/images/js/accessibility.js"></script>
  <script src="../../../assets/images/js/analytics.js"></script>
</body>
</html>