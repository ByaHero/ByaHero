<?php
// components/navbarConductor.php
if (session_status() === PHP_SESSION_NONE) {
    @session_start();
}

// Ensure base URL resolves correctly depending on environment
$scriptName = $_SERVER['SCRIPT_NAME'] ?? '';
$publicDir = rtrim(str_replace('\\', '/', dirname($scriptName)), '/');
$base = preg_replace('~/public(/.*)?$~', '', $publicDir) ?: '';

// Resolve Asset Paths
$logoUrl     = $base . '/assets/images/topBarLogo.svg'; // Falls back to text if missing
$wordmarkUrl = $base . '/assets/images/ByaHero.svg';    // Added ByaHero wordmark

// Conductor links
$profileUrl = $base . '/public/conductor/profile/profile.php';
$logoutUrl  = $base . '/public/logout.php';

// Use SAME images as navbarPassenger (icons)
$hamburgerImg = $base . '/assets/images/HAMBURGER.svg';
$personImg    = $base . '/assets/images/person.svg';
$logoutImg    = $base . '/assets/images/logout.svg';

/* NEW: detect if current page is conductor profile.php or waitingPax.php so we can render a special top bar */
$isConductorProfile = (in_array(basename($scriptName), ['profile.php', 'profile', 'waitingPax.php', 'waitingPax']));

// Display name in hamburger header
$displayName = $_SESSION['user_name'] ?? null;
$displayEmail = $_SESSION['user_email'] ?? null;
$displayHeaderName = $displayName ?: ($displayEmail ?: 'Conductor');

// If it's an email address, extract the name part and capitalize it
if (str_contains($displayHeaderName, '@')) {
    $displayHeaderName = ucfirst(explode('@', $displayHeaderName)[0]);
}

// Extract first letter for the profile avatar fallback
$userInitial = strtoupper(substr(trim($displayHeaderName), 0, 1));
$userProfilePic = $_SESSION['user_profile_picture'] ?? null;
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
        height: 54px;
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
        height: 54px;
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

    /* NEW: Styling for the dynamic initial avatar */
    .profile-initial-circle {
        width: 80px;
        height: 80px;
        background-color: #ffffff;
        color: #0f3878;
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
</style>

<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0&display=swap" rel="stylesheet" media="print" onload="this.media='all'" />
<script src="<?= htmlspecialchars($base) ?>/assets/js/customAlerts.js?v=1"></script>

<?php if ($isConductorProfile): ?>

    <div class="nav-conductor-profilebar">
        <a href="<?= htmlspecialchars($base . '/public/conductor/conductor.php') ?>" aria-label="Close">
            <span class="material-symbols-rounded" style="font-size: 26px;">close</span>
        </a>
        <div class="title">
            <?php echo (basename($scriptName) === 'waitingPax.php' || basename($scriptName) === 'waitingPax') ? 'Wait Count' : 'Profile'; ?>
        </div>
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

    <div class="offcanvas offcanvas-end" tabindex="-1" id="conductorMenu" aria-labelledby="conductorMenuLabel" style="width: 85vw;">
        <div class="conductor-menu-header">
            <button type="button" class="conductor-menu-close" data-bs-dismiss="offcanvas" aria-label="Close">
                <span class="material-symbols-rounded">close</span>
            </button>

            <div class="d-flex align-items-center gap-3 pt-2 pb-3 w-100">
                <div class="profile-initial-circle">
                    <?php if ($userProfilePic): ?>
                        <?php 
                            $isAbsolute = preg_match('~^(https?:|data:)~i', $userProfilePic);
                            $imgSrc = $isAbsolute ? htmlspecialchars($userProfilePic) : $base . '/' . ltrim(htmlspecialchars($userProfilePic), '/');
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
                <div class="fw-bold text-break text-white"
                     style="font-size: <?= $titleSize ?> !important; line-height: 1.1 !important; flex: 1; padding-right: 15px;">
                    <?php echo htmlspecialchars($displayHeaderName); ?>
                </div>
            </div>

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

                <a href="<?= htmlspecialchars($base . '/public/conductor/waitingPax.php') ?>" class="conductor-menu-btn">
                    <div class="icon-wrap">
                        <span class="material-symbols-rounded" style="font-size:28px;color:#0f3878">group</span>
                    </div>
                    Wait Count
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
        if (path.endsWith('/conductorLive.php') || path.endsWith('conductorLive.php') || path.endsWith('/conductorLive') || path.endsWith('conductorLive')) {
            document.body.setAttribute('data-page', 'conductorLive');
        }
    } catch (e) {}
})();
</script>
<script>
  window.APP_BASE_URL = window.APP_BASE_URL || <?= json_encode($base, JSON_UNESCAPED_SLASHES) ?>;
</script>
<script src="<?= htmlspecialchars($base) ?>/assets/js/capacitor_back_button.js"></script>