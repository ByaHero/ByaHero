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

  <!-- Global Accessibility -->
  <link rel="stylesheet" href="../../../assets/images/css/accessibility.css">

  <style>
    body {
      font-family: "Segoe UI", sans-serif;
      background-color: #f8f9fa;
      padding-bottom: 80px;
    }

    .logout-container {
      margin-top: 70px;
      text-align: center;
      padding: 2rem;
    }

    .logout-icon {
      font-size: 5rem;
      color: #ef4444;
      margin-bottom: 1rem;
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
      max-width: 400px;
    }

    .logout-buttons {
      margin-top: 1.5rem;
      display: flex;
      justify-content: center;
      gap: 1rem;
    }

    .logout-button {
      padding: 12px 24px;
      font-size: 1rem;
      border-radius: 10px;
      min-width: 120px;
      font-weight: 600;
    }

    .btn-danger {
      background-color: #ef4444;
      border-color: #ef4444;
    }

    .btn-danger:hover {
      background-color: #dc2626;
      border-color: #dc2626;
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

  <!-- Main Content -->
  <div class="container logout-container">
    <span class="material-symbols-rounded logout-icon">logout</span>
    <div class="logout-heading">Confirm Logout</div>
    <p class="logout-description">
      Are you sure you want to log out? You will need to log back in to access your account and settings.
    </p>

    <!-- Buttons -->
    <div class="logout-buttons">
      <button onclick="confirmLogout()" class="btn btn-danger logout-button">
        <span class="material-symbols-rounded" style="vertical-align: middle; font-size: 1.2rem; margin-right: 4px;">logout</span>
        Yes, Logout
      </button>
      <button onclick="window.location.href='settings.php';" class="btn btn-outline-secondary logout-button">
        Cancel
      </button>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
  <script src="../../../assets/images/js/accessibility.js"></script>
  <script>
    function confirmLogout() {
      // Redirect to the actual logout handler
      window.location.href = '../../../public/logout.php';
    }
  </script>
</body>

</html>