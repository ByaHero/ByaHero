<?php
require_once __DIR__ . '/auth_passenger.php';

// GATEKEEPER: Ensure user has a contact number
if (empty($_SESSION['user_contacts'])) {
  header('Location: completeProfile.php', true, 302);
  exit;
}

$currentUser = null;
if (isset($_SESSION['user_id'])) {
  $currentUser = [
    'id' => $_SESSION['user_id'],
    'name' => $_SESSION['user_name'] ?? null,
    'email' => $_SESSION['user_email'] ?? null,
    'profile_picture' => $_SESSION['user_profile_picture'] ?? null
  ];
}

$scriptName = $_SERVER['SCRIPT_NAME'] ?? '';
$publicDir = rtrim(str_replace('\\', '/', dirname($scriptName)), '/');
$baseUrl = preg_replace('~/public/.*$~', '', $publicDir) ?: '';
?>

<!doctype html>
<html lang="en">

<head>
  <meta charset="utf-8" />
  <link rel="icon" href="../../assets/images/byaheroLogoBlue.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
  <title>Passenger Live Map | ByaHero Real-Time Bus Tracker</title>

  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0&display=swap" rel="stylesheet" media="print" onload="this.media='all'" />
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css" />
  <link rel="manifest" href="../manifest.webmanifest">
  <meta name="theme-color" content="#1e3a8a">

  <link rel="stylesheet" href="<?= htmlspecialchars($baseUrl, ENT_QUOTES) ?>/assets/css/passengerBottomSheet.css?v=5">
  <link rel="stylesheet" href="<?= htmlspecialchars($baseUrl, ENT_QUOTES) ?>/assets/css/passenger/passengerIndex.css?v=<?= time() ?>">
  <link rel="stylesheet" href="../../assets/css/accessibility.css">

  <script>
    window._sosPendingToken = null;
  </script>
  <script src="../../assets/js/accessibility.js"></script>
</head>

<body class="bg-light">

  <main class="d-flex flex-column h-100 w-100">
    <h1 class="visually-hidden">ByaHero Live Commuter Map and Bus Tracker</h1>
    <div class="flex-grow-1 position-relative" style="min-height: 0;">
      <div id="map"></div>
    </div>
  </main>

  <?php include __DIR__ . '/../../components/passengerBottomSheet.php'; ?>

  <div class="modal fade" id="profileModal" tabindex="-1">
    <div class="modal-dialog modal-sm modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-body text-center">
          <?php if ($currentUser): ?>
            <h6><?= htmlspecialchars($currentUser['name'] ?? $currentUser['email']) ?></h6>
            <a href="../logout.php" class="btn btn-sm btn-outline-danger mt-2">Logout</a>
          <?php else: ?>
            <p>Please log in.</p>
            <a href="../login.php" class="btn btn-primary btn-sm">Login</a>
          <?php endif; ?>
        </div>
      </div>
    </div>
  </div>

  <?php include __DIR__ . "/../../components/navbarPassenger.php"; ?>

  <script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>

  <script src="https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js" defer></script>
  <script src="../../assets/js/passengerBottomSheet.js?v=2"></script>

  <script>
    // Pass PHP context variables to Javascript
    window.userProfilePic = <?= json_encode($currentUser['profile_picture'] ?? null) ?>;
    window.rawUserName = <?= json_encode($currentUser['name'] ?? $currentUser['email'] ?? 'Guest') ?>;
    window.userInitial = (typeof window.rawUserName === 'string' && window.rawUserName.length > 0) ? window.rawUserName.charAt(0).toUpperCase() : '?';

    // Base URL detection for passengerMap and other components
    (function() {
      var path = window.location.pathname || '/';
      var pubIndex = path.toLowerCase().indexOf('/public/');
      var base = (pubIndex !== -1) ? path.substring(0, pubIndex) : '';
      window.PROJECT_BASE = base;
      window.APP_BASE_URL = base;
      window.ICON_BASE = base + '/assets/images/icons';
    })();
  </script>

  <script src="../../assets/js/byaheroTracking.js?v=<?= time() ?>"></script>
  <script src="../../assets/js/passenger/passengerMap.js?v=<?= time() ?>"></script>
  <script src="../../assets/js/passenger/passengerRideTracker.js?v=<?= time() ?>"></script>
  <script src="../../assets/js/passenger/byaheroTour.js?v=<?= time() ?>"></script>

  <script>
    // Initialize map
    var mapId = 'map';
    var map = L.map(mapId, {
      zoomControl: false
    }).setView([14.0905, 121.0550], 12);

    window._map = map;

    // Resize bus-stop and user markers when zoom changes
    map.on('zoomend', function() {
      resizeStopMarkersForZoom(map.getZoom());
      if (userMarker) {
        userMarker.setIcon(getUserIcon());
        updateUserMarkerWaitingStyle();
      }
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '',
      maxZoom: 19
    }).addTo(map);

    // Initial triggers
    startUserLocationWatch();
    PassengerRideTracker.init();
    updateBuses();
    setTimeout(function() { if (typeof updateRoutePills === 'function') updateRoutePills(); }, 100);
    scheduleNextBusUpdate();
  </script>

  <!-- Waiting Modal -->
  <div class="modal fade" id="waitingModal" tabindex="-1" aria-labelledby="waitingModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered" style="max-width: 420px;">
      <div class="modal-content waiting-modal-content">
        <button type="button" class="waiting-modal-close border-0 bg-transparent p-0" data-bs-dismiss="modal" aria-label="Close">
          <img src="../../assets/images/EKS.svg" alt="Close" style="width: 24px; height: 24px; display: block;" />
        </button>
        
        <div class="text-center">
          <!-- Question Mark Circle Icon -->
          <img src="../../assets/images/waitingMark.svg" alt="Waiting Mark" class="waiting-modal-icon-image" />

          <!-- Modal Title -->
          <h2 class="waiting-modal-title">Are you waiting for a bus?</h2>

          <!-- Modal Subtitle -->
          <p class="waiting-modal-subtitle">
            Help us improve transit accuracy by confirming your status at this location
          </p>

          <!-- Current Location -->
          <div id="waitingLocationStatusDiv" class="waiting-modal-location-container text-center">
            <div class="waiting-modal-location-badge">
              <span class="material-symbols-rounded loc-icon">my_location</span>
              <span id="waitingLocationNameDisplay" class="loc-text">Resolving...</span>
            </div>
          </div>

          <div id="waitingStatusMsg" class="alert alert-info py-2 px-3 mb-3 small d-none rounded-3">
          </div>

          <!-- Buttons Container -->
          <div class="mt-4">
            <!-- Yes, I'm Waiting Button -->
            <button id="btnSetWaiting" type="button" class="btn p-0 border-0 bg-transparent w-100" style="box-shadow: none;">
              <img src="../../assets/images/waitingButton.svg" alt="I am waiting" style="width: 100%; height: auto; max-width: 320px; display: block; margin: 0 auto;" />
            </button>

            <!-- Cancel Waiting Button -->
            <button id="btnCancelWaiting" type="button" class="btn waiting-modal-btn-cancel d-none">
              <span class="waiting-modal-btn-circle-icon text-secondary">
                <img src="../../assets/images/EKS.svg" alt="Close" style="width: 18px; height: 18px; display: inline-block; vertical-align: middle;" />
              </span>
              <span>Cancel Waiting</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
