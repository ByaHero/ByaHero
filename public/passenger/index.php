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
    <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
  <title>Passenger Live Map | ByaHero Real-Time Bus Tracker</title>
  <meta name="description" content="View the live passenger commute dashboard. Track real-time bus locations, seat availability, routes, stops, and boarding status instantly on ByaHero." />
  <meta name="keywords" content="byahero, bus tracker, passenger dashboard, live map, estimated arrival, seat availability" />
  <link rel="canonical" href="https://byahero.ph/public/passenger/index.php" />
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://byahero.ph/public/passenger/index.php" />
  <meta property="og:title" content="Passenger Live Map | ByaHero Real-Time Bus Tracker" />
  <meta property="og:description" content="View the live passenger commute dashboard. Track real-time bus locations, seat availability, routes, stops, and boarding status instantly on ByaHero." />
  <meta property="og:image" content="../assets/images/byaheroLogo.png" />

  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image" />
  <meta property="twitter:url" content="https://byahero.ph/public/passenger/index.php" />
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

    /* --- FILTER ROUTES pill dropdown styling --- */
    .route-pill {
      cursor: pointer;
      font-size: 0.85rem;
      letter-spacing: 0.5px;
    }

    .route-pill.dropdown-toggle::after {
      display: none;
    }

    .route-menu {
      border: 0;
      border-radius: 16px;
      padding: 8px;
      min-width: 220px;
      max-height: 280px;
      overflow-y: auto;
    }

    .route-menu .dropdown-item {
      border-radius: 12px;
      padding: 10px 12px;
      font-weight: 600;
    }

    .route-menu .dropdown-item.active,
    .route-menu .dropdown-item:active {
      background: #1e3a8a;
    }

    .route-menu-centered {
      left: 50% !important;
      right: auto !important;
      transform: translateX(-50%) !important;
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
      box-shadow: 0 0 0 3px #3b82f6, 0 4px 6px rgba(0,0,0,0.3);
      overflow: hidden;
      transition: box-shadow 0.3s ease;
    }

    .user-marker-container.is-waiting .user-avatar-circle {
      box-shadow: 0 0 0 3px #10b981, 0 0 0 10px rgba(16, 185, 129, 0.4), 0 4px 6px rgba(0,0,0,0.3);
      animation: waitingPulse 2.5s infinite;
    }

    .user-waiting-bubble {
      position: absolute;
      transform: translateX(-50%) scale(0.6);
      transform-origin: bottom center;
      z-index: 1001;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    .user-marker-container.is-waiting .user-waiting-bubble {
      opacity: 1;
      transform: translateX(-50%) scale(1);
    }

    @keyframes waitingPulse {
      0% {
        box-shadow: 0 0 0 3px #10b981, 0 0 0 0px rgba(16, 185, 129, 0.5), 0 4px 6px rgba(0,0,0,0.3);
      }
      70% {
        box-shadow: 0 0 0 3px #10b981, 0 0 0 12px rgba(16, 185, 129, 0), 0 4px 6px rgba(0,0,0,0.3);
      }
      100% {
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
    // --------------------- BASE URL DETECTION ---------------------
    // passengerBottomSheet.js auto-detects this too, but we set it early
    // here so any inline code below can also reference window.APP_BASE_URL.
    (function() {
      var PROJECT_FOLDER = 'Byahero-Prototype-v3';
      var path = window.location.pathname || '/';
      var base = path.toLowerCase().startsWith('/' + PROJECT_FOLDER.toLowerCase() + '/') ?
        '/' + PROJECT_FOLDER :
        '';
      window.PROJECT_BASE = base;
      window.APP_BASE_URL = base;
      window.ICON_BASE = base + '/assets/images/icons';
    })();

    // --------------------- MAP INIT ---------------------
    var mapId = 'map';
    var map = L.map(mapId, {
      zoomControl: false
    }).setView([14.0905, 121.0550], 12);

    // Expose map to passengerBottomSheet.js (used by setBusStopsVisibility / focusStop)
    window._map = map;

    // Resize bus-stop and user markers when zoom changes
    map.on('zoomend', function() {
      resizeStopMarkersForZoom(map.getZoom());
      if (userMarker) {
        userMarker.setIcon(getUserIcon());
        updateUserMarkerWaitingStyle(); // Sync waiting class state immediately
      }
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '',
      maxZoom: 19
    }).addTo(map);

    // --------------------- BUS ICONS ---------------------
    var busMarkers = {};
    var statusColors = {
      available: '#10b981',
      on_stop: '#f59e0b',
      full: '#ef4444',
      unavailable: '#6b7280'
    };

    var ICON_CACHE = {
      available: L.icon({
        iconUrl: ICON_BASE + '/marker.svg',
        iconSize: [40, 40],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36]
      }),
      full: L.icon({
        iconUrl: ICON_BASE + '/marker.svg',
        iconSize: [40, 40],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36]
      })
    };

    function createBusIcon(status) {
      var s = String(status || '').toLowerCase();

      // Always use the bus image icon for these states,
      // so the marker image does NOT change when on_stop.
      if (s === 'full') return ICON_CACHE.full; // you can keep a different icon if you want
      return ICON_CACHE.available; // used for available, on_stop, anything else
    }

    // --------------------- USER LOCATION ---------------------
    var userLocation = null;
    var userProfilePic = <?= json_encode($currentUser['profile_picture'] ?? null) ?>;
    var rawUserName = <?= json_encode($currentUser['name'] ?? $currentUser['email'] ?? 'Guest') ?>;
    var userInitial = (typeof rawUserName === 'string' && rawUserName.length > 0) ? rawUserName.charAt(0).toUpperCase() : '?';

    function getUserIcon() {
      var currentZoom = (typeof map !== 'undefined' && map) ? map.getZoom() : 12;
      var baseZoom = 12; // Starting zoom level where icon is default size
      
      // Calculate dynamic scaling factor based on zoom level (10% increase per level)
      var scale = Math.pow(1.10, currentZoom - baseZoom);
      scale = Math.max(0.85, Math.min(2.5, scale));
      
      var markerSize = Math.round(36 * scale);
      var bubbleWidth = Math.round(46 * scale);
      var bubbleHeight = Math.round(20 * scale);
      var bubbleBottom = Math.round(markerSize + 6);
      
      // Shift bubble dynamically by base scaling offset AND add the additional 20px shift right
      var bubbleOffset = Math.round(8 * scale) + 20;

      var htmlContent = '';
      
      // Avatar circle container
      htmlContent += '<div class="user-avatar-circle" style="width: ' + markerSize + 'px; height: ' + markerSize + 'px;">';
      if (userProfilePic) {
         var isAbsolute = /^https?:\/\//i.test(userProfilePic);
         var safePic = isAbsolute ? userProfilePic : window.PROJECT_BASE + '/' + userProfilePic.replace(/^\/+/, '');
         htmlContent += '<img src="' + safePic + '" style="width:100%;height:100%;object-fit:cover;" />';
      } else {
         htmlContent += userInitial;
      }
      htmlContent += '</div>';

      // Waiting message bubble
      var bubbleUrl = window.PROJECT_BASE + '/assets/images/waitingMEG.svg';
      htmlContent += '<div class="user-waiting-bubble" style="bottom: ' + bubbleBottom + 'px; left: calc(50% + ' + bubbleOffset + 'px); width: ' + bubbleWidth + 'px; height: ' + bubbleHeight + 'px;">';
      htmlContent += '<img src="' + bubbleUrl + '" style="width:100%;height:100%;display:block;" />';
      htmlContent += '</div>';

      // Determine initial class state directly during icon creation to avoid flashing or resetting
      var isWaitingClass = (isPassengerWaiting && !(PassengerRideTracker && PassengerRideTracker.activeRide)) ? ' is-waiting' : '';

      return L.divIcon({
        className: 'user-marker-container' + isWaitingClass,
        html: htmlContent,
        iconSize: [markerSize, markerSize],
        iconAnchor: [markerSize / 2, markerSize / 2]
      });
    }
    var userMarker = null;

    // --- WAITING FEATURE SUPPORT ---
    var isPassengerWaiting = false;
    var passengerWaitingLocation = null;

    function bindUserMarker(marker) {
        if (!marker) return;
        marker.off('click');
        marker.on('click', function() {
            openWaitingModal();
        });
        updateUserMarkerWaitingStyle();
    }

    async function checkWaitingStatus() {
        try {
            const url = new URL('../../backend/waiting_api.php?action=get_my_status', window.location.href).href;
            const res = await fetch(url, { credentials: 'have' });
            const data = await res.json();
            if (data && data.success) {
                isPassengerWaiting = !!data.is_waiting;
                passengerWaitingLocation = data.location_name;
                updateUserMarkerWaitingStyle();
            }
        } catch(e) { console.error("Error checking waiting status:", e); }
    }

    function updateUserMarkerWaitingStyle() {
        if (!userMarker) return;
        const element = userMarker._icon || userMarker._path;
        if (!element) return;
        
        var shouldShowWaiting = isPassengerWaiting && !(PassengerRideTracker && PassengerRideTracker.activeRide);
        
        if (shouldShowWaiting) {
            element.classList.add('is-waiting');
        } else {
            element.classList.remove('is-waiting');
        }
    }

    async function openWaitingModal() {
        const resolvedLoc = (lastKnownLocation && lastKnownLocation.locName) ? resolveLocationName(lastKnownLocation.lat, lastKnownLocation.lng) : null;
        
        const displaySpan = document.getElementById('waitingLocationNameDisplay');
        const btnSet = document.getElementById('btnSetWaiting');
        const btnCancel = document.getElementById('btnCancelWaiting');
        const statusMsg = document.getElementById('waitingStatusMsg');

        await checkWaitingStatus();

        if (isPassengerWaiting) {
            displaySpan.textContent = passengerWaitingLocation || "Your current stop";
            btnSet.classList.add('d-none');
            btnCancel.classList.remove('d-none');
            statusMsg.classList.remove('d-none');
            statusMsg.className = "alert alert-success py-2 px-3 mb-3 small rounded-3";
            statusMsg.innerHTML = `<strong>Status:</strong> Waiting for bus at <strong>${passengerWaitingLocation}</strong>.`;
        } else {
            if (resolvedLoc) {
                displaySpan.textContent = resolvedLoc;
                btnSet.classList.remove('d-none');
                btnSet.removeAttribute('disabled');
                btnCancel.classList.add('d-none');
                statusMsg.classList.add('d-none');
            } else {
                displaySpan.textContent = "Unrecognized Stop";
                btnSet.classList.remove('d-none');
                btnSet.setAttribute('disabled', 'true');
                btnCancel.classList.add('d-none');
                statusMsg.classList.remove('d-none');
                statusMsg.className = "alert alert-danger py-2 px-3 mb-3 small rounded-3";
                statusMsg.innerHTML = `<span class="material-symbols-rounded align-middle me-1" style="font-size:16px;">warning</span> You are not at any recognized stop. Waiting can only be activated at designated locations.`;
            }
        }

        const modalEl = document.getElementById('waitingModal');
        if (modalEl) {
            const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
            modal.show();
        }
    }
    window.watchId = null;
    window.bgWatcherId = null;
    var selectedRoute = '';
    var locationPermissionGranted = true;

    var AVG_SPEED_MPS = (30 * 1000) / 3600;
    var MAX_DISTANCE_METERS = 5000;

    // --- CONSOLIDATED TRACKING LOGIC (LITERAL COPY FROM conductorLive.php) ---
    var _lastNetworkSync = 0;
    var _lastUiUpdateAt = 0;
    var _lastLocationUpdateAt = 0;
    var lastKnownLocation = null;
    var bgWatcherId = null;
    var watchId = null;
    var SYNC_INTERVAL = 5000;
    var _heartbeatIntervalId = null;
    var _rideTrackerIntervalId = null;
    var _updateBusesIntervalId = null;
    var _appStateListener = null;
    var routeFeatures = [];

    async function safePost(relativeUrl, payload = {}) {
        const url = new URL(relativeUrl, window.location.href).href;
        try {
            if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.CapacitorHttp) {
                const res = await window.Capacitor.Plugins.CapacitorHttp.post({
                    url,
                    headers: { 
                        'Content-Type': 'application/json',
                        'Accept': 'application/json, text/plain, */*',
                        'User-Agent': navigator.userAgent, // Required for InfinityFree bypass
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    data: payload
                });
                return res.data;
            } else {
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'User-Agent': navigator.userAgent,
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: JSON.stringify(payload)
                });
                return await res.json();
            }
        } catch(e) {
            console.error('safePost error:', e);
            return { success: false, error: e.message };
        }
    }

    async function triggerManualUpdate() {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(pos => {
            onLocationUpdate(pos);
        }, err => {}, { enableHighAccuracy: true, timeout: 5000 });
    }

    function pointInRing(x, y, ring) {
        let inside = false;
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
            const xi = ring[i][0], yi = ring[i][1];
            const xj = ring[j][0], yj = ring[j][1];
            const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / ((yj - yi) || 1) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    function showLocationDisabledNotice() {
      if (sessionStorage.getItem('location_notice_shown')) return;
      var notice = document.createElement('div');
      notice.className = 'location-notice position-fixed bottom-0 start-50 translate-middle-x mb-5 p-3 bg-warning text-dark rounded shadow-lg d-flex align-items-center gap-2';
      notice.style.zIndex = '9999';
      notice.style.maxWidth = '90%';
      notice.innerHTML = `<span class="material-symbols-rounded">location_off</span><span class="small">Location services disabled. <a href="./passengerSettings/privacySecurity.php" class="text-primary fw-bold text-decoration-underline">Enable</a></span><button class="btn-close btn-close-sm ms-2" onclick="this.parentElement.remove()"></button>`;
      document.body.appendChild(notice);
      sessionStorage.setItem('location_notice_shown', '1');
      setTimeout(function() { if (notice.parentElement) notice.remove(); }, 5000);
    }

    function showLocationPermissionDenied() {
      var notice = document.createElement('div');
      notice.className = 'location-notice position-fixed bottom-0 start-50 translate-middle-x mb-5 p-3 bg-danger text-white rounded shadow-lg d-flex align-items-center gap-2';
      notice.style.zIndex = '9999'; notice.style.maxWidth = '90%';
      notice.innerHTML = `<span class="material-symbols-rounded">error</span><span class="small">Location permission denied. Please enable it in your browser settings.</span><button class="btn-close btn-close-white ms-2" onclick="this.parentElement.remove()"></button>`;
      document.body.appendChild(notice);
    }

    function resolveLocationName(lat, lng) {
        if (!routeFeatures || routeFeatures.length === 0) return null;
        for (const f of routeFeatures) {
            if (!f.geometry) continue;
            if (f.geometry.type === 'Polygon' && Array.isArray(f.geometry.coordinates) && f.geometry.coordinates[0]) {
                if (pointInRing(lng, lat, f.geometry.coordinates[0])) {
                    return (f.properties && (f.properties['Current Location'] || f.properties.name)) || null;
                }
            }
            if (f.geometry.type === 'MultiPolygon' && Array.isArray(f.geometry.coordinates)) {
                for (const poly of f.geometry.coordinates) {
                    if (poly && poly[0] && pointInRing(lng, lat, poly[0])) {
                        return (f.properties && (f.properties['Current Location'] || f.properties.name)) || null;
                    }
                }
            }
        }
        return null;
    }

    async function loadRouteFeatures() {
        try {
            const res = await fetch('../map_data.php', { cache: 'no-store' });
            const json = await res.json();
            if (json && Array.isArray(json.features)) {
                routeFeatures = json.features.filter(f => f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon'));
            }
        } catch (e) { }
    }

    async function uploadMyLocation(lat, lng, accuracy) {
        await safePost('../../backend/updateUserLocation.php', {
            latitude: lat,
            longitude: lng,
            accuracy: accuracy ?? null
        });
    }

    function onLocationUpdate(pos) {
        const now = Date.now();
        // Throttle location updates to at most once every 1500ms to save CPU/battery
        if (now - _lastLocationUpdateAt < 1500) return;
        _lastLocationUpdateAt = now;

        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const acc = pos.coords.accuracy;
        const resolved = resolveLocationName(lat, lng);
        const locName = resolved || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

        userLocation = { lat, lng };
        lastKnownLocation = { lat, lng, locName };

        if (!userMarker) {
            userMarker = L.marker([lat, lng], {
                icon: getUserIcon(),
                zIndexOffset: 1000
            }).addTo(map);
            bindUserMarker(userMarker);
        } else {
            userMarker.setLatLng([lat, lng]);
            updateUserMarkerWaitingStyle();
        }

        // Throttled UI updates (Stops list) to every 5 seconds
        if (now - _lastUiUpdateAt > 5000) {
            _lastUiUpdateAt = now;
            if (window.allStops) renderStopsList(window.allStops);
        }

        // Sync with server every 5 seconds
        if (now - _lastNetworkSync > SYNC_INTERVAL) {
            uploadMyLocation(lat, lng, acc);
            _lastNetworkSync = now;
        }

        // Feed into the Ride Tracker
        if (PassengerRideTracker && typeof PassengerRideTracker.tick === 'function') {
            if (now - (window._lastTrackerTick || 0) > 10000) {
                window._lastTrackerTick = now;
                PassengerRideTracker.tick();
            }
        }
    }

    async function startUserLocationWatch() {
      const locationEnabled = localStorage.getItem('byahero_location_services') !== '0';
      if (!locationEnabled) { showLocationDisabledNotice(); return; }
      if (!navigator.geolocation) return;

      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.BackgroundGeolocation) {
          const BG = window.Capacitor.Plugins.BackgroundGeolocation;
          try {
              const permissions = await BG.requestPermissions();
              if (permissions.location !== 'granted') {
                  startWebGeolocation();
                  return;
              }

              window.bgWatcherId = await BG.addWatcher(
                  {
                      backgroundMessage: "Tracking active. Keep app open in background.",
                      backgroundTitle: "ByaHero Journey Tracking",
                      requestPermissions: true,
                      stale: false,
                      distanceFilter: 0 
                  },
                  function callback(location, error) {
                      if (error) return;
                      const pos = { coords: { latitude: location.latitude, longitude: location.longitude, accuracy: location.accuracy } };
                      onLocationUpdate(pos);
                  }
              );
              startKeepAliveAudio();
              acquireWakeLock();
          } catch (e) { startWebGeolocation(); }
      } else {
          startWebGeolocation();
      }
    }

    function startWebGeolocation() {
        if (!navigator.geolocation) return;
        window.watchId = navigator.geolocation.watchPosition(
            onLocationUpdate,
            (err) => console.warn('GPS Error:', err.message),
            { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
        );
        startKeepAliveAudio();
        acquireWakeLock();
    }

    // --- SCREEN WAKE LOCK ---
    let wakeLock = null;
    async function acquireWakeLock() {
        if (!('wakeLock' in navigator)) return;
        try {
            wakeLock = await navigator.wakeLock.request('screen');
            wakeLock.addEventListener('release', () => {
                if (document.visibilityState === 'visible') acquireWakeLock();
            });
        } catch (e) { }
    }
    async function releaseWakeLock() {
        if (wakeLock) { try { await wakeLock.release(); } catch(e){} wakeLock = null; }
    }

    // --- AUDIO KEEP-ALIVE ---
    let keepAliveAudio = null;
    function startKeepAliveAudio() {
        // Only run on mobile/Capacitor, not desktop web browsers
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (!isMobile) return;

        if (!keepAliveAudio) {
            // A valid 2-second silent WAV to avoid infinite loop CPU thrashing on 0-duration headers
            keepAliveAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAgAAAA');
            keepAliveAudio.loop = true;
            keepAliveAudio.volume = 0.001;
            keepAliveAudio.play().catch(e => {
                const playOnInteraction = () => {
                    if (keepAliveAudio) keepAliveAudio.play().catch(()=>{});
                    document.removeEventListener('touchstart', playOnInteraction);
                    document.removeEventListener('click', playOnInteraction);
                };
                document.addEventListener('touchstart', playOnInteraction);
                document.addEventListener('click', playOnInteraction);
            });
        }
    }
    function stopKeepAliveAudio() {
        if (keepAliveAudio) { keepAliveAudio.pause(); keepAliveAudio = null; }
    }

    // --- PERSISTENCE LISTENERS ---
    const _onVisibilityChange = async () => {
        if (document.visibilityState === 'visible') {
            acquireWakeLock();
            if (keepAliveAudio && keepAliveAudio.paused) keepAliveAudio.play().catch(()=>{});
            const trackingActive = (bgWatcherId !== null || watchId !== null);
            if (!trackingActive) startUserLocationWatch();
            else if (lastKnownLocation) {
                uploadMyLocation(lastKnownLocation.lat, lastKnownLocation.lng, 0);
                _lastNetworkSync = Date.now();
            }
        }
    };
    document.addEventListener('visibilitychange', _onVisibilityChange);

    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
        const _appStateResult = window.Capacitor.Plugins.App.addListener('appStateChange', ({ isActive }) => {
            if (isActive) {
                acquireWakeLock();
                if (keepAliveAudio && keepAliveAudio.paused) keepAliveAudio.play().catch(()=>{});
                if (lastKnownLocation) {
                    uploadMyLocation(lastKnownLocation.lat, lastKnownLocation.lng, 0);
                    _lastNetworkSync = Date.now();
                }
            }
        });
        if (_appStateResult && typeof _appStateResult.then === 'function') {
            _appStateResult.then(handle => { _appStateListener = handle; });
        } else {
            _appStateListener = _appStateResult;
        }
    }

    // Heartbeat Monitor - using recursive setTimeout to prevent overlapping async calls
    var _heartbeatRunning = false;
    function _heartbeatTick() {
        if (_heartbeatRunning) return;
        _heartbeatRunning = true;
        (async () => {
            try {
                if (document.visibilityState !== 'visible') {
                    if (keepAliveAudio && keepAliveAudio.paused) keepAliveAudio.play().catch(()=>{});
                }
                const trackingActive = (bgWatcherId !== null || watchId !== null);
                if (!trackingActive) {
                    startUserLocationWatch();
                } else if (lastKnownLocation && (Date.now() - _lastNetworkSync > 8000)) {
                    triggerManualUpdate();
                }
            } finally {
                _heartbeatRunning = false;
                _heartbeatIntervalId = setTimeout(_heartbeatTick, 5000);
            }
        })();
    }
    _heartbeatIntervalId = setTimeout(_heartbeatTick, 5000);

    // --------------------- PASSENGER RIDE TRACKER (AUTO-BOARDING) ---------------------
    var PassengerRideTracker = {
      activeRide: null,
      proximityThreshold: 30, // meters
      departureThreshold: 150, // meters
      checkInterval: 10000, // 10 seconds
      busUpdateTracker: {},

      init: async function() {
        console.log('Initializing PassengerRideTracker...');
        await this.checkActiveRide();
        // Tracking is started globally at the end of the script
        this._tickRecursive();
      },

      _tickRecursive: function() {
        if (this._tickRunning) return;
        this._tickRunning = true;
        this.tick().then(() => {
          this._tickRunning = false;
          _rideTrackerIntervalId = setTimeout(() => this._tickRecursive(), this.checkInterval);
        }).catch(() => {
          this._tickRunning = false;
          _rideTrackerIntervalId = setTimeout(() => this._tickRecursive(), this.checkInterval);
        });
      },

      tick: async function() {
        if (this.activeRide) {
          await this.checkActiveRide();
          await this.checkDistanceForDeparture();
        } else {
          await this.checkProximityToBuses();
        }
      },

      checkActiveRide: async function() {
        try {
          const data = await safePost('../api.php?action=check_active_ride');
          if (data.success) {
            if (data.on_ride) {
              this.activeRide = data.ride;
              this.updateUI();
              updateUserMarkerWaitingStyle();
            } else if (this.activeRide) {
              this.activeRide = null;
              this.updateUI();
              this.showDepartureNotice();
              updateUserMarkerWaitingStyle();
            }
          }
        } catch (e) { console.warn('checkActiveRide error:', e); }
      },

      checkProximityToBuses: async function() {
        if (!userLocation || !allBuses || allBuses.length === 0) return;
        for (const bus of allBuses) {
          if (!bus.coords || !bus.operation_id) continue;
          const dist = distanceMeters(userLocation.lat, userLocation.lng, bus.coords[0], bus.coords[1]);
          if (dist <= this.proximityThreshold) {
            this.joinRide(bus);
            break; 
          }
        }
      },

      joinRide: async function(bus) {
        try {
          const data = await safePost('../api.php?action=join_ride', { operation_id: bus.operation_id });
          if (data.success) {
            await this.checkActiveRide();
            this.showBoardingNotice(bus);
          }
        } catch (e) { console.warn('joinRide error:', e); }
      },

      updateUI: function() {
        const statusEl = document.getElementById('rideStatusPill');
        if (this.activeRide) {
          if (!statusEl) {
            const pill = document.createElement('div');
            pill.id = 'rideStatusPill';
            pill.className = 'position-fixed top-0 start-50 translate-middle-x z-3';
            pill.style.marginTop = '75px';
            pill.style.zIndex = '1050'; // Just below navbar but above most things
            pill.innerHTML = `
              <div id="rideStatusPillContainer" class="bg-success text-white px-3 py-2 rounded-pill shadow fw-bold d-flex align-items-center gap-2 border border-white border-2" style="font-size: 0.85rem; backdrop-filter: blur(4px); background-color: rgba(25, 135, 84, 0.9) !important;">
                <span id="rideStatusPillText" class="d-flex align-items-center gap-2">
                  <span class="material-symbols-rounded" style="font-size: 20px;">directions_bus</span>
                  On Ride: ${this.activeRide.bus_code}
                </span>
              </div>
            `;
            document.body.appendChild(pill);
          } else {
            const textEl = document.getElementById('rideStatusPillText');
            if (textEl) {
              textEl.innerHTML = `
                <span class="material-symbols-rounded" style="font-size: 20px;">directions_bus</span>
                On Ride: ${this.activeRide.bus_code}
              `;
            }
            const containerEl = document.getElementById('rideStatusPillContainer');
            if (containerEl) {
              containerEl.classList.replace('bg-warning', 'bg-success');
              containerEl.classList.replace('text-dark', 'text-white');
            }
          }
        } else if (statusEl) {
          statusEl.remove();
        }
      },

      showBoardingNotice: function(bus) {
        const notice = document.createElement('div');
        notice.className = 'location-notice position-fixed bottom-0 start-50 translate-middle-x mb-5 p-3 bg-primary text-white rounded shadow-lg d-flex align-items-center gap-2';
        notice.style.zIndex = '9999';
        notice.style.marginBottom = '80px';
        notice.innerHTML = `
          <span class="material-symbols-rounded">check_circle</span>
          <span class="small">Automatically boarded <b>Bus ${bus.code}</b></span>
          <button class="btn-close btn-close-white ms-2" onclick="this.parentElement.remove()"></button>
        `;
        document.body.appendChild(notice);
        setTimeout(() => notice.remove(), 5000);
      },

      showDepartureNotice: function(msg) {
        msg = msg || "Ride completed. Automatically departed.";
        const notice = document.createElement('div');
        notice.className = 'location-notice position-fixed bottom-0 start-50 translate-middle-x mb-5 p-3 bg-info text-white rounded shadow-lg d-flex align-items-center gap-2';
        notice.style.zIndex = '9999';
        notice.style.marginBottom = '80px';
        notice.innerHTML = `
          <span class="material-symbols-rounded">info</span>
          <span class="small">${msg}</span>
          <button class="btn-close btn-close-white ms-2" onclick="this.parentElement.remove()"></button>
        `;
        document.body.appendChild(notice);
        setTimeout(() => notice.remove(), 5000);
      },

      checkDistanceForDeparture: async function() {
        if (!this.activeRide || !userLocation || !allBuses || allBuses.length === 0) return;
        
        const busId = this.activeRide.bus_id;
        const bus = allBuses.find(b => String(b.id) === String(busId));
        
        if (!bus || !bus.coords) return;
        
        const now = Date.now();
        if (!this.busUpdateTracker[busId]) {
            this.busUpdateTracker[busId] = { updatedStr: bus.updated || null, lastSeenChange: now };
        } else if (bus.updated && this.busUpdateTracker[busId].updatedStr !== bus.updated) {
            this.busUpdateTracker[busId].updatedStr = bus.updated;
            this.busUpdateTracker[busId].lastSeenChange = now;
        }
        
        const secondsSinceChange = (now - this.busUpdateTracker[busId].lastSeenChange) / 1000;
        const isStale = secondsSinceChange > 60;
        
        const statusEl = document.getElementById('rideStatusPillText');
        const containerEl = document.getElementById('rideStatusPillContainer');
        if (statusEl && containerEl) {
            if (isStale) {
                statusEl.innerHTML = `<span class="material-symbols-rounded" style="font-size: 20px;">warning</span> On Ride: ${this.activeRide.bus_code} <small>(Bus Signal Lost)</small>`;
                containerEl.classList.replace('bg-success', 'bg-warning');
                containerEl.classList.replace('text-white', 'text-dark');
            } else {
                statusEl.innerHTML = `<span class="material-symbols-rounded" style="font-size: 20px;">directions_bus</span> On Ride: ${this.activeRide.bus_code}`;
                containerEl.classList.replace('bg-warning', 'bg-success');
                containerEl.classList.replace('text-dark', 'text-white');
            }
        }
        
        if (isStale) return;
        
        const dist = distanceMeters(userLocation.lat, userLocation.lng, bus.coords[0], bus.coords[1]);
        if (dist > this.departureThreshold) {
            this.leaveRide();
        }
      },
      
      leaveRide: async function() {
        try {
            const data = await safePost('../api.php?action=leave_ride');
            if (data.success) {
                this.activeRide = null;
                this.updateUI();
                this.showDepartureNotice("You moved away from the bus. Automatically departed.");
                updateUserMarkerWaitingStyle();
            }
        } catch (e) { console.warn('leaveRide error:', e); }
      }
    };

    window.addEventListener('storage', function(e) {
      if (e.key !== 'byahero_location_services') return;
      var isEnabled = e.newValue !== '0';
      if (isEnabled && !locationPermissionGranted) {
        startUserLocationWatch();
      } else if (!isEnabled && locationPermissionGranted) {
        locationPermissionGranted = false;
        if (userMarker) { map.removeLayer(userMarker); userMarker = null; }
        userLocation = null;
      }
    });

    // --------------------- BUSES ---------------------
    var _updateBusesInProgress = false;
    var _updateBusesTimer = null;

    async function updateBuses() {
      if (_updateBusesInProgress) return; // Skip if previous request still in progress
      _updateBusesInProgress = true;
      try {
        var res = await fetch('../api.php?action=get_buses');
        var json = await res.json();
        if (json.success && json.buses) {
          var buses = json.buses.map(normalizeBus);
          allBuses = buses;
          if (locationPermissionGranted && userLocation) {
            buses.forEach(function(b) {
              if (b.coords) {
                var dist = distanceMeters(b.coords[0], b.coords[1], userLocation.lat, userLocation.lng);
                b.eta = formatArrivalBySeconds(dist / AVG_SPEED_MPS);
                b.progress = Math.round(Math.max(0, Math.min(100, 100 - (dist / MAX_DISTANCE_METERS) * 100)));
              }
            });
          }
          if (typeof generateSmartNotificationsFromBuses === 'function') await generateSmartNotificationsFromBuses(buses);
          updateMap(buses);
          renderBusList(buses);
          updateFilters(buses);
        }
      } catch (e) { console.error('Bus fetch error:', e); }
      finally {
        _updateBusesInProgress = false;
      }
    }

    function scheduleNextBusUpdate() {
        _updateBusesTimer = setTimeout(async () => {
            await updateBuses();
            scheduleNextBusUpdate();
        }, 4000);
    }

    function updateMap(buses) {
      var filtered = buses.filter(function(b) {
        return (!selectedRoute || b.route === selectedRoute) && b.status !== 'unavailable' && b.coords !== null;
      });
      var currentIds = new Set(filtered.map(function(b) { return String(b.id); }));
      Object.keys(busMarkers).forEach(function(id) {
        if (!currentIds.has(id)) { map.removeLayer(busMarkers[id]); delete busMarkers[id]; }
      });
      if (userLocation && locationPermissionGranted) {
        if (!userMarker) {
          userMarker = L.marker([userLocation.lat, userLocation.lng], { icon: getUserIcon(), zIndexOffset: 1000 }).addTo(map);
          bindUserMarker(userMarker);
        } else { 
          userMarker.setLatLng([userLocation.lat, userLocation.lng]); 
          updateUserMarkerWaitingStyle();
        }
      } else if (userMarker && !locationPermissionGranted) {
        map.removeLayer(userMarker); userMarker = null;
      }
      filtered.forEach(function(b) {
        var iconForBus = createBusIcon(b.status);
        var popup = '<b>' + b.code + '</b><br>' + b.locName + (b.eta ? '<br><small>ETA: ' + b.eta + '</small>' : '');
        if (busMarkers[b.id]) {
          busMarkers[b.id].setLatLng(b.coords).setIcon(iconForBus);
          if (busMarkers[b.id].getPopup()) {
            busMarkers[b.id].setPopupContent(popup);
          } else {
            busMarkers[b.id].bindPopup(popup);
          }
        } else {
          var m = L.marker(b.coords, { icon: iconForBus }).addTo(map);
          m.bindPopup(popup);
          busMarkers[b.id] = m;
        }
      });
    }

    function renderBusList(buses) {
      var container = document.getElementById('busListMobile');
      if (!container) return;
      var activeBuses = buses.filter(function(b) {
        return (!selectedRoute || b.route === selectedRoute) && b.status !== 'unavailable' && b.coords !== null;
      });
      if (activeBuses.length === 0) {
        container.innerHTML = `<div class="p-3"><div class="d-flex flex-column justify-content-center align-items-center text-muted text-center"><img src="../../assets/images/icons/noBus.svg" alt="No Bus" class="mb-2 no-bus-icon" /><span class="fw-bold">No Available Bus</span></div></div>`;
        return;
      }
      var html = activeBuses.map(function(b) {
        var color = statusColors[b.status] || '#ccc';
        var progress = b.progress || 0;
        var arrivalText = b.eta ? 'Arriving by ' + b.eta : '';
        
        var statusLabel = '';
        if (b.status === 'available') statusLabel = 'Available';
        else if (b.status === 'on_stop') statusLabel = 'On Stop';
        else if (b.status === 'full') statusLabel = 'Full';
        else statusLabel = String(b.status || '').replace('_', ' ').toUpperCase();

        return `
          <div class="card border-0 border-bottom rounded-0 cursor-pointer" onclick="focusBus('${b.id}')">
            <div class="card-body py-3 px-4">
              <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="badge bg-primary rounded-2 text-uppercase fw-bold">${b.code}</span>
                <div style="padding: 2px 8px; border-radius: 12px; background: ${color}; color: black; font-size: 11px; font-weight: bold; text-transform: uppercase;">
                  ${statusLabel}
                </div>
              </div>
              <div class="d-flex justify-content-between small text-muted">
                <span>${b.locName}</span>
                <span>${b.seats} Available</span>
              </div>
              ${arrivalText ? `<div class="small text-muted mb-1">${arrivalText}</div>` : ''}
              
              <div class="bus-timeline-track position-relative mt-4 mb-2 mx-2">
                <div class="bus-timeline-progress position-absolute top-0 bottom-0" style="left:${progress}%; width:${100 - progress}%"></div>
                <div class="bus-timeline-bus position-absolute bg-white rounded-circle shadow-sm border border-2 border-primary d-flex align-items-center justify-content-center" style="left:${progress}%; transform: translateX(-50%);">
                  <span class="material-symbols-rounded text-primary" style="font-size: 16px;">directions_bus</span>
                </div>
                <div class="bus-timeline-destination position-absolute bg-white rounded-circle shadow-sm border border-2 border-danger d-flex align-items-center justify-content-center" style="right: 0; transform: translateX(50%);">
                  <span class="material-symbols-rounded text-danger" style="font-size: 14px;">place</span>
                </div>
              </div>
            </div>
          </div>`;
      }).join('');
      container.innerHTML = html;
    }

    function normalizeBus(bus) {
      var coords = null;
      if (bus.current_location) {
        try {
          var geo = JSON.parse(bus.current_location);
          if (geo.geometry) coords = [geo.geometry.coordinates[1], geo.geometry.coordinates[0]];
        } catch (e) {}
      }
      if (!coords && bus.lat && bus.lng) coords = [bus.lat, bus.lng];
      return {
        id: bus.Bus_ID || bus.id,
        code: bus.code || 'BUS',
        route: bus.route || '',
        status: bus.status || 'unavailable',
        coords: coords,
        locName: bus.current_location_name || 'Updating...',
        seats: (bus.seat_availability || 0) + '/' + (bus.total_seats || 0),
        eta: null,
        progress: 0,
        updated: bus.updated || null,
        operation_id: bus.current_operation_id || null
      };
    }

    function distanceMeters(lat1, lon1, lat2, lon2) {
      var R = 6371000;
      var dLat = (lat2 - lat1) * Math.PI / 180;
      var dLon = (lon2 - lon1) * Math.PI / 180;
      var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    function formatArrivalBySeconds(seconds) {
      var dt = new Date(Date.now() + Math.max(0, seconds * 1000));
      var h = dt.getHours();
      var m = dt.getMinutes().toString().padStart(2, '0');
      var ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12; h = h ? h : 12;
      return h + ':' + m + ' ' + ampm;
    }

    window.focusBus = function(id) {
      var m = busMarkers[id];
      if (!m) return;
      map.flyTo(m.getLatLng(), 15);
      m.openPopup();
    };

    var allBuses = [];

    window.setRoute = function(r) {
      selectedRoute = r;
      var label = document.getElementById('filterLabelMobile');
      if (label) label.textContent = r ? r.substring(0, 12) + '...' : 'FILTER ROUTES';
      updateBuses();
      setTimeout(function() { centerToFirstBusInRoute(r, allBuses); }, 300);
    };

    window.setRouteFromSheet = function(route) {
      window.setRoute(route);
      if (typeof window.updateRoutePills === 'function') window.updateRoutePills();
    };

    window.centerToFirstBusInRoute = function(route, buses) {
      var filtered = buses.filter(function(b) {
        return (!route || b.route === route) && b.status !== 'unavailable' && b.coords !== null;
      });
      if (filtered.length > 0) focusBus(filtered[0].id);
    };

    function updateFilters(buses) {
      var manualRoutes = ['Laurel - Tanauan', 'Tanauan - Laurel'];
      var apiRoutes = buses.map(function(b) { return b.route; }).filter(function(r) { return r; });
      var routes = [...new Set([...manualRoutes, ...apiRoutes])];
      var menu = document.getElementById('routeDropdownMenu');
      if (!menu) return;
      var html = `<li><button class="dropdown-item ${selectedRoute === '' ? 'active' : ''}" type="button" onclick="setRoute('')">All Routes</button></li>`;
      routes.forEach(function(r) {
        var safe = String(r).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        html += `<li><button class="dropdown-item ${selectedRoute === r ? 'active' : ''}" type="button" onclick="setRoute('${safe}')">${r}</button></li>`;
      });
      menu.innerHTML = html;
    }

    function escapeHtml(str) {
      return String(str ?? '').replace(/[&<>"']/g, function(s) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]);
      });
    }

    // --------------------- BUS STOPS ---------------------
    var stopMarkers = {};
    window._stopMarkers = stopMarkers;
    var STOP_ICONS = {
      pickup_point: L.icon({ iconUrl: PROJECT_BASE + '/assets/images/icons/busStopMarkerFinal1.svg', iconSize: [50, 50], iconAnchor: [25, 50], popupAnchor: [0, -44] }),
      bus_stop: L.icon({ iconUrl: PROJECT_BASE + '/assets/images/icons/busStopMarkerFinal2.svg', iconSize: [50, 50], iconAnchor: [25, 50], popupAnchor: [0, -44] }),
      terminal: L.icon({ iconUrl: PROJECT_BASE + '/assets/images/icons/BUSSTOP.png', iconSize: [50, 50], iconAnchor: [25, 50], popupAnchor: [0, -44] })
    };
    function stopIcon(type) { var t = String(type || '').toLowerCase(); return STOP_ICONS[t] || STOP_ICONS.bus_stop; }

    function resizeStopMarkersForZoom(zoom) {
      if (!window._stopMarkers) return;
      var targetSizePx;
      if (zoom <= 12) targetSizePx = 45;
      else if (zoom >= 17) targetSizePx = 80;
      else { var t = (zoom - 12) / (17 - 12); targetSizePx = 45 + t * (80 - 45); }
      Object.values(window._stopMarkers).forEach(function(marker) {
        var t = marker.options.stopType || 'bus_stop';
        var baseIcon = STOP_ICONS[t] || STOP_ICONS.bus_stop;
        var baseSize = baseIcon.options.iconSize;
        var baseWidth = baseSize[0], baseHeight = baseSize[1];
        var aspect = baseWidth / baseHeight || 1;
        var newHeight = targetSizePx, newWidth = Math.round(newHeight * aspect);
        var baseAnchor = baseIcon.options.iconAnchor || [baseWidth / 2, baseHeight];
        var basePopup = baseIcon.options.popupAnchor || [0, -baseHeight * 0.9];
        var widthScale = newWidth / baseWidth, heightScale = newHeight / baseHeight;
        var newAnchor = [Math.round(baseAnchor[0] * widthScale), Math.round(baseAnchor[1] * heightScale)];
        var newPopup = [Math.round(basePopup[0] * widthScale), Math.round(basePopup[1] * heightScale)];
        var zoomIcon = L.icon({ iconUrl: baseIcon.options.iconUrl, iconSize: [newWidth, newHeight], iconAnchor: newAnchor, popupAnchor: newPopup });
        marker.setIcon(zoomIcon);
      });
    }

    async function loadStops() {
      var listEl = document.getElementById('busStopsListMobile');
      if (listEl) listEl.innerHTML = '<div class="text-center mt-4"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>';
      var res = await fetch('../api.php?action=get_bus_stops_terminal', { cache: 'no-store' });
      var json = await res.json();
      if (!json || !json.success || !Array.isArray(json.data)) {
        var msg = json?.error || 'Failed to load stops';
        if (listEl) listEl.innerHTML = '<div class="text-center text-danger mt-4 small">' + escapeHtml(msg) + '</div>';
        return;
      }
      var stops = json.data;
      window.allStops = stops;
      renderStopsList(stops);
      var ids = new Set(stops.map(function(s) { return String(s.id); }));
      Object.keys(stopMarkers).forEach(function(id) {
        if (!ids.has(id)) { map.removeLayer(stopMarkers[id]); delete stopMarkers[id]; }
      });
      stops.forEach(function(s) {
        var id = String(s.id), lat = parseFloat(s.lat), lng = parseFloat(s.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        var typeLabel = String(s.type || '').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
        var popup = '<b>' + escapeHtml(s.name) + '</b><br>' + escapeHtml(s.location_name || '') + (s.location_landmark ? '<br><small>' + escapeHtml(s.location_landmark) + '</small>' : '') + '<br><small>' + escapeHtml(typeLabel) + '</small>';
        if (stopMarkers[id]) { stopMarkers[id].setLatLng([lat, lng]).setIcon(stopIcon(s.type)).setPopupContent(popup); }
        else { stopMarkers[id] = L.marker([lat, lng], { icon: stopIcon(s.type), stopType: String(s.type || 'bus_stop').toLowerCase() }).addTo(map).bindPopup(popup); }
      });
      if (typeof setBusStopsVisibility === 'function') setBusStopsVisibility(false);
      resizeStopMarkersForZoom(map.getZoom());
    }

    window.currentStopsRoute = 'LAUREL - TANAUAN';

    window.toggleStopsRoute = function() {
      var icon = document.getElementById('stopsRouteIcon');
      if (icon) {
        var currentRot = parseInt(icon.getAttribute('data-rot') || '0');
        currentRot += 180;
        icon.style.transform = 'rotate(' + currentRot + 'deg)';
        icon.setAttribute('data-rot', currentRot);
      }
      
      window.currentStopsRoute = (window.currentStopsRoute === 'LAUREL - TANAUAN') ? 'TANAUAN - LAUREL' : 'LAUREL - TANAUAN';
      
      var textEl = document.getElementById('stopsRouteText');
      if (textEl) textEl.textContent = window.currentStopsRoute;
      
      if (window.allStops) {
        renderStopsList(window.allStops);
      }
    };

    function renderStopsList(stops) {
      var listEl = document.getElementById('busStopsListMobile');
      if (!listEl || !stops) return;
      
      var filteredStops = stops.filter(function(s) {
        return !s.route || s.route.toUpperCase() === window.currentStopsRoute;
      });
      stops = filteredStops;

      if (typeof stopMarkers !== 'undefined' && map) {
        var ids = new Set(stops.map(function(s) { return String(s.id); }));
        Object.keys(stopMarkers).forEach(function(id) {
          if (!ids.has(id)) {
            map.removeLayer(stopMarkers[id]);
          } else {
            if (!map.hasLayer(stopMarkers[id])) {
              // Ensure we respect bottom sheet visibility state
              var viewBusstops = document.getElementById('view-busstops');
              if (viewBusstops && !viewBusstops.classList.contains('d-none')) {
                map.addLayer(stopMarkers[id]);
              }
            }
          }
        });
      }

      if (locationPermissionGranted && userLocation) {
        stops.forEach(function(s) {
          var lat = parseFloat(s.lat), lng = parseFloat(s.lng);
          s.distance = Number.isFinite(lat) && Number.isFinite(lng) ? distanceMeters(lat, lng, userLocation.lat, userLocation.lng) : 9999999;
        });
        stops = stops.slice().sort(function(a, b) { return (a.distance || 0) - (b.distance || 0); });
      }
      if (!stops.length) listEl.innerHTML = '<div class="text-center text-muted mt-4 small">No bus stops yet.</div>';
      else {
        listEl.innerHTML = stops.map(function(s) {
          var subtitle = [s.location_name, s.location_landmark].filter(Boolean).join(' • ');
          var typeLabel = String(s.type || '').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
          var distHtml = '';
          if (s.distance !== undefined && s.distance < 9999999) {
            var dText = s.distance < 1000 ? Math.round(s.distance) + ' m away' : (s.distance / 1000).toFixed(1) + ' km away';
            distHtml = '<div class="small fw-bold text-primary mt-1 d-flex align-items-center gap-1"><span class="material-symbols-rounded" style="font-size: 14px;">directions_walk</span> ' + dText + '</div>';
          }
          return `<button type="button" class="bus-stop-card" onclick="focusStop('${String(s.id)}')"><div class="d-flex justify-content-between align-items-start"><div class="me-2"><div class="bus-stop-title">${escapeHtml(s.name)}</div><div class="bus-stop-subtitle">${escapeHtml(subtitle || '')}</div></div><div class="d-flex flex-column align-items-center"><span class="bus-stop-type-pill">${escapeHtml(typeLabel || 'Pick Up Point')}</span>${distHtml}</div></div></button>`;
        }).join('');
      }
    }

    function flyToMyLocationKeepingMarkerVisible(lat, lng) {
      var zoom = Math.max(map.getZoom(), 16);
      map.flyTo([lat, lng], zoom, { animate: true, duration: 0.6 });
      setTimeout(function() {
        var sheetH = (typeof getBottomSheetHeightPx === 'function') ? getBottomSheetHeightPx() : 0;
        var padding = 40, yOffset = Math.round((sheetH / 2) + padding);
        if (yOffset > 0) map.panBy([0, yOffset], { animate: true, duration: 0.25 });
      }, 650);
    }

    window.centerToMyLocation = function() {
      if (userLocation && locationPermissionGranted) { flyToMyLocationKeepingMarkerVisible(userLocation.lat, userLocation.lng); if (userMarker) userMarker.bringToFront?.(); return; }
      if (!navigator.geolocation) { alert('Geolocation is not supported on this device/browser.'); return; }
      navigator.geolocation.getCurrentPosition(function(pos) {
        var lat = pos.coords.latitude, lng = pos.coords.longitude;
        userLocation = { lat: lat, lng: lng };
        if (!userMarker) { 
          userMarker = L.circleMarker([lat, lng], { radius: 8, color: '#2563eb', fillColor: '#60a5fa', fillOpacity: 0.9 }).addTo(map); 
          bindUserMarker(userMarker);
        }
        else { 
          userMarker.setLatLng([lat, lng]); 
          bindUserMarker(userMarker);
        }
        flyToMyLocationKeepingMarkerVisible(lat, lng);
        uploadMyLocation(lat, lng, pos.coords.accuracy);
      }, function(error) {
        console.error('centerToMyLocation error:', error);
        if (error.code === error.PERMISSION_DENIED) showLocationPermissionDenied();
        else alert('Unable to get your location right now.');
      }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 });
    };

    document.addEventListener('DOMContentLoaded', function() {
      const locationEnabled = localStorage.getItem('byahero_location_services') !== '0';
      if (!locationEnabled) locationPermissionGranted = false;
      
      loadRouteFeatures().catch(()=>{});

      const urlParams = new URLSearchParams(window.location.search);
      const joinCode = urlParams.get('join_circle');
      if (joinCode) {
        window.history.replaceState({}, document.title, window.location.pathname);
        fetch('../../backend/joinCircleByCode.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ invite_code: joinCode }) })
        .then(res => res.json()).then(data => {
          if (data.success) { alert('Welcome! You have successfully joined the circle.'); if (typeof switchSheetTab === 'function') switchSheetTab('groups'); }
          else { console.warn('Auto-join failed:', data.message); if (data.message !== 'Already in circle') { alert('Join failed: ' + data.message); } }
        }).catch(err => console.error('Deep link join error:', err));
      }

      // Wire up Waiting Modal Actions
      const btnSet = document.getElementById('btnSetWaiting');
      if (btnSet) {
          btnSet.addEventListener('click', async function() {
              const resolvedLoc = (lastKnownLocation && lastKnownLocation.locName) ? resolveLocationName(lastKnownLocation.lat, lastKnownLocation.lng) : null;
              if (!resolvedLoc) {
                  alert("Unable to set waiting status. You must be at a recognized stop.");
                  return;
              }
              
              btnSet.setAttribute('disabled', 'true');
              btnSet.innerHTML = `<div class="d-flex align-items-center justify-content-center gap-2 py-2 text-primary fw-bold"><span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Updating status...</div>`;
              
              try {
                  const res = await safePost('../../backend/waiting_api.php', {
                      action: 'set_waiting',
                      location_name: resolvedLoc
                  });
                  if (res && res.success) {
                      isPassengerWaiting = true;
                      passengerWaitingLocation = resolvedLoc;
                      updateUserMarkerWaitingStyle();
                      
                      // Transition button visibility immediately in real-time inside the modal
                      btnSet.classList.add('d-none');
                      const btnCancel = document.getElementById('btnCancelWaiting');
                      if (btnCancel) btnCancel.classList.remove('d-none');
                      
                      const statusMsg = document.getElementById('waitingStatusMsg');
                      if (statusMsg) {
                          statusMsg.classList.remove('d-none');
                          statusMsg.className = "alert alert-success py-2 px-3 mb-3 small rounded-3";
                          statusMsg.innerHTML = `<strong>Status:</strong> Waiting for bus at <strong>${resolvedLoc}</strong>.`;
                      }
                      
                      bootstrap.Modal.getInstance(document.getElementById('waitingModal')).hide();
                      alert(`🚌 You are now marked as waiting at ${resolvedLoc}!`);
                  } else {
                      alert(res.message || "Failed to update waiting status");
                  }
              } catch(e) {
                  console.error("Error setting waiting:", e);
                  alert("An error occurred. Please try again.");
              } finally {
                  btnSet.removeAttribute('disabled');
                  btnSet.innerHTML = `<img src="../../assets/images/waitingButton.svg" alt="I am waiting" style="width: 100%; height: auto; max-width: 320px; display: block; margin: 0 auto;" />`;
              }
          });
      }

      const btnCancel = document.getElementById('btnCancelWaiting');
      if (btnCancel) {
          btnCancel.addEventListener('click', async function() {
              btnCancel.setAttribute('disabled', 'true');
              btnCancel.innerHTML = `<div class="d-flex align-items-center justify-content-center gap-2"><span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Cancelling...</div>`;
              
              try {
                  const res = await safePost('../../backend/waiting_api.php', {
                      action: 'cancel_waiting'
                  });
                  if (res && res.success) {
                      isPassengerWaiting = false;
                      passengerWaitingLocation = null;
                      updateUserMarkerWaitingStyle();
                      
                      // Transition button visibility immediately in real-time inside the modal
                      btnCancel.classList.add('d-none');
                      if (btnSet) btnSet.classList.remove('d-none');
                      
                      const statusMsg = document.getElementById('waitingStatusMsg');
                      if (statusMsg) {
                          statusMsg.classList.add('d-none');
                      }
                      
                      bootstrap.Modal.getInstance(document.getElementById('waitingModal')).hide();
                      alert("Waiting status cancelled successfully.");
                  } else {
                      alert(res.message || "Failed to cancel waiting status");
                  }
              } catch(e) {
                  console.error("Error cancelling waiting:", e);
                  alert("An error occurred. Please try again.");
              } finally {
                  btnCancel.removeAttribute('disabled');
                  btnCancel.innerHTML = `
                      <span class="waiting-modal-btn-circle-icon text-secondary">
                          <span class="material-symbols-rounded" style="font-size: 18px; font-weight: bold;">close</span>
                      </span>
                      <span>Cancel Waiting</span>
                  `;
              }
          });
      }

      // Trigger initial check for waiting status
      setTimeout(checkWaitingStatus, 2000);
    });

    startUserLocationWatch();
    PassengerRideTracker.init();
    updateBuses();
    setTimeout(function() { if (typeof updateRoutePills === 'function') updateRoutePills(); }, 100);
    scheduleNextBusUpdate();

    // --- CLEANUP: prevent memory leaks on page unload ---
    function _cleanup() {
        if (_heartbeatIntervalId) { clearTimeout(_heartbeatIntervalId); _heartbeatIntervalId = null; }
        if (_rideTrackerIntervalId) { clearTimeout(_rideTrackerIntervalId); _rideTrackerIntervalId = null; }
        if (_updateBusesTimer) { clearTimeout(_updateBusesTimer); _updateBusesTimer = null; }
        _updateBusesInProgress = false;
        if (_onVisibilityChange) document.removeEventListener('visibilitychange', _onVisibilityChange);
        if (_appStateListener) {
            const listener = _appStateListener;
            _appStateListener = null;
            if (typeof listener.then === 'function') {
                listener.then(h => { if (h && h.remove) h.remove(); });
            } else if (listener.remove) {
                listener.remove();
            }
        }
        if (window.watchId) { try { navigator.geolocation.clearWatch(window.watchId); } catch(e){} window.watchId = null; }
        if (window.bgWatcherId && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.BackgroundGeolocation) {
            try { window.Capacitor.Plugins.BackgroundGeolocation.removeWatcher({ id: window.bgWatcherId }); } catch(e){}
            window.bgWatcherId = null;
        }
        releaseWakeLock();
        stopKeepAliveAudio();
    }
    window.addEventListener('beforeunload', _cleanup);
    window.addEventListener('pagehide', _cleanup);
  </script>

  <!-- Waiting Modal -->
  <div class="modal fade" id="waitingModal" tabindex="-1" aria-labelledby="waitingModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered" style="max-width: 420px;">
      <div class="modal-content waiting-modal-content">
        <button type="button" class="waiting-modal-close" data-bs-dismiss="modal" aria-label="Close">&times;</button>
        
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
                <span class="material-symbols-rounded" style="font-size: 18px; font-weight: bold;">close</span>
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