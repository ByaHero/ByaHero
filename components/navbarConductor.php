<?php
// components/navbarConductor.php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Ensure base URL resolves correctly depending on environment
$projectFolder = 'ByaHero-Prototype-V3';
$uri = $_SERVER['REQUEST_URI'] ?? '/';
$base = (stripos($uri, '/' . $projectFolder . '/') === 0) ? ('/' . $projectFolder) : '';

// Resolve Asset Paths
$logoUrl = $base . '/assets/images/topBarLogo.svg'; // Falls back to text if missing

// Link to the profile based on your provided file structure
$profileUrl = $base . '/public/conductor/profile/profile.php';
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
        position: relative;
        z-index: 1050;
    }

    .nav-conductor-logo {
        height: 35px;
        object-fit: contain;
    }

    /* Hamburger Icon Button Styling (no circle) */
    .nav-conductor-hamburger {
        background: transparent;
        border: none;
        padding: 0;
        margin: 0;
        color: #ffffff;
        text-decoration: none;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 42px;
        height: 42px;
        box-shadow: none;
        transition: transform 0.2s;
        border-radius: 0;
        line-height: 1;
    }

    .nav-conductor-hamburger:hover,
    .nav-conductor-hamburger:active {
        transform: scale(0.95);
        color: #ffffff;
    }

    /* ADDED: custom "hamburger" with wider line spacing (like your screenshot) */
    .nav-conductor-hamburger-icon {
        width: 28px;
        height: 22px;
        display: flex;
        flex-direction: column;
        justify-content: space-between; /* this creates the bigger spacing */
        align-items: flex-start;
    }

    .nav-conductor-hamburger-icon span {
        display: block;
        width: 28px;
        height: 3px;
        background: #ffffff;
        border-radius: 999px;
    }
</style>

<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded" rel="stylesheet" />

<div class="nav-conductor-top">
    <img src="<?= htmlspecialchars($logoUrl) ?>" alt="ByaHero" class="nav-conductor-logo" onerror="this.outerHTML='<h4 class=\'text-white mb-0 fw-bold\'>ByaHero</h4>'">

    <button type="button" class="nav-conductor-hamburger" data-bs-toggle="offcanvas" data-bs-target="#conductorMenu" aria-controls="conductorMenu" aria-label="Menu">
        <span class="nav-conductor-hamburger-icon" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
        </span>
    </button>
</div>

<!-- Offcanvas Menu (contains Profile link) -->
<div class="offcanvas offcanvas-end" tabindex="-1" id="conductorMenu" aria-labelledby="conductorMenuLabel">
    <div class="offcanvas-header">
        <h5 class="offcanvas-title" id="conductorMenuLabel">Menu</h5>
        <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
    </div>
    <div class="offcanvas-body">
        <a href="<?= htmlspecialchars($profileUrl) ?>" class="btn btn-light w-100 fw-bold py-3 rounded-4">
            Profile
        </a>
    </div>
</div>