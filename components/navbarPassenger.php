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
</style>

<?php
/*   Eto yung bahagi ng navbarPassenger.php na nag-aadjust depende sa pageType variable 
  na dine-define sa mga page files tulad ng settings.php at notifications.php.

  Halimbawa mula sa settings.php:
<?php
  $pageType = 'settings';        // Triggers the "Settings" header
  $backLink = '../index.php';    // Tells the arrow where to go
  $pageDepth = "../../../";      // Fixes the logo path (for the bottom nav if needed)
  include "../../../components/navbarPassenger.php";
  ?> */
// 1. NOTIFICATIONS HEADER
if (isset($pageType) && $pageType === 'notifications'): ?>
  <div
    class="bg-primary d-flex align-items-center rounded-bottom-4 px-3 shadow-sm position-absolute top-0 start-0 z-3 w-100"
    style="height: 40px;">
    <a href="index.php"
      class="text-white text-decoration-none d-flex align-items-center p-1 rounded-circle hover-bg-white-10">
      <span class="material-symbols-rounded text-white">close</span>
    </a>
    <h6 class="h5 mb-0 text-white fw-normal ms-2">Notifications</h6>
  </div>

  <?php
  // 2. SETTINGS HEADER (New Addition)
elseif (isset($pageType) && $pageType === 'settings'):
  // Default back link if not set
  $backTarget = isset($backLink) ? $backLink : '../index.php';
  ?>
  <div
    class="bg-primary d-flex align-items-center rounded-bottom-4 px-3 shadow-sm position-absolute top-0 start-0 z-3 w-100"
    style="height: 40px;">
    <a href="<?php echo $backTarget; ?>"
      class="text-white text-decoration-none d-flex align-items-center p-1 rounded-circle hover-bg-white-10">
      <span class="material-symbols-rounded text-white">arrow_back</span>
    </a>
    <h6 class="h5 mb-0 text-white fw-normal ms-2">Settings</h6>
  </div>

  <?php
  // 3. SOS HEADER (Fixed)
elseif (isset($pageType) && $pageType === 'sos'):
  // Default back link if not set
  $backTarget = isset($backLink) ? $backLink : '../index.php';
  ?>
  <div
    class="bg-primary d-flex align-items-center rounded-bottom-4 px-3 shadow-sm position-absolute top-0 start-0 z-3 w-100">

    <a href="<?php echo $backTarget; ?>"
      class="text-white text-decoration-none d-flex align-items-center p-1 rounded-circle hover-bg-white-10 me-3"
      style="height: 40px;">
      <span class="material-symbols-rounded text-white">arrow_back</span>
    </a>

    <div class="text-white lh-1">
      <h6 class="mb-1 fw-bold">Emergency Center</h6>
    </div>
  </div>

  <!-- --------------------------------------------------------------------------- -->
  <?php
  // DEFAULT LOGO HEADER (All other pages)
else: ?>
  <div
    class="bg-primary d-flex align-items-center rounded-bottom-4 px-3 shadow-sm position-absolute top-0 start-0 z-3 w-100"
    style="height: 40px;">
    <img src="<?php echo isset($pageDepth) ? $pageDepth : '../../'; ?>images/topBarLogo.svg" alt="ByaHero" height="30">
  </div>
<?php endif; ?>

<div class="fixed-bottom bg-white border-top shadow-lg" style="height: 60px; z-index: 1060;">
  <div class="row h-100 m-0">

    <div class="col-3 h-100 p-0">
      <button
        class="btn w-100 h-100 d-flex flex-column align-items-center justify-content-center p-0 border-0 bg-transparent nav-btn text-primary"
        onclick="selectNav(this, 'location')">
        <span class="material-symbols-rounded fs-1 mb-1">location_on</span>
        <span class="fw-bold small" style="font-size: 0.75rem;">LOCATION</span>
      </button>
    </div>

    <div class="col-3 h-100 p-0">
      <button
        class="btn w-100 h-100 d-flex flex-column align-items-center justify-content-center p-0 border-0 bg-transparent nav-btn text-dark"
        onclick="window.location.href='/Byahero-Prototype-v3/public/passenger/safety/safety.php'">
        <span class="material-symbols-rounded fs-1 mb-1">security</span>
        <span class="fw-bold small" style="font-size: 0.75rem;">SAFETY</span>
      </button>
    </div>

    <div class="col-3 h-100 p-0">
      <button
        class="btn w-100 h-100 d-flex flex-column align-items-center justify-content-center p-0 border-0 bg-transparent nav-btn text-dark"
        onclick="selectNav(this, 'info')" data-bs-toggle="modal" data-bs-target="#infoModal">
        <span class="material-symbols-rounded fs-1 mb-1">directions_bus</span>
        <span class="fw-bold small" style="font-size: 0.75rem;">INFO</span>
      </button>
    </div>

    <div class="col-3 h-100 p-0">
      <button
        class="btn w-100 h-100 d-flex flex-column align-items-center justify-content-center p-0 border-0 bg-transparent nav-btn text-dark"
        onclick="selectNav(this, 'profile')" data-bs-toggle="modal" data-bs-target="#profileModal">
        <span class="material-symbols-rounded fs-1 mb-1">person</span>
        <span class="fw-bold small" style="font-size: 0.75rem;">PROFILE</span>
      </button>
    </div>

  </div>
</div>