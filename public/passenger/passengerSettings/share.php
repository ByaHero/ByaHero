<?php
require_once __DIR__ . '/../auth_passenger.php';
$pageType = 'settings';        // Configures navbar for Share page
$backLink = 'settings.php';    // Back button navigates to settings.php
$pageDepth = "../../../";      // Fixes the logo path if needed
?>
<!doctype html>
<html lang="en">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>Share ByaHero - ByaHero</title>

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

    .share-container {
      margin-top: 70px; /* Ensures spacing between navbar and content */
      text-align: center;
    }

    .share-heading {
      font-weight: bold;
      font-size: 1.5rem;
      color: #1e3a8a;
      margin-top: 0.5rem;
    }

    .share-description {
      font-size: 1rem;
      color: #6b7280;
      line-height: 1.5;
      margin: 0.5rem auto 1.5rem auto;
    }

    .share-item {
      padding: 12px 16px;
      background-color: white;
      margin: 0.5rem auto;
      border-radius: 10px;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items-center;
      justify-content: center;
      cursor: pointer;
      width: 300px;
      text-decoration: none;
    }

    .share-item span {
      font-size: 1.2rem;
      margin-right: 10px;
    }

    .share-item:hover {
      background-color: #e8eaf6;
    }
  </style>
</head>

<body>
  <?php include "../../../components/navbarPassenger.php"; ?>

  <!-- Main Content -->
  <div class="container share-container">
    <div class="share-heading">Share ByaHero</div>
    <p class="share-description">
      Help us reach more passengers! Share ByaHero on social media or with your friends directly.
    </p>

    <!-- Share Options -->
    <a href="#" class="share-item">
      <span class="material-symbols-rounded text-primary">link</span> Share via Link
    </a>
    <a href="#" class="share-item">
      <span class="material-symbols-rounded text-primary">qr_code</span> Share via QR Code
    </a>
    <a href="#" class="share-item">
      <span class="material-symbols-rounded text-primary">share</span> Share on Social Media
    </a>
  </div>

  <!-- Bootstrap JS -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>

</html>