<!doctype html>
<html lang="en">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>Feedback - ByaHero</title>

  <!-- Bootstrap -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css">

  <!-- Material Icons -->
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded" rel="stylesheet">

  <style>
    body {
      font-family: "Segoe UI", sans-serif;
      background-color: #f8f9fa;
      padding-bottom: 80px;
    }

    .feedback-container {
      margin-top: 70px; /* Spacing between navbar and content */
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
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    .feedback-card:hover {
      background: #e8eaf6;
    }

    .feedback-form {
      margin-top: 1.5rem;
    }

    .feedback-textarea {
      width: 100%;
      height: 100px;
      border-radius: 10px;
      border: 1px solid #d1d5db;
      padding: 8px 12px;
    }

    .feedback-textarea:focus {
      border-color: #1e3a8a;
      outline: none;
    }
  </style>
</head>

<body>
  <?php
  $pageType = 'settings';        // Triggers the back button (no header text visible)
  $backLink = 'settings.php';    // Ensures proper navigation to settings.php
  $pageDepth = "../../../";      // Fixes the logo path (for the bottom nav if needed)
  include "../../../components/navbarPassenger.php";
  ?>

  <!-- Main Content -->
  <div class="container feedback-container">

    <!-- Feedback Header -->
    <div class="feedback-header">
      <h5 class="fw-bold text-primary">Help us improve!</h5>
      <p class="text-muted">How would you like to describe your experience with ByaHero?</p>
    </div>

    <!-- Feedback Reaction Cards -->
    <div class="row text-center g-3">
      <div class="col-4">
        <div class="feedback-card">
          😊
        </div>
      </div>
      <div class="col-4">
        <div class="feedback-card">
          😐
        </div>
      </div>
      <div class="col-4">
        <div class="feedback-card">
          😟
        </div>
      </div>
      <div class="col-6">
        <div class="feedback-card">
          👍
        </div>
      </div>
      <div class="col-6">
        <div class="feedback-card">
          👎
        </div>
      </div>
    </div>

    <!-- Feedback Form -->
    <div class="feedback-form">
      <label for="feedbackTextarea" class="fw-bold">Want to share your overall experience?</label>
      <textarea id="feedbackTextarea" class="feedback-textarea"></textarea>
    </div>

    <!-- Action Buttons -->
    <div class="mt-3 d-flex justify-content-center gap-2">
      <button class="btn btn-secondary px-4" onclick="window.location.href='settings.php';">Cancel</button>
      <button class="btn btn-primary px-4" onclick="submitFeedback()">Submit</button>
    </div>
  </div>

  <!-- Bootstrap JS -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>

  <!-- Feedback Submission Script -->
  <script>
    function submitFeedback() {
      const feedbackText = document.getElementById("feedbackTextarea").value;

      if (feedbackText.trim() === "") {
        alert("Please enter your feedback before submitting.");
        return;
      }

      alert("Thank you for your feedback!");
      window.location.href = "settings.php";
    }
  </script>
</body>
</html>