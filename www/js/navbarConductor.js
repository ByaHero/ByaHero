(function () {
    'use strict';

    // 1. Resolve relative path depth automatically
    const path = window.location.pathname;
    let depth = '../'; // default fallback
    if (path.includes('/conductor/')) {
        const index = path.indexOf('/conductor/');
        const parts = path.substring(index).split('/');
        const depthCount = parts.length - 2;
        depth = "../".repeat(depthCount) || './';
    }

    // 2. Retrieve User Profile Details from LocalStorage
    const cachedEmail = localStorage.getItem('byahero_cached_email') || '';
    const cachedRole = localStorage.getItem('byahero_cached_role') || '';
    const cachedName = localStorage.getItem('byahero_cached_name') || '';
    const cachedProfilePic = localStorage.getItem('byahero_cached_profile_picture') || '';

    // Enforce role check
    if (cachedRole !== 'conductor') {
        window.location.href = depth + 'login.html';
        return;
    }

    let displayHeaderName = cachedName || cachedEmail || 'Conductor';
    if (displayHeaderName.includes('@')) {
        displayHeaderName = displayHeaderName.split('@')[0];
    }
    // Capitalize first letter
    displayHeaderName = displayHeaderName.charAt(0).toUpperCase() + displayHeaderName.slice(1);
    const userInitial = displayHeaderName.charAt(0).toUpperCase() || '?';

    // 3. Inject accessibility assets and styles dynamically
    if (!document.getElementById('navbar-conductor-font')) {
        const link = document.createElement('link');
        link.id = 'navbar-conductor-font';
        link.rel = 'stylesheet';
        link.href = "https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0&display=swap";
        document.head.appendChild(link);
    }
    
    // Inject Custom CSS Styles
    const styleEl = document.createElement('style');
    styleEl.id = 'navbar-conductor-custom-styles';
    styleEl.textContent = `
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

        .nav-conductor-wordmark {
            height: 32px;
            object-fit: contain;
            display: block;
            margin: 0 auto;
        }

        .nav-conductor-hamburger {
            background: transparent;
            border: none;
            padding: 0;
            margin: 0;
            width: 50px;
            height: 50px;
            display: flex;
            align-items: center;
            justify-content: flex-end;
        }

        .nav-conductor-hamburger img {
            height: 25px;
            width: auto;
            object-fit: contain;
        }

        .nav-conductor-live-title {
            color: #ffffff;
            font-weight: 800;
            letter-spacing: 0.5px;
            font-size: 0.95rem;
            margin: 0;
            line-height: 1;
            text-transform: uppercase;
        }

        #conductorMenu.offcanvas { z-index: 2005 !important; }
        .offcanvas-backdrop { z-index: 2004 !important; }

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
    `;
    document.head.appendChild(styleEl);

    // 4. Determine Page Layout
    const isConductorProfile = path.endsWith('/profile.html') || path.endsWith('/waitingPax.html');
    const isConductorLive = path.endsWith('/conductorLive.html');

    let topBarHtml = '';
    if (isConductorProfile) {
        const titleText = path.endsWith('/waitingPax.html') ? 'Wait Count' : 'Profile';
        topBarHtml = `
            <div class="nav-conductor-profilebar">
                <a href="${depth}conductor/index.html" aria-label="Close">
                    <span class="material-symbols-rounded" style="font-size: 26px;">close</span>
                </a>
                <div class="title">${titleText}</div>
            </div>
        `;
    } else {
        const liveTitleStyle = isConductorLive ? 'display: block;' : 'display: none;';
        const logoStyle = isConductorLive ? 'display: none !important;' : 'display: flex;';
        const wordmarkStyle = isConductorLive ? 'display: none !important;' : 'display: block;';
        const hamburgerStyle = isConductorLive ? 'display: none !important;' : 'display: flex;';
        const paddingStyle = isConductorLive ? 'height: 46px; padding: 0 16px; justify-content: center;' : '';

        topBarHtml = `
            <div class="nav-conductor-top" style="${paddingStyle}">
                <div style="width: 50px; ${logoStyle} align-items: center;">
                    <img src="${depth}assets/images/topBarLogo.svg" alt="ByaHero" class="nav-conductor-logo" onerror="this.outerHTML='<h4 class=\\'text-white mb-0 fw-bold\\'>ByaHero</h4>'">
                </div>

                <img src="${depth}assets/images/ByaHero.svg" alt="ByaHero" class="nav-conductor-wordmark" style="${wordmarkStyle}">
                
                <div class="nav-conductor-live-title" style="${liveTitleStyle}">BUS LIVE</div>

                <div style="width: 50px; ${hamburgerStyle} justify-content: flex-end;">
                    <button type="button" class="nav-conductor-hamburger" data-bs-toggle="offcanvas" data-bs-target="#conductorMenu" aria-controls="conductorMenu" aria-label="Menu">
                        <img src="${depth}assets/images/HAMBURGER.svg" alt="Menu">
                    </button>
                </div>
            </div>
        `;
    }

    let offcanvasHtml = '';
    if (!isConductorProfile && !isConductorLive) {
        let profilePicHtml = '';
        if (cachedProfilePic) {
            const isAbsolute = /^(https?:|data:)/i.test(cachedProfilePic);
            const imgSrc = isAbsolute ? cachedProfilePic : depth + cachedProfilePic.replace(/^\//, '');
            profilePicHtml = `<img src="${imgSrc}" alt="Profile Picture" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        } else {
            profilePicHtml = userInitial;
        }

        const nameLen = displayHeaderName.length;
        let titleSize = '32px';
        if (nameLen > 25) {
            titleSize = '20px';
        } else if (nameLen > 15) {
            titleSize = '24px';
        }

        offcanvasHtml = `
            <div class="offcanvas offcanvas-end" tabindex="-1" id="conductorMenu" aria-labelledby="conductorMenuLabel" style="width: 85vw;">
                <div class="conductor-menu-header">
                    <button type="button" class="conductor-menu-close" data-bs-dismiss="offcanvas" aria-label="Close">
                        <span class="material-symbols-rounded">close</span>
                    </button>

                    <div class="d-flex align-items-center gap-3 pt-2 pb-3 w-100">
                        <div class="profile-initial-circle">
                            ${profilePicHtml}
                        </div>

                        <div class="fw-bold text-break text-white"
                             style="font-size: ${titleSize} !important; line-height: 1.1 !important; flex: 1; padding-right: 15px;">
                            ${displayHeaderName}
                        </div>
                    </div>

                    <div class="conductor-menu-divider"></div>
                </div>

                <div class="offcanvas-body conductor-menu-body">
                    <div class="d-grid gap-3">
                        <a href="${depth}conductor/profile/profile.html" class="conductor-menu-btn">
                            <div class="icon-wrap">
                                <img src="${depth}assets/images/person.svg" alt="Profile">
                            </div>
                            Profile
                        </a>

                        <a href="${depth}conductor/waitingPax.html" class="conductor-menu-btn">
                            <div class="icon-wrap">
                                <span class="material-symbols-rounded" style="font-size:28px;color:#0f3878">group</span>
                            </div>
                            Wait Count
                        </a>

                        <a href="#" id="navbar-logout-btn" class="conductor-menu-btn">
                            <div class="icon-wrap">
                                <img src="${depth}assets/images/logout.svg" alt="Logout">
                            </div>
                            Log out
                        </a>
                    </div>
                </div>
            </div>
        `;
    }

    // 5. Inject placeholders or elements into DOM
    let topContainer = document.getElementById('navbar-top-placeholder');
    if (!topContainer) {
        topContainer = document.createElement('div');
        topContainer.id = 'navbar-top-placeholder';
        document.body.insertBefore(topContainer, document.body.firstChild);
    }
    topContainer.innerHTML = topBarHtml;

    if (offcanvasHtml) {
        let menuContainer = document.getElementById('navbar-menu-placeholder');
        if (!menuContainer) {
            menuContainer = document.createElement('div');
            menuContainer.id = 'navbar-menu-placeholder';
            document.body.appendChild(menuContainer);
        }
        menuContainer.innerHTML = offcanvasHtml;
    }

    // 6. Bind Logout Action
    const logoutBtn = document.getElementById('navbar-logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (confirm("Are you sure you want to log out?")) {
                const token = localStorage.getItem('sos_fcm_active_token') || '';
                if (token && navigator.onLine) {
                    try {
                        const SERVER_URL = localStorage.getItem('byahero_server_url') || 'https://byahero.alwaysdata.net';
                        const cachedEmail = localStorage.getItem('byahero_cached_email') || '';
                        await fetch(SERVER_URL + '/public/logout.php', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                            body: 'fcm_token=' + encodeURIComponent(token) + '&email=' + encodeURIComponent(cachedEmail)
                        });
                    } catch (err) {
                        // ignore
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

    // 7. Inject Utility Scripts
    if (!window.customAlerts) {
        const alertScript = document.createElement('script');
        alertScript.src = `${depth}assets/js/customAlerts.js`;
        document.body.appendChild(alertScript);
    }

    const backScript = document.createElement('script');
    backScript.src = `${depth}assets/js/capacitor_back_button.js`;
    document.body.appendChild(backScript);

    // Expose config and base url
    window.APP_BASE_URL = depth.slice(0, -1) || '';

    // 8. Dynamic fetch interceptor for relative PHP routes in Capacitor context
    const originalFetch = window.fetch;
    window.fetch = async function(url, options) {
        const SERVER_URL = localStorage.getItem('byahero_server_url') || 'https://byahero.alwaysdata.net';
        const requestUrl = (typeof url === 'object' && url !== null) ? url.url : url;
        const cachedEmail = localStorage.getItem('byahero_cached_email') || '';

        let fetchUrl = requestUrl;
        let fetchOptions = options || {};

        if (typeof requestUrl === 'string') {
            let isTarget = false;
            
            // Resolve relative PHP file path under Capacitor
            if (requestUrl.includes('.php') && !requestUrl.startsWith('http') && !requestUrl.startsWith('data:')) {
                let cleanPath = requestUrl.replace(/^\.\.\/\.\.\/|^\.\.\/|^\.\//, '');
                let fullPath = window.location.pathname;
                let relativeToWww = '';
                if (fullPath.includes('/www/')) {
                    relativeToWww = fullPath.split('/www/')[1];
                } else if (fullPath.includes('/conductor/')) {
                    relativeToWww = fullPath.substring(fullPath.indexOf('/conductor/') + 1);
                } else {
                    relativeToWww = fullPath;
                }
                
                let parts = relativeToWww.split('/');
                parts.pop(); // remove current HTML filename
                
                let relParts = requestUrl.split('/');
                for (let part of relParts) {
                    if (part === '..') {
                        parts.pop();
                    } else if (part !== '.' && part !== '') {
                        parts.push(part);
                    }
                }
                
                let resolvedRelative = parts.join('/');
                if (!resolvedRelative.startsWith('public/') && !resolvedRelative.startsWith('backend/')) {
                    resolvedRelative = 'public/' + resolvedRelative;
                }
                
                fetchUrl = SERVER_URL + '/' + resolvedRelative;
                isTarget = true;
            } else if (requestUrl.includes('backend/')) {
                fetchUrl = SERVER_URL + '/backend/' + requestUrl.substring(requestUrl.indexOf('backend/') + 8);
                isTarget = true;
            }

            // Append email parameter for session hydration on the fly
            if (isTarget && cachedEmail) {
                const separator = fetchUrl.includes('?') ? '&' : '?';
                if (!fetchUrl.includes('email=')) {
                    fetchUrl += separator + 'email=' + encodeURIComponent(cachedEmail);
                }
            }
        }

        fetchOptions.credentials = 'include';
        return originalFetch(fetchUrl, fetchOptions);
    };
})();
