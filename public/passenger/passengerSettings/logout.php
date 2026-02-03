<!doctype html>
<html lang="en">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>Logout - ByaHero</title>

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

    .logout-container {
      margin-top: 70px; /* Ensures spacing between navbar and content */
      text-align: center;
    }

    .logout-heading {
      font-weight: bold;
      font-size: 1.5rem;
      color: #1e3a8a;
      margin-top: 0.5rem;
    }

    .logout-description {
      font-size: 1rem;
      color: #6b7280;
      line-height: 1.5;
      margin: 0.5rem auto 1.5rem auto;
    }

    .logout-buttons {
      margin-top: 1.5rem;
    }

    .logout-button {
      padding: 10px 16px;
      font-size: 1rem;
      border-radius: 10px;
      width: 150px;
      margin: 0 10px;
    }
  </style>
</head>

<body>
  <?php
  $pageType = 'settings';        // Configures navbar for Logout page
  $backLink = 'settings.php';    // Back button navigates to settings.php
  $pageDepth = "../../../";      // Fixes the logo path if needed
  include "../../../components/navbarPassenger.php";
  ?>

  <!-- Main Content -->
  <div class="container logout-container">
    <div class="logout-heading">Confirm Logout</div>
    <p class="logout-description">
      Are you sure you want to log out? You will need to log back in to access your account.
    </p>

    <!-- Buttons -->
    <div class="logout-buttons">
      <button onclick="window.location.href='../index.php';" class="btn btn-primary logout-button">Yes</button>
      <button onclick="window.location.href='settings.php';" class="btn btn-outline-secondary logout-button">Cancel</button>
    </div>
  </div>

  <!-- Bootstrap JS -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>

</html>