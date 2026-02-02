<?php
// navbarConductor.php
// Include this file at the top of conductor.php and conductorLive.php
// It renders a conductor-specific navbar/topbar and sets a CSS variable --nav-height

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

$userName = $_SESSION['user_name'] ?? 'User';
$script = basename($_SERVER['PHP_SELF']);

// Use the exact project-rooted path you provided (root-relative so it resolves from any page)
$logoutImageUrl = '/Byahero-Prototype-V3/assets/images/logoutButton.png';
?>
<style>
/* CRITICAL: This hides the default Top Logo Bar from navbar.php */
.nav-wrapper .position-absolute.top-0 {
    display: none !important;
}

/* Provide a CSS variable for navbar height so pages can adjust spacing */
:root { --nav-height: 110px; }

/* Shared styles */
.nav-conductor {
    background: linear-gradient(180deg, #0f3878, #0f3878);
    color: #fff;
    box-shadow: 0 4px 10px rgba(0,0,0,0.08);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 18px;
}

/* Selection page (conductor.php) */
.nav-conductor.simple {
    border-bottom-left-radius: 20px;
    border-bottom-right-radius: 20px;
    height: var(--nav-height);
}

/* Small topbar for live page (conductorLive.php). shorter height */
.nav-conductor.small {
    border-bottom-left-radius: 12px;
    border-bottom-right-radius: 12px;
    height: 44px;
    padding: 6px 12px;
}

/* Left title area */
.nav-left h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 800;
}

/* Right avatar / actions */
.nav-right { display:flex; align-items:center; gap:10px; }

/* Avatar */
.user-avatar {
    width: 48px; height: 48px;
    border-radius: 50%;
    background: #fff;
    color: #0f3878;
    display:flex; align-items:center; justify-content:center;
    font-size: 26px;
    box-shadow: 0 6px 18px rgba(0,0,0,0.12);
}

/* Logout button (visible in selection page) - uses an image */
.logout-btn {
    display:inline-flex;
    align-items:center;
    justify-content:center;
    padding:0;
    border-radius:8px;
    color:#0f3878;
    background:transparent;
    text-decoration:none;
    font-weight:700;
    line-height:0;
    border: none;
}

/* Ensure the logout image fits nicely */
.logout-btn img {
    display:block;
    height:36px;
    width:auto;
    border-radius:6px;
}

/* small button used in live topbar for close control */
.btn-close-like {
    display:inline-flex; align-items:center; justify-content:center;
    gap:6px; padding:6px 8px; border-radius:8px;
    background: rgba(255,255,255,0.06); color: #fff; text-decoration:none;
}

/* Screen-reader-only helper */
.sr-only {
    position: absolute !important;
    height: 1px; width: 1px;
    overflow: hidden;
    clip: rect(1px, 1px, 1px, 1px);
    white-space: nowrap;
}

/* Ensure pages that use this include can use the variable to offset content */
.main-content-wrapper {
    margin-top: calc(var(--nav-height, 100px) -30px);
}
</style>

<?php
// Render markup depending on page
if ($script === 'conductor.php'):
    // selection page - show name + avatar + logout button
    echo '<style>:root{ --nav-height: 110px; }</style>';
    ?>
    <header class="nav-conductor simple" role="banner" aria-label="Conductor header">
        <div class="nav-left" style="display:flex;flex-direction:column;justify-content:center;">
            <h2 style="line-height:1;">Hello, <?= htmlspecialchars($userName) ?>!</h2>
            <!-- intentionally no assigned bus text here -->
        </div>

        <div class="nav-right" aria-hidden="false">
            <div class="user-avatar" title="<?= htmlspecialchars($userName) ?>">
                <span class="material-icons-round" aria-hidden="true">person</span>
            </div>

            <!-- Logout uses the provided image. -->
            <a class="logout-btn" href="../logout.php" title="Logout" aria-label="Logout">
                <img src="<?= htmlspecialchars($logoutImageUrl) ?>" alt="Logout" />
                <span class="sr-only">Logout</span>
            </a>
        </div>
    </header>
<?php
elseif ($script === 'conductorLive.php'):
    // live page - compact topbar with close + title, DO NOT show profile here
    echo '<style>:root{ --nav-height: 44px; }</style>';
    ?>
    <header class="nav-conductor small" role="banner" aria-label="Conductor live header">
        <div style="display:flex; align-items:center; gap:10px;">
            <a class="btn-close-like" href="conductor.php" title="Close">
                <span class="material-icons-round" aria-hidden="true">close</span>
            </a>
            <div style="font-weight:600;">Bus Update</div>
        </div>

        <div class="nav-right" aria-hidden="true">
            <!-- No profile or logout button on live topbar per request -->
        </div>
    </header>
<?php
else:
    // fallback: show simple header with avatar and logout (useful if included elsewhere)
    echo '<style>:root{ --nav-height: 110px; }</style>';
    ?>
    <header class="nav-conductor simple" role="banner" aria-label="Conductor header">
        <div class="nav-left">
            <h2>Hello, <?= htmlspecialchars($userName) ?>!</h2>
        </div>
        <div class="nav-right">
            <div class="user-avatar" title="<?= htmlspecialchars($userName) ?>">
                <span class="material-icons-round">person</span>
            </div>
            <a class="logout-btn" href="../logout.php" title="Logout" aria-label="Logout">
                <img src="<?= htmlspecialchars($logoutImageUrl) ?>" alt="Logout" />
                <span class="sr-only">Logout</span>
            </a>
        </div>
    </header>
<?php
endif;
?>