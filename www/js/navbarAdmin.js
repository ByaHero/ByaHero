(function () {
    'use strict';

    // 1. Resolve relative path depth automatically
    const path = window.location.pathname;
    let depth = '../'; // default fallback
    if (path.includes('/admin/')) {
        const index = path.indexOf('/admin/');
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
    if (cachedRole !== 'admin') {
        window.location.href = depth + 'login.html';
        return;
    }

    let displayHeaderName = cachedName || cachedEmail || 'Admin';
    if (displayHeaderName.includes('@')) {
        displayHeaderName = displayHeaderName.split('@')[0];
    }
    displayHeaderName = displayHeaderName.charAt(0).toUpperCase() + displayHeaderName.slice(1);
    const userInitial = displayHeaderName.charAt(0).toUpperCase() || '?';

    // 3. Inject accessibility assets and styles dynamically
    if (!document.getElementById('navbar-admin-font')) {
        const link = document.createElement('link');
        link.id = 'navbar-admin-font';
        link.rel = 'stylesheet';
        link.href = "https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0&display=swap";
        document.head.appendChild(link);
    }
    
    // Read parameters from body attributes
    const body = document.body;
    const pageTitle = body.getAttribute('data-page-title') || 'Admin';
    const pageType = body.getAttribute('data-page-type') || 'dashboard'; // dashboard, adminProfile, generic
    const backLink = body.getAttribute('data-back-link') || 'index.html';

    const isAdminProfile = (pageType === 'adminProfile');
    const isDashboard = (pageType === 'dashboard');
    const showClose = (!isDashboard && !isAdminProfile);

    // Inject Custom CSS Styles
    const styleEl = document.createElement('style');
    styleEl.id = 'navbar-admin-custom-styles';
    styleEl.textContent = `
        :root{
            --admin-blue: #0f3878;
            --admin-top-h: 54px;
            --admin-bottom-h: 35px;
        }

        body{
            padding-top: var(--admin-top-h) !important;
            padding-bottom: var(--admin-bottom-h) !important;
        }

        .admin-topbar-wrap{ z-index: 2000; position: fixed; top: 0; left: 0; right: 0; }
        .admin-bottombar-wrap{ z-index: 1500; position: fixed; bottom: 0; left: 0; right: 0; }

        .admin-topbar{
            height: var(--admin-top-h);
            background: var(--admin-blue);
            color: #fff;
            border-bottom-left-radius: 20px;
            border-bottom-right-radius: 20px;
            padding: 0 20px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .admin-left{
            display: flex;
            align-items: center;
            gap: 12px;
            min-width: 0;
            width: 100%;
        }

        .admin-title{
            font-weight: 800;
            letter-spacing: .2px;
            font-size: 1.05rem;
            line-height: 1.1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .admin-close-btn{
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
        .admin-close-btn:hover{
            background: rgba(255, 255, 255, 0.2);
            color: #fff;
        }

        .admin-logo{
            height: 35px;
            object-fit: contain;
            display: block;
        }

        .admin-hamburger{
            background: transparent;
            border: none;
            padding: 0;
            margin: 0;
            width: 50px;
            height: 50px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
        }
        .admin-hamburger img{
            height: 25px;
            width: auto;
            object-fit: contain;
        }

        .admin-bottombar{ height: var(--admin-bottom-h); background: var(--admin-blue); }

        #adminMenu.offcanvas{ z-index: 2005 !important; }
        .offcanvas-backdrop{ z-index: 2004 !important; }

        .admin-menu-header{
            background: var(--admin-blue);
            color: #fff;
            padding: 16px;
            border-bottom-left-radius: 18px;
            border-bottom-right-radius: 18px;
            position: relative;
        }

        .admin-menu-divider{
            border-top: 2px solid #ffffff;
            height: 3px;
            margin-top: 10px;
            opacity: 1;
        }

        .admin-menu-close{
            position: absolute;
            top: 10px;
            right: 10px;
            border: 0;
            background: transparent;
            color: #fff;
            padding: 6px;
            line-height: 1;
        }

        .admin-menu-body{ background: #f3f4f6; }

        .admin-menu-btn{
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

        .admin-menu-btn .icon-wrap{
            margin-left: 12px;
            margin-right: 6px;
            width: 34px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }

        .admin-menu-btn .icon-wrap img{
            height: 28px;
            width: 28px;
            object-fit: contain;
        }

        .admin-profilebar{
            height: var(--admin-top-h);
            background: var(--admin-blue);
            color: #fff;
            border-bottom-left-radius: 20px;
            border-bottom-right-radius: 20px;
            padding: 0 20px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .admin-profilebar .title{
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

    // 4. Determine Page Layout HTML
    let topBarHtml = '';
    if (isAdminProfile) {
        topBarHtml = `
            <div class="container-fluid admin-profilebar position-relative">
                <div class="d-flex align-items-center gap-2" style="z-index: 1;">
                    <a class="admin-close-btn" href="${backLink}" title="Back" aria-label="Back">
                        <span class="material-symbols-rounded" style="font-size: 26px;">arrow_back</span>
                    </a>
                    <div class="title">Profile</div>
                </div>
            </div>
        `;
    } else {
        const titleContent = showClose 
            ? `<a class="admin-close-btn" href="${backLink}" title="Back" aria-label="Back">
                   <span class="material-symbols-rounded" style="font-size: 26px;">arrow_back</span>
               </a>
               <div class="admin-title">${pageTitle}</div>`
            : `<img src="${depth}assets/images/topBarLogo.svg" alt="ByaHero" class="admin-logo" onerror="this.outerHTML='<h4 class=\\'text-white mb-0 fw-bold\\'>ByaHero</h4>'">`;

        const centerWordmark = isDashboard
            ? `<div class="position-absolute top-50 start-50 translate-middle" style="z-index: 0; pointer-events: none;">
                   <img src="${depth}assets/images/ByaHero.svg" alt="ByaHero" style="height: 35px; object-fit: contain;">
               </div>`
            : '';

        const hamburgerButton = isDashboard
            ? `<button type="button" class="admin-hamburger" data-bs-toggle="offcanvas" data-bs-target="#adminMenu" aria-controls="adminMenu" aria-label="Menu">
                   <img src="${depth}assets/images/HAMBURGER.svg" alt="Menu">
               </button>`
            : '';

        topBarHtml = `
            <div class="container-fluid admin-topbar position-relative">
                <div class="admin-left" style="z-index: 1;">
                    ${titleContent}
                </div>
                ${centerWordmark}
                <div style="z-index: 1;">
                    ${hamburgerButton}
                </div>
            </div>
        `;
    }

    let offcanvasHtml = '';
    if (isDashboard) {
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
            <div class="offcanvas offcanvas-end" tabindex="-1" id="adminMenu" aria-labelledby="adminMenuLabel" style="width: 85vw;">
                <div class="admin-menu-header">
                    <button type="button" class="admin-menu-close border-0 bg-transparent p-0" data-bs-dismiss="offcanvas" aria-label="Close">
                        <img src="${depth}assets/images/EKS.svg" alt="Close" style="width: 24px; height: 24px; display: block; filter: brightness(0) invert(1);" />
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

                    <div class="admin-menu-divider"></div>
                </div>

                <div class="offcanvas-body admin-menu-body">
                    <div class="d-grid gap-3">
                        <a href="${depth}admin/adminProfile.html" class="admin-menu-btn">
                            <div class="icon-wrap">
                                <img src="${depth}assets/images/person.svg" alt="Profile">
                            </div>
                            Profile
                        </a>

                        <a href="#" id="navbar-logout-btn" class="admin-menu-btn">
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

    // 5. Inject Topbar, Offcanvas Menu, and Bottom Strip
    let topContainer = document.getElementById('navbar-top-placeholder');
    if (!topContainer) {
        topContainer = document.createElement('div');
        topContainer.id = 'navbar-top-placeholder';
        topContainer.className = 'admin-topbar-wrap';
        body.insertBefore(topContainer, body.firstChild);
    }
    topContainer.innerHTML = topBarHtml;

    if (offcanvasHtml) {
        let menuContainer = document.getElementById('navbar-menu-placeholder');
        if (!menuContainer) {
            menuContainer = document.createElement('div');
            menuContainer.id = 'navbar-menu-placeholder';
            body.appendChild(menuContainer);
        }
        menuContainer.innerHTML = offcanvasHtml;
    }

    let bottomContainer = document.getElementById('navbar-bottom-placeholder');
    if (!bottomContainer) {
        bottomContainer = document.createElement('div');
        bottomContainer.id = 'navbar-bottom-placeholder';
        bottomContainer.className = 'admin-bottombar-wrap';
        bottomContainer.innerHTML = `<div class="admin-bottombar" style="height: ${isAdminProfile ? '30px' : '35px'};"></div>`;
        body.appendChild(bottomContainer);
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
                    } catch (err) {}
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
                } else if (fullPath.includes('/admin/')) {
                    relativeToWww = fullPath.substring(fullPath.indexOf('/admin/') + 1);
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

            // Append json=1 and email parameter on the fly for backend API redirection
            if (isTarget) {
                const separator = fetchUrl.includes('?') ? '&' : '?';
                if (!fetchUrl.includes('json=')) {
                    fetchUrl += separator + 'json=1';
                }
                if (cachedEmail && !fetchUrl.includes('email=')) {
                    const nextSep = fetchUrl.includes('?') ? '&' : '?';
                    fetchUrl += nextSep + 'email=' + encodeURIComponent(cachedEmail);
                }
            }
        }

        fetchOptions.credentials = 'include';
        return originalFetch(fetchUrl, fetchOptions);
    };

    window.APP_BASE_URL = depth.slice(0, -1) || '';
})();
