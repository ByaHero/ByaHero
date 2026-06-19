(function () {
    'use strict';

    // 1. Resolve relative path depth automatically
    const path = window.location.pathname;
    let depth = '../'; // default fallback
    if (path.includes('/passenger/')) {
        const index = path.indexOf('/passenger/');
        const parts = path.substring(index).split('/');
        const depthCount = parts.length - 2;
        depth = "../".repeat(depthCount) || './';
    }

    const baseUrl = depth;

    // 2. Read config options from <body> element
    const body = document.body;
    const pageTitle = body.getAttribute('data-page-title') || '';
    const pageType = body.getAttribute('data-page-type') || ''; // generic, sos, settings, profile, notifications, or home (default)
    const backLink = body.getAttribute('data-back-link') || 'javascript:history.back()';
    const activeTab = body.getAttribute('data-active-tab') || ''; // location, sos, info

    // 3. Retrieve User Profile Details from LocalStorage
    const displayName = localStorage.getItem('byahero_cached_name') || localStorage.getItem('byahero_cached_email') || 'Guest';
    let displayHeaderName = displayName;
    if (displayHeaderName.includes('@')) {
        displayHeaderName = displayHeaderName.split('@')[0];
    }
    // Capitalize first letter
    displayHeaderName = displayHeaderName.charAt(0).toUpperCase() + displayHeaderName.slice(1);
    const userInitial = displayHeaderName.charAt(0).toUpperCase() || '?';
    const userProfilePic = localStorage.getItem('byahero_cached_profile_picture') || '';

    // 4. Inject accessibility assets and styles dynamically
    if (!document.getElementById('navbar-accessibility-styles')) {
        const link = document.createElement('link');
        link.id = 'navbar-accessibility-styles';
        link.rel = 'stylesheet';
        link.href = `${depth}assets/css/accessibility.css`;
        document.head.appendChild(link);
    }
    
    // Inject Custom CSS Styles (from navbarPassenger.php style block)
    const styleEl = document.createElement('style');
    styleEl.id = 'navbar-custom-styles';
    styleEl.textContent = `
        :root {
            --bs-primary: #1e3a8a;
            --bs-primary-rgb: 30, 58, 138;
            --bs-bg-light: #f3f4f6;
        }

        .hover-bg-white-10:hover {
            background-color: rgba(255, 255, 255, 0.1);
        }

        .nav-item-btn img,
        .sos-dome img,
        [data-bs-toggle="offcanvas"] img,
        .topbar-wordmark {
            -webkit-backface-visibility: hidden;
            backface-visibility: hidden;
            -webkit-transform: perspective(1px) translateZ(0);
            transform: perspective(1px) translateZ(0);
            image-rendering: -webkit-optimize-contrast;
            image-rendering: crisp-edges;
        }

        .material-symbols-rounded {
            font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
            -webkit-font-smoothing: antialiased;
            text-rendering: optimizeLegibility;
        }

        body {
            padding-bottom: 100px !important;
        }

        .passenger-topbar-sticky {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            width: 100%;
            z-index: 2002 !important;
        }

        .topbar-wordmark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
        }

        .offcanvas-username {
            font-size: 24px !important;
            line-height: 1.2 !important;
            word-break: break-word;
            max-width: 100%;
        }

        .profile-initial-circle {
            width: 80px;
            height: 80px;
            background-color: #ffffff;
            color: var(--bs-primary);
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

        .nav-btn {
            transition: all 0.3s ease;
        }

        .nav-btn.active-nav {
            color: var(--bs-primary) !important;
        }

        .offcanvas {
            z-index: 2005 !important;
        }

        .offcanvas-backdrop {
            z-index: 2004 !important;
        }

        .bottom-nav {
            height: 70px;
            z-index: 1060;
            overflow: visible !important;
        }

        .bottom-nav .nav-item-btn {
            width: 100%;
            height: 70px;
            border: 0;
            background: transparent;
        }

        .bottom-nav .nav-label {
            font-size: 0.70rem;
            font-weight: 800;
            letter-spacing: .3px;
        }

        .bottom-nav .nav-icon {
            font-size: 30px;
            line-height: 1;
        }

        .bottom-nav .sos-col {
            position: relative;
            overflow: visible;
        }

        .bottom-nav .sos-btn {
            border: 0;
            background: transparent;
            padding: 0;
            width: 100%;
            height: 70px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-end;
            padding-bottom: 6px;
            position: relative;
        }

        .bottom-nav .sos-dome {
            position: absolute;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 100px;
            height: 76px;
            background-color: #2563eb;
            border-radius: 50px 50px 0 0;
            box-shadow: 0 -4px 15px rgba(37, 99, 235, 0.3);
            display: flex;
            align-items: center;
            justify-content: flex-start;
            flex-direction: column;
            padding-top: 14px;
            gap: 2px;
        }

        .bottom-nav .sos-dome .sos-icon-wrap {
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .bottom-nav .sos-dome .sos-icon-wrap svg {
            width: 32px;
            height: 32px;
            filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15));
        }

        .bottom-nav .sos-dome .nav-label {
            font-size: 0.75rem;
            font-weight: 800;
            color: #fff;
            letter-spacing: .5px;
            line-height: 1;
            margin-top: 2px;
        }

        .bottom-nav .nav-btn.active-nav:not(.sos-btn) {
            color: var(--bs-primary) !important;
        }

        #sos-btn,
        .sos-btn-floating,
        [data-sos] {
            display: none !important;
        }

        .nav-item-btn img {
            transition: opacity 0.2s ease;
            width: 24px;
            height: 24px;
            object-fit: contain;
        }

        .nav-item-btn.active-nav img {
            opacity: 1;
        }

        .nav-item-btn:not(.active-nav) img {
            opacity: 0.6;
        }

        @media (min-width: 992px) {
            .passenger-topbar-sticky {
                height: 60px !important;
                padding: 0 24px !important;
            }
            
            .desktop-nav-link {
                color: rgba(255, 255, 255, 0.75) !important;
                text-decoration: none !important;
                font-size: 0.9rem !important;
                font-weight: 700 !important;
                padding: 8px 16px !important;
                border-radius: 20px !important;
                transition: all 0.2s ease !important;
                display: inline-flex !important;
                align-items: center !important;
                border: 1px solid transparent !important;
            }
            .desktop-nav-link:hover {
                color: #ffffff !important;
                background-color: rgba(255, 255, 255, 0.1) !important;
            }
            .desktop-nav-link.active {
                color: #ffffff !important;
                background-color: rgba(255, 255, 255, 0.2) !important;
                border-color: rgba(255, 255, 255, 0.25) !important;
                box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1) !important;
            }
            
            .bottom-nav {
                display: none !important;
            }
            body {
                padding-bottom: 0 !important;
            }
            
            #bottomSheet {
                left: 24px !important;
                top: 84px !important;
                bottom: 24px !important;
                width: 400px !important;
                height: calc(100vh - 108px) !important;
                border-radius: 20px !important;
                box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15) !important;
                transform: none !important;
                transition: none !important;
                z-index: 1050 !important;
            }
            
            .sheet-drag-handle {
                display: none !important;
            }
            
            #my-location-btn-container {
                position: fixed !important;
                bottom: 24px !important;
                right: 24px !important;
                top: auto !important;
                left: auto !important;
                width: auto !important;
                z-index: 1060 !important;
            }
            .my-location-btn-wrap {
                position: relative !important;
                right: auto !important;
                margin: 0 !important;
            }
            
            .offcanvas-end {
                width: 400px !important;
            }
        }
    `;
    document.head.appendChild(styleEl);

    // 5. Generate Desktop Nav Links HTML
    const desktopLinksHtml = `
      <div class="d-none d-lg-flex align-items-center gap-3 ms-auto me-3" id="desktop-nav-links">
        <a href="${depth}passenger/index.html" class="desktop-nav-link ${activeTab === 'location' ? 'active' : ''}">
          <span class="material-symbols-rounded align-middle me-1" style="font-size: 20px;">map</span>Live Map
        </a>
        <a href="${depth}passenger/sos/sos.html" class="desktop-nav-link ${activeTab === 'sos' ? 'active' : ''}">
          <span class="material-symbols-rounded align-middle me-1" style="font-size: 20px;">emergency</span>SOS
        </a>
        <a href="${depth}passenger/busInfo/busInfo.html" class="desktop-nav-link ${activeTab === 'info' ? 'active' : ''}">
          <span class="material-symbols-rounded align-middle me-1" style="font-size: 20px;">directions_bus</span>Bus Info
        </a>
      </div>
    `;

    // 6. Assemble Top sticky bar HTML
    let topBarHtml = '';
    if (pageType === 'notifications') {
        topBarHtml = `
          <div class="bg-primary d-flex align-items-center justify-content-between rounded-bottom-4 px-3 shadow-sm position-absolute top-0 start-0 z-3 w-100 passenger-topbar-sticky" style="height: 56px;">
            <div class="d-flex align-items-center">
              <a href="${depth}passenger/index.html" class="text-white text-decoration-none d-flex align-items-center p-1 rounded-circle hover-bg-white-10">
                <span class="material-symbols-rounded text-white">close</span>
              </a>
              <h6 class="h5 mb-0 text-white fw-normal ms-2">Notifications</h6>
            </div>
            ${desktopLinksHtml}
          </div>
        `;
    } else if (pageType === 'sos') {
        topBarHtml = `
          <div class="bg-primary d-flex align-items-center justify-content-between rounded-bottom-4 px-3 shadow-sm position-absolute top-0 start-0 z-3 w-100 passenger-topbar-sticky" style="height: 40px;">
            <div class="d-flex align-items-center">
              <a href="${backLink}" class="text-white text-decoration-none d-flex align-items-center p-1 rounded-circle hover-bg-white-10">
                <span class="material-symbols-rounded text-white">arrow_back</span>
              </a>
              <h6 class="h5 mb-0 text-white fw-normal ms-2">${pageTitle || 'Emergency Center'}</h6>
            </div>
            ${desktopLinksHtml}
          </div>
        `;
    } else if (pageType === 'settings' || pageType === 'profile' || pageType === 'generic') {
        topBarHtml = `
          <div class="bg-primary d-flex align-items-center justify-content-between rounded-bottom-4 px-3 shadow-sm position-absolute top-0 start-0 z-3 w-100 passenger-topbar-sticky" style="height: 40px;">
            <div class="d-flex align-items-center">
              <a href="${backLink}" class="text-white text-decoration-none d-flex align-items-center p-1 rounded-circle hover-bg-white-10">
                <span class="material-symbols-rounded text-white">arrow_back</span>
              </a>
              <h6 class="h5 mb-0 text-white fw-normal ms-2">${pageTitle}</h6>
            </div>
            ${desktopLinksHtml}
          </div>
        `;
    } else {
        // Default Home Topbar
        topBarHtml = `
          <div class="bg-primary d-flex align-items-center justify-content-between rounded-bottom-4 px-3 shadow-sm position-absolute top-0 start-0 z-3 w-100 passenger-topbar-sticky" style="height: 54px;">
            <div class="d-flex align-items-center" style="width: 60px; height: 100%;">
              <img src="${depth}assets/images/topBarLogo.svg" alt="ByaHero Logo" height="32">
            </div>
            <div class="position-absolute top-50 start-50 translate-middle" style="z-index: 0; pointer-events: none;">
              <img src="${depth}assets/images/ByaHero.svg" alt="ByaHero" height="30" style="object-fit: contain;">
            </div>
            <div class="d-flex align-items-center gap-2 justify-content-end" style="height: 100%;">
              ${desktopLinksHtml}
              <a href="${depth}passenger/notifications.html" class="text-white text-decoration-none position-relative d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;">
                <img id="topbar-notification-icon" src="${depth}assets/images/notification bell.svg" alt="Notifications" height="22">
              </a>
              <button type="button" class="btn p-0 text-white d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;" data-bs-toggle="offcanvas" data-bs-target="#passengerMenu" aria-controls="passengerMenu">
                <img src="${depth}assets/images/HAMBURGER.svg" alt="Menu" height="18">
              </button>
            </div>
          </div>
        `;
    }

    // 7. Assemble Offcanvas Sidebar HTML
    const SERVER_URL = localStorage.getItem('byahero_server_url') || 'https://byahero.alwaysdata.net';
    let avatarHtml = userInitial;
    if (userProfilePic && userProfilePic !== 'null' && userProfilePic !== 'undefined') {
        const isAbsolute = userProfilePic.startsWith('data:') || userProfilePic.startsWith('http');
        const imgSrc = isAbsolute ? userProfilePic : (SERVER_URL.replace(/\/$/, '') + '/' + userProfilePic.replace(/^\//, ''));
        avatarHtml = `<img src="${imgSrc}" alt="Profile Picture" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
    }

    const offcanvasHtml = `
      <div class="offcanvas offcanvas-end" tabindex="-1" id="passengerMenu" aria-labelledby="passengerMenuLabel" style="width: 80vw;">
        <div class="bg-primary text-white p-3 rounded-bottom-4 position-relative">
          <button type="button" class="btn p-0 position-absolute top-0 end-0 m-3 text-white" data-bs-dismiss="offcanvas" aria-label="Close">
            <span class="material-symbols-rounded" style="font-size: 28px;">close</span>
          </button>
          <div class="d-flex align-items-center gap-3 pt-2 pb-3 w-100">
            <div class="profile-initial-circle" id="menuUserAvatar">
              ${avatarHtml}
            </div>
            <div class="fw-bold text-break offcanvas-username" id="menuUserName" style="font-size: 24px !important; line-height: 1.1 !important; flex: 1; padding-right: 15px;">
              ${displayHeaderName}
            </div>
          </div>
          <div style="border-top: 2px solid #ffffff; height: 3px; margin-top: 8px; margin-bottom: 8px;"></div>
        </div>
        <div class="offcanvas-body bg-white">
          <div class="d-grid gap-3">
            <a class="btn shadow rounded-4 py-3 d-flex align-items-center justify-content-start gap-3 fw-bold text-dark" style="background-color: #ececec;" href="${depth}passenger/profile/profile.html">
              <div style="margin-left: 20px; margin-right: 10px;">
                <img src="${depth}assets/images/person.svg" alt="Profile" height="30">
              </div>
              Profile
            </a>
            <a class="btn shadow rounded-4 py-3 d-flex align-items-center justify-content-start gap-3 fw-bold text-dark" style="background-color: #ececec;" href="${depth}passenger/showGuide/showGuide.html">
              <div style="margin-left: 20px; margin-right: 10px;">
                <img src="${depth}assets/images/icons/USER GUIDE.svg" alt="User Guide" height="30">
              </div>
              User Guide
            </a>
            <a class="btn shadow rounded-4 py-3 d-flex align-items-center justify-content-start gap-3 fw-bold text-dark" style="background-color: #ececec;" href="${depth}passenger/passengerSettings/privacySecurity.html">
              <div style="margin-left: 20px; margin-right: 10px;">
                <img src="${depth}assets/images/privacy.svg" alt="Privacy" height="30">
              </div>
              Privacy and Security
            </a>
            <a class="btn shadow rounded-4 py-3 d-flex align-items-center justify-content-start gap-3 fw-bold text-dark" style="background-color: #ececec;" href="${depth}passenger/lostAndFound/lostAndFound.html">
              <div style="margin-left: 20px; margin-right: 10px;">
                <img src="${depth}assets/images/lostandfound.svg" alt="Lost and Found" height="30">
              </div>
              Lost and Found
            </a>
            <a class="btn shadow rounded-4 py-3 d-flex align-items-center justify-content-start gap-3 fw-bold text-dark" style="background-color: #ececec;" href="${depth}passenger/passengerSettings/about.html">
              <div style="margin-left: 20px; margin-right: 10px;">
                <img src="${depth}assets/images/about.svg" alt="About" height="30">
              </div>
              About
            </a>
            <a class="btn shadow rounded-4 py-3 d-flex align-items-center justify-content-start gap-3 fw-bold text-dark" style="background-color: #ececec;" href="${depth}passenger/passengerSettings/feedback.html">
              <div style="margin-left: 20px; margin-right: 10px;">
                <img src="${depth}assets/images/feedback.svg" alt="Feedback" height="30">
              </div>
              Feedback
            </a>
            <a class="btn shadow rounded-4 py-3 d-flex align-items-center justify-content-start gap-3 fw-bold text-dark" style="background-color: #ececec;" href="${depth}passenger/report/report.html">
              <div style="margin-left: 20px; margin-right: 10px;">
                <img src="${depth}assets/images/report.svg" alt="Report" height="30">
              </div>
              Report a Problem
            </a>
            <a class="btn shadow rounded-4 py-3 d-flex align-items-center justify-content-start gap-3 fw-bold text-dark" style="background-color: #ececec;" href="${depth}passenger/passengerSettings/share.html">
              <div style="margin-left: 20px; margin-right: 10px;">
                <img src="${depth}assets/images/share.svg" alt="Share" height="30">
              </div>
              Share ByaHero
            </a>
            <a class="btn shadow rounded-4 py-3 d-flex align-items-center justify-content-start gap-3 fw-bold text-dark" style="background-color: #ececec;" href="${depth}passenger/rideHistory.html">
              <div style="margin-left: 20px; margin-right: 10px;">
                <img src="${depth}assets/images/HISTORY.svg" alt="History" height="30">
              </div>
              Ride History
            </a>
            <button type="button" class="btn shadow rounded-4 py-3 d-flex align-items-center justify-content-start gap-3 fw-bold text-dark w-100" style="background-color: #ececec;" id="navbar-logout-btn">
              <div style="margin-left: 20px; margin-right: 10px;">
                <img src="${depth}assets/images/logout.svg" alt="Logout" height="30">
              </div>
              Log out
            </button>
          </div>
        </div>
      </div>
    `;

    // 8. Assemble Bottom navigation bar HTML
    const bottomNavHtml = `
      <div class="fixed-bottom bg-white border-top shadow-lg bottom-nav" style="height: 65px; z-index: 1060;">
        <div class="container-fluid h-100">
          <div class="row h-100 align-items-end m-0">
            <div class="col-4 p-0 text-center">
              <button id="nav-location" class="nav-item-btn d-flex flex-column align-items-center justify-content-center nav-btn text-dark ${activeTab === 'location' ? 'active-nav' : ''}" onclick="window.location.href='${depth}passenger/index.html'">
                <img id="nav-location-icon" src="${depth}assets/images/icons/locationBlack.svg" alt="Bus Location" style="width: 24px; height: 24px; object-fit: contain;" />
                <span class="nav-label">LOCATION</span>
              </button>
            </div>
            <div class="col-4 p-0 text-center sos-col">
              <button id="nav-sos" class="sos-btn nav-btn ${activeTab === 'sos' ? 'active-nav' : ''}" onclick="window.location.href='${depth}passenger/sos/sos.html'">
                <div class="sos-dome">
                  <div class="sos-icon-wrap">
                    <img id="nav-sos-icon" src="${depth}assets/images/icons/SOS.svg" alt="SOS" style="width: 32px; height: 32px; object-fit: contain;" />
                  </div>
                  <span class="nav-label">SOS</span>
                </div>
              </button>
            </div>
            <div class="col-4 p-0 text-center">
              <button id="nav-info" class="nav-item-btn d-flex flex-column align-items-center justify-content-center nav-btn text-dark ${activeTab === 'info' ? 'active-nav' : ''}" onclick="window.location.href='${depth}passenger/busInfo/busInfo.html'">
                <img id="nav-info-icon" src="${depth}assets/images/icons/busActive.svg" alt="Bus Info" style="width: 24px; height: 24px; object-fit: contain;" />
                <span class="nav-label">BUS INFO</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // 9. Inject placeholders if they exist, or append directly to body
    // Topbar injection
    let topContainer = document.getElementById('navbar-top-placeholder');
    if (!topContainer) {
        topContainer = document.createElement('div');
        topContainer.id = 'navbar-top-placeholder';
        body.insertBefore(topContainer, body.firstChild);
    }
    topContainer.innerHTML = topBarHtml;

    // Bottom Navigation injection
    let bottomContainer = document.getElementById('navbar-bottom-placeholder');
    if (!bottomContainer) {
        bottomContainer = document.createElement('div');
        bottomContainer.id = 'navbar-bottom-placeholder';
        body.appendChild(bottomContainer);
    }
    bottomContainer.innerHTML = bottomNavHtml;

    // Offcanvas menu injection
    let menuContainer = document.getElementById('navbar-menu-placeholder');
    if (!menuContainer) {
        menuContainer = document.createElement('div');
        menuContainer.id = 'navbar-menu-placeholder';
        body.appendChild(menuContainer);
    }
    menuContainer.innerHTML = offcanvasHtml;

    // 10. Bind logout button action
    const logoutBtn = document.getElementById('navbar-logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            if (confirm("Are you sure you want to log out?")) {
                const token = localStorage.getItem('sos_fcm_active_token') || '';
                if (token && navigator.onLine) {
                    try {
                        const SERVER_URL = localStorage.getItem('byahero_server_url') || 'https://byahero.alwaysdata.net';
                        await fetch(SERVER_URL + '/public/logout.php', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                            body: 'fcm_token=' + encodeURIComponent(token)
                        });
                    } catch (e) {
                        // ignore error
                    }
                }
                localStorage.removeItem('byahero_cached_email');
                localStorage.removeItem('byahero_cached_role');
                localStorage.removeItem('byahero_cached_name');
                localStorage.removeItem('byahero_cached_profile_picture');
                localStorage.removeItem('byahero_cached_contacts');
                localStorage.removeItem('byahero_cached_phone');
                localStorage.removeItem('sos_fcm_active_token');
                window.location.href = `${depth}login.html`;
            }
        });
    }

    // 11. Dynamic Notification Unread Status Polling (runs only on Home / generic screens)
    if (!pageType || pageType === 'home') {
        const POLL_MS = 60000; // 60s
        let _pollInProgress = false;

        function setNotifIcon(hasUnread) {
            const img = document.getElementById('topbar-notification-icon');
            if (!img) return;
            img.src = hasUnread ? `${depth}assets/images/notificationAlert.svg` : `${depth}assets/images/notification bell.svg`;
        }

        async function pollUnread() {
            if (_pollInProgress) return;
            if (!navigator.onLine) return;
            const cachedEmail = localStorage.getItem('byahero_cached_email');
            if (!cachedEmail || cachedEmail === 'guest@byahero.app') return;

            _pollInProgress = true;
            try {
                const SERVER_URL = localStorage.getItem('byahero_server_url') || 'https://byahero.alwaysdata.net';
                const res = await fetch(`${SERVER_URL}/backend/getUnreadStatus.php?ts=${Date.now()}`, {
                    credentials: 'include',
                    cache: 'no-store'
                });
                if (!res.ok) return;
                const data = await res.json();
                if (data && data.success) {
                    setNotifIcon(!!data.has_unread);
                }
            } catch (e) {
                // fail silently
            } finally {
                _pollInProgress = false;
            }
        }

        setInterval(pollUnread, POLL_MS);
        pollUnread(); // initial run
    }

    // 12. Load accessibility.js dynamically
    const script = document.createElement('script');
    script.src = `${depth}assets/js/accessibility.js`;
    body.appendChild(script);

    // 13. Load capacitor_firebase_bridge.js dynamically if on Capacitor
    if (window.Capacitor) {
        const bridgeScript = document.createElement('script');
        bridgeScript.src = `${depth}assets/js/capacitor_firebase_bridge.js`;
        body.appendChild(bridgeScript);
    }

    // 14. Load byaheroTour.js dynamically if tour is active (needed for pages other than index.html in Capacitor)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('start_tour') === 'true' && !window.ByaheroTour) {
        const tourScript = document.createElement('script');
        tourScript.src = `${depth}assets/js/passenger/byaheroTour.js`;
        body.appendChild(tourScript);
    }

})();
