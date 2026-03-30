<?php
// --- SESSION CHECK ---
if (session_status() === PHP_SESSION_NONE) {
  session_start();
}

// 1) Resolve Paths
$depth = isset($pageDepth) ? $pageDepth : '../../';
$defaultBack = $depth . 'passenger/index.php';
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

// Optional: if a page provides this variable, it can force-hide dot without breaking anything
$hasUnreadNotifications = isset($hasUnreadNotifications) ? (bool) $hasUnreadNotifications : false;
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

  /* Centered Byahero wordmark in top bar */
  .topbar-wordmark {
    margin: 0 auto;
    display: block;
  }

  /* Display name in hamburger header */
  .offcanvas-username {
    font-size: 90px;
    line-height: 20px;
  }

  /* Active state for bottom nav buttons */
  .nav-btn {
    transition: all 0.3s ease;
  }

  .nav-btn.active-nav {
    color: var(--bs-primary) !important;
  }

  /* Put the panel above everything */
  .offcanvas {
    z-index: 2001 !important;
  }

  /* Put the backdrop just below the panel (still above app UI) */
  .offcanvas-backdrop {
    z-index: 2000 !important;
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
    width: 86px;
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
  }

  .nav-item-btn.active-nav img {
    opacity: 1;
  }

  .nav-item-btn:not(.active-nav) img {
    opacity: 0.6;
  }
</style>
<script>
  window._sosPendingToken = null;
  window.gonative_onesignal_info = function (info) {
    var id = info && (info.oneSignalId || info.userId || info.subscriptionId
      || (info.subscription && info.subscription.id) || info.oneSignalUserId);
    if (!id) return;
    window._sosPendingToken = id;
    if (window.sosBridge) window.sosBridge.saveToken(id);
  };
  window.median_onesignal_info = window.gonative_onesignal_info;
</script>
<link rel="stylesheet" href="<?php echo $depth; ?>assets/css/accessibility.css">
<script src="<?php echo $depth; ?>assets/js/accessibility.js"></script>

<?php
// --- TOP BAR RENDERING (PHP) ---

// CASE A: NOTIFICATIONS (Custom Design)
if (isset($pageType) && $pageType === 'Notifications'): ?>
  <div
    class="bg-primary d-flex align-items-center rounded-bottom-4 px-3 shadow-sm position-absolute top-0 start-0 z-3 w-100"
    style="height: 40px;">
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
    class="bg-primary d-flex align-items-center rounded-bottom-4 px-3 shadow-sm position-absolute top-0 start-0 z-3 w-100"
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
    class="bg-primary d-flex align-items-center rounded-bottom-4 px-3 shadow-sm position-absolute top-0 start-0 z-3 w-100"
    style="height: 40px;">
    <a href="<?php echo $backTarget; ?>"
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
    class="bg-primary d-flex align-items-center rounded-bottom-4 px-3 shadow-sm position-absolute top-0 start-0 z-3 w-100"
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
    class="bg-primary d-flex align-items-center rounded-bottom-4 px-3 shadow-sm position-absolute top-0 start-0 z-3 w-100"
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
    class="bg-primary d-flex align-items-center rounded-bottom-4 px-3 shadow-sm position-absolute top-0 start-0 z-3 w-100"
    style="height: 40px;">

    <!-- Left logo wrapper keeps a fixed/known width -->
    <div class="d-flex align-items-center" style="width: 60px;">
      <img src="<?php echo $depth; ?>assets/images/topBarLogo.svg" alt="ByaHero" height="30">
    </div>

    <!-- Centered Byahero wordmark -->
    <img src="<?php echo $depth; ?>assets/images/ByaHero.png" alt="ByaHero" height="30" class="topbar-wordmark">

    <!-- Right icons wrapper, similar width to left -->
    <div class="d-flex align-items-center gap-3 justify-content-end" style="width: 60px; column-gap: 20px;">
      <!-- Bell -->
      <a href="<?php echo $depth; ?>public/passenger/notifications.php"
        class="text-white text-decoration-none position-relative d-flex align-items-center justify-content-center"
        style="width: 40px; height: 40px;"
        onclick="if(typeof analytics !== 'undefined') analytics.buttonClick('Notifications Button');">

        <?php if (!empty($hasUnreadNotifications)): ?>
          <span class="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle"
            style="margin-left: -10px; margin-top: 10px;">
            <img src="<?php echo $depth; ?>assets/images/notificationAlert.png" alt="ByaHero" height="30">
          </span>
        <?php endif; ?>

        <img src="<?php echo $depth; ?>assets/images/notification bell.png" alt="ByaHero" height="30">
      </a>

      <!-- Hamburger -->
      <button type="button" class="btn p-0 text-white d-flex align-items-center justify-content-center"
        style="width: 40px; height: 40px;" data-bs-toggle="offcanvas" data-bs-target="#passengerMenu"
        aria-controls="passengerMenu">
        <img src="<?php echo $depth; ?>assets/images/hamburger.png" alt="ByaHero" height="20">
      </button>
    </div>
  </div>
<?php endif; ?>

<!-- Hamburger Offcanvas -->
<div class="offcanvas offcanvas-end" tabindex="-1" id="passengerMenu" aria-labelledby="passengerMenuLabel">
  <!-- Header card -->
  <div class="bg-primary text-white p-3 rounded-bottom-4 position-relative">
    <button type="button" class="btn p-0 position-absolute top-0 end-0 m-3 text-white" data-bs-dismiss="offcanvas"
      aria-label="Close">
      <span class="material-symbols-rounded" style="font-size: 28px;">close</span>
    </button>

    <div class="d-flex align-items-center gap-3 pt-2 pb-3">

      <div class="" style="margin-left: 20px; margin-right: 10px;">
        <img src="<?php echo $depth; ?>assets/images/profilepic.png" alt="profilepic" height="90">
      </div>

      <!-- Changed font-size: 90px; to use class/offcanvas-username -->
      <div class="fw-bold offcanvas-username" style="font-size: 30px !important; line-height: 20px;">
        <?php echo htmlspecialchars($displayHeaderName); ?>
      </div>
    </div>
    <div style="border-top: 2px solid #ffffff; height: 3px; margin-top: 8px; margin-bottom: 8px;">
    </div>
  </div>

  <!-- Body -->
  <div class="offcanvas-body bg-light">
    <div class="d-grid gap-3">

      <a class="btn bg-white shadow-sm rounded-4 py-3 d-flex align-items-center justify-content-start gap-3 fw-bold "
        href="<?php echo $depth; ?>public/passenger/profile/profile.php">
        <div class="" style="margin-left: 20px; margin-right: 10px;">
          <img src="<?php echo $depth; ?>assets/images/person.svg" alt="person" height="30">
        </div>
        Profile
      </a>

      <a class="btn bg-white shadow-sm rounded-4 py-3 d-flex align-items-center justify-content-start gap-3 fw-bold"
        href="<?php echo $depth; ?>public/passenger/passengerSettings/accessibilitySettings.php">
        <div class="" style="margin-left: 20px; margin-right: 10px;">
          <img src="<?php echo $depth; ?>assets/images/accessibility.svg" alt="accessibility" height="30">
        </div>
        Accessibility
      </a>

      <a class="btn bg-white shadow-sm rounded-4 py-3 d-flex align-items-center justify-content-start gap-3 fw-bold"
        href="<?php echo $depth; ?>public/passenger/passengerSettings/privacySecurity.php">
        <div class="" style="margin-left: 20px; margin-right: 10px;">
          <img src="<?php echo $depth; ?>assets/images/privacy.svg" alt="privacy" height="30">
        </div>
        Privacy and Security
      </a>

      <a class="btn bg-white shadow-sm rounded-4 py-3 d-flex align-items-center justify-content-start gap-3 fw-bold"
        href="<?php echo $depth; ?>public/passenger/passengerSettings/feedback.php">
        <div class="" style="margin-left: 20px; margin-right: 10px;">
          <img src="<?php echo $depth; ?>assets/images/feedback.svg" alt="feedback" height="30">
        </div>
        Feedback
      </a>

      <a class="btn bg-white shadow-sm rounded-4 py-3 d-flex align-items-center justify-content-start gap-3 fw-bold"
        href="<?php echo $depth; ?>public/passenger/passengerSettings/about.php">
        <div class="" style="margin-left: 20px; margin-right: 10px;">
          <img src="<?php echo $depth; ?>assets/images/about.svg" alt="about" height="30">
        </div>
        About
      </a>

      <a class="btn bg-white shadow-sm rounded-4 py-3 d-flex align-items-center justify-content-start gap-3 fw-bold"
        href="<?php echo $depth; ?>public/passenger/passengerSettings/share.php">
        <div class="" style="margin-left: 20px; margin-right: 10px;">
          <img src="<?php echo $depth; ?>assets/images/share.svg" alt="share" height="30">
        </div>
        Share ByaHero
      </a>

      <a class="btn bg-white shadow-sm rounded-4 py-3 d-flex align-items-center justify-content-start gap-3 fw-bold"
        href="<?php echo $depth; ?>public/passenger/register_token_test.php">
        <div class="" style="margin-left: 20px; margin-right: 10px;">
          <img src="<?php echo $depth; ?>assets/images/share.svg" alt="share" height="30">
        </div>
        Register Push Token (Test)
      </a>

      <?php if (isset($_SESSION['user_id'])): ?>
        <!-- Logged-in: show Log out, route through logout.php -->
        <a class="btn bg-white shadow-sm rounded-4 py-3 d-flex align-items-center justify-content-start gap-3 fw-bold"
          href="<?php echo $depth; ?>public/logout.php">
          <div class="" style="margin-left: 20px; margin-right: 10px;">
            <img src="<?php echo $depth; ?>assets/images/logout.svg" alt="logout" height="30">
          </div>
          Log out
        </a>
      <?php else: ?>
        <!-- Not logged-in: show Log in -->
        <a class="btn bg-white shadow-sm rounded-4 py-3 d-flex align-items-center justify-content-start gap-3 fw-bold"
          href="<?php echo $depth; ?>public/login.php">
          <span class="material-symbols-rounded">login</span>
          Log in
        </a>
      <?php endif; ?>

    </div>
  </div>
</div>

<!-- Bottom Navigation (Location / SOS / Bus Info) -->
<div class="fixed-bottom bg-white border-top shadow-lg bottom-nav" style="height: 65px; z-index: 1060;">
  <div class="container-fluid h-100">
    <div class="row h-100 align-items-end m-0">

      <!-- LOCATION -->
      <div class="col-4 p-0 text-center">
        <button id="nav-location"
          class="nav-item-btn d-flex flex-column align-items-center justify-content-center nav-btn text-dark"
          data-action="link" data-url="<?php echo $depth; ?>public/passenger/index.php">
          <img id="nav-location-icon"
            src="<?= htmlspecialchars($baseUrl, ENT_QUOTES) ?>/assets/images/icons/locationBlack.svg" alt="Bus Location"
            style="width: 24px; height: 24px; object-fit: contain;" />
          <span class="nav-label">LOCATION</span>
        </button>
      </div>

      <!-- SOS (CENTER) -->
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

      <!-- BUS INFO -->
      <div class="col-4 p-0 text-center">
        <button id="nav-info"
          class="nav-item-btn d-flex flex-column align-items-center justify-content-center nav-btn text-dark"
          data-action="link" data-url="<?php echo $depth; ?>public/passenger/busInfo/busInfo.php">
          <img id="nav-info-icon" src="<?= htmlspecialchars($baseUrl, ENT_QUOTES) ?>/assets/images/icons/busBlack.svg"
            alt="Bus Info" style="width: 24px; height: 24px; object-fit: contain;" />
          <span class="nav-label">BUS INFO</span>
        </button>
      </div>

    </div>
  </div>
</div>

<script src="<?php echo htmlspecialchars($baseUrl, ENT_QUOTES); ?>/assets/js/median_onesignal_bridge.js"></script>

<script>
  // Expose base URL for icon swapping
  window.APP_BASE_URL = <?= json_encode($baseUrl, JSON_UNESCAPED_SLASHES) ?>;

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
        locationIcon.src = `${base}/assets/images/icons/locationBlack.svg`;
      }
    }

    // Update Bus Info icon
    if (infoIcon) {
      if (activeButton === infoBtn) {
        infoIcon.src = `${base}/assets/images/icons/busBlack.svg`;
      } else {
        infoIcon.src = `${base}/assets/images/icons/busBlack.svg`;
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