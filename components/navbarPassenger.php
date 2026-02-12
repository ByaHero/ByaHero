<?php
// --- SESSION CHECK ---
// Ensure session is started so we can check if the user is logged in
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// 1. Resolve Paths
// We use $pageDepth to fix links (e.g. if file is in passenger/subfolder/, depth is "../../")
$depth = isset($pageDepth) ? $pageDepth : '../../';
$defaultBack = $depth . 'passenger/index.php';
$backTarget = isset($backLink) ? $backLink : $defaultBack;

// 2. Determine Profile Button Destination
// If user is logged in -> Go to Profile Page
// If user is NOT logged in -> Go to Login Page
if (isset($_SESSION['user_id'])) {
    $profileUrl = $depth . 'public/passenger/profile/profile.php';
} else {
    $profileUrl = $depth . 'public/login.php';
}
?>

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

  /* Active state for bottom nav buttons */
  .nav-btn {
    transition: all 0.3s ease;
  }
  .nav-btn.active-nav {
    color: var(--bs-primary) !important;
  }
</style>

<link rel="stylesheet" href="<?php echo $depth; ?>assets/images/css/accessibility.css">
<script src="<?php echo $depth; ?>assets/images/js/accessibility.js"></script>

<?php
// --- TOP BAR RENDERING (PHP) ---

// CASE A: NOTIFICATIONS (Custom Design)
if (isset($pageType) && $pageType === 'notifications'): ?>
  <div class="bg-primary d-flex align-items-center rounded-bottom-4 px-3 shadow-sm position-absolute top-0 start-0 z-3 w-100" style="height: 40px;">
    <a href="<?php echo $defaultBack; ?>" class="text-white text-decoration-none d-flex align-items-center p-1 rounded-circle hover-bg-white-10">
      <span class="material-symbols-rounded text-white">close</span>
    </a>
    <h6 class="h5 mb-0 text-white fw-normal ms-2">Notifications</h6>
  </div>

<?php 
// CASE B: SOS (Custom Red Design)
elseif (isset($pageType) && $pageType === 'sos'): ?>
  <div class="bg-primary d-flex align-items-center rounded-bottom-4 px-3 shadow-sm position-absolute top-0 start-0 z-3 w-100">
    <a href="<?php echo $backTarget; ?>" class="text-white text-decoration-none d-flex align-items-center p-1 rounded-circle hover-bg-white-10 me-3" style="height: 40px;">
      <span class="material-symbols-rounded text-white">arrow_back</span>
    </a>
    <div class="text-white lh-1">
      <h6 class="mb-1 fw-bold">Emergency Center</h6>
    </div>
  </div>

<?php 
// CASE C: GENERIC PAGE (Flexible for ANY new page)
elseif (isset($pageTitle) || (isset($pageType) && $pageType === 'settings')): 
  // Use $pageTitle if set, otherwise fallback to empty (like old settings)
  $displayTitle = isset($pageTitle) ? $pageTitle : ''; 
?>
  <div class="bg-primary d-flex align-items-center rounded-bottom-4 px-3 shadow-sm position-absolute top-0 start-0 z-3 w-100" style="height: 40px;">
    <a href="<?php echo $backTarget; ?>" class="text-white text-decoration-none d-flex align-items-center p-1 rounded-circle hover-bg-white-10">
      <span class="material-symbols-rounded text-white">arrow_back</span>
    </a>
    <h6 class="h5 mb-0 text-white fw-normal ms-2"><?php echo htmlspecialchars($displayTitle); ?></h6>
  </div>

<?php 
// CASE D: DEFAULT / HOME (Logo only)
else: ?>
  <div class="bg-primary d-flex align-items-center rounded-bottom-4 px-3 shadow-sm position-absolute top-0 start-0 z-3 w-100" style="height: 40px;">
    <img src="<?php echo $depth; ?>assets/images/topBarLogo.svg" alt="ByaHero" height="30">
  </div>
<?php endif; ?>


<div class="fixed-bottom bg-white border-top shadow-lg" style="height: 60px; z-index: 1060;">
  <div class="row h-100 m-0">

    <div class="col-3 h-100 p-0">
      <button id="nav-location" 
        class="btn w-100 h-100 d-flex flex-column align-items-center justify-content-center p-0 border-0 bg-transparent nav-btn text-dark" 
        data-action="link" 
        data-url="<?php echo $depth; ?>public/passenger/index.php">
        <span class="material-symbols-rounded fs-1 mb-1">location_on</span>
        <span class="fw-bold small" style="font-size: 0.75rem;">LOCATION</span>
      </button>
    </div>

    <div class="col-3 h-100 p-0">
      <button id="nav-safety" 
        class="btn w-100 h-100 d-flex flex-column align-items-center justify-content-center p-0 border-0 bg-transparent nav-btn text-dark" 
        data-action="link" 
        data-url="<?php echo $depth; ?>public/passenger/safety/safety.php">
        <span class="material-symbols-rounded fs-1 mb-1">security</span>
        <span class="fw-bold small" style="font-size: 0.75rem;">SAFETY</span>
      </button>
    </div>

    <div class="col-3 h-100 p-0">
      <button id="nav-info" 
        class="btn w-100 h-100 d-flex flex-column align-items-center justify-content-center p-0 border-0 bg-transparent nav-btn text-dark" 
        data-action="modal" 
        data-target="#infoModal"
        data-url="<?php echo $depth; ?>#">
        <span class="material-symbols-rounded fs-1 mb-1">directions_bus</span>
        <span class="fw-bold small" style="font-size: 0.75rem;">INFO</span>
      </button>
    </div>

    <div class="col-3 h-100 p-0">
      <button id="nav-profile" 
        class="btn w-100 h-100 d-flex flex-column align-items-center justify-content-center p-0 border-0 bg-transparent nav-btn text-dark" 
        data-action="link" 
        data-url="<?php echo $profileUrl; ?>">
        <span class="material-symbols-rounded fs-1 mb-1">person</span>
        <span class="fw-bold small" style="font-size: 0.75rem;">PROFILE</span>
      </button>
    </div>

  </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', () => {
    // Configuration
    const basePath = "<?php echo $depth; ?>"; 
    const indexUrl = basePath + "passenger/index.php";
    
    // Detect if we are on the Home Page (Index)
    // We check if the 'map' element exists or if the URL ends in typical index paths
    const hasMap = document.getElementById('map') || document.getElementById('map-desktop-placeholder');
    const path = window.location.pathname;
    const isIndex = hasMap || path.endsWith('passenger/') || path.endsWith('index.php');

    // --- 1. HANDLE BUTTON CLICKS ---
    const navButtons = document.querySelectorAll('.nav-btn');
    
    navButtons.forEach(btn => {
        // Highlight logic: Check if current URL matches button URL
        const btnUrl = btn.getAttribute('data-url');
        if (btnUrl && window.location.href.includes(btnUrl.split('/').pop())) {
              setActive(btn);
        } else if (isIndex && btn.id === 'nav-location') {
              setActive(btn);
        }

        btn.addEventListener('click', (e) => {
            const action = btn.getAttribute('data-action');
            
            // Type A: Direct Link (e.g. Safety, Location, Profile)
            if (action === 'link') {
                const url = btn.getAttribute('data-url');
                // If we are already here, do nothing (or specific home logic)
                if (window.location.href.includes(url.split('/').pop())) {
                    if(isIndex) toggleBottomSheet(); // Tapping location on home toggles sheet
                    return; 
                }
                window.location.href = url;
            }

            // Type B: Modal Trigger (e.g. Info)
            else if (action === 'modal') {
                const targetId = btn.getAttribute('data-target');

                if (isIndex) {
                    // We are on Home: Open the modal directly
                    openBootstrapModal(targetId);
                    setActive(btn);
                } else {
                    // We are NOT on Home: Redirect to home and tell it to open the modal
                    // We pass ?open=targetId in the URL
                    const cleanTarget = targetId.replace('#', '');
                    window.location.href = indexUrl + "?open=" + cleanTarget;
                }
            }
        });
    });

    // --- 2. HANDLE AUTO-OPENING MODALS (redirected from other pages) ---
    if (isIndex) {
        const urlParams = new URLSearchParams(window.location.search);
        const modalToOpen = urlParams.get('open');
        
        if (modalToOpen) {
            // Wait a split second for Bootstrap to be ready
            setTimeout(() => {
                openBootstrapModal('#' + modalToOpen);
                
                // Highlight the correct button
                if (modalToOpen === 'infoModal') setActive(document.getElementById('nav-info'));
                
                // Clean the URL so refresh doesn't reopen it
                window.history.replaceState({}, document.title, window.location.pathname);
            }, 300);
        }
    }

    // --- HELPER FUNCTIONS ---

    function setActive(activeBtn) {
        navButtons.forEach(b => {
            b.classList.remove('active-nav', 'text-primary'); 
            b.classList.add('text-dark'); 
        });
        if(activeBtn) {
            activeBtn.classList.add('active-nav', 'text-primary');
            activeBtn.classList.remove('text-dark');
        }
    }

    function openBootstrapModal(id) {
        if (typeof bootstrap !== 'undefined') {
            const el = document.querySelector(id);
            if (el) {
                const modal = new bootstrap.Modal(el);
                modal.show();
            }
        } else {
            console.warn("Bootstrap not loaded");
        }
    }

    function toggleBottomSheet() {
        // Tries to find the bottom sheet function from index.php
        // Uses the existing logic if available
        if (typeof selectNav === 'function') {
            selectNav(document.getElementById('nav-location'), 'location');
        } else {
            const sheet = document.querySelector('.bottom-sheet');
            if (sheet) {
                sheet.classList.remove('d-none');
                sheet.classList.add('d-flex');
            }
        }
    }
});
</script>