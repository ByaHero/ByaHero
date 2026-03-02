<?php
session_start();

// Redirect to login if not logged in
if (!isset($_SESSION['user_id'])) {
    header("Location: ../../../public/login.php?redirect=" . urlencode($_SERVER['REQUEST_URI']));
    exit;
}

require_once '../../../config/db_connection.php';

$userId = $_SESSION['user_id'];
$message = '';
$error = '';

// Handle form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $currentPassword = $_POST['current_password'] ?? '';
    $newPassword = $_POST['new_password'] ?? '';
    $confirmPassword = $_POST['confirm_password'] ?? '';
    
    // Validation
    if (empty($currentPassword) || empty($newPassword) || empty($confirmPassword)) {
        $error = "All fields are required.";
    } elseif (strlen($newPassword) < 6) {
        $error = "New password must be at least 6 characters long.";
    } elseif ($newPassword !== $confirmPassword) {
        $error = "New passwords do not match.";
    } else {
        // Verify current password
        $stmt = $conn->prepare("SELECT password FROM users WHERE id = ?");
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            $error = "User not found. Please log in again.";
            $stmt->close();
        } else {
            $user = $result->fetch_assoc();
            $stmt->close();
            
            if (!password_verify($currentPassword, $user['password'])) {
                $error = "Current password is incorrect.";
            } else {
                // Update password
                $newPasswordHash = password_hash($newPassword, PASSWORD_DEFAULT);
                $stmt = $conn->prepare("UPDATE users SET password = ? WHERE id = ?");
                $stmt->bind_param("si", $newPasswordHash, $userId);
                
                if ($stmt->execute()) {
                    $message = "Password changed successfully!";
                    $stmt->close();
                    
                    // Track password change (security event)
                    try {
                        $stmt = $conn->prepare("INSERT INTO analytics_events (user_id, event_type, event_data, page) VALUES (?, 'setting_changed', ?, ?)");
                        $eventData = json_encode(['setting' => 'Password', 'value' => 'Changed']);
                        $page = '/profile/changePassword';
                        $stmt->bind_param("iss", $userId, $eventData, $page);
                        $stmt->execute();
                        $stmt->close();
                    } catch (Exception $e) {
                        error_log("Analytics error: " . $e->getMessage());
                    }
                } else {
                    $error = "Failed to change password. Please try again.";
                    $stmt->close();
                }
            }
        }
    }
}
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>Change Password - ByaHero</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css">
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded" rel="stylesheet">
  <link rel="stylesheet" href="../../../assets/css/accessibility.css">
  
  <style>
    body {
      font-family: "Segoe UI", sans-serif;
      background-color: #f8f9fa;
      padding-bottom: 80px;
    }
    .password-container {
      margin-top: 70px;
      max-width: 600px;
    }
    .password-card {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .security-icon {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 2.5rem;
      margin: 0 auto 1.5rem;
    }
    .form-label {
      font-weight: 600;
      color: #374151;
      margin-bottom: 0.5rem;
    }
    .form-control:focus {
      border-color: #10b981;
      box-shadow: 0 0 0 0.2rem rgba(16, 185, 129, 0.25);
    }
    .password-requirements {
      background: #f0fdf4;
      border: 1px solid #86efac;
      border-radius: 8px;
      padding: 1rem;
      margin-top: 1rem;
    }
    .password-requirements ul {
      margin: 0;
      padding-left: 1.5rem;
    }
    .password-requirements li {
      color: #15803d;
      font-size: 0.9rem;
    }
    .toggle-password {
      position: absolute;
      right: 10px;
      top: 38px;
      cursor: pointer;
      color: #6b7280;
      user-select: none;
    }
    .toggle-password:hover {
      color: #374151;
    }
    .input-wrapper {
      position: relative;
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

  <div class="container password-container">
    <div class="password-card">
      <div class="security-icon">
        <span class="material-symbols-rounded">lock</span>
      </div>
      
      <h4 class="text-center fw-bold mb-1">Change Password</h4>
      <p class="text-center text-muted mb-4">Update your password to keep your account secure</p>

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
        <div class="mb-3">
          <label for="current_password" class="form-label">Current Password</label>
          <div class="input-wrapper">
            <input 
              type="password" 
              class="form-control" 
              id="current_password" 
              name="current_password" 
              required
              placeholder="Enter current password"
            >
            <span class="material-symbols-rounded toggle-password" onclick="togglePassword('current_password')">visibility</span>
          </div>
        </div>

        <div class="mb-3">
          <label for="new_password" class="form-label">New Password</label>
          <div class="input-wrapper">
            <input 
              type="password" 
              class="form-control" 
              id="new_password" 
              name="new_password" 
              required
              minlength="6"
              placeholder="Enter new password"
            >
            <span class="material-symbols-rounded toggle-password" onclick="togglePassword('new_password')">visibility</span>
          </div>
        </div>

        <div class="mb-3">
          <label for="confirm_password" class="form-label">Confirm New Password</label>
          <div class="input-wrapper">
            <input 
              type="password" 
              class="form-control" 
              id="confirm_password" 
              name="confirm_password" 
              required
              minlength="6"
              placeholder="Confirm new password"
            >
            <span class="material-symbols-rounded toggle-password" onclick="togglePassword('confirm_password')">visibility</span>
          </div>
        </div>

        <div class="password-requirements">
          <strong class="d-block mb-2" style="color: #15803d;">Password Requirements:</strong>
          <ul>
            <li>At least 6 characters long</li>
            <li>Mix of letters and numbers recommended</li>
            <li>Avoid common passwords</li>
          </ul>
        </div>

        <div class="d-grid gap-2 mt-4">
          <button type="submit" class="btn btn-success">
            <span class="material-symbols-rounded" style="font-size:18px; vertical-align:middle">shield</span>
            Update Password
          </button>
          <button type="button" class="btn btn-outline-secondary" onclick="window.location.href='accountSettings.php'">
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
    // Toggle password visibility
    function togglePassword(fieldId) {
      const field = document.getElementById(fieldId);
      const icon = field.nextElementSibling;
      
      if (field.type === 'password') {
        field.type = 'text';
        icon.textContent = 'visibility_off';
      } else {
        field.type = 'password';
        icon.textContent = 'visibility';
      }
    }

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