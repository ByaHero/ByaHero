<?php
// --- SESSION CHECK ---
if (session_status() === PHP_SESSION_NONE) {
  session_start();
}
// SECURITY HEADERS
if (!headers_sent()) {
  header('X-Frame-Options: SAMEORIGIN');
  header('X-Content-Type-Options: nosniff');
  header('X-XSS-Protection: 1; mode=block');
  header('Referrer-Policy: strict-origin-when-cross-origin');
}

// 1) Resolve Paths
$depth = isset($pageDepth) ? $pageDepth : '../../';
$defaultBack = $depth . 'public/passenger/index.php';
$backTarget = isset($backLink) ? $backLink : $defaultBack;

// 2) Get base URL for icons
if (!isset($baseUrl)) {
  $scriptName = $_SERVER['SCRIPT_NAME'] ?? '';
  $publicDir = rtrim(str_replace('\\', '/', dirname($scriptName)), '/');
  $baseUrl = preg_replace('~/public/.*$~', '', $publicDir) ?: '';
}

// 3) Profile URL
if (isset($_SESSION['user_id'])) {
  $profileUrl = $depth . 'public/passenger/profile/profile.php';
} else {
  $profileUrl = $depth . 'public/login.php';
}

// Display name in hamburger header (no DB calls here)
$displayName = $_SESSION['user_name'] ?? null;
$displayEmail = $_SESSION['user_email'] ?? null;
$displayHeaderName = $displayName ?: ($displayEmail ?: 'Guest');

// Extract the first letter for the profile avatar
$userInitial = strtoupper(substr(trim($displayHeaderName), 0, 1));
$userProfilePic = $_SESSION['user_profile_picture'] ?? null;

// Optional: if a page provides this variable, it can force-hide dot without breaking anything
$hasUnreadNotifications = isset($hasUnreadNotifications) ? (bool) $hasUnreadNotifications : false;

/**
 * If caller didn't set $hasUnreadNotifications, compute it here (global navbar behavior).
 * This makes the alert icon work on ALL pages that include this navbar.
 */
if (!$hasUnreadNotifications && isset($_SESSION['user_id'])) {
  try {
    // db_connection.php lives at project-root/config/db_connection.php
    // navbarPassenger.php lives at project-root/components/navbarPassenger.php
    require_once __DIR__ . '/../config/db_connection.php';

    if (isset($conn) && $conn instanceof mysqli) {
      $uid = (int) $_SESSION['user_id'];

      $stmt = $conn->prepare("
        SELECT 1
        FROM (
          SELECT 1 AS has_unread
          FROM notifications
          WHERE user_id = ?
            AND read_at IS NULL
          LIMIT 1

          UNION ALL

          SELECT 1 AS has_unread
          FROM sos_alerts
          WHERE recipient_user_id = ?
            AND status = 'active'
          LIMIT 1
        ) x
        LIMIT 1
      ");
      if ($stmt) {
        $stmt->bind_param("ii", $uid, $uid);
        $stmt->execute();
        $res = $stmt->get_result();
        $hasUnreadNotifications = ($res && $res->num_rows > 0);
        $stmt->close();
      }
    }
  } catch (Throwable $e) {
    // fail silently; keep default false
  }
}
?>

<style>
  :root {
    --bs-primary: #1e3a8a;
    --bs-primary-rgb: 30, 58, 138;
    --bs-bg-light: #f3f4f6;
  }

  .hover-bg-white-10:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }

  body {
    padding-bottom: 100px !important;
  }

  /* ADDED: makes the top bar sticky/fixed and above other UI */
  .passenger-topbar-sticky {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    width: 100%;
    z-index: 2002 !important;
  }


  /* Centered Byahero wordmark in top bar */
  .topbar-wordmark {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
  }

  /* UPDATED: Allows long names to wrap nicely without overflowing */
  .offcanvas-username {
    font-size: 24px !important;
    line-height: 1.2 !important;
    word-break: break-word;
    max-width: 100%;
  }

  /* NEW: Styling for the dynamic initial avatar */
  .profile-initial-circle {
    width: 80px;
    height: 80px;
    background-color: #ffffff;
    color: var(--bs-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    font-size: 36px;
    font-weight: bold;
    flex-shrink: 0;
    margin-left: 10px;
    overflow: hidden;
  }

  /* Active state for bottom nav buttons */
  .nav-btn {
    transition: all 0.3s ease;
  }

  .nav-btn.active-nav {
    color: var(--bs-primary) !important;
  }

  /* FIX: Put the panel above everything, including the 2002 topbar */
  .offcanvas {
    z-index: 2005 !important;
  }

  /* FIX: Put the backdrop just below the panel but above the topbar */
  .offcanvas-backdrop {
    z-index: 2004 !important;
  }

  /* Center SOS button — dome that rises above the navbar */
  .bottom-nav {
    height: 70px;
    z-index: 1060;
    overflow: visible !important;
  }

  .bottom-nav .nav-item-btn {
    width: 100%;
    height: 70px;
    border: 0;
    background: transparent;
  }

  .bottom-nav .nav-label {
    font-size: 0.70rem;
    font-weight: 800;
    letter-spacing: .3px;
  }

  .bottom-nav .nav-icon {
    font-size: 30px;
    line-height: 1;
  }

  /* SOS col needs to allow overflow */
  .bottom-nav .sos-col {
    position: relative;
    overflow: visible;
  }

  /* The actual SOS button */
  .bottom-nav .sos-btn {
    border: 0;
    background: transparent;
    padding: 0;
    width: 100%;
    height: 70px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    padding-bottom: 6px;
    position: relative;
  }

  /* The dome shape */
  .bottom-nav .sos-dome {
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 100px;
    height: 76px;
    background-color: #2563eb;
    border-radius: 50px 50px 0 0;
    box-shadow: 0 -4px 15px rgba(37, 99, 235, 0.3);
    display: flex;
    align-items: center;
    justify-content: flex-start;
    flex-direction: column;
    padding-top: 14px;
    gap: 2px;
  }

  .bottom-nav .sos-dome .sos-icon-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .bottom-nav .sos-dome .sos-icon-wrap svg {
    width: 32px;
    height: 32px;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15));
  }

  .bottom-nav .sos-dome .nav-label {
    font-size: 0.75rem;
    font-weight: 800;
    color: #fff;
    letter-spacing: .5px;
    line-height: 1;
    margin-top: 2px;
  }

  /* Optional: active state */
  .bottom-nav .nav-btn.active-nav:not(.sos-btn) {
    color: var(--bs-primary) !important;
  }

  /* If you still have an old floating SOS button somewhere, hide it */
  #sos-btn,
  .sos-btn-floating,
  [data-sos] {
    display: none !important;
  }

  /* Active/Inactive icon styling for bottom nav */
  .nav-item-btn img {
    transition: opacity 0.2s ease;
    width: 24px;
    height: 24px;
    object-fit: contain;
  }

  .nav-item-btn.active-nav img {
    opacity: 1;
  }

  .nav-item-btn:not(.active-nav) img {
    opacity: 0.6;
  }
</style>
<link rel="stylesheet" href="<?php echo htmlspecialchars($depth); ?>assets/css/accessibility.css">
<script src="<?php echo htmlspecialchars($depth); ?>assets/js/accessibility.js"></script>

<?php
// --- TOP BAR RENDERING (PHP) ---

// CASE A: NOTIFICATIONS (Custom Design)
if (isset($pageType) && $pageType === 'Notifications'): ?>
  <div
    class="bg-primary d-flex align-items-center rounded-bottom-4 px-3 shadow-sm position-absolute top-0 start-0 z-3 w-100 passenger-topbar-sticky"
    style="height: 56px;">
    <a href="<?php echo $defaultBack; ?>"
      class="text-white text-decoration-none d-flex align-items-center p-1 rounded-circle hover-bg-white-10">
      <span class="material-symbols-rounded text-white">close</span>
    </a>
    <h6 class="h5 mb-0 text-white fw-normal ms-2">Notifications</h6>
  </div>

  <?php
  // CASE B: SOS
elseif (isset($pageType) && $pageType === 'sos'): ?>
  <div
    class="bg-primary d-flex align-items-center rounded-bottom-4 px-3 shadow-sm position-absolute top-0 start-0 z-3 w-100 passenger-topbar-sticky"
    style="height: 40px;">
    <a href="<?php echo $backTarget; ?>"
      class="text-white text-decoration-none d-flex align-items-center p-1 rounded-circle hover-bg-white-10">
      <span class="material-symbols-rounded text-white">arrow_back</span>
    </a>
    <h6 class="h5 mb-0 text-white fw-normal ms-2">Emergency Center</h6>
  </div>

  <?php
  // CASE C: SETTINGS PAGES (Specific Titles)
elseif (isset($pageType) && $pageType === 'settings'):

  $currentFile = basename($_SERVER['PHP_SELF']);
  $settingsTitles = [
    'settings.php' => 'Settings',
    'about.php' => 'About',
    'accessibilitySettings.php' => 'Accessibility',
    'chatSupport.php' => 'Help & FAQ',
    'feedback.php' => 'Feedback',
    'privacyPolicy.php' => 'Privacy Policy',
    'privacySecurity.php' => 'Privacy & Security',
    'share.php' => 'Share ByaHero',
    'shareLocation.php' => 'Share My Location',
    'smartNotification.php' => 'Smart Notification',
    'termsOfService.php' => 'Terms of Service'
  ];
  $displayTitle = $settingsTitles[$currentFile] ?? 'Settings';
  ?>
  <div
    class="bg-primary d-flex align-items-center rounded-bottom-4 px-3 shadow-sm position-absolute top-0 start-0 z-3 w-100 passenger-topbar-sticky"
    style="height: 40px;">
    <a href="<?php echo $defaultBack; ?>"
      class="text-white text-decoration-none d-flex align-items-center p-1 rounded-circle hover-bg-white-10">
      <span class="material-symbols-rounded text-white">arrow_back</span>
    </a>
    <h6 class="h5 mb-0 text-white fw-normal ms-2"><?php echo htmlspecialchars($displayTitle); ?></h6>
  </div>

  <?php
  // CASE D: PROFILE PAGES
elseif (isset($pageType) && $pageType === 'profile'):

  $currentFile = basename($_SERVER['PHP_SELF']);
  $profileTitles = [
    'profile.php' => 'My Profile',
    'accountSettings.php' => 'Account Settings',
    'editProfile.php' => 'Edit Profile',
    'changePassword.php' => 'Change Password',
    'loginActivity.php' => 'Login Activity'
  ];
  $displayTitle = $profileTitles[$currentFile] ?? 'Profile';
  ?>
  <div
    class="bg-primary d-flex align-items-center rounded-bottom-4 px-3 shadow-sm position-absolute top-0 start-0 z-3 w-100 passenger-topbar-sticky"
    style="height: 40px;">
    <a href="<?php echo $backTarget; ?>"
      class="text-white text-decoration-none d-flex align-items-center p-1 rounded-circle hover-bg-white-10">
      <span class="material-symbols-rounded text-white">arrow_back</span>
    </a>
    <h6 class="h5 mb-0 text-white fw-normal ms-2"><?php echo htmlspecialchars($displayTitle); ?></h6>
  </div>

  <?php
  // CASE E: GENERIC PAGE
elseif (isset($pageTitle)): ?>
  <div
    class="bg-primary d-flex align-items-center rounded-bottom-4 px-3 shadow-sm position-absolute top-0 start-0 z-3 w-100 passenger-topbar-sticky"
    style="height: 40px;">
    <a href="<?php echo $backTarget; ?>"
      class="text-white text-decoration-none d-flex align-items-center p-1 rounded-circle hover-bg-white-10">
      <span class="material-symbols-rounded text-white">arrow_back</span>
    </a>
    <h6 class="h5 mb-0 text-white fw-normal ms-2"><?php echo htmlspecialchars($pageTitle); ?></h6>
  </div>

  <?php
  // CASE F: DEFAULT / HOME (Logo + Title + Notifications + Hamburger)
else: ?>
  <div
    class="bg-primary d-flex align-items-center justify-content-between rounded-bottom-4 px-3 shadow-sm position-absolute top-0 start-0 z-3 w-100 passenger-topbar-sticky"
    style="height: 54px;">

    <div class="d-flex align-items-center" style="width: 60px; height: 100%;">
      <img src="<?php echo $depth; ?>assets/images/topBarLogo.svg" alt="ByaHero" height="32">
    </div>

    <img src="<?php echo $depth; ?>assets/images/ByaHero.png" alt="ByaHero" height="30" class="topbar-wordmark">

    <div class="d-flex align-items-center gap-2 justify-content-end" style="height: 100%;">
      <a href="<?php echo $depth; ?>public/passenger/notifications.php"
        class="text-white text-decoration-none position-relative d-flex align-items-center justify-content-center"
        style="width: 40px; height: 40px;">

        <img id="topbar-notification-icon"
          src="<?php echo $depth; ?>assets/images/<?php echo !empty($hasUnreadNotifications) ? 'notificationAlert.svg' : 'notification bell.svg'; ?>"
          alt="ByaHero" height="22">
      </a>

      <button type="button" class="btn p-0 text-white d-flex align-items-center justify-content-center"
        style="width: 40px; height: 40px;" data-bs-toggle="offcanvas" data-bs-target="#passengerMenu"
        aria-controls="passengerMenu">
        <img src="<?php echo $depth; ?>assets/images/hamburger.png" alt="ByaHero" height="18">
      </button>
    </div>
  </div>
<?php endif; ?>

<div class="offcanvas offcanvas-end" tabindex="-1" id="passengerMenu" aria-labelledby="passengerMenuLabel" style="width: 80vw;">
  <div class="bg-primary text-white p-3 rounded-bottom-4 position-relative">
    <button type="button" class="btn p-0 position-absolute top-0 end-0 m-3 text-white" data-bs-dismiss="offcanvas"
      aria-label="Close">
      <span class="material-symbols-rounded" style="font-size: 28px;">close</span>
    </button>

    <div class="d-flex align-items-center gap-3 pt-2 pb-3 w-100">

      <div class="profile-initial-circle">
        <?php if ($userProfilePic): ?>
          <?php 
            $isAbsolute = preg_match('~^https?://~i', $userProfilePic);
            $imgSrc = $isAbsolute ? htmlspecialchars($userProfilePic) : $depth . ltrim(htmlspecialchars($userProfilePic), '/');
          ?>
          <img src="<?php echo htmlspecialchars($imgSrc); ?>" alt="Profile Picture" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">
        <?php else: ?>
          <?php echo htmlspecialchars($userInitial); ?>
        <?php endif; ?>
      </div>

      <?php
        $nameLen = strlen($displayHeaderName);
        if ($nameLen > 25) {
          $titleSize = '20px';
        } elseif ($nameLen > 15) {
          $titleSize = '24px';
        } else {
          $titleSize = '32px';
        }
      ?>
      <div class="fw-bold text-break"
        style="font-size: <?= $titleSize ?> !important; line-height: 1.1 !important; flex: 1; padding-right: 15px;">
        <?php echo htmlspecialchars($displayHeaderName); ?>
      </div>

    </div>
    <div style="border-top: 2px solid #ffffff; height: 3px; margin-top: 8px; margin-bottom: 8px;">
    </div>
  </div>

  <div class="offcanvas-body bg-white">
    <div class="d-grid gap-3">

      <a class="btn shadow rounded-4 py-3 d-flex align-items-center justify-content-start gap-3 fw-bold text-dark" style="background-color: #ececec;"
        href="<?php echo $depth; ?>public/passenger/profile/profile.php">
        <div class="" style="margin-left: 20px; margin-right: 10px;">
          <img src="<?php echo $depth; ?>assets/images/person.svg" alt="person" height="30">
        </div>
        Profile
      </a>

      <!--
      <a class="btn shadow rounded-4 py-3 d-flex align-items-center justify-content-start gap-3 fw-bold text-dark" style="background-color: #ececec;"
        href="<?php echo $depth; ?>public/passenger/passengerSettings/accessibilitySettings.php">
        <div class="" style="margin-left: 20px; margin-right: 10px;">
          <img src="<?php echo $depth; ?>assets/images/accessibility.svg" alt="accessibility" height="30">
        </div>
        Accessibility
      </a>
      -->

      <a class="btn shadow rounded-4 py-3 d-flex align-items-center justify-content-start gap-3 fw-bold text-dark" style="background-color: #ececec;"
        href="<?php echo $depth; ?>public/passenger/showGuide/showGuide.php">
        <div class="" style="margin-left: 20px; margin-right: 10px;">
          <img src="<?php echo $depth; ?>assets/images/icons/USER GUIDE.svg" alt="user guide" height="30">
        </div>
        User Guide
      </a>

      <a class="btn shadow rounded-4 py-3 d-flex align-items-center justify-content-start gap-3 fw-bold text-dark" style="background-color: #ececec;"
        href="<?php echo $depth; ?>public/passenger/passengerSettings/privacySecurity.php">
        <div class="" style="margin-left: 20px; margin-right: 10px;">
          <img src="<?php echo $depth; ?>assets/images/privacy.svg" alt="privacy" height="30">
        </div>
        Privacy and Security
      </a>

      <a class="btn shadow rounded-4 py-3 d-flex align-items-center justify-content-start gap-3 fw-bold text-dark" style="background-color: #ececec;"
        href="<?php echo $depth; ?>public/passenger/lostAndFound/lostAndFound.php">
        <div class="" style="margin-left: 20px; margin-right: 10px;">
          <img src="<?php echo $depth; ?>assets/images/lostandfound.svg" alt="lost and found" height="30">
        </div>
        Lost and Found
      </a>

      <a class="btn shadow rounded-4 py-3 d-flex align-items-center justify-content-start gap-3 fw-bold text-dark" style="background-color: #ececec;"
        href="<?php echo $depth; ?>public/passenger/passengerSettings/about.php">
        <div class="" style="margin-left: 20px; margin-right: 10px;">
          <img src="<?php echo $depth; ?>assets/images/about.svg" alt="about" height="30">
        </div>
        About
      </a>

      <a class="btn shadow rounded-4 py-3 d-flex align-items-center justify-content-start gap-3 fw-bold text-dark" style="background-color: #ececec;"
        href="<?php echo $depth; ?>public/passenger/passengerSettings/feedback.php">
        <div class="" style="margin-left: 20px; margin-right: 10px;">
          <img src="<?php echo $depth; ?>assets/images/feedback.svg" alt="feedback" height="30">
        </div>
        Feedback
      </a>

      <a class="btn shadow rounded-4 py-3 d-flex align-items-center justify-content-start gap-3 fw-bold text-dark" style="background-color: #ececec;"
        href="<?php echo $depth; ?>public/passenger/report/report.php">
        <div class="" style="margin-left: 20px; margin-right: 10px;">
          <img src="<?php echo $depth; ?>assets/images/report.svg" alt="report a problem" height="30">
        </div>
        Report a Problem
      </a>

      <a class="btn shadow rounded-4 py-3 d-flex align-items-center justify-content-start gap-3 fw-bold text-dark" style="background-color: #ececec;"
        href="<?php echo $depth; ?>public/passenger/passengerSettings/share.php">
        <div class="" style="margin-left: 20px; margin-right: 10px;">
          <img src="<?php echo $depth; ?>assets/images/share.svg" alt="share" height="30">
        </div>
        Share ByaHero
      </a>

      <a class="btn shadow rounded-4 py-3 d-flex align-items-center justify-content-start gap-3 fw-bold text-dark" style="background-color: #ececec;"
        href="<?php echo $depth; ?>public/passenger/rideHistory.php">
        <div class="" style="margin-left: 20px; margin-right: 10px;">
          <img src="<?php echo $depth; ?>assets/images/HISTORY.svg" alt="ride history" height="30">
        </div>
        Ride History
      </a>

      <?php if (isset($_SESSION['user_id'])): ?>
        <form id="logout-form" action="<?php echo $depth; ?>public/logout.php" method="POST" style="display:none;">
          <input type="hidden" name="fcm_token" id="logout-fcm-token" value="">
        </form>
        <button type="button"
          class="btn shadow rounded-4 py-3 d-flex align-items-center justify-content-start gap-3 fw-bold text-dark w-100"
          style="background-color: #ececec;"
          onclick="
            var token = localStorage.getItem('sos_fcm_active_token') || '';
            document.getElementById('logout-fcm-token').value = token;
            document.getElementById('logout-form').submit();
          ">
          <div class="" style="margin-left: 20px; margin-right: 10px;">
            <img src="<?php echo $depth; ?>assets/images/logout.svg" alt="logout" height="30">
          </div>
          Log out
        </button>
      <?php else: ?>
        <a class="btn shadow rounded-4 py-3 d-flex align-items-center justify-content-start gap-3 fw-bold text-dark" style="background-color: #ececec;"
          href="<?php echo $depth; ?>public/login.php">
          <span class="material-symbols-rounded" style="margin-left: 20px; margin-right: 10px; font-size: 30px;">login</span>
          Log in
        </a>
      <?php endif; ?>

    </div>
  </div>
</div>

<div class="fixed-bottom bg-white border-top shadow-lg bottom-nav" style="height: 65px; z-index: 1060;">
  <div class="container-fluid h-100">
    <div class="row h-100 align-items-end m-0">

      <div class="col-4 p-0 text-center">
        <button id="nav-location"
          class="nav-item-btn d-flex flex-column align-items-center justify-content-center nav-btn text-dark"
          data-action="link" data-url="<?php echo $depth; ?>public/passenger/index.php">
          <img id="nav-location-icon"
            src="<?= htmlspecialchars($baseUrl, ENT_QUOTES) ?>/assets/images/icons/locationBlack.svg" alt="Bus Location"
            style="width: 24px; height: 24px; object-fit: contain;" />
          <span class="nav-label"> LOCATION </span>
        </button>
      </div>

      <div class="col-4 p-0 text-center sos-col">
        <button id="nav-sos" class="sos-btn nav-btn" data-action="link"
          data-url="<?php echo $depth; ?>public/passenger/sos/sos.php">
          <div class="sos-dome">
            <div class="sos-icon-wrap">
              <img id="nav-sos-icon" src="<?= htmlspecialchars($baseUrl, ENT_QUOTES) ?>/assets/images/icons/SOS.png"
                alt="SOS"
                style="width: 32px; height: 32px; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15));" />
            </div>
            <span class="nav-label">SOS</span>
          </div>
        </button>
      </div>

      <div class="col-4 p-0 text-center">
        <button id="nav-info"
          class="nav-item-btn d-flex flex-column align-items-center justify-content-center nav-btn text-dark"
          data-action="link" data-url="<?php echo $depth; ?>public/passenger/busInfo/busInfo.php">
          <img id="nav-info-icon" src="<?= htmlspecialchars($baseUrl, ENT_QUOTES) ?>/assets/images/icons/busActive.svg"
            alt="Bus Info" style="width: 24px; height: 24px; object-fit: contain;" />
          <span class="nav-label">BUS INFO</span>
        </button>
      </div>

    </div>
  </div>
</div>

<script>
  // Must be set BEFORE the bridge script loads so REGISTER_URL is computed correctly
  window.APP_BASE_URL = <?= json_encode($baseUrl, JSON_UNESCAPED_SLASHES) ?>;
</script>
<script src="<?php echo htmlspecialchars($baseUrl, ENT_QUOTES); ?>/assets/js/capacitor_firebase_bridge.js?v=<?= time() ?>"></script>
<script src="<?php echo htmlspecialchars($baseUrl, ENT_QUOTES); ?>/assets/js/capacitor_back_button.js?v=<?= time() ?>"></script>

<script>
  (function () {
    // Poll unread notifications + active SOS alerts
    // Keep interval conservative for InfinityFree
    const POLL_MS = 30000; // 30 seconds
    let _pollIntervalId = null;

    function setNotifIcon(hasUnread) {
      const img = document.getElementById('topbar-notification-icon');
      if (!img) return;

      const base = window.APP_BASE_URL || '';
      const normal = base + '/assets/images/notification bell.svg';
      const alert = base + '/assets/images/notificationAlert.svg';

      img.src = hasUnread ? alert : normal;
    }

    var _pollInProgress = false;

    async function pollUnread() {
        if (_pollInProgress) return;
        _pollInProgress = true;
      try {
        const res = await fetch((window.APP_BASE_URL || '') + '/backend/getUnreadStatus.php?ts=' + Date.now(), {
          credentials: 'include',
          cache: 'no-store'
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!data || !data.success) return;

        setNotifIcon(!!data.has_unread);
      } catch (e) {
        // fail silently
      } finally {
        _pollInProgress = false;
      }
    }

    // Only poll when tab is visible to reduce load
    function tick() {
      if (document.visibilityState !== 'visible') return;
      pollUnread();
    }

    function scheduleNextPoll() {
        _pollIntervalId = setTimeout(() => {
            tick();
            scheduleNextPoll();
        }, POLL_MS);
    }

    document.addEventListener('visibilitychange', tick);
    scheduleNextPoll();
    tick(); // run once on load

    function _cleanup() {
        if (_pollIntervalId) { clearTimeout(_pollIntervalId); _pollIntervalId = null; }
        _pollInProgress = false;
        document.removeEventListener('visibilitychange', tick);
    }
    window.addEventListener('beforeunload', _cleanup);
    window.addEventListener('pagehide', _cleanup);
  })();
</script>

<script>
  // ===== BOTTOM NAV ICON SWAPPING =====
  window.updateBottomNavIcons = function (activeButton) {
    const base = window.APP_BASE_URL || '';

    const locationBtn = document.getElementById('nav-location');
    const sosBtn = document.getElementById('nav-sos');
    const infoBtn = document.getElementById('nav-info');

    const locationIcon = document.getElementById('nav-location-icon');
    const infoIcon = document.getElementById('nav-info-icon');

    // Update Location icon
    if (locationIcon) {
      if (activeButton === locationBtn) {
        locationIcon.src = `${base}/assets/images/icons/locationBlack.svg`;
      } else {
        locationIcon.src = `${base}/assets/images/icons/locationIdle.svg`;
      }
    }

    // Update Bus Info icon
    if (infoIcon) {
      if (activeButton === infoBtn) {
        infoIcon.src = `${base}/assets/images/icons/busActive.svg`;
      } else {
        infoIcon.src = `${base}/assets/images/icons/busIdle.svg`;
      }
    }
  };

  // ===== BOTTOM NAV LOGIC =====
  document.addEventListener('DOMContentLoaded', () => {
    const basePath = "<?php echo $depth; ?>";
    const indexUrl = basePath + "passenger/index.php";

    const hasMap = document.getElementById('map') || document.getElementById('map-desktop-placeholder');
    const path = window.location.pathname;
    const isIndex = hasMap || path.endsWith('passenger/') || path.endsWith('index.php');

    const navButtons = document.querySelectorAll('.nav-btn');
    let activeBtn = null;

    navButtons.forEach(btn => {
      const btnUrl = btn.getAttribute('data-url');
      if (btnUrl && window.location.href.includes(btnUrl.split('/').pop())) {
        setActive(btn);
        activeBtn = btn;
      } else if (isIndex && btn.id === 'nav-location') {
        setActive(btn);
        activeBtn = btn;
      }

      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');

        if (action === 'link') {
          const url = btn.getAttribute('data-url');
          if (window.location.href.includes(url.split('/').pop())) {
            if (isIndex) toggleBottomSheet();
            return;
          }
          // Set as active before navigating
          setActive(btn);
          activeBtn = btn;
          window.location.href = url;
        }
      });
    });

    function setActive(activeBtn) {
      navButtons.forEach(b => {
        b.classList.remove('active-nav', 'text-primary');
        b.classList.add('text-dark');
      });
      if (activeBtn) {
        activeBtn.classList.add('active-nav', 'text-primary');
        activeBtn.classList.remove('text-dark');
      }
      // Update icons when active button changes
      updateBottomNavIcons(activeBtn);
    }

    function toggleBottomSheet() {
      if (typeof selectNav === 'function') {
        selectNav(document.getElementById('nav-location'), 'location');
      } else {
        const sheet = document.querySelector('.bottom-sheet');
        if (sheet) {
          sheet.classList.remove('d-none');
          sheet.classList.add('d-flex');
        }
      }
    }
  });

  // ===== HAMBURGER MENU LOGIC =====
  document.addEventListener('DOMContentLoaded', () => {
    const menu = document.getElementById('passengerMenu');
    if (!menu) return;

    const bottomSheet =
      document.querySelector('#bottomSheet') ||
      document.querySelector('.bottom-sheet') ||
      document.querySelector('.passenger-bottom-sheet');

    const sosBtn =
      document.querySelector('#sos-btn') ||
      document.querySelector('.sos-btn') ||
      document.querySelector('[data-sos]');

    menu.addEventListener('show.bs.offcanvas', () => {
      if (bottomSheet) bottomSheet.classList.add('d-none');
      if (sosBtn) sosBtn.classList.add('d-none');
    });

    menu.addEventListener('hidden.bs.offcanvas', () => {
      if (bottomSheet) bottomSheet.classList.remove('d-none');
      if (sosBtn) sosBtn.classList.remove('d-none');
    });
  });
</script>