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

    /* Profile Icon Button Styling */
    .nav-conductor-profile {
        background-color: white;
        width: 42px;
        height: 42px;
        border-radius: 50%;
        display: flex;
        justify-content: center;
        align-items: center;
        color: #0f3878;
        text-decoration: none;
        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        transition: transform 0.2s;
    }

    .nav-conductor-profile:hover,
    .nav-conductor-profile:active {
        transform: scale(0.95);
        color: #0f3878;
    }

    .nav-conductor-profile .material-symbols-rounded {
        font-size: 26px;
        font-weight: 700;
    }
</style>

<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded" rel="stylesheet" />

<div class="nav-conductor-top">
    <img src="<?= htmlspecialchars($logoUrl) ?>" alt="ByaHero" class="nav-conductor-logo" onerror="this.outerHTML='<h4 class=\'text-white mb-0 fw-bold\'>ByaHero</h4>'">
    
    <a href="<?= htmlspecialchars($profileUrl) ?>" class="nav-conductor-profile">
        <span class="material-symbols-rounded">person</span>
    </a>
</div>