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
  <meta name="description" content="View the live passenger commute dashboard. Track real-time bus locations, seat availability, routes, stops, and boarding status instantly on ByaHero." />
  <meta name="keywords" content="byahero, bus tracker, passenger dashboard, live map, estimated arrival, seat availability" />
  <link rel="canonical" href="https://byahero.up.railway.app/public/passenger/index.php" />
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://byahero.up.railway.app/public/passenger/index.php" />
  <meta property="og:title" content="Passenger Live Map | ByaHero Real-Time Bus Tracker" />
  <meta property="og:description" content="View the live passenger commute dashboard. Track real-time bus locations, seat availability, routes, stops, and boarding status instantly on ByaHero." />
  <meta property="og:image" content="../assets/images/byaheroLogo.png" />

  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image" />
  <meta property="twitter:url" content="https://byahero.up.railway.app/public/passenger/index.php" />
  <meta property="twitter:title" content="Passenger Live Map | ByaHero Real-Time Bus Tracker" />
  <meta property="twitter:description" content="View the live passenger commute dashboard. Track real-time bus locations, seat availability, routes, stops, and boarding status instantly on ByaHero." />
  <meta property="twitter:image" content="../assets/images/byaheroLogo.png" />

  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0&display=swap" rel="stylesheet" media="print" onload="this.media='all'" />
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css" />
  <link rel="manifest" href="../manifest.webmanifest">
  <meta name="theme-color" content="#1e3a8a">


  <link rel="stylesheet" href="<?= htmlspecialchars($baseUrl, ENT_QUOTES) ?>/assets/css/passengerBottomSheet.css?v=5">

  <link rel="stylesheet" href="../../assets/css/accessibility.css">

  <script>
    window._sosPendingToken = null;
  </script>
  <script src="../../assets/js/accessibility.js"></script>

  <style>
    :root {
      --bs-primary: #1e3a8a;
      --bs-primary-rgb: 30, 58, 138;
      --bs-bg-light: #f3f4f6;
    }

    html, body {
      height: 100%;
      width: 100%;
      overflow: hidden;
      position: fixed; /* Prevents scroll bounce on iOS */
    }

    body {
      font-family: "Segoe UI", sans-serif;
      padding-bottom: 0 !important; /* Override navbarPassenger padding for this fixed-height page */
    }



    #map {
      height: 100%;
      width: 100%;
      z-index: 1;
    }

    .h-60px {
      height: 60px;
    }

    .rounded-top-4 {
      border-top-left-radius: 1.5rem;
      border-top-right-radius: 1.5rem;
    }

    .map-overlay {
      z-index: 1000;
    }



    @media (min-width: 992px) {
      /* Removed .map-and-sidebar to allow full screen map on desktop */
    }

    .leaflet-marker-icon {
      pointer-events: auto;
    }

    .bus-timeline-track {
      height: 3px !important;
      background-image: linear-gradient(to right, #cbd5e1 50%, rgba(255, 255, 255, 0) 0%);
      background-position: center;
      background-size: 8px 3px;
      background-repeat: repeat-x;
      background-color: transparent;
      position: relative;
      display: block;
      margin-top: 15px !important;
      margin-bottom: 12px !important;
      margin-left: 18px !important;
      margin-right: 18px !important;
      z-index: 5;
    }

    .bus-timeline-progress {
      background: linear-gradient(90deg, #3b82f6, #1e3a8a) !important; /* Lighter at the bus, darker at destination */
      border-radius: 4px;
      height: 3px;
      position: absolute;
      top: 0;
      z-index: 6;
      box-shadow: 0 0 8px rgba(30, 58, 138, 0.2);
      transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .bus-timeline-bus {
      transition: left 0.5s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
      z-index: 10;
    }

    .bus-timeline-destination {
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
      z-index: 9;
    }

    .user-marker-container {
      position: relative;
      cursor: pointer !important;
    }

    .user-avatar-circle {
      width: 100%;
      height: 100%;
      background-color: #ffffff;
      color: var(--bs-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      font-size: 18px;
      font-weight: bold;
      box-shadow: 0 0 0 3px #3b82f6, 0 0 0 0px rgba(59, 130, 246, 0.45), 0 4px 6px rgba(0,0,0,0.3);
      overflow: hidden;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer !important;
      animation: clickablePulse 2.5s infinite;
    }

    .user-avatar-circle:hover {
      transform: scale(1.08);
      box-shadow: 0 0 0 3px #3b82f6, 0 0 0 12px rgba(59, 130, 246, 0.25), 0 6px 12px rgba(0,0,0,0.35);
    }

    .user-marker-container.is-waiting .user-avatar-circle {
      box-shadow: 0 0 0 3px #10b981, 0 0 0 0px rgba(16, 185, 129, 0.45), 0 4px 6px rgba(0,0,0,0.3);
      animation: waitingPulse 2.5s infinite;
    }

    .user-waiting-chat-bubble {
      position: absolute;
      background-color: white; /* Clean simple background */
      color: #3b82f6; /* Inactive text color matching blue theme */
      border: 1.5px solid #3b82f6; /* Simple border */
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04);
      pointer-events: auto;
      cursor: pointer;
      opacity: 1;
      transform: translateX(-50%) scale(1);
      transform-origin: bottom center;
      transition: all 0.25s ease-in-out;
      z-index: 1002;
      animation: floatBubble 3s ease-in-out infinite; /* Float animation */
    }

    @keyframes floatBubble {
      0% {
        transform: translate(-50%, 0) scale(1);
      }
      50% {
        transform: translate(-50%, -5px) scale(1.02); /* floating up slightly */
      }
      100% {
        transform: translate(-50%, 0) scale(1);
      }
    }

    .user-waiting-chat-bubble::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border-width: 5px;
      border-style: solid;
      border-color: white transparent transparent transparent;
      transition: border-color 0.2s ease;
    }

    .user-waiting-chat-bubble::before {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border-width: 6.5px;
      border-style: solid;
      border-color: #3b82f6 transparent transparent transparent;
      transition: border-color 0.2s ease;
      z-index: -1;
    }

    /* Active waiting state matches the green badge theme */
    .user-marker-container.is-waiting .user-waiting-chat-bubble {
      color: #10b981;
      border-color: #10b981;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2), 0 2px 4px rgba(0, 0, 0, 0.05);
    }

    .user-marker-container.is-waiting .user-waiting-chat-bubble::before {
      border-color: #10b981 transparent transparent transparent;
    }

    @keyframes clickablePulse {
      0% {
        transform: scale(1);
        box-shadow: 0 0 0 3px #3b82f6, 0 0 0 0px rgba(59, 130, 246, 0.45), 0 4px 6px rgba(0,0,0,0.3);
      }
      50% {
        transform: scale(1.06);
        box-shadow: 0 0 0 3px #3b82f6, 0 0 0 12px rgba(59, 130, 246, 0.25), 0 4px 6px rgba(0,0,0,0.3);
      }
      70% {
        transform: scale(1.02);
        box-shadow: 0 0 0 3px #3b82f6, 0 0 0 24px rgba(59, 130, 246, 0), 0 4px 6px rgba(0,0,0,0.3);
      }
      100% {
        transform: scale(1);
        box-shadow: 0 0 0 3px #3b82f6, 0 0 0 0px rgba(59, 130, 246, 0), 0 4px 6px rgba(0,0,0,0.3);
      }
    }

    @keyframes waitingPulse {
      0% {
        transform: scale(1);
        box-shadow: 0 0 0 3px #10b981, 0 0 0 0px rgba(16, 185, 129, 0.5), 0 4px 6px rgba(0,0,0,0.3);
      }
      50% {
        transform: scale(1.06);
        box-shadow: 0 0 0 3px #10b981, 0 0 0 12px rgba(16, 185, 129, 0.3), 0 4px 6px rgba(0,0,0,0.3);
      }
      70% {
        transform: scale(1.02);
        box-shadow: 0 0 0 3px #10b981, 0 0 0 24px rgba(16, 185, 129, 0), 0 4px 6px rgba(0,0,0,0.3);
      }
      100% {
        transform: scale(1);
        box-shadow: 0 0 0 3px #10b981, 0 0 0 0px rgba(16, 185, 129, 0), 0 4px 6px rgba(0,0,0,0.3);
      }
    }

    .location-notice {
      animation: slideUp 0.3s ease-out;
    }

    .no-bus-icon {
      width: 110px !important;
      height: auto !important;
    }

    @keyframes slideUp {
      from {
        transform: translate(-50%, 20px);
        opacity: 0;
      }

      to {
        transform: translate(-50%, 0);
        opacity: 1;
      }
    }

    /* --- SLEEK PREMIUM WAITING MODAL STYLES --- */
    .waiting-modal-content {
      border-radius: 40px !important;
      padding: 3rem 2rem 2.5rem 2rem !important;
      border: none !important;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15) !important;
      background: #ffffff !important;
      position: relative !important;
    }

    .waiting-modal-close {
      position: absolute !important;
      top: 24px !important;
      right: 24px !important;
      background: none !important;
      border: none !important;
      font-size: 1.75rem !important;
      line-height: 1 !important;
      color: #000000 !important;
      opacity: 0.8 !important;
      cursor: pointer !important;
      padding: 0 !important;
      transition: opacity 0.2s, transform 0.2s !important;
      z-index: 10 !important;
    }

    .waiting-modal-close:hover {
      opacity: 1 !important;
      transform: scale(1.1) !important;
    }

    .waiting-modal-icon-image {
      width: 110px !important;
      height: 110px !important;
      display: block !important;
      margin: 0 auto 2rem auto !important;
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
    }

    .waiting-modal-icon-image:hover {
      transform: scale(1.08) rotate(5deg) !important;
    }

    .waiting-modal-title {
      font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif !important;
      font-size: 1.85rem !important;
      font-weight: 700 !important;
      color: #000000 !important;
      margin-bottom: 0.75rem !important;
      letter-spacing: -0.5px !important;
    }

    .waiting-modal-subtitle {
      font-size: 1.05rem !important;
      font-weight: 400 !important;
      color: #374151 !important;
      line-height: 1.45 !important;
      margin-bottom: 1.75rem !important;
      max-width: 90% !important;
      margin-left: auto !important;
      margin-right: auto !important;
    }

    .waiting-modal-location-container {
      margin-bottom: 1.75rem !important;
    }

    .waiting-modal-location-badge {
      display: inline-flex !important;
      align-items: center !important;
      gap: 8px !important;
      padding: 0.5rem 1.25rem !important;
      background-color: #f1f5f9 !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 50px !important;
    }

    .waiting-modal-location-badge span.loc-icon {
      font-size: 18px !important;
      color: #2b72c4 !important;
    }

    .waiting-modal-location-badge span.loc-text {
      font-size: 0.9rem !important;
      font-weight: 600 !important;
      color: #475569 !important;
    }

    #btnSetWaiting {
      transition: transform 0.2s ease-in-out !important;
      cursor: pointer !important;
    }

    #btnSetWaiting:hover:not(:disabled) {
      transform: scale(1.025) !important;
    }

    #btnSetWaiting:active:not(:disabled) {
      transform: scale(0.975) !important;
    }

    #btnSetWaiting:disabled {
      opacity: 0.55 !important;
      cursor: not-allowed !important;
    }

    #btnSetWaiting:disabled img {
      filter: grayscale(0.85) contrast(0.8) !important;
      cursor: not-allowed !important;
      pointer-events: none !important;
    }

    .waiting-modal-btn-cancel {
      background-color: #f1f5f9 !important;
      border: 1px solid #cbd5e1 !important;
      border-radius: 20px !important;
      padding: 1.1rem 2rem !important;
      font-size: 1.2rem !important;
      font-weight: 700 !important;
      color: #475569 !important;
      display: flex;
      align-items: center !important;
      justify-content: center !important;
      gap: 12px !important;
      width: 100% !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05) !important;
      transition: background-color 0.2s, transform 0.2s, box-shadow 0.2s !important;
    }

    .waiting-modal-btn-cancel:hover:not(:disabled) {
      background-color: #e2e8f0 !important;
      color: #334155 !important;
      transform: translateY(-1px) !important;
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08) !important;
    }

    .waiting-modal-btn-cancel:active:not(:disabled) {
      transform: translateY(1px) !important;
    }

    .waiting-modal-btn-cancel:disabled {
      opacity: 0.6 !important;
      background-color: #9ca3af !important;
      cursor: not-allowed !important;
      box-shadow: none !important;
    }

    .waiting-modal-btn-circle-icon {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 28px !important;
      height: 28px !important;
      border-radius: 50% !important;
      background-color: #ffffff !important;
    }

    .waiting-modal-btn-circle-icon.text-primary span {
      color: #174288 !important;
    }

    .waiting-modal-btn-circle-icon.text-secondary {
      background-color: #475569 !important;
    }

    .waiting-modal-btn-circle-icon.text-secondary span {
      color: #ffffff !important;
    }
  </style>
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
      var PROJECT_FOLDER = 'Byahero-Prototype-v3';
      var path = window.location.pathname || '/';
      var match = path.match(new RegExp('^/([^/]+)/', 'i'));
      var base = (match && match[1].toLowerCase() === PROJECT_FOLDER.toLowerCase()) ?
        '/' + match[1] :
        '';
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

          <!-- Current Location (Retained as requested) -->
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