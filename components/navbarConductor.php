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
$hamburgerImg = $base . '/assets/images/hamburger.png';
$personImg    = $base . '/assets/images/person.svg';
$logoutImg    = $base . '/assets/images/logout.svg';

/* NEW: detect if current page is conductor profile.php so we can render a special top bar */
$path = $_SERVER['REQUEST_URI'] ?? '';
$isConductorProfile = (strpos($path, '/public/conductor/profile/profile.php') !== false);

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

                <button type="button" class="conductor-menu-btn w-100 text-start border-0" 
                        data-bs-dismiss="offcanvas" onclick="openWaitCountModal()">
                    <div class="icon-wrap">
                        <span class="material-symbols-rounded" style="font-size:28px;color:#0f3878">group</span>
                    </div>
                    Wait Count
                </button>

                <a href="<?= htmlspecialchars($logoutUrl) ?>" class="conductor-menu-btn">
                    <div class="icon-wrap">
                        <img src="<?= htmlspecialchars($logoutImg) ?>" alt="Logout">
                    </div>
                    Log out
                </a>
            </div>
        </div>
    </div>

    <!-- Wait Count Modal -->
    <div class="modal fade" id="waitCountModal" tabindex="-1" aria-labelledby="waitCountModalLabel" aria-hidden="true" style="z-index: 2050;">
      <div class="modal-dialog modal-dialog-centered modal-fullscreen-sm-down">
        <div class="modal-content rounded-4 border-0 shadow-lg" style="overflow: hidden;">
          <div class="modal-header" style="background:#0f3878; color:#fff; border-radius: 0; padding: 1.2rem 1.5rem;">
            <h5 class="modal-title fw-bold d-flex align-items-center gap-2" id="waitCountModalLabel">
              <span class="material-symbols-rounded">directions_bus</span> 🚏 Waiting Passengers
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body p-0" style="background: #f8fafc;">
            <div class="text-center py-4 border-bottom bg-white shadow-sm mb-2">
              <span class="text-muted small fw-bold d-block mb-1" style="letter-spacing: 0.5px;">TOTAL PASSENGERS WAITING</span>
              <span class="badge rounded-pill fs-5 px-4 py-2 animate-bounce" style="background: #0f3878;">
                <span id="waitCountTotal">0</span> passengers
              </span>
            </div>
            
            <div id="waitCountList" class="list-group list-group-flush px-3 py-2">
              <!-- Dynamically populated wait list per stop -->
            </div>
            
            <div class="text-center py-3 border-top mt-2 bg-white">
              <small class="text-muted d-flex align-items-center justify-content-center gap-1">
                <span class="material-symbols-rounded" style="font-size: 14px; animation: spin 4s linear infinite;">sync</span>
                Auto-refreshes every 15 seconds
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>

    <style>
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    </style>

    <script>
      function openWaitCountModal() {
          loadWaitCount();
          const modalEl = document.getElementById('waitCountModal');
          if (modalEl) {
              const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
              modal.show();
          }
      }

      async function loadWaitCount() {
          try {
              const base = window.APP_BASE_URL || '';
              const res = await fetch(base + '/backend/waiting_api.php?action=get_wait_count', { credentials: 'have' });
              const data = await res.json();
              if (!data || !data.success) return;
              
              document.getElementById('waitCountTotal').textContent = data.total;
              const list = document.getElementById('waitCountList');
              
              if (!data.locations || data.locations.length === 0) {
                  list.innerHTML = `
                      <div class="text-center text-muted py-5 px-3 bg-white rounded-3 shadow-sm border border-light">
                          <span class="material-symbols-rounded text-muted mb-2" style="font-size: 48px;">no_accounts</span>
                          <p class="mb-0 fw-semibold">No passengers waiting right now.</p>
                          <small class="text-muted">Waiting lists update in real-time.</small>
                      </div>
                  `;
                  return;
              }
              
              list.innerHTML = data.locations.map(loc => `
                  <div class="list-group-item d-flex justify-content-between align-items-center rounded-3 bg-white border border-light shadow-sm mb-2 px-3 py-2.5">
                      <div class="d-flex align-items-center gap-2">
                          <span class="material-symbols-rounded text-primary" style="font-size: 20px;">place</span>
                          <span class="fw-bold text-dark">${loc.location_name}</span>
                      </div>
                      <span class="badge rounded-pill px-3 py-1.5 fs-7 fw-bold" style="background:#0f3878; color:white;">
                          ${loc.count} waiting
                      </span>
                  </div>
              `).join('');
          } catch(e) { console.error('Wait count error', e); }
      }

      let _waitInterval = null;
      document.addEventListener('DOMContentLoaded', () => {
          const modal = document.getElementById('waitCountModal');
          if (!modal) return;
          modal.addEventListener('show.bs.modal', () => { 
              loadWaitCount();
              _waitInterval = setInterval(loadWaitCount, 15000); 
          });
          modal.addEventListener('hide.bs.modal', () => { 
              clearInterval(_waitInterval); 
              _waitInterval = null; 
          });
      });
    </script>

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
  window.APP_BASE_URL = window.APP_BASE_URL || '<?= json_encode($base, JSON_UNESCAPED_SLASHES) ?>';
</script>
<script src="<?= htmlspecialchars($base) ?>/assets/js/capacitor_back_button.js"></script>