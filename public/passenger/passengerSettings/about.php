<?php
require_once __DIR__ . '/../auth_passenger.php';
$pageType = 'settings';        // Configures navbar for About page
$backLink = 'settings.php';    // Back button navigates to settings.php
$pageDepth = "../../../";      // Fixes the logo path used for topBarLogo.svg
?>
<!doctype html>
<html lang="en">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>About ByaHero</title>

  <!-- Bootstrap -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css">

  <!-- Material Icons -->
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded" rel="stylesheet">

  <style>
    body {
      font-family: "Segoe UI", sans-serif;
      background-color: #f8f9fa;
    }

    .about-container {
      margin-top: 70px; /* Ensures spacing between navbar and content */
      text-align: center;
    }

    .about-logo {
      margin: 20px auto;
      width: 150px;
      height: auto;
    }

    .about-heading {
      font-weight: bold;
      font-size: 1.5rem;
      color: #1e3a8a;
      margin-top: 1rem;
    }

    .about-text {
      font-size: 1rem;
      color: #6b7280;
      margin-top: 1rem;
      line-height: 1.6;
    }
  </style>
</head>

<body>
<?php include "../../../components/navbarPassenger.php"; ?>

  <!-- Main Content -->
  <div class="container about-container">
    <!-- Logo -->
    <img src="../../../assets/images/byaheroLogoBlue.svg" alt="ByaHero Logo" class="about-logo">

    <!-- Heading -->
    <div class="about-heading">Welcome to ByaHero</div>

    <!-- Text Content -->
    <p class="about-text">
      ByaHero is dedicated to revolutionizing the way passengers experience bus transport. Our goal is to provide
      seamless tracking of bus schedules, timely notifications, and intelligent insights to enhance your travel experience.
      <br><br>
      By leveraging modern technology, we aim to connect passengers and operators with the tools they need for reliable and efficient transportation.
      Whether you're planning your daily commute or a long journey, ByaHero is here to make it stress-free and convenient.
      <br><br>
      Thank you for choosing ByaHero—your reliable partner in bus transport solutions.
    </p>

    <!-- Contact Information -->
    <p class="about-text">
      <strong>Contact Us:</strong><br>
      Email: support@byahero.com<br>
      Phone: +1 234 567 890
    </p>
  </div>

  <!-- Bootstrap JS -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>

</html>