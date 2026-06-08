<?php
require_once __DIR__ . '/../auth_passenger.php';

require_once '../../../config/db.php';
$conn = db();

$userId = $_SESSION['user_id'];
$message = '';
$error = '';

// Check if user has a password set
$stmt = $conn->prepare("SELECT password FROM users WHERE id = ?");
$stmt->bind_param("i", $userId);
$stmt->execute();
$res = $stmt->get_result();
$userData = $res->fetch_assoc();
$stmt->close();

$hasPassword = !empty($userData['password']);

// Handle form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $currentPassword = $_POST['current_password'] ?? '';
    $newPassword = $_POST['new_password'] ?? '';
    $confirmPassword = $_POST['confirm_password'] ?? '';
    
    // Validation
    if ($hasPassword && empty($currentPassword)) {
        $error = "Current password is required.";
    } elseif (empty($newPassword) || empty($confirmPassword)) {
        $error = "New password fields are required.";
    } elseif (strlen($newPassword) < 6) {
        $error = "New password must be at least 6 characters long.";
    } elseif ($newPassword !== $confirmPassword) {
        $error = "New passwords do not match.";
    } else {
        // Verify current password ONLY if they have one
        if ($hasPassword && !password_verify($currentPassword, $userData['password'])) {
            $error = "Current password is incorrect.";
        } else {
            // Update password
            $newPasswordHash = password_hash($newPassword, PASSWORD_DEFAULT);
            $stmt = $conn->prepare("UPDATE users SET password = ? WHERE id = ?");
            $stmt->bind_param("si", $newPasswordHash, $userId);
                
                if ($stmt->execute()) {
                    $message = $hasPassword ? "Password changed successfully!" : "Password set successfully!";
                    $hasPassword = true; // Update state after setting
                    $stmt->close();
                    
                    // Track password change (security event)
                    try {
                        $stmt = $conn->prepare("INSERT INTO analytics_events (user_id, event_type, event_data, page) VALUES (?, 'setting_changed', ?, ?)");
                        $eventData = json_encode(['setting' => 'Password', 'value' => 'Changed/Set']);
                        $page = '/profile/changePassword';
                        $stmt->bind_param("iss", $userId, $eventData, $page);
                        $stmt->execute();
                        $stmt->close();
                    } catch (Exception $e) {
                        error_log("Analytics error: " . $e->getMessage());
                    }
                } else {
                    $error = "Failed to update password. Please try again.";
                    $stmt->close();
                }
        }
    }
}
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
    <link rel="icon" href="../../../assets/images/byaheroLogoBlue.svg" type="image/svg+xml">
    <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>Change Password - ByaHero</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css">
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
  <link rel="stylesheet" href="../../../assets/css/accessibility.css">
  
  <style>
    body {
      font-family: "Segoe UI", sans-serif;
      background-color: #f8f9fa;
      padding-bottom: 80px;
    }
    .toggle-password{
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      border: 0;
      background: transparent;
      font-weight: 900;
      color: #334155;
      padding: 6px 8px;
      cursor: pointer;
      user-select: none;
      line-height: 1;
    }
    .toggle-password img{
      width: 24px;
      height: 24px;
      object-fit: contain;
      display: block;
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

  <div class="container mt-5 pt-3" style="max-width: 600px; margin-top: 70px !important;">
    <div class="bg-white p-4 p-sm-5 shadow-sm border" style="border-radius: 12px;">
      <div class="d-flex align-items-center justify-content-center rounded-circle text-white mx-auto mb-4" style="width: 80px; height: 80px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); font-size: 2.5rem;">
        <span class="material-symbols-rounded" style="font-size: 2.5rem;">lock</span>
      </div>
      
      <h4 class="text-center fw-bold mb-1"><?= $hasPassword ? 'Change Password' : 'Set Password' ?></h4>
      <p class="text-center text-muted mb-4">
        <?= $hasPassword ? 'Update your password to keep your account secure' : 'Create a password for your account so you can log in without Google.' ?>
      </p>

      <?php if (isset($_GET['from']) && $_GET['from'] === 'delete'): ?>
        <div class="alert alert-warning text-center" style="font-size: 0.9rem;">
          <span class="material-symbols-rounded" style="vertical-align:middle; font-size:18px;">security</span>
          <strong>Security Notice:</strong> You must set a password to verify your identity before you can delete your account.
        </div>
      <?php endif; ?>

      <?php if ($message): ?>
        <div class="alert alert-success alert-dismissible fade show" role="alert">
          <span class="material-symbols-rounded" style="font-size:20px; vertical-align:middle">check_circle</span>
          <?= htmlspecialchars($message) ?>
          <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
      <?php endif; ?>

      <?php if ($error): ?>
        <div class="alert alert-danger alert-dismissible fade show" role="alert">
          <span class="material-symbols-rounded" style="font-size:20px; vertical-align:middle">error</span>
          <?= htmlspecialchars($error) ?>
          <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
      <?php endif; ?>

      <form method="POST" id="passwordForm">
        <?php if ($hasPassword): ?>
        <div class="mb-3">
          <label for="current_password" class="form-label fw-semibold text-secondary mb-2">Current Password</label>
          <div class="position-relative">
            <input 
              type="password" 
              class="form-control pe-5"
              id="current_password" 
              name="current_password" 
              required
              placeholder="Enter current password"
              style="border-radius: 12px; padding: 12px;"
            >
            <button type="button" class="toggle-password" data-target="current_password" aria-label="Show password">
              <img src="../../../assets/images/icons/show.png" alt="Show">
            </button>
          </div>
        </div>
        <?php endif; ?>

        <div class="mb-3">
          <label for="new_password" class="form-label fw-semibold text-secondary mb-2">New Password</label>
          <div class="position-relative">
            <input 
              type="password" 
              class="form-control pe-5"
              id="new_password" 
              name="new_password" 
              required
              minlength="6"
              placeholder="Enter new password"
              style="border-radius: 12px; padding: 12px;"
            >
            <button type="button" class="toggle-password" data-target="new_password" aria-label="Show password">
              <img src="../../../assets/images/icons/show.png" alt="Show">
            </button>
          </div>
        </div>

        <div class="mb-3">
          <label for="confirm_password" class="form-label fw-semibold text-secondary mb-2">Confirm New Password</label>
          <div class="position-relative">
            <input 
              type="password" 
              class="form-control pe-5"
              id="confirm_password" 
              name="confirm_password" 
              required
              minlength="6"
              placeholder="Confirm new password"
              style="border-radius: 12px; padding: 12px;"
            >
            <button type="button" class="toggle-password" data-target="confirm_password" aria-label="Show password">
              <img src="../../../assets/images/icons/show.png" alt="Show">
            </button>
          </div>
        </div>

        <div class="border border-primary-subtle rounded-3 p-3 mt-3" style="background: #eff6ff;">
          <strong class="d-block mb-2" style="color: #1d4ed8;">Password Requirements:</strong>
          <ul class="m-0 ps-4">
            <li class="small" style="color: #1d4ed8;">At least 6 characters long</li>
            <li class="small" style="color: #1d4ed8;">Mix of letters and numbers recommended</li>
            <li class="small" style="color: #1d4ed8;">Avoid common passwords</li>
          </ul>
        </div>

        <div class="d-grid gap-2 mt-4">
          <button type="submit" class="btn btn-primary rounded-pill py-3" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border: none; font-weight: 600;">
            <span class="material-symbols-rounded" style="font-size:18px; vertical-align:middle">shield</span>
            Update Password
          </button>
          <button type="button" class="btn btn-outline-secondary rounded-pill py-3" onclick="location.href = 'accountSettings.php'" style="font-weight: 600;">
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
  <script src="../../../assets/js/accessibility.js"></script>
  <script src="../../../assets/js/analytics.js"></script>
  <script>
    // Toggle password visibility (show.png / shownot.svg)
    document.querySelectorAll('.toggle-password').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-target');
        const field = id ? document.getElementById(id) : null;
        if (!field) return;

        const isPw = field.type === 'password';
        field.type = isPw ? 'text' : 'password';

        btn.innerHTML = isPw
          ? '<img src="../../../assets/images/icons/shownot.svg" alt="Hide">'
          : '<img src="../../../assets/images/icons/show.png" alt="Show">';
      });
    });

    // Password validation
    const form = document.getElementById('passwordForm');
    form.addEventListener('submit', function(e) {
      const newPassword = document.getElementById('new_password').value;
      const confirmPassword = document.getElementById('confirm_password').value;
      
      if (newPassword !== confirmPassword) {
        e.preventDefault();
        alert('New passwords do not match!');
        return false;
      }
      
      // Track password change
      if (typeof analytics !== 'undefined') {
        analytics.settingChanged('Password', 'Changed');
      }
    });
  </script>
</body>
</html>