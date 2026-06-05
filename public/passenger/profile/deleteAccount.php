<?php
require_once __DIR__ . '/../auth_passenger.php';

$userName = $_SESSION['user_name'] ?? 'User';
$userId = $_SESSION['user_id'];

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
  <title>Delete Account - ByaHero</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css">
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
  <link rel="stylesheet" href="../../../assets/css/accessibility.css">
  
  <style>
    body {
      font-family: "Segoe UI", sans-serif;
      background-color: #f8f9fa;
      padding-bottom: 80px;
    }
    .warning-icon-pulse {
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4); }
      70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(220, 38, 38, 0); }
      100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
    }
    .btn-delete-hover:hover {
      background: #b91c1c !important;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3) !important;
    }
    .btn-delete-hover:active {
      transform: translateY(1px);
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
    <div class="bg-white p-4 p-sm-5 shadow-sm border border-danger-subtle" style="border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.08) !important;">
      <div class="d-flex align-items-center justify-content-center rounded-circle text-danger mx-auto mb-4 warning-icon-pulse" style="width: 80px; height: 80px; background: #fef2f2; font-size: 3rem;">
        <span class="material-symbols-rounded" style="font-size: 3rem;">warning</span>
      </div>
      
      <h3 class="text-center fw-bold mb-2">Delete Account?</h3>
      <p class="text-center text-muted mb-4">We're sorry to see you go, <?= htmlspecialchars($userName) ?>. Please confirm your decision.</p>

      <div class="border border-danger-subtle rounded-3 p-4 mb-4" style="background: #fff1f2; border-radius: 12px;">
        <div class="fw-bold d-flex align-items-center gap-2 mb-2" style="color: #9f1239;">
          <span class="material-symbols-rounded" style="font-size: 20px;">info</span>
          Important Information
        </div>
        <ul class="small mb-0" style="color: #be123c;">
          <li>Your profile and all personal data will be <strong>permanently deleted</strong>.</li>
          <li>Your SOS history and emergency contacts will be erased.</li>
          <li>This action <strong>cannot be undone</strong>.</li>
        </ul>
      </div>

      <div id="alertPlaceholder"></div>

      <form id="deleteForm">
        <div class="mb-4">
          <label for="confirmText" class="form-label fw-semibold text-secondary">Type "delete my account" to Confirm</label>
          <input type="text" class="form-control form-control-lg" id="confirmText" name="confirmText" required placeholder="delete my account" autocomplete="off" style="border-radius: 12px;">
        </div>

        <div class="form-check mb-4">
          <input class="form-check-input" type="checkbox" id="confirmCheck" required>
          <label class="form-check-label text-muted small" for="confirmCheck">
            I understand that my account and all data will be permanently removed.
          </label>
        </div>

        <div class="d-grid gap-2">
          <button type="submit" class="btn btn-danger w-100 py-3 fw-semibold btn-delete-hover" id="submitBtn" style="border-radius: 12px; background: #dc2626; border: none; font-size: 1rem; transition: all 0.2s;">
            <span id="btnText">Permanently Delete Account</span>
            <span id="btnLoader" class="spinner-border spinner-border-sm d-none" role="status"></span>
          </button>
          <a href="accountSettings" class="btn btn-light border py-3" style="border-radius: 12px; font-weight: 600; font-size: 1rem;">Keep My Account</a>
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

      const confirmText = document.getElementById('confirmText').value;
      
      // UI State: Loading
      submitBtn.disabled = true;
      btnText.classList.add('d-none');
      btnLoader.classList.remove('d-none');
      alertPlaceholder.innerHTML = '';

      try {
        const formData = new FormData();
        formData.append('action', 'delete_account');
        formData.append('confirmText', confirmText);

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
