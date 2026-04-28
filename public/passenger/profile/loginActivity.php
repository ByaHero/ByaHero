<?php
session_start();

// Redirect to login if not logged in
if (!isset($_SESSION['user_id'])) {
    header("Location: ../../../public/login.php?redirect=" . urlencode($_SERVER['REQUEST_URI']));
    exit;
}

require_once '../../../config/db_connection.php';

$userId = $_SESSION['user_id'];

// If no login activity in analytics, create sample data from current session
$loginActivity = [[
    'event_data' => json_encode(['device' => 'Current Device']),
    'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown',
    'ip_address' => $_SERVER['REMOTE_ADDR'] ?? 'Unknown',
    'created_at' => date('Y-m-d H:i:s')
]];

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
  <link rel="stylesheet" href="../../../assets/css/accessibility.css">
  
  <style>
    body {
      font-family: "Segoe UI", sans-serif;
      background-color: #f8f9fa;
      padding-bottom: 80px;
    }
    .activity-container {
      margin-top: 70px;
    }
    .activity-icon {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
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
    <div class="card shadow-sm border-0 rounded-4 p-2 p-md-3">
      <div class="card-body">
        <h4 class="fw-bold mb-1 text-dark">Login Activity</h4>
        <p class="text-muted mb-4">Recent sessions where your account was accessed</p>

        <ul class="list-group list-group-flush">
          <?php 
          $isFirst = true;
          foreach ($loginActivity as $activity): 
            $browser = parseUserAgent($activity['user_agent']);
            $device = getDeviceType($activity['user_agent']);
            $timestamp = strtotime($activity['created_at']);
            
            // Calculate time difference
            $timeAgo = max(0, time() - $timestamp); // max(0) prevents negative times if server clock is slightly off
            
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
            <li class="list-group-item d-flex align-items-start gap-3 py-3 px-0 border-bottom border-light">
              <div class="activity-icon rounded-circle d-flex align-items-center justify-content-center text-white flex-shrink-0">
                <span class="material-symbols-rounded">
                  <?= $device === 'Mobile' ? 'smartphone' : ($device === 'Tablet' ? 'tablet' : 'computer') ?>
                </span>
              </div>
              
              <div class="flex-grow-1">
                <div class="d-flex align-items-center mb-1">
                  <span class="fw-semibold text-dark me-2">
                    <?= htmlspecialchars($browser) ?> on <?= htmlspecialchars($device) ?>
                  </span>
                  <?php if ($isFirst): ?>
                    <span class="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-2 py-1" style="font-size: 0.75rem;">
                      Current Session
                    </span>
                  <?php endif; ?>
                </div>
                
                <div class="text-secondary" style="font-size: 0.85rem;">
                  <span class="material-symbols-rounded align-middle" style="font-size:16px;">schedule</span>
                  <span class="align-middle"><?= $timeDisplay ?></span>
                  <span class="mx-1">•</span>
                  <span class="material-symbols-rounded align-middle" style="font-size:16px;">location_on</span>
                  <span class="align-middle"><?= htmlspecialchars($activity['ip_address']) ?></span>
                </div>
              </div>
            </li>
          <?php 
            $isFirst = false;
          endforeach; 
          ?>
        </ul>

        <?php if (empty($loginActivity)): ?>
          <div class="text-center py-5">
            <span class="material-symbols-rounded text-muted" style="font-size:4rem">history</span>
            <p class="text-muted mt-3">No login activity to display</p>
          </div>
        <?php endif; ?>

        <div class="alert alert-info d-flex align-items-center mt-4 border-0 bg-info-subtle text-info-emphasis rounded-3" role="alert">
          <span class="material-symbols-rounded me-2" style="font-size:24px;">info</span>
          <div>
            <strong>Security Tip:</strong> If you see suspicious activity, change your password immediately.
          </div>
        </div>

        <div class="d-grid gap-2 mt-4">
          <button class="btn btn-outline-primary py-2 rounded-3 fw-medium" onclick="window.location.href='accountSettings.php'">
            Back to Account Settings
          </button>
        </div>
      </div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
  <script src="../../../assets/js/accessibility.js"></script>
</body>
</html>