<?php
session_start();

// Redirect to login if not logged in
if (!isset($_SESSION['user_id'])) {
    header("Location: ../../../public/login.php?redirect=" . urlencode($_SERVER['REQUEST_URI']));
    exit;
}

// Get user data from session
$userId = $_SESSION['user_id'];
$userName = $_SESSION['user_name'] ?? '';
$userEmail = $_SESSION['user_email'] ?? '';
?>
<!doctype html>
<html lang="en">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>Account Settings - ByaHero</title>

  <!-- Bootstrap -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css">

  <!-- Material Icons -->
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded" rel="stylesheet">

  <!-- Global Accessibility -->
  <link rel="stylesheet" href="../../../assets/images/css/accessibility.css">

  <style>
    body {
      font-family: "Segoe UI", sans-serif;
      background-color: #f8f9fa;
      padding-bottom: 80px;
    }

    .account-container {
      margin-top: 70px;
    }

    .account-heading {
      font-weight: bold;
      font-size: 1.3rem;
      color: #1e3a8a;
      margin-bottom: 0.5rem;
    }

    .account-description {
      color: #6b7280;
      font-size: 0.9rem;
      margin-bottom: 1.5rem;
    }

    .account-section {
      margin-top: 1.5rem;
    }

    .account-section-header {
      font-weight: bold;
      color: #1e3a8a;
      margin-bottom: 0.5rem;
      font-size: 1.1rem;
    }

    .settings-item {
      padding: 14px 16px;
      background-color: white;
      margin: 0.5rem 0;
      border-radius: 10px;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      transition: background 0.2s;
    }

    .settings-item .settings-icon {
      font-size: 1.3rem;
      margin-right: 12px;
      color: #4b5563;
    }

    .settings-item:hover {
      background: #e8eaf6;
    }

    .settings-item .item-label {
      display: flex;
      align-items: center;
      flex: 1;
    }

    .settings-item .item-text {
      display: flex;
      flex-direction: column;
    }

    .settings-item .item-title {
      font-weight: 500;
      color: #1f2937;
    }

    .settings-item .item-subtitle {
      font-size: 0.8rem;
      color: #6b7280;
      margin-top: 2px;
    }

    .user-profile-card {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      margin-bottom: 1.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .user-avatar {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 1.5rem;
      font-weight: bold;
    }

    .user-info {
      flex: 1;
    }

    .user-name {
      font-weight: 600;
      color: #1f2937;
      font-size: 1.1rem;
    }

    .user-email {
      color: #6b7280;
      font-size: 0.9rem;
    }

    .danger-zone {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 10px;
      padding: 1rem;
      margin-top: 2rem;
    }

    .danger-zone-title {
      color: #dc2626;
      font-weight: 600;
      margin-bottom: 0.5rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
  </style>
</head>

<body>
  <?php
  $pageType = 'settings';
  $backLink = 'settings.php';
  $pageDepth = "../../../";
  include "../../../components/navbarPassenger.php";
  ?>

  <!-- Main Content -->
  <div class="container account-container">

    <!-- Heading -->
    <div class="account-heading">Account Settings</div>
    <p class="account-description">Manage your account information and security</p>

    <!-- User Profile Card -->
    <div class="user-profile-card">
      <div class="user-avatar">
        <?= strtoupper(substr($userName ?: $userEmail, 0, 1)) ?>
      </div>
      <div class="user-info">
        <div class="user-name"><?= htmlspecialchars($userName ?: 'User') ?></div>
        <div class="user-email"><?= htmlspecialchars($userEmail) ?></div>
      </div>
      <button class="btn btn-outline-primary btn-sm" onclick="window.location.href='editProfile.php'">
        Edit Profile
      </button>
    </div>

    <!-- Account Section -->
    <div class="account-section">
      <div class="account-section-header">Account</div>
      
      <div class="settings-item" onclick="window.location.href='editProfile.php'">
        <div class="item-label">
          <span class="material-symbols-rounded settings-icon">person</span>
          <div class="item-text">
            <div class="item-title">Personal Information</div>
            <div class="item-subtitle">Name, email, and profile details</div>
          </div>
        </div>
        <span class="material-symbols-rounded text-muted">chevron_right</span>
      </div>

      <div class="settings-item" onclick="window.location.href='changePassword.php'">
        <div class="item-label">
          <span class="material-symbols-rounded settings-icon">key</span>
          <div class="item-text">
            <div class="item-title">Change Password</div>
            <div class="item-subtitle">Update your password</div>
          </div>
        </div>
        <span class="material-symbols-rounded text-muted">chevron_right</span>
      </div>

      <div class="settings-item" onclick="window.location.href='loginActivity.php'">
        <div class="item-label">
          <span class="material-symbols-rounded settings-icon">history</span>
          <div class="item-text">
            <div class="item-title">Login Activity</div>
            <div class="item-subtitle">Recent login sessions</div>
          </div>
        </div>
        <span class="material-symbols-rounded text-muted">chevron_right</span>
      </div>
    </div>

    <!-- Privacy & Security Section -->
    <div class="account-section">
      <div class="account-section-header">Privacy & Security</div>
      
      <div class="settings-item" onclick="window.location.href='privacySecurity.php'">
        <div class="item-label">
          <span class="material-symbols-rounded settings-icon">lock</span>
          <div class="item-text">
            <div class="item-title">Privacy Settings</div>
            <div class="item-subtitle">Control your data and permissions</div>
          </div>
        </div>
        <span class="material-symbols-rounded text-muted">chevron_right</span>
      </div>

      <div class="settings-item" onclick="window.location.href='dataDownload.php'">
        <div class="item-label">
          <span class="material-symbols-rounded settings-icon">download</span>
          <div class="item-text">
            <div class="item-title">Download Your Data</div>
            <div class="item-subtitle">Get a copy of your information</div>
          </div>
        </div>
        <span class="material-symbols-rounded text-muted">chevron_right</span>
      </div>
    </div>

    <!-- Danger Zone -->
    <div class="danger-zone">
      <div class="danger-zone-title">
        <span class="material-symbols-rounded">warning</span>
        Danger Zone
      </div>
      <p class="text-muted small mb-3">Once you delete your account, there is no going back. Please be certain.</p>
      <button class="btn btn-danger btn-sm" onclick="confirmDeleteAccount()">
        <span class="material-symbols-rounded" style="font-size:16px; vertical-align:middle">delete_forever</span>
        Delete Account
      </button>
    </div>

  </div>

  <!-- Bootstrap JS -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
  <script src="../../../assets/images/js/accessibility.js"></script>
  <script src="../../../assets/images/js/analytics.js"></script>
  
  <script>
    // Track page view
    if (typeof analytics !== 'undefined') {
      // Analytics already auto-tracks page view
    }

    // Delete account confirmation
    function confirmDeleteAccount() {
      if (confirm('⚠️ Are you absolutely sure?\n\nThis will permanently delete your account and all associated data. This action cannot be undone.')) {
        if (confirm('🔴 Final confirmation: Type your email to confirm deletion\n\nYour email: <?= htmlspecialchars($userEmail) ?>')) {
          // Track deletion attempt
          if (typeof analytics !== 'undefined') {
            analytics.featureUsed('Account Deletion Requested');
          }
          
          window.location.href = '../../../backend/deleteAccount.php';
        }
      }
    }

    // Track button clicks
    document.querySelectorAll('.settings-item').forEach(item => {
      item.addEventListener('click', function() {
        const title = this.querySelector('.item-title')?.textContent;
        if (typeof analytics !== 'undefined' && title) {
          analytics.buttonClick('Account Settings - ' + title);
        }
      });
    });
  </script>
</body>

</html>