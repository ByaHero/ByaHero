<?php
require_once __DIR__ . '/../auth_passenger.php';
$isLoggedIn = true; // auth_passenger.php ensures the user is logged in
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
    <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>Feedback - ByaHero</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css">
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
  
  <!-- Global Accessibility -->
  <link rel="stylesheet" href="../../../assets/images/css/accessibility.css">
  
  <style>
    body {
      font-family: "Inter", "Segoe UI", sans-serif;
      background: linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%);
      padding-bottom: 80px;
      min-height: 100vh;
    }
    .feedback-container {
      margin-top: 80px;
      max-width: 600px;
    }
    .feedback-card {
      background: #ffffff;
      border: none;
      border-radius: 24px;
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.06);
      padding: 2.5rem 2rem;
    }
    .feedback-header {
      text-align: center;
      margin-bottom: 2rem;
    }
    .feedback-header h5 {
      font-size: 1.75rem;
      color: #1e3a8a;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .feedback-header p {
      color: #64748b;
      font-size: 1.05rem;
    }
    .star-wrapper {
      background: #f8fafc;
      border-radius: 16px;
      padding: 1.5rem;
      margin-bottom: 2rem;
    }
    .star {
      width: 55px;
      height: 55px;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      filter: drop-shadow(0 4px 6px rgba(0,0,0,0.05));
    }
    .star:hover {
      transform: scale(1.2) translateY(-5px);
      filter: drop-shadow(0 8px 12px rgba(0,0,0,0.1));
    }
    .star:active {
      transform: scale(0.9);
    }
    .feedback-form label {
      color: #334155;
      font-weight: 600;
      font-size: 0.95rem;
    }
    .feedback-textarea {
      width: 100%;
      height: 140px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      background-color: #f8fafc;
      padding: 16px;
      font-size: 1rem;
      resize: vertical;
      transition: all 0.2s ease;
      color: #1e293b;
    }
    .feedback-textarea:focus {
      border-color: #1e3a8a;
      background-color: #ffffff;
      outline: none;
      box-shadow: 0 0 0 4px rgba(30, 58, 138, 0.1);
    }
    .feedback-textarea::placeholder {
      color: #94a3b8;
    }
    .btn-custom {
      border-radius: 50rem;
      padding: 14px 28px;
      font-weight: 600;
      transition: all 0.2s ease;
      letter-spacing: 0.3px;
    }
    .btn-primary-custom {
      background-color: #1e3a8a;
      border-color: #1e3a8a;
      color: white;
      box-shadow: 0 4px 12px rgba(30, 58, 138, 0.2);
    }
    .btn-primary-custom:hover {
      background-color: #172554;
      border-color: #172554;
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(30, 58, 138, 0.3);
      color: white;
    }
    .btn-secondary-custom {
      background-color: #f1f5f9;
      border-color: #f1f5f9;
      color: #475569;
    }
    .btn-secondary-custom:hover {
      background-color: #e2e8f0;
      border-color: #e2e8f0;
      color: #1e293b;
      transform: translateY(-2px);
    }
    .login-required-notice {
      background-color: #fffbeb;
      border: 1px solid #fde68a;
      border-left: 4px solid #f59e0b;
      padding: 16px;
      border-radius: 12px;
      margin-bottom: 2rem;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 2px 8px rgba(245, 158, 11, 0.05);
    }
    .login-required-notice .material-symbols-rounded {
      color: #f59e0b;
    }
    .login-required-notice span {
      color: #92400e;
      font-size: 0.95rem;
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

  <div class="container feedback-container">
    <div class="feedback-card">
      <div class="feedback-header">
        <h5>Help us improve!</h5>
        <p>How would you rate your experience with ByaHero?</p>
      </div>

      <?php if (!$isLoggedIn): ?>
        <div class="login-required-notice">
          <span class="material-symbols-rounded">info</span>
          <span>Please <a href="../../../public/login.php" style="color: #d97706; text-decoration: underline; font-weight: bold;">login</a> to submit feedback.</span>
        </div>
      <?php endif; ?>

      <div id="feedbackFormContent">
        <div class="star-wrapper d-flex justify-content-center gap-4">
          <img src="../../../assets/images/star_blank.svg" class="star" data-value="1" alt="1 star">
          <img src="../../../assets/images/star_blank.svg" class="star" data-value="2" alt="2 stars">
          <img src="../../../assets/images/star_blank.svg" class="star" data-value="3" alt="3 stars">
          <img src="../../../assets/images/star_blank.svg" class="star" data-value="4" alt="4 stars">
          <img src="../../../assets/images/star_blank.svg" class="star" data-value="5" alt="5 stars">
        </div>

        <div class="feedback-form">
          <label for="feedbackTextarea" class="mb-3 d-block">Additional Information (What would you like to say?)</label>
          <textarea id="feedbackTextarea" class="feedback-textarea" placeholder="Share your thoughts, suggestions, or report issues..." <?php echo !$isLoggedIn ? 'disabled' : ''; ?>></textarea>
        </div>

        <div class="mt-4 pt-2 d-flex justify-content-center gap-3">
          <button class="btn btn-secondary-custom btn-custom w-50" onclick="window.location.href='../index.php';">Cancel</button>
          <button class="btn btn-primary-custom btn-custom w-50" id="submitBtn" onclick="submitFeedback()" <?php echo !$isLoggedIn ? 'disabled' : ''; ?>>Submit Feedback</button>
        </div>
      </div>

      <div id="successMessage" style="display: none;" class="text-center py-4">
        <span class="material-symbols-rounded" style="font-size: 4rem; color: #10b981;">check_circle</span>
        <h4 class="mt-3 fw-bold" style="color: #1e3a8a;">Feedback Sent!</h4>
        <p class="text-muted">Thank you for helping us improve ByaHero.</p>
        <p class="text-muted small mt-4">Redirecting you home...</p>
      </div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
  <script src="../../../assets/images/js/accessibility.js"></script>
  <script>
    const isLoggedIn = <?php echo $isLoggedIn ? 'true' : 'false'; ?>;
    let selectedRating = null;
    const blankStarUrl = '../../../assets/images/star_blank.svg';
    const fullStarUrl = '../../../assets/images/star_full.svg';
    const stars = document.querySelectorAll('.star');

    stars.forEach(star => {
      star.addEventListener('mouseover', function() {
        if (!isLoggedIn) return;
        const val = parseInt(this.getAttribute('data-value'));
        updateStars(val, true);
      });
      
      star.addEventListener('mouseout', function() {
        if (!isLoggedIn) return;
        updateStars(selectedRating ? parseInt(selectedRating) : 0, false);
      });
      
      star.addEventListener('click', function() {
        if (!isLoggedIn) {
          alert("Please login to submit feedback.");
          window.location.href = '../../../public/login.php';
          return;
        }
        selectedRating = this.getAttribute('data-value');
        updateStars(parseInt(selectedRating), false);
      });
    });

    function updateStars(value, isHover) {
      stars.forEach(s => {
        const starVal = parseInt(s.getAttribute('data-value'));
        if (starVal <= value) {
          s.src = fullStarUrl;
          if (isHover) s.style.transform = 'scale(1.15)';
          else s.style.transform = 'scale(1)';
        } else {
          s.src = blankStarUrl;
          s.style.transform = 'scale(1)';
        }
      });
    }

    function submitFeedback() {
      if (!isLoggedIn) {
        alert("Please login to submit feedback.");
        window.location.href = '../../../public/login.php';
        return;
      }

      const feedbackText = document.getElementById("feedbackTextarea").value;

      if (!selectedRating) {
        alert("Please select a rating before submitting.");
        return;
      }

      const formData = new FormData();
      formData.append('rating', selectedRating);
      formData.append('feedback', feedbackText.trim());

      const submitBtn = document.getElementById('submitBtn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Submitting...';
      }

      fetch('../../../backend/submitFeedback.php', {
        method: 'POST',
        body: formData
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          document.getElementById('feedbackFormContent').style.display = 'none';
          document.getElementById('successMessage').style.display = 'block';
          setTimeout(() => {
            window.location.href = '../index.php';
          }, 2000);
        } else {
          alert("Failed to submit feedback: " + data.message);
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Submit Feedback';
          }
        }
      })
      .catch(error => {
        console.error('Error:', error);
        alert("An error occurred while submitting feedback.");
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'Submit Feedback';
        }
      });
    }
  </script>
</body>
</html>