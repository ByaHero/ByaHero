<?php
session_start();
$isLoggedIn = isset($_SESSION['user_id']);
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>Feedback - ByaHero</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css">
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded" rel="stylesheet">
  
  <!-- Global Accessibility -->
  <link rel="stylesheet" href="../../../assets/images/css/accessibility.css">
  
  <style>
    body {
      font-family: "Segoe UI", sans-serif;
      background-color: #f8f9fa;
      padding-bottom: 80px;
    }
    .feedback-container {
      margin-top: 70px;
    }
    .feedback-header {
      margin-bottom: 1rem;
    }
    .feedback-card {
      width: 86px;
      height: 86px;
      background: white;
      border-radius: 10px;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
      border: 2px solid transparent;
    }
    .feedback-card:hover {
      background: #e8eaf6;
      transform: scale(1.05);
    }
    .feedback-card.selected {
      background: #1e3a8a;
      border-color: #1e3a8a;
      color: white;
    }
    .feedback-card .emoji {
      font-size: 2.5rem;
      margin-bottom: 0.25rem;
    }
    .feedback-card .label {
      font-size: 0.7rem;
      font-weight: 600;
      text-align: center;
      color: #6b7280;
    }
    .feedback-card.selected .label {
      color: white;
    }
    .feedback-form {
      margin-top: 1.5rem;
    }
    .feedback-textarea {
      width: 100%;
      height: 120px;
      border-radius: 10px;
      border: 1px solid #d1d5db;
      padding: 12px;
      font-size: 0.95rem;
      resize: vertical;
    }
    .feedback-textarea:focus {
      border-color: #1e3a8a;
      outline: none;
      box-shadow: 0 0 0 3px rgba(30, 58, 138, 0.1);
    }
    .login-required-notice {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 12px 16px;
      border-radius: 8px;
      margin-top: 1rem;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .login-required-notice .material-symbols-rounded {
      color: #f59e0b;
    }
    .login-required-notice span {
      color: #92400e;
      font-size: 0.9rem;
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
    <div class="feedback-header">
      <h5 class="fw-bold text-primary">Help us improve!</h5>
      <p class="text-muted">How would you rate your experience with ByaHero?</p>
    </div>

    <?php if (!$isLoggedIn): ?>
      <div class="login-required-notice">
        <span class="material-symbols-rounded">info</span>
        <span>Please <a href="../../../public/login.php" style="color: #1e3a8a; font-weight: bold;">login</a> to submit feedback.</span>
      </div>
    <?php endif; ?>

    <div class="row text-center g-3 justify-content-center">
      <div class="col-4">
        <div class="feedback-card" onclick="selectRating('excellent', this)">
          <div class="emoji">😄</div>
          <div class="label">Excellent</div>
        </div>
      </div>
      <div class="col-4">
        <div class="feedback-card" onclick="selectRating('good', this)">
          <div class="emoji">🙂</div>
          <div class="label">Good</div>
        </div>
      </div>
      <div class="col-4">
        <div class="feedback-card" onclick="selectRating('fair', this)">
          <div class="emoji">😐</div>
          <div class="label">Fair</div>
        </div>
      </div>
      <div class="col-4">
        <div class="feedback-card" onclick="selectRating('poor', this)">
          <div class="emoji">😞</div>
          <div class="label">Poor</div>
        </div>
      </div>
      <div class="col-4">
        <div class="feedback-card" onclick="selectRating('very_poor', this)">
          <div class="emoji">😠</div>
          <div class="label">Very Poor</div>
        </div>
      </div>
    </div>

    <div class="feedback-form">
      <label for="feedbackTextarea" class="fw-bold mb-2">Tell us more about your experience (optional)</label>
      <textarea id="feedbackTextarea" class="feedback-textarea" placeholder="Share your thoughts, suggestions, or report issues..." <?php echo !$isLoggedIn ? 'disabled' : ''; ?>></textarea>
    </div>

    <div class="mt-3 d-flex justify-content-center gap-2">
      <button class="btn btn-secondary px-4" onclick="if(typeof analytics !== 'undefined') analytics.buttonClick('Cancel Feedback'); window.location.href='settings.php';">Cancel</button>
      <button class="btn btn-primary px-4" onclick="submitFeedback()" <?php echo !$isLoggedIn ? 'disabled' : ''; ?>>Submit Feedback</button>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
  <script src="../../../assets/images/js/accessibility.js"></script>
  <script src="../../../assets/images/js/analytics.js"></script>
  <script>
    const isLoggedIn = <?php echo $isLoggedIn ? 'true' : 'false'; ?>;
    let selectedRating = null;

    function selectRating(rating, element) {
      if (!isLoggedIn) {
        alert("Please login to submit feedback.");
        window.location.href = '../../../public/login.php';
        return;
      }

      document.querySelectorAll('.feedback-card').forEach(card => {
        card.classList.remove('selected');
      });
      
      element.classList.add('selected');
      selectedRating = rating;
      
      // Track rating selection
      if (typeof analytics !== 'undefined') {
        analytics.featureUsed('Feedback Rating Selected', { rating: rating });
      }
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
        
        // Track validation error
        if (typeof analytics !== 'undefined') {
          analytics.error('Feedback submission failed: No rating selected');
        }
        return;
      }

      const formData = new FormData();
      formData.append('rating', selectedRating);
      formData.append('feedback', feedbackText.trim());

      // Track feedback submission attempt
      if (typeof analytics !== 'undefined') {
        analytics.featureUsed('Feedback Submitted', { 
          rating: selectedRating,
          has_text: feedbackText.trim().length > 0
        });
      }

      fetch('../../../backend/submitFeedback.php', {
        method: 'POST',
        body: formData
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          alert("Thank you for your feedback!");
          
          // Track successful submission
          if (typeof analytics !== 'undefined') {
            analytics.featureUsed('Feedback Submission Success', { rating: selectedRating });
          }
          
          window.location.href = "settings.php";
        } else {
          alert("Failed to submit feedback: " + data.message);
          
          // Track failure
          if (typeof analytics !== 'undefined') {
            analytics.error('Feedback submission failed: ' + data.message);
          }
        }
      })
      .catch(error => {
        console.error('Error:', error);
        alert("An error occurred while submitting feedback.");
        
        // Track error
        if (typeof analytics !== 'undefined') {
          analytics.error('Feedback submission error: ' + error.message);
        }
      });
    }
  </script>
</body>
</html>