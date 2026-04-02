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
    --admin-primary: #123e7a; /* Adjusted to match the exact dark blue in image */
    --admin-primary-rgb: 18, 62, 122;
  }

  /* Reserve space for fixed topbar + fixed bottom bar */
  body {
    padding-top: 85px !important;     /* thicker top bar */
    padding-bottom: 30px !important;  /* bottom blue strip */
  }

  /* Make sure it stays above everything */
  .admin-topbar-wrap { z-index: 2000; }

  /* Thicker blue bar */
  .admin-topbar {
    height: 85px;
    background: var(--admin-primary);
    color: #fff;
    border-bottom-left-radius: 24px;
    border-bottom-right-radius: 24px;
    padding: 0 20px;
  }

  /* Title must be top-left (not centered) */
  .admin-title {
    font-weight: 700;
    letter-spacing: .2px;
    font-size: 1.5rem; /* Larger font to match image */
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

  /* Right-side logout icon */
  .admin-topbar .icon-btn {
    width: 36px;
    height: 36px;
    border: 0;
    background: transparent; /* Removed circular background */
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s ease;
    text-decoration: none;
    margin-left: 8px; /* Spacing from the avatar */
  }
  .admin-topbar .icon-btn:hover {
    transform: scale(1.05);
  }

  /* Avatar look similar to reference (larger white circle with black icon) */
  .admin-avatar {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: #fff;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .admin-avatar svg {
    width: 40px;
    height: 40px;
    fill: #111111; /* Changed to match the black icon in your image */
    margin-top: 4px; /* Slight nudge down to center the shoulders */
  }

  /* Fixed bottom blue strip */
  .admin-bottombar-wrap { z-index: 1500; }
  .admin-bottombar { height: 35px; background: var(--admin-primary); }
</style>

<div class="position-fixed top-0 start-0 w-100 admin-topbar-wrap">
  <div class="container-fluid admin-topbar d-flex align-items-center justify-content-between">

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

    <div class="d-flex align-items-center">
      <?php if ($isDashboard): ?>
        <div class="admin-avatar" title="<?= htmlspecialchars($displayHeaderName) ?>" aria-label="Admin profile">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.33 0-10 1.67-10 5v2h20v-2c0-3.33-6.67-5-10-5z"/>
          </svg>
        </div>

        <a class="icon-btn" href="<?php echo $depth; ?>public/ADMIN/logout.php" title="Logout" aria-label="Logout">
          <svg viewBox="0 0 24 24" width="26" height="26" stroke="#000000" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
        </a>
      <?php endif; ?>
    </div>

  </div>
</div>

<div class="position-fixed bottom-0 start-0 w-100 admin-bottombar-wrap">
  <div class="admin-bottombar"></div>
</div>