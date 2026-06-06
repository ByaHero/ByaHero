<?php
require_once __DIR__ . '/../auth_passenger.php';
$pageType = 'settings';        // Configures navbar for About page
$backLink = '../index.php';    // Back button navigates to index.php
$pageDepth = "../../../";      // Fixes the logo path used for topBarLogo.svg
?>
<!doctype html>
<html lang="en">

<head>
  <meta charset="utf-8">
    <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>About ByaHero</title>

  <!-- Bootstrap -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css">

  <!-- Material Icons -->
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0&display=swap" rel="stylesheet" media="print" onload="this.media='all'">

  <style>
    body {
      font-family: "Segoe UI", sans-serif;
      background-color: #f8f9fa;
    }
  </style>
</head>

<body>
<?php include "../../../components/navbarPassenger.php"; ?>

  <!-- Main Content -->
  <div class="container text-center mt-5 pt-3" style="margin-top: 70px !important;">
    <!-- Logo -->
    <img src="../../../assets/images/byaheroLogoBlue.svg" alt="ByaHero Logo" class="d-block mx-auto my-4" style="width: 150px; height: auto;">

    <!-- Heading -->
    <div class="fw-bold fs-4 text-primary mt-3">Welcome to ByaHero</div>

    <!-- Text Content -->
    <p class="fs-6 text-secondary mt-3" style="line-height: 1.6;">
      ByaHero is dedicated to revolutionizing the way passengers experience bus transport. Our goal is to provide
      seamless tracking of bus schedules, timely notifications, and intelligent insights to enhance your travel experience.
      <br><br>
      By leveraging modern technology, we aim to connect passengers and operators with the tools they need for reliable and efficient transportation.
      Whether you're planning your daily commute or a long journey, ByaHero is here to make it stress-free and convenient.
      <br><br>
      Thank you for choosing ByaHero—your reliable partner in bus transport solutions.
    </p>

    <!-- Contact Information -->
    <p class="fs-6 text-secondary mt-3" style="line-height: 1.6;">
      <strong>Contact Us:</strong><br>
      Email: support@byahero.com<br>
      Phone: +1 234 567 890
    </p>
  </div>

  <!-- Bootstrap JS -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>

</html>