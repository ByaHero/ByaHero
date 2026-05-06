<?php
require_once __DIR__ . '/../auth_passenger.php';

// Get user data from session
$userId = $_SESSION['user_id'];
$userName = $_SESSION['user_name'] ?? '';
$userEmail = $_SESSION['user_email'] ?? '';
$userProfilePic = $_SESSION['user_profile_picture'] ?? null;
?>
<!doctype html>
<html lang="en">

<head>
  <meta charset="utf-8">
    <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>Account Settings - ByaHero</title>

  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css">

  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0&display=swap" rel="stylesheet" media="print" onload="this.media='all'">

  <link rel="stylesheet" href="../../../assets/css/accessibility.css">

  <style>
    body {
      font-family: "Segoe UI", sans-serif;
      background-color: #f8f9fa;
      padding-bottom: 80px;
    }

    .account-container {
      margin-top: 70px;
      padding: 0 1rem;
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
      font-weight: 600;
      color: #1e3a8a;
      margin-bottom: 0.75rem;
      font-size: 1rem;
      padding-left: 0.25rem;
    }

    .settings-item {
      padding: 16px;
      background-color: white;
      margin-bottom: 0.5rem;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      transition: all 0.2s;
      border: 1px solid #e5e7eb;
    }

    .settings-item:hover {
      background: #f0f4ff;
      border-color: #c7d2fe;
      transform: translateY(-1px);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
    }

    .settings-item:active {
      transform: translateY(0);
    }

    .settings-item .settings-icon {
      font-size: 24px;
      margin-right: 14px;
      color: #6366f1;
      flex-shrink: 0;
    }

    .settings-item .item-label {
      display: flex;
      align-items: center;
      flex: 1;
      min-width: 0;
    }

    .settings-item .item-text {
      display: flex;
      flex-direction: column;
      min-width: 0;
      flex: 1;
    }

    .settings-item .item-title {
      font-weight: 500;
      color: #1f2937;
      font-size: 0.95rem;
      margin-bottom: 2px;
    }

    .settings-item .item-subtitle {
      font-size: 0.8rem;
      color: #6b7280;
      line-height: 1.3;
    }

    .settings-item .chevron {
      color: #9ca3af;
      font-size: 20px;
      flex-shrink: 0;
      margin-left: 8px;
    }

    .user-profile-card {
      background: white;
      border-radius: 14px;
      padding: 1.25rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      margin-bottom: 1.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      border: 1px solid #e5e7eb;
    }

    .user-avatar {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background-color: #ffffff;
      color: #1e3a8a;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.6rem;
      font-weight: bold;
      flex-shrink: 0;
      border: 2px solid #1e3a8a;
      overflow: hidden;
    }

    .user-info {
      flex: 1;
      min-width: 0;
    }

    .user-name {
      font-weight: 600;
      color: #1f2937;
      font-size: 1.05rem;
      margin-bottom: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-email {
      color: #6b7280;
      font-size: 0.85rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .btn-edit-profile {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 500;
      transition: all 0.2s;
      flex-shrink: 0;
    }

    .btn-edit-profile:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
      color: white;
    }

    @media (max-width: 576px) {
      .user-profile-card {
        flex-direction: column;
        text-align: center;
      }

      .user-info {
        width: 100%;
      }

      .btn-edit-profile {
        width: 100%;
      }
    }
  </style>
</head>

<body>
  <?php
  // This variable passes the name to the navbar!
  $pageTitle = 'Profile'; 
  $pageType = 'settings';
  $backLink = 'profile.php';
  $pageDepth = "../../../";
  
  // Go up 3 levels from public/passenger/profile/ to reach the root, then into components/
  require_once "../../../components/navbarPassenger.php";
  ?>

  <div class="container account-container">

    <div class="account-heading">Account Settings</div>
    <p class="account-description">Manage your account security and preferences</p>

    <div class="user-profile-card">
      <div class="user-avatar">
        <?php if ($userProfilePic): ?>
          <?php 
            $isAbsolute = preg_match('~^https?://~i', $userProfilePic);
            $imgSrc = $isAbsolute ? htmlspecialchars($userProfilePic) : $pageDepth . ltrim(htmlspecialchars($userProfilePic), '/');
          ?>
          <img src="<?= $imgSrc ?>" alt="Profile Picture" style="width: 100%; height: 100%; object-fit: cover;">
        <?php else: ?>
          <?= strtoupper(substr($userName ?: $userEmail, 0, 1)) ?>
        <?php endif; ?>
      </div>
      <div class="user-info">
        <div class="user-name"><?= htmlspecialchars($userName ?: 'User') ?></div>
        <div class="user-email"><?= htmlspecialchars($userEmail) ?></div>
      </div>
      <button class="btn btn-edit-profile" onclick="window.location.href='editProfile.php'">
        Edit Profile
      </button>
    </div>

    <div class="account-section">
      <div class="account-section-header">Security</div>

      <div class="settings-item" onclick="window.location.href='changePassword.php'">
        <div class="item-label">
          <span class="material-symbols-rounded settings-icon">lock</span>
          <div class="item-text">
            <div class="item-title">Change Password</div>
            <div class="item-subtitle">Update your password</div>
          </div>
        </div>
        <span class="material-symbols-rounded chevron">chevron_right</span>
      </div>

      <div class="settings-item" onclick="window.location.href='loginActivity.php'">
        <div class="item-label">
          <span class="material-symbols-rounded settings-icon">history</span>
          <div class="item-text">
            <div class="item-title">Login Activity</div>
            <div class="item-subtitle">Recent login sessions</div>
          </div>
        </div>
        <span class="material-symbols-rounded chevron">chevron_right</span>
      </div>
    </div>

    <div class="account-section">
      <div class="account-section-header" style="color: #dc2626;">Danger Zone</div>
      <div class="settings-item" onclick="window.location.href='deleteAccount.php'" style="border-color: #fee2e2;">
        <div class="item-label">
          <span class="material-symbols-rounded settings-icon" style="color: #dc2626;">delete_forever</span>
          <div class="item-text">
            <div class="item-title" style="color: #dc2626;">Delete Account</div>
            <div class="item-subtitle">Permanently remove your account data</div>
          </div>
        </div>
        <span class="material-symbols-rounded chevron" style="color: #fca5a5;">chevron_right</span>
      </div>
    </div>

  </div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
  <script src="../../../assets/js/accessibility.js"></script>
</body>

</html>