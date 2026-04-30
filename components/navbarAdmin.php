<?php
// components/navbarAdmin.php
if (session_status() === PHP_SESSION_NONE) {
  session_start();
}

/**
 * Behavior:
 * - Dashboard: show logo + hamburger (offcanvas with Profile + Logout)
 * - Admin Profile (adminProfile.php): special bar (X + "Profile"), no hamburger, thinner bottom strip
 * - Other admin pages: show X (close) + page title (NO hamburger)
 */

// 1) Resolve Paths
$depth = isset($pageDepth) ? $pageDepth : '../../';
$defaultBack = $depth . 'public/ADMIN/admin.php';
$backTarget = isset($backLink) ? $backLink : $defaultBack;

// 2) Base URL (for assets, works on localhost subfolder + InfinityFree)
if (!isset($baseUrl)) {
  $scriptName = $_SERVER['SCRIPT_NAME'] ?? '';
  $publicDir = rtrim(str_replace('\\', '/', dirname($scriptName)), '/');
  $baseUrl = preg_replace('~/public/.*$~', '', $publicDir) ?: '';
}

// Display name
$displayName = $_SESSION['user_name'] ?? null;
$displayEmail = $_SESSION['user_email'] ?? null;
$displayHeaderName = $displayName ?: ($displayEmail ?: 'Admin');

// Page routing hints
$adminPageType = $pageType ?? null;
$pageTitle = $pageTitle ?? null;

// Same idea as passenger: titles change per screen
function adminTitleForType(?string $t): string {
  $map = [
    'dashboard' => 'Hello, Admin!',
    'operationSchedule' => 'Bus Operation Schedule',
    'manageBuses' => 'Total Buses',
    'manageActiveBuses' => 'Active Buses',
    'manageStops' => 'Bus Pick up Points',
    'manageConductors' => 'Drivers & Conductors',
    'busFare' => 'Bus Fares',
    'adminProfile' => 'Profile',
    'manageLostAndFound' => 'Lost & Found',
    'manageReports' => 'Passenger Reports',
  ];
  return $map[$t] ?? 'Admin';
}

$titleMain = $pageTitle ?: adminTitleForType($adminPageType ?: 'dashboard');

// ONLY show Profile + Logout on the admin dashboard
$isDashboard = (($adminPageType ?: 'dashboard') === 'dashboard');

// Detect adminProfile page (via pageType OR URL)
$req = $_SERVER['REQUEST_URI'] ?? '';
$isAdminProfile =
  (($adminPageType ?? '') === 'adminProfile') ||
  (strpos($req, '/public/ADMIN/adminProfile.php') !== false) ||
  (strpos($req, 'adminProfile.php') !== false);

// On other admin pages: show X button (close)
$showClose = (!$isDashboard && !$isAdminProfile);

// Assets
$logoUrl = $baseUrl . '/assets/images/topBarLogo.svg';
$hamburgerImg = $baseUrl . '/assets/images/hamburger.png';

// Menu links
$profileUrl = $baseUrl . '/public/ADMIN/adminProfile.php';
$logoutUrl  = $baseUrl . '/public/logout.php';

// Menu icons (same as conductor menu)
$personImg = $baseUrl . '/assets/images/person.svg';
$logoutImg = $baseUrl . '/assets/images/logout.svg';
?>

<style>
  :root{
    --admin-blue: #0f3878;
    --admin-top-h: 70px;      /* same as navbarConductor */
    --admin-bottom-h: 35px;   /* default bottom strip */
  }

  /* Reserve space for fixed topbar + fixed bottom bar */
  body{
    padding-top: var(--admin-top-h) !important;
    padding-bottom: var(--admin-bottom-h) !important;
  }

  /* On adminProfile, make bottom bar a bit thinner (per your request) */
  <?php if ($isAdminProfile): ?>
  body{
    padding-bottom: 30px !important;
  }
  <?php endif; ?>

  .admin-topbar-wrap{ z-index: 2000; }
  .admin-bottombar-wrap{ z-index: 1500; }

  /* Default topbar (dashboard + other pages) */
  .admin-topbar{
    height: var(--admin-top-h);
    background: var(--admin-blue);
    color: #fff;
    border-bottom-left-radius: 20px;
    border-bottom-right-radius: 20px;
    padding: 0 20px;
    box-shadow: 0 4px 10px rgba(0,0,0,0.15);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .admin-left{
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .admin-title{
    font-weight: 800;
    letter-spacing: .2px;
    font-size: 1.05rem;
    line-height: 1.1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .admin-close-btn{
    width: 44px;
    height: 44px;
    border: 0;
    background: rgba(255, 255, 255, 0.12);
    color: #fff;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s ease;
    text-decoration: none;
    flex: 0 0 auto;
  }
  .admin-close-btn:hover{
    background: rgba(255, 255, 255, 0.2);
    color: #fff;
  }

  .admin-logo{
    height: 35px;
    object-fit: contain;
    display: block;
  }

  .admin-hamburger{
    background: transparent;
    border: none;
    padding: 0;
    margin: 0;
    width: 50px;
    height: 50px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .admin-hamburger img{
    height: 25px;
    width: auto;
    object-fit: contain;
  }

  /* Bottom blue strip */
  .admin-bottombar{ height: var(--admin-bottom-h); background: var(--admin-blue); }

  <?php if ($isAdminProfile): ?>
  .admin-bottombar{ height: 30px; }
  <?php endif; ?>

  /* Offcanvas layering */
  #adminMenu.offcanvas{ z-index: 2005 !important; }
  .offcanvas-backdrop{ z-index: 2004 !important; }

  /* Offcanvas header/body/buttons copied from conductor style */
  .admin-menu-header{
    background: var(--admin-blue);
    color: #fff;
    padding: 16px;
    border-bottom-left-radius: 18px;
    border-bottom-right-radius: 18px;
    position: relative;
  }

  .admin-menu-title{
    margin: 0;
    font-weight: 900;
    font-size: 28px;
    line-height: 1.1;
    word-break: break-word;
    padding-right: 44px;
  }

  .admin-menu-divider{
    border-top: 2px solid #ffffff;
    height: 3px;
    margin-top: 10px;
    opacity: 1;
  }

  .admin-menu-close{
    position: absolute;
    top: 10px;
    right: 10px;
    border: 0;
    background: transparent;
    color: #fff;
    padding: 6px;
    line-height: 1;
  }

  .admin-menu-body{ background: #f3f4f6; }

  .admin-menu-btn{
    background: #ffffff;
    box-shadow: 0 2px 10px rgba(0,0,0,0.08);
    border-radius: 16px;
    padding: 14px 16px;
    font-weight: 800;
    text-align: left;
    display: flex;
    gap: 14px;
    align-items: center;
    color: #111827;
    text-decoration: none;
  }

  .admin-menu-btn .icon-wrap{
    margin-left: 12px;
    margin-right: 6px;
    width: 34px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .admin-menu-btn .icon-wrap img{
    height: 28px;
    width: 28px;
    object-fit: contain;
  }

  /* Special profile bar (adminProfile) like conductor profile top bar */
  .admin-profilebar{
    height: var(--admin-top-h);
    background: var(--admin-blue);
    color: #fff;
    border-bottom-left-radius: 20px;
    border-bottom-right-radius: 20px;
    padding: 0 20px;
    box-shadow: 0 4px 10px rgba(0,0,0,0.15);
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .admin-profilebar .title{
    color: #fff;
    font-weight: 800;
    font-size: 1rem;
    margin: 0;
  }
</style>

<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded" rel="stylesheet" />

<div class="position-fixed top-0 start-0 w-100 admin-topbar-wrap">

  <?php if ($isAdminProfile): ?>

    <!-- SPECIAL NAVBAR FOR adminProfile.php -->
    <div class="container-fluid admin-profilebar position-relative">
      <div class="d-flex align-items-center gap-2" style="z-index: 1;">
        <a class="admin-close-btn" href="<?= htmlspecialchars($backTarget) ?>" title="Back" aria-label="Back">
          <span class="material-symbols-rounded" style="font-size: 26px;">arrow_back</span>
        </a>
        <div class="title">Profile</div>
      </div>
    </div>

  <?php else: ?>

    <!-- DEFAULT NAVBAR -->
    <div class="container-fluid admin-topbar position-relative">
      <div class="admin-left" style="z-index: 1;">
        <?php if ($showClose): ?>
          <a class="admin-close-btn" href="<?= htmlspecialchars($backTarget) ?>" title="Back" aria-label="Back">
            <span class="material-symbols-rounded" style="font-size: 26px;">arrow_back</span>
          </a>
          <div class="admin-title"><?= htmlspecialchars($titleMain) ?></div>
        <?php else: ?>
          <img
            src="<?= htmlspecialchars($logoUrl) ?>"
            alt="ByaHero"
            class="admin-logo"
            onerror="this.outerHTML='<h4 class=\'text-white mb-0 fw-bold\'>ByaHero</h4>'"
          >
        <?php endif; ?>
      </div>

      <?php if ($isDashboard): ?>
      <!-- Centered Logo -->
      <div class="position-absolute top-50 start-50 translate-middle" style="z-index: 0; pointer-events: none;">
        <img
          src="<?= htmlspecialchars($baseUrl . '/assets/images/ByaHero.png') ?>"
          alt="ByaHero"
          style="height: 35px; object-fit: contain;"
        >
      </div>
      <?php endif; ?>

      <div style="z-index: 1;">
        <?php if ($isDashboard): ?>
          <button
            type="button"
            class="admin-hamburger"
            data-bs-toggle="offcanvas"
            data-bs-target="#adminMenu"
            aria-controls="adminMenu"
            aria-label="Menu">
            <img src="<?= htmlspecialchars($hamburgerImg) ?>" alt="Menu">
          </button>
        <?php endif; ?>
      </div>
    </div>

  <?php endif; ?>

</div>

<?php if ($isDashboard): ?>
  <!-- Offcanvas Menu (dashboard only) -->
  <div class="offcanvas offcanvas-end" tabindex="-1" id="adminMenu" aria-labelledby="adminMenuLabel" style="width: 85vw;">
    <div class="admin-menu-header">
      <button type="button" class="admin-menu-close" data-bs-dismiss="offcanvas" aria-label="Close">
        <span class="material-symbols-rounded" style="font-size: 28px;">close</span>
      </button>

      <?php
        $nameLen = strlen($displayHeaderName);
        if ($nameLen > 25) {
          $titleSize = '18px';
        } elseif ($nameLen > 15) {
          $titleSize = '22px';
        } else {
          $titleSize = '28px';
        }
      ?>
      <h5 class="admin-menu-title" id="adminMenuLabel" style="font-size: <?= $titleSize ?>;">
        <?= htmlspecialchars($displayHeaderName) ?>
      </h5>

      <div class="admin-menu-divider"></div>
    </div>

    <div class="offcanvas-body admin-menu-body">
      <div class="d-grid gap-3">
        <a href="<?= htmlspecialchars($profileUrl) ?>" class="admin-menu-btn">
          <div class="icon-wrap">
            <img src="<?= htmlspecialchars($personImg) ?>" alt="Profile">
          </div>
          Profile
        </a>

        <a href="<?= htmlspecialchars($logoutUrl) ?>" class="admin-menu-btn">
          <div class="icon-wrap">
            <img src="<?= htmlspecialchars($logoutImg) ?>" alt="Logout">
          </div>
          Log out
        </a>
      </div>
    </div>
  </div>
<?php endif; ?>

<div class="position-fixed bottom-0 start-0 w-100 admin-bottombar-wrap">
  <div class="admin-bottombar"></div>
</div>