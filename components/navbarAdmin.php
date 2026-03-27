<?php
// --- SESSION CHECK ---
if (session_status() === PHP_SESSION_NONE) {
  session_start();
}

// 1) Resolve Paths (same pattern as navbarPassenger)
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

// On other admin pages: show X button (close)
$showClose = !$isDashboard;
?>
<style>
  :root {
    --admin-primary: #0b3a78;
    --admin-primary-rgb: 11, 58, 120;
  }

  /* Reserve space for fixed topbar + fixed bottom bar */
  body {
    padding-top: 70px !important;     /* thicker top bar */
    padding-bottom: 22px !important;  /* bottom blue strip */
  }

  /* Make sure it stays above everything */
  .admin-topbar-wrap { z-index: 2000; }

  /* Thicker blue bar (reference) */
  .admin-topbar {
    height: 70px;
    background: var(--admin-primary);
    color: #fff;
    border-bottom-left-radius: 18px;
    border-bottom-right-radius: 18px;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
  }

  /* Title must be top-left (not centered) */
  .admin-title {
    font-weight: 900;
    letter-spacing: .2px;
    font-size: 1.15rem;
    line-height: 1.1;
    white-space: nowrap;
  }

  /* Close (X) button */
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

  /* Right-side icons (dashboard only) */
  .admin-topbar .icon-btn {
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
  }
  .admin-topbar .icon-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    color: #fff;
  }

  /* Avatar look similar to reference (white circle) */
  .admin-avatar {
    width: 44px;
    height: 44px;
    border-radius: 999px;
    background: #fff;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.18);
  }
  .admin-avatar svg {
    width: 26px;
    height: 26px;
    fill: var(--admin-primary);
  }

  /* Fixed bottom blue strip (reference) */
  .admin-bottombar-wrap { z-index: 1500; }
  .admin-bottombar { height: 22px; background: var(--admin-primary); }
</style>

<!-- Fixed Admin Topbar -->
<div class="position-fixed top-0 start-0 w-100 admin-topbar-wrap">
  <div class="container-fluid px-3 admin-topbar d-flex align-items-center justify-content-between">

    <!-- LEFT: X (non-dashboard only) + Title -->
    <div class="d-flex align-items-center gap-2">
      <?php if ($showClose): ?>
        <a class="admin-close-btn" href="<?php echo htmlspecialchars($backTarget); ?>" title="Close" aria-label="Close">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path fill="currentColor" d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.29 19.71 2.88 18.29 9.17 12 2.88 5.71 4.29 4.29l6.3 6.3 6.29-6.3z"/>
          </svg>
        </a>
      <?php endif; ?>

      <div class="admin-title"><?= htmlspecialchars($titleMain) ?></div>
    </div>

    <!-- RIGHT: Dashboard ONLY (Avatar + Logout) -->
    <div class="d-flex align-items-center gap-2">
      <?php if ($isDashboard): ?>
        <div class="admin-avatar" title="<?= htmlspecialchars($displayHeaderName) ?>" aria-label="Admin profile">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </div>

        <a class="icon-btn" href="<?php echo $depth; ?>public/ADMIN/logout.php" title="Logout" aria-label="Logout">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path fill="currentColor" d="M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
          </svg>
        </a>
      <?php endif; ?>
    </div>

  </div>
</div>

<!-- Fixed bottom blue bar (reference) -->
<div class="position-fixed bottom-0 start-0 w-100 admin-bottombar-wrap">
  <div class="admin-bottombar"></div>
</div>