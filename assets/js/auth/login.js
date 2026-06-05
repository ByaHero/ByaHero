/**
 * login.js
 * ──────────────────────────────────────────────────────────────────────────
 * Authentication client logic for ByaHero Login Screen.
 * Handles password visibility, Google Web/Native Login integration.
 * ──────────────────────────────────────────────────────────────────────────
 */

document.addEventListener('DOMContentLoaded', () => {
    const pwd = document.getElementById('password');
    const toggle = document.getElementById('togglePwd');
    const eye = document.getElementById('eyeIcon');

    if (pwd && toggle && eye) {
        const syncIcon = () => {
            if (pwd.type === 'password') {
                eye.textContent = 'visibility_off';
                toggle.setAttribute('aria-pressed', 'false');
                toggle.setAttribute('title', 'Show password');
                toggle.setAttribute('aria-label', 'Show password');
            } else {
                eye.textContent = 'visibility';
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
            
            // Retain cursor position at the end of input
            const val = pwd.value;
            pwd.value = '';
            pwd.value = val;
        });
    }

    // Polling watch for Capacitor loading Native SDK
    let attempts = 0;
    const pollTimer = setInterval(() => {
        if (initNativeCapacitorGoogleAuth() || attempts > 20) {
            clearInterval(pollTimer);
        }
        attempts++;
    }, 100);
});

/**
 * Google Sign-In standard web client flow.
 */
function handleGoogleLogin(response) {
    const credential = response.credential;
    const redirectInput = document.querySelector('input[name="redirect"]');
    const redirectUrl = redirectInput ? redirectInput.value : '';

    const formData = new FormData();
    formData.append('action', 'google_auth');
    formData.append('credential', credential);
    formData.append('redirect', redirectUrl);

    fetch('auth_api.php', {
        method: 'POST',
        body: formData
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            window.location.href = data.redirect || redirectUrl;
        } else {
            alert(`Google login failed: ${data.message}`);
        }
    })
    .catch(err => {
        console.error(err);
        alert('An error occurred during Google sign in.');
    });
}

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
