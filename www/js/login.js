/**
 * www/js/login.js
 * Client-side authentication logic for ByaHero Offline Login View.
 */

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
            const SERVER_URL = localStorage.getItem('byahero_server_url') || 'https://byahero.app';
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

                    // Redirect to local app assets instead of remote server
                    if (role === 'passenger') {
                        window.location.replace("passenger/index.html");
                    } else if (role === 'conductor') {
                        window.location.replace("conductor/index.html");
                    } else {
                        window.location.replace("passenger/index.html");
                    }
                } else {
                    showError(data.message || 'Invalid email or password.');
                }
            } catch (err) {
                console.error(err);
                showError('Network error connecting to the server. Please try again.');
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
                const currentUrl = localStorage.getItem('byahero_server_url') || 'https://byahero.app';
                const newUrl = prompt(
                    "ByaHero Developer Settings\n\nEnter Backend Base URL (e.g. http://10.0.2.2/ByaHero or http://192.168.18.77/ByaHero):",
                    currentUrl
                );
                if (newUrl !== null) {
                    const trimmed = newUrl.trim().replace(/\/$/, ""); // trim and strip trailing slash
                    if (trimmed === '' || trimmed === 'https://byahero.app') {
                        localStorage.removeItem('byahero_server_url');
                        alert("Restored default server: https://byahero.app");
                    } else {
                        localStorage.setItem('byahero_server_url', trimmed);
                        alert("Server URL set to: " + trimmed);
                    }
                    window.location.reload();
                }
            }
        });
    }
});

// Google Login Handler
window.handleGoogleLogin = function (response) {
    if (navigator.onLine === false) {
        alert("Google sign-in requires an internet connection.");
        return;
    }

    const SERVER_URL = localStorage.getItem('byahero_server_url') || 'https://byahero.app';
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
                window.location.replace("passenger/index.html");
            } else {
                alert(`Google login failed: ${data.message}`);
            }
        })
        .catch(err => {
            console.error(err);
            alert('An error occurred during Google sign in.');
        });
};
