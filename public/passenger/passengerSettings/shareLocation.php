<!doctype html>
<html lang="en">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>Share My Location - ByaHero</title>

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

    .location-container {
      margin-top: 70px; /* Ensures spacing between navbar and content */
      text-align: center;
    }

    .location-heading {
      font-weight: bold;
      font-size: 1.5rem;
      color: #1e3a8a;
      margin-top: 0.5rem;
    }

    .location-description {
      font-size: 1rem;
      color: #6b7280;
      line-height: 1.5;
      margin: 0.5rem auto 1.5rem auto;
    }

    .location-buttons {
      margin-top: 1.5rem;
    }

    .location-button {
      padding: 12px 20px;
      font-size: 1rem;
      border-radius: 10px;
      margin: 0.5rem auto;
      width: 90%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    .location-button .material-symbols-rounded {
      font-size: 1.5rem;
      margin-right: 8px;
    }

    .location-button.current {
      color: white;
      background-color: #1e3a8a;
    }

    .location-button.map {
      color: #1e3a8a;
      background-color: white;
      border: 1px solid #1e3a8a;
    }

    .location-button.stop {
      color: white;
      background-color: #dc3545;
    }

    .location-button:hover {
      opacity: 0.9;
    }
  </style>
</head>

<body>
  <?php
  $pageType = 'settings';        // Configures navbar for Share Location page
  $backLink = 'settings.php';    // Back button navigates to settings.php
  $pageDepth = "../../../";      // Fixes the logo path if needed
  include "../../../components/navbarPassenger.php";
  ?>

  <!-- Main Content -->
  <div class="container location-container">
    <!-- Heading -->
    <div class="location-heading">Share My Location</div>
    <p class="location-description">
      Share your location with friends or bus operators for a seamless tracking experience. You can choose to share your current location or a preferred location.
    </p>

    <!-- Location Sharing Options -->
    <div class="location-buttons">
      <!-- Share Current Location -->
      <div class="location-button current" onclick="shareCurrentLocation()">
        <span class="material-symbols-rounded">my_location</span> Share Current Location
      </div>

      <!-- Share a Selected Location via Map -->
      <div class="location-button map" onclick="openMap()">
        <span class="material-symbols-rounded">location_on</span> Select Location on Map
      </div>

      <!-- Stop Location Sharing -->
      <div class="location-button stop" onclick="stopSharingLocation()">
        <span class="material-symbols-rounded">cancel</span> Stop Sharing Location
      </div>
    </div>
  </div>

  <!-- Bootstrap JS -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
  <script>
    // Placeholder functions for the buttons
    function shareCurrentLocation() {
      alert('Your current location is being shared.');
    }

    function openMap() {
      alert('Opening map for location selection.');
    }

    function stopSharingLocation() {
      alert('Location sharing has been stopped.');
    }
  </script>
</body>

</html>