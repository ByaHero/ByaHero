/**
 * www/js/login.js
 * Client-side authentication logic for ByaHero Offline Login View.
 */

// Automatically detect and set local developer backend URL if running under localhost/XAMPP
(function() {
    const loc = window.location;
    const isLocal = loc.hostname === 'localhost' || 
                    loc.hostname === '127.0.0.1' || 
                    loc.hostname.startsWith('192.168.') || 
                    loc.hostname.startsWith('10.') || 
                    loc.hostname.startsWith('172.') || 
                    loc.hostname.endsWith('.local');
    
    const isNative = window.Capacitor && (
        window.Capacitor.isNative || 
        (window.Capacitor.getPlatform && window.Capacitor.getPlatform() !== 'web') ||
        navigator.userAgent.includes('Capacitor') ||
        loc.href.includes('capacitor://')
    );

    const storedUrl = localStorage.getItem('byahero_server_url');
    const isAuto = localStorage.getItem('byahero_server_url_is_auto') === 'true';

    if (isLocal && !isNative) {
        if (!storedUrl || storedUrl === 'https://byahero.alwaysdata.net') {
            const match = loc.pathname.match(/\/[Bb]ya[Hh]ero/);
            const localUrl = loc.origin + (match ? match[0] : '');
            localStorage.setItem('byahero_server_url', localUrl);
            localStorage.setItem('byahero_server_url_is_auto', 'true');
        }
    } else {
        if (isAuto) {
            localStorage.removeItem('byahero_server_url');
            localStorage.removeItem('byahero_server_url_is_auto');
        }
    }
})();

document.addEventListener('DOMContentLoaded', () => {
    const pwd = document.getElementById('password');
    const toggle = document.getElementById('togglePwd');
    const eye = document.getElementById('eyeIcon');
    const form = document.getElementById('loginForm');
    const errorBlock = document.getElementById('errorBlock');

    // Password Toggle UI Logic (Exact same as PHP/original js)
    if (pwd && toggle && eye) {
        const syncIcon = () => {
            if (pwd.type === 'password') {
                eye.src = 'assets/images/hash.svg';
                toggle.setAttribute('aria-pressed', 'false');
                toggle.setAttribute('title', 'Show password');
                toggle.setAttribute('aria-label', 'Show password');
            } else {
                eye.src = 'assets/images/pass.svg';
                toggle.setAttribute('aria-pressed', 'true');
                toggle.setAttribute('title', 'Hide password');
                toggle.setAttribute('aria-label', 'Hide password');
            }
        };

        syncIcon();

        toggle.addEventListener('click', () => {
            pwd.type = pwd.type === 'password' ? 'text' : 'password';
            syncIcon();
            pwd.focus();

            const val = pwd.value;
            pwd.value = '';
            pwd.value = val;
        });
    }

    // Auto-login if offline and session exists
    if (navigator.onLine === false) {
        const cachedRole = localStorage.getItem('byahero_cached_role');
        const cachedEmail = localStorage.getItem('byahero_cached_email');
        if (cachedRole && cachedEmail) {
            console.log("Offline mode: Redirecting based on cached session", cachedRole);
            if (cachedRole === 'passenger') {
                window.location.replace("passenger/index.html");
            } else if (cachedRole === 'conductor') {
                window.location.replace("conductor/index.html");
            } else if (cachedRole === 'admin') {
                window.location.replace("admin/index.html");
            }
        }
    }

    // Form Submission
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorBlock.classList.add('d-none');
            errorBlock.textContent = '';

            const email = document.getElementById('email').value.trim();
            const password = pwd.value;

            if (!email || !password) {
                showError('Email/contact and password required.');
                return;
            }

            // If completely offline
            if (navigator.onLine === false) {
                const cachedEmail = localStorage.getItem('byahero_cached_email');
                const cachedRole = localStorage.getItem('byahero_cached_role');

                // Allow entering local offline modes if they previously logged in with this email
                if (cachedEmail && cachedEmail.toLowerCase() === email.toLowerCase()) {
                    if (cachedRole === 'passenger') {
                        window.location.replace("passenger/index.html");
                    } else if (cachedRole === 'conductor') {
                        window.location.replace("conductor/index.html");
                    } else if (cachedRole === 'admin') {
                        window.location.replace("admin/index.html");
                    } else {
                        window.location.replace("error.html");
                    }
                    return;
                } else {
                    showError('You are offline. To login for the first time, please connect to the internet.');
                    return;
                }
            }

            // Online flow - Authenticate against live server
            let SERVER_URL = localStorage.getItem('byahero_server_url');
            if (!SERVER_URL) {
                SERVER_URL = 'https://byahero.alwaysdata.net';
            }

            const formData = new FormData();
            formData.append('action', 'login');
            formData.append('email', email);
            formData.append('password', password);

            try {
                const response = await fetch(SERVER_URL + '/public/auth_api.php', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();

                if (data.success) {
                    // Cache session in LocalStorage
                    localStorage.setItem('byahero_cached_email', email);

                    // Deduce role from redirect path
                    let role = 'passenger';
                    if (data.redirect && data.redirect.includes('conductor')) {
                        role = 'conductor';
                    } else if (data.redirect && data.redirect.includes('driver')) {
                        role = 'driver';
                    } else if (data.redirect && data.redirect.includes('admin')) {
                        role = 'admin';
                    }

                    localStorage.setItem('byahero_cached_role', role);

                    // Cache user profile details
                    const contacts = data.user?.contacts || '';
                    localStorage.setItem('byahero_cached_contacts', contacts);
                    localStorage.setItem('byahero_cached_phone', contacts);
                    localStorage.setItem('byahero_cached_name', data.user?.name || email.split('@')[0]);
                    const pic = data.user?.profile_picture;
                    if (pic && pic !== 'null' && pic !== 'undefined') {
                        localStorage.setItem('byahero_cached_profile_picture', pic);
                    } else {
                        localStorage.removeItem('byahero_cached_profile_picture');
                    }

                    // Always route to local static files to support offline-first operation
                    if (role === 'passenger') {
                        if (!contacts) {
                            window.location.replace("passenger/completeProfile.html");
                        } else {
                            window.location.replace("passenger/index.html");
                        }
                    } else if (role === 'conductor') {
                        window.location.replace("conductor/index.html");
                    } else if (role === 'admin') {
                        window.location.replace("admin/index.html");
                    } else {
                        window.location.replace("passenger/index.html");
                    }
                } else {
                    showError(data.message || 'Invalid email or password.');
                }
            } catch (err) {
                console.error(err);
                if (SERVER_URL === 'https://byahero.alwaysdata.net') {
                    showError('Network error connecting to the server. Please check your connection, or tap the ByaHero logo 5 times to configure your local developer server URL.');
                } else {
                    showError(`Network error connecting to ${SERVER_URL}. Please ensure your local server (Apache) is running and accessible. Tap the ByaHero logo 5 times to reconfigure.`);
                }
            }
        });
    }

    function showError(msg) {
        if (errorBlock) {
            errorBlock.textContent = msg;
            errorBlock.classList.remove('d-none');
        }
    }

    // Developer Shortcut: Tap logo 5 times to configure custom backend server URL (for localhost / emulator debugging)
    const logo = document.querySelector('.brand-logo');
    if (logo) {
        let clickCount = 0;
        let lastClick = 0;
        logo.style.cursor = 'pointer';
        logo.addEventListener('click', () => {
            const now = Date.now();
            if (now - lastClick > 1500) {
                clickCount = 0;
            }
            clickCount++;
            lastClick = now;
            if (clickCount === 5) {
                clickCount = 0;
                const currentUrl = localStorage.getItem('byahero_server_url') || 'https://byahero.alwaysdata.net';
                const newUrl = prompt(
                    "ByaHero Developer Settings\n\nEnter Backend Base URL (e.g. http://10.0.2.2/ByaHero or http://192.168.18.77/ByaHero):",
                    currentUrl
                );
                if (newUrl !== null) {
                    const trimmed = newUrl.trim().replace(/\/$/, ""); // trim and strip trailing slash
                    if (trimmed === '' || trimmed === 'https://byahero.alwaysdata.net') {
                        localStorage.removeItem('byahero_server_url');
                        localStorage.removeItem('byahero_server_url_is_auto');
                        alert("Restored default server: https://byahero.alwaysdata.net");
                    } else {
                        localStorage.setItem('byahero_server_url', trimmed);
                        localStorage.removeItem('byahero_server_url_is_auto');
                        alert("Server URL set to: " + trimmed);
                    }
                    window.location.reload();
                }
            }
        });
    }

    // Polling watch for Capacitor loading Native SDK
    let attempts = 0;
    const pollTimer = setInterval(() => {
        if (initNativeCapacitorGoogleAuth() || attempts > 300) {
            clearInterval(pollTimer);
        }
        attempts++;
    }, 100);
});

/**
 * Capacitor plugin check & Native Google Login initialization.
 */
function initNativeCapacitorGoogleAuth() {
    if (!window.Capacitor) return false;
    
    const isNative = window.Capacitor.isNative || 
                    (window.Capacitor.getPlatform && window.Capacitor.getPlatform() !== 'web') ||
                    navigator.userAgent.includes('Capacitor') ||
                    window.location.href.includes('capacitor://');
                    
    if (isNative) {
        const webContainer = document.getElementById('gsi-web-container');
        const nativeContainer = document.getElementById('gsi-native-container');
        
        if (webContainer) webContainer.style.display = 'none';
        if (nativeContainer) {
            nativeContainer.style.setProperty('display', 'flex', 'important');
            nativeContainer.style.opacity = '1';
            nativeContainer.style.visibility = 'visible';
        }
        
        if (window.Capacitor.Plugins && window.Capacitor.Plugins.GoogleAuth) {
            try {
                window.Capacitor.Plugins.GoogleAuth.initialize({
                    clientId: '299495970056-35hqu1hnl0ugisp6270he24qugv24skl.apps.googleusercontent.com',
                    scopes: ['profile', 'email'],
                    grantOfflineAccess: true,
                });
            } catch (e) {
                console.warn('GoogleAuth initialize issue:', e);
            }
        }
        
        const nativeBtn = document.getElementById('native-google-btn');
        if (nativeBtn) {
            nativeBtn.addEventListener('click', async () => {
                if (!window.Capacitor.Plugins || !window.Capacitor.Plugins.GoogleAuth) {
                    alert('Google Auth plugin not loaded properly.');
                    return;
                }
                try {
                    const googleUser = await window.Capacitor.Plugins.GoogleAuth.signIn();
                    if (googleUser && googleUser.authentication && googleUser.authentication.idToken) {
                        handleGoogleLogin({ credential: googleUser.authentication.idToken });
                    } else {
                        alert('Google login failed: Could not retrieve ID token.');
                    }
                } catch (error) {
                    console.error('Native Google Sign-In error:', error);
                    alert(`Google Sign-In Error: ${error.message || JSON.stringify(error)}`);
                }
            });
        }
        return true;
    }
    return true;
}

// Google Login Handler
window.handleGoogleLogin = function (response) {
    if (navigator.onLine === false) {
        alert("Google sign-in requires an internet connection.");
        return;
    }

    const SERVER_URL = localStorage.getItem('byahero_server_url') || 'https://byahero.alwaysdata.net';
    const credential = response.credential;
    const formData = new FormData();
    formData.append('action', 'google_auth');
    formData.append('credential', credential);

    fetch(SERVER_URL + '/public/auth_api.php', {
        method: 'POST',
        body: formData
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                localStorage.setItem('byahero_cached_role', 'passenger');
                
                // Cache user profile details
                const email = data.user?.email || 'Guest';
                const contacts = data.user?.contacts || '';
                localStorage.setItem('byahero_cached_email', email);
                localStorage.setItem('byahero_cached_contacts', contacts);
                localStorage.setItem('byahero_cached_phone', contacts);
                localStorage.setItem('byahero_cached_name', data.user?.name || email.split('@')[0]);
                const pic = data.user?.profile_picture;
                if (pic && pic !== 'null' && pic !== 'undefined') {
                    localStorage.setItem('byahero_cached_profile_picture', pic);
                } else {
                    localStorage.removeItem('byahero_cached_profile_picture');
                }

                if (!contacts) {
                    window.location.replace("passenger/completeProfile.html");
                } else {
                    window.location.replace("passenger/index.html");
                }
            } else {
                alert(`Google login failed: ${data.message}`);
            }
        })
        .catch(err => {
            console.error(err);
            alert('An error occurred during Google sign in.');
        });
};
