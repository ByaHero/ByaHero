<?php
// components/navbarConductor.php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Ensure base URL resolves correctly depending on environment
$projectFolder = 'ByaHero-Prototype-V3';
$uri = $_SERVER['REQUEST_URI'] ?? '/';
$basePath = (stripos($uri, '/' . $projectFolder . '/') === 0) ? ('/' . $projectFolder) : '';

// Resolve Absolute Base URL for native background services
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https" : "http";
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$absoluteBase = $protocol . "://" . $host . $basePath;

$base = $basePath; // Keep $base as relative for internal links

// Resolve Asset Paths
$logoUrl     = $base . '/assets/images/topBarLogo.svg'; // Falls back to text if missing
$wordmarkUrl = $base . '/assets/images/ByaHero.png';    // Added ByaHero wordmark

// Conductor links
$profileUrl = $base . '/public/conductor/profile/profile.php';
$logoutUrl  = $base . '/public/logout.php';

// Use SAME images as navbarPassenger (icons)
$hamburgerImg = $base . '/assets/images/hamburger.png';
$personImg    = $base . '/assets/images/person.svg';
$logoutImg    = $base . '/assets/images/logout.svg';

/* NEW: detect if current page is conductor profile.php so we can render a special top bar */
$path = $_SERVER['REQUEST_URI'] ?? '';
$isConductorProfile = (strpos($path, '/public/conductor/profile/profile.php') !== false);
?>

<style>
    /* Navbar styles matching the image */
    .nav-conductor-top {
        background-color: #0f3878;
        padding: 12px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom-left-radius: 20px;
        border-bottom-right-radius: 20px;
        height: 70px;
        box-shadow: 0 4px 10px rgba(0,0,0,0.15);

        position: sticky;
        top: 0;
        z-index: 1050;
    }

    .nav-conductor-logo {
        height: 35px;
        object-fit: contain;
    }

    /* Added Wordmark styling */
    .nav-conductor-wordmark {
        height: 32px;
        object-fit: contain;
        display: block;
        margin: 0 auto;
    }

    /* Use passenger hamburger image */
    .nav-conductor-hamburger {
        background: transparent;
        border: none;
        padding: 0;
        margin: 0;
        width: 50px;
        height: 50px;
        display: flex;
        align-items: center;
        justify-content: flex-end; /* Changed to push right */
    }

    .nav-conductor-hamburger img {
        height: 25px;
        width: auto;
        object-fit: contain;
    }

    /* ========= ONLY CHANGE FOR conductorLive page ========= */
    body[data-page="conductorLive"] .nav-conductor-top {
        height: 46px;
        padding: 0 16px;
        justify-content: center;
    }

    body[data-page="conductorLive"] .nav-conductor-logo,
    body[data-page="conductorLive"] .nav-conductor-wordmark, /* Hide wordmark on live page */
    body[data-page="conductorLive"] .nav-conductor-hamburger {
        display: none !important;
    }

    body[data-page="conductorLive"] .nav-conductor-live-title {
        display: block;
    }

    .nav-conductor-live-title {
        display: none;
        color: #ffffff;
        font-weight: 800;
        letter-spacing: 0.5px;
        font-size: 0.95rem;
        margin: 0;
        line-height: 1;
        text-transform: uppercase;
    }

    /* Offcanvas layering (same idea as passenger) */
    #conductorMenu.offcanvas { z-index: 2005 !important; }
    .offcanvas-backdrop { z-index: 2004 !important; }

    /* Blue shade header like passenger offcanvas */
    .conductor-menu-header {
        background: #0f3878;
        color: #fff;
        padding: 16px;
        border-bottom-left-radius: 18px;
        border-bottom-right-radius: 18px;
        position: relative;
    }

    .conductor-menu-title {
        margin: 0;
        font-weight: 900;
        font-size: 28px;
        line-height: 1.1;
        word-break: break-word;
        padding-right: 44px;
    }

    .conductor-menu-divider {
        border-top: 2px solid #ffffff;
        height: 3px;
        margin-top: 10px;
        opacity: 1;
    }

    .conductor-menu-close {
        position: absolute;
        top: 10px;
        right: 10px;
        border: 0;
        background: transparent;
        color: #fff;
        padding: 6px;
        line-height: 1;
    }

    .conductor-menu-close .material-symbols-rounded {
        font-size: 28px;
    }

    .conductor-menu-body {
        background: #f3f4f6;
    }

    /* Make menu buttons match passenger style */
    .conductor-menu-btn {
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

    .conductor-menu-btn .icon-wrap {
        margin-left: 12px;
        margin-right: 6px;
        width: 34px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    .conductor-menu-btn .icon-wrap img {
        height: 28px;
        width: 28px;
        object-fit: contain;
    }

    /* ===== NEW: Special topbar for conductor profile.php (X + Profile text) ===== */
    .nav-conductor-profilebar {
        background-color: #0f3878;
        padding: 12px 20px;
        display: flex;
        align-items: center;
        gap: 12px;
        border-bottom-left-radius: 20px;
        border-bottom-right-radius: 20px;
        height: 70px;
        box-shadow: 0 4px 10px rgba(0,0,0,0.15);
        position: sticky;
        top: 0;
        z-index: 1050;
    }

    .nav-conductor-profilebar a {
        color: #fff;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        border-radius: 999px;
    }

    .nav-conductor-profilebar a:active {
        transform: scale(0.98);
    }

    .nav-conductor-profilebar .title {
        color: #fff;
        font-weight: 800;
        font-size: 1rem;
        margin: 0;
    }
</style>

<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded" rel="stylesheet" />

<?php if ($isConductorProfile): ?>

    <div class="nav-conductor-profilebar">
        <a href="<?= htmlspecialchars($base . '/public/conductor/conductor.php') ?>" aria-label="Close">
            <span class="material-symbols-rounded" style="font-size: 26px;">close</span>
        </a>
        <div class="title">Profile</div>
    </div>

<?php else: ?>

    <div class="nav-conductor-top">
        <div style="width: 50px; display: flex; align-items: center;">
            <img src="<?= htmlspecialchars($logoUrl) ?>" alt="ByaHero" class="nav-conductor-logo" onerror="this.outerHTML='<h4 class=\'text-white mb-0 fw-bold\'>ByaHero</h4>'">
        </div>

        <img src="<?= htmlspecialchars($wordmarkUrl) ?>" alt="ByaHero" class="nav-conductor-wordmark">
        
        <div class="nav-conductor-live-title">BUS LIVE</div>

        <div style="width: 50px; display: flex; justify-content: flex-end;">
            <button type="button" class="nav-conductor-hamburger" data-bs-toggle="offcanvas" data-bs-target="#conductorMenu" aria-controls="conductorMenu" aria-label="Menu">
                <img src="<?= htmlspecialchars($hamburgerImg) ?>" alt="Menu">
            </button>
        </div>
    </div>

    <div class="offcanvas offcanvas-end" tabindex="-1" id="conductorMenu" aria-labelledby="conductorMenuLabel">
        <div class="conductor-menu-header">
            <button type="button" class="conductor-menu-close" data-bs-dismiss="offcanvas" aria-label="Close">
                <span class="material-symbols-rounded">close</span>
            </button>

            <h5 class="conductor-menu-title" id="conductorMenuLabel">
                <?= htmlspecialchars($_SESSION['user_name'] ?? 'Menu') ?>
            </h5>

            <div class="conductor-menu-divider"></div>
        </div>

        <div class="offcanvas-body conductor-menu-body">
            <div class="d-grid gap-3">
                <a href="<?= htmlspecialchars($profileUrl) ?>" class="conductor-menu-btn">
                    <div class="icon-wrap">
                        <img src="<?= htmlspecialchars($personImg) ?>" alt="Profile">
                    </div>
                    Profile
                </a>

                <a href="<?= htmlspecialchars($logoutUrl) ?>" class="conductor-menu-btn">
                    <div class="icon-wrap">
                        <img src="<?= htmlspecialchars($logoutImg) ?>" alt="Logout">
                    </div>
                    Log out
                </a>
            </div>
        </div>
    </div>

<?php endif; ?>

<script>
/* Minimal page detection to scope the "BUS LIVE" header only to conductorLive.php */
(function () {
    try {
        var path = (window.location && window.location.pathname) ? window.location.pathname : '';
        if (path.endsWith('/conductorLive.php') || path.endsWith('conductorLive.php')) {
            document.body.setAttribute('data-page', 'conductorLive');
        }
    } catch (e) {}
})();
</script>
<script>
  window.APP_BASE_URL = window.APP_BASE_URL || <?= json_encode($absoluteBase, JSON_UNESCAPED_SLASHES) ?>;
</script>
<script src="<?= htmlspecialchars($base) ?>/assets/js/capacitor_back_button.js"></script>