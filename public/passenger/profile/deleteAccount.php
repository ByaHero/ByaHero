<?php
session_start();

// Redirect to login if not logged in
if (!isset($_SESSION['user_id'])) {
    header("Location: ../../../public/login.php?redirect=" . urlencode($_SERVER['REQUEST_URI']));
    exit;
}

$userName = $_SESSION['user_name'] ?? 'User';
$userId = $_SESSION['user_id'];

require_once '../../../config/db_connection.php';
$stmt = $conn->prepare("SELECT password FROM users WHERE id = ?");
$stmt->bind_param("i", $userId);
$stmt->execute();
$res = $stmt->get_result();
$userData = $res->fetch_assoc();
$stmt->close();

$hasPassword = !empty($userData['password']);

if (!$hasPassword) {
    header("Location: changePassword.php?from=delete");
    exit;
}
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>Delete Account - ByaHero</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css">
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded" rel="stylesheet">
  <link rel="stylesheet" href="../../../assets/css/accessibility.css">
  
  <style>
    body {
      font-family: "Segoe UI", sans-serif;
      background-color: #f8f9fa;
      padding-bottom: 80px;
    }
    .delete-container {
      margin-top: 70px;
      max-width: 600px;
    }
    .delete-card {
      background: white;
      border-radius: 20px;
      padding: 2.5rem;
      box-shadow: 0 10px 30px rgba(0,0,0,0.08);
      border: 1px solid #fee2e2;
    }
    .warning-icon {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: #fef2f2;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #dc2626;
      font-size: 3rem;
      margin: 0 auto 1.5rem;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4); }
      70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(220, 38, 38, 0); }
      100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
    }
    .warning-box {
      background: #fff1f2;
      border: 1px solid #fecdd3;
      border-radius: 12px;
      padding: 1.25rem;
      margin-bottom: 2rem;
    }
    .warning-title {
      color: #9f1239;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }
    .warning-text {
      color: #be123c;
      font-size: 0.9rem;
      margin: 0;
    }
    .form-label {
      font-weight: 600;
      color: #374151;
    }
    .btn-delete {
      background: #dc2626;
      color: white;
      border: none;
      padding: 0.75rem;
      border-radius: 12px;
      font-weight: 600;
      transition: all 0.2s;
    }
    .btn-delete:hover {
      background: #b91c1c;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
    }
    .btn-delete:disabled {
      background: #f87171;
      transform: none;
      box-shadow: none;
    }
    .toggle-password {
      position: absolute;
      right: 15px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: #6b7280;
      cursor: pointer;
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

  <div class="container delete-container">
    <div class="delete-card">
      <div class="warning-icon">
        <span class="material-symbols-rounded">warning</span>
      </div>
      
      <h3 class="text-center fw-bold mb-2">Delete Account?</h3>
      <p class="text-center text-muted mb-4">We're sorry to see you go, <?= htmlspecialchars($userName) ?>. Please confirm your decision.</p>

      <div class="warning-box">
        <div class="warning-title">
          <span class="material-symbols-rounded" style="font-size: 20px;">info</span>
          Important Information
        </div>
        <ul class="warning-text">
          <li>Your profile and all personal data will be <strong>permanently deleted</strong>.</li>
          <li>Your SOS history and emergency contacts will be erased.</li>
          <li>This action <strong>cannot be undone</strong>.</li>
        </ul>
      </div>

      <div id="alertPlaceholder"></div>

      <form id="deleteForm">
        <div class="mb-4">
          <label for="password" class="form-label">Enter Password to Confirm</label>
          <div class="position-relative">
            <input type="password" class="form-control form-control-lg" id="password" name="password" required placeholder="Current password">
            <button type="button" class="toggle-password" id="togglePassword">
              <span class="material-symbols-rounded" style="font-size: 20px;">visibility_off</span>
            </button>
          </div>
        </div>

        <div class="form-check mb-4">
          <input class="form-check-input" type="checkbox" id="confirmCheck" required>
          <label class="form-check-label text-muted small" for="confirmCheck">
            I understand that my account and all data will be permanently removed.
          </label>
        </div>

        <div class="d-grid gap-2">
          <button type="submit" class="btn btn-delete" id="submitBtn">
            <span id="btnText">Permanently Delete Account</span>
            <span id="btnLoader" class="spinner-border spinner-border-sm d-none" role="status"></span>
          </button>
          <a href="accountSettings.php" class="btn btn-light border py-2" style="border-radius: 12px; font-weight: 600;">Keep My Account</a>
        </div>
      </form>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
  <script src="../../../assets/js/accessibility.js"></script>
  
  <script>
    const form = document.getElementById('deleteForm');
    const submitBtn = document.getElementById('submitBtn');
    const btnText = document.getElementById('btnText');
    const btnLoader = document.getElementById('btnLoader');
    const alertPlaceholder = document.getElementById('alertPlaceholder');

    function showAlert(message, type = 'danger') {
      alertPlaceholder.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
          <span class="material-symbols-rounded" style="font-size:20px; vertical-align:middle">error</span>
          ${message}
          <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
      `;
    }

    // Toggle Password Visibility
    document.getElementById('togglePassword').addEventListener('click', function() {
      const password = document.getElementById('password');
      const icon = this.querySelector('.material-symbols-rounded');
      if (password.type === 'password') {
        password.type = 'text';
        icon.textContent = 'visibility';
      } else {
        password.type = 'password';
        icon.textContent = 'visibility_off';
      }
    });

    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const confirmCheck = document.getElementById('confirmCheck');
      if (!confirmCheck.checked) {
        showAlert('Please check the confirmation box.');
        return;
      }

      // Final confirmation
      if (!confirm('Are you absolutely sure you want to delete your account? This action is IRREVERSIBLE.')) {
        return;
      }

      const password = document.getElementById('password').value;
      
      // UI State: Loading
      submitBtn.disabled = true;
      btnText.classList.add('d-none');
      btnLoader.classList.remove('d-none');
      alertPlaceholder.innerHTML = '';

      try {
        const formData = new FormData();
        formData.append('action', 'delete_account');
        formData.append('password', password);

        const response = await fetch('../../auth_api.php', {
          method: 'POST',
          body: formData
        });

        const data = await response.json();

        if (data.success) {
          window.location.href = '../../../public/' + data.redirect;
        } else {
          showAlert(data.message || 'Failed to delete account. Please check your password.');
          submitBtn.disabled = false;
          btnText.classList.remove('d-none');
          btnLoader.classList.add('d-none');
        }
      } catch (error) {
        showAlert('An error occurred. Please try again later.');
        submitBtn.disabled = false;
        btnText.classList.remove('d-none');
        btnLoader.classList.add('d-none');
      }
    });
  </script>
</body>
</html>
