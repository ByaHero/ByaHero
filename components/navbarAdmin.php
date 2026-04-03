<?php
// components/navbarAdmin.php
if (session_status() === PHP_SESSION_NONE) {
  session_start();
}

/**
 * Keep original behavior:
 * - Dashboard: show logo + hamburger (offcanvas with Profile + Logout)
 * - Other admin pages: show X (close) + page title (NO hamburger)
 */

// 1) Resolve Paths (same pattern as your original navbarAdmin)
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
    'analytics' => 'Analytics',
    'operationSchedule' => 'Bus Operation Schedule',
    'manageBuses' => 'Total Buses',
    'manageActiveBuses' => 'Active Buses',
    'manageStops' => 'Bus Pick up Points',
    'manageConductors' => 'Drivers & Conductors',
    'busFare' => 'Bus Fares',
  ];
  return $map[$t] ?? 'Admin';
}

$titleMain = $pageTitle ?: adminTitleForType($adminPageType ?: 'dashboard');

// ONLY show Profile + Logout on the admin dashboard
$isDashboard = (($adminPageType ?: 'dashboard') === 'dashboard');
$showClose = !$isDashboard;

// Assets (your specified files)
$logoUrl = $baseUrl . '/assets/images/byaheroLogo.png';
$hamburgerImg = $baseUrl . '/assets/images/hamburger.png';

// Menu links
$profileUrl = $baseUrl . '/public/ADMIN/adminProfile.php';
$logoutUrl  = $baseUrl . '/public/logout.php';

// Menu icons (same as conductor menu)
$personImg = $baseUrl . '/assets/images/person.svg';
$logoutImg = $baseUrl . '/assets/images/logout.svg';
?>

<style>
  /* Keep original spacing behavior (top + bottom reserved space) */
  body {
    padding-top: 85px !important;     /* thicker top bar */
    padding-bottom: 30px !important;  /* bottom blue strip */
  }

  /* Fixed wrappers */
  .admin-topbar-wrap { z-index: 2000; }
  .admin-bottombar-wrap { z-index: 1500; }

  /* ===== Topbar matches conductor look (color/radius/shadow) but keeps 85px height ===== */
  .admin-topbar {
    height: 85px;
    background: #0f3878;
    color: #fff;
    border-bottom-left-radius: 24px;
    border-bottom-right-radius: 24px;
    padding: 0 20px;
    box-shadow: 0 4px 10px rgba(0,0,0,0.15);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  /* Left area */
  .admin-left {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .admin-title {
    font-weight: 800;
    letter-spacing: .2px;
    font-size: 1.3rem;
    line-height: 1.1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Close (X) button (kept from original behavior) */
  .admin-close-btn {
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
  .admin-close-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    color: #fff;
  }

  /* Dashboard logo */
  .admin-logo {
    height: 35px;
    object-fit: contain;
    display: block;
  }

  /* Hamburger (same idea as conductor) */
  .admin-hamburger {
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
  .admin-hamburger img {
    height: 25px;
    width: auto;
    object-fit: contain;
  }

  /* Bottom blue strip (keep original) */
  .admin-bottombar { height: 35px; background: #0f3878; }

  /* Offcanvas layering consistent with conductor */
  #adminMenu.offcanvas { z-index: 2005 !important; }
  .offcanvas-backdrop { z-index: 2004 !important; }

  /* Offcanvas header/body/buttons copied from conductor style */
  .admin-menu-header {
    background: #0f3878;
    color: #fff;
    padding: 16px;
    border-bottom-left-radius: 18px;
    border-bottom-right-radius: 18px;
    position: relative;
  }

  .admin-menu-title {
    margin: 0;
    font-weight: 900;
    font-size: 28px;
    line-height: 1.1;
    word-break: break-word;
    padding-right: 44px;
  }

  .admin-menu-divider {
    border-top: 2px solid #ffffff;
    height: 3px;
    margin-top: 10px;
    opacity: 1;
  }

  .admin-menu-close {
    position: absolute;
    top: 10px;
    right: 10px;
    border: 0;
    background: transparent;
    color: #fff;
    padding: 6px;
    line-height: 1;
  }

  .admin-menu-body {
    background: #f3f4f6;
  }

  .admin-menu-btn {
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

  .admin-menu-btn .icon-wrap {
    margin-left: 12px;
    margin-right: 6px;
    width: 34px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .admin-menu-btn .icon-wrap img {
    height: 28px;
    width: 28px;
    object-fit: contain;
  }
</style>

<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded" rel="stylesheet" />

<div class="position-fixed top-0 start-0 w-100 admin-topbar-wrap">
  <div class="container-fluid admin-topbar">

    <div class="admin-left">
      <?php if ($showClose): ?>
        <a class="admin-close-btn" href="<?= htmlspecialchars($backTarget) ?>" title="Close" aria-label="Close">
          <span class="material-symbols-rounded" style="font-size: 26px;">close</span>
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

    <div>
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
</div>

<?php if ($isDashboard): ?>
  <!-- Offcanvas Menu (dashboard only) -->
  <div class="offcanvas offcanvas-end" tabindex="-1" id="adminMenu" aria-labelledby="adminMenuLabel">
    <div class="admin-menu-header">
      <button type="button" class="admin-menu-close" data-bs-dismiss="offcanvas" aria-label="Close">
        <span class="material-symbols-rounded" style="font-size: 28px;">close</span>
      </button>

      <h5 class="admin-menu-title" id="adminMenuLabel">
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