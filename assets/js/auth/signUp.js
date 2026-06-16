/**
 * signUp.js
 * ──────────────────────────────────────────────────────────────────────────
 * Registration client logic for ByaHero Sign Up Screen.
 * Handles phone format checks, pass matching, OTP requests, Capacitor and Google.
 * ──────────────────────────────────────────────────────────────────────────
 */

/**
 * Transitions between multi-step signup containers.
 */
function showStep(num) {
    document.querySelectorAll('.signup-step').forEach(s => s.style.display = 'none');
    const targetStep = document.getElementById(`step-${num}`);
    if (targetStep) targetStep.style.display = 'block';
}

/**
 * Toggles visibility of input field values between password and text.
 */
function togglePass(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    if (input && icon) {
        if (input.type === 'password') {
            input.type = 'text';
            icon.src = '../assets/images/pass.svg';
        } else {
            input.type = 'password';
            icon.src = '../assets/images/hash.svg';
        }
        input.focus();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // STEP 1: Request OTP
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async e => {
            e.preventDefault();
            const form = e.target;
            const btn = form.querySelector('button[type="submit"]');
            const alertBox = document.getElementById('signupAlert');
            const originalText = btn.innerHTML;

            // Clear validation indicators
            form.querySelectorAll('.form-control').forEach(el => el.classList.remove('is-invalid'));
            if (alertBox) alertBox.innerHTML = '';

            let hasError = false;

            // Email check
            const emailInput = document.getElementById('signupEmail');
            if (!emailInput.value.trim() || !emailInput.checkValidity()) {
                emailInput.classList.add('is-invalid');
                hasError = true;
            }

            // Contact check
            const contactInput = document.getElementById('contactsInput');
            const contactVal = contactInput.value.trim();
            if (!/^(09|639)\d{9}$/.test(contactVal)) {
                contactInput.classList.add('is-invalid');
                hasError = true;
            }

            // Password size check
            const passInput = document.getElementById('passInput');
            if (passInput.value.length < 6) {
                passInput.classList.add('is-invalid');
                hasError = true;
            }

            // Confirmed matching check
            const confirmInput = document.getElementById('confirmInput');
            if (passInput.value !== confirmInput.value) {
                confirmInput.classList.add('is-invalid');
                hasError = true;
            }

            if (hasError) return;

            btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
            btn.disabled = true;

            try {
                const fd = new FormData(form);
                const res = await fetch('auth_api.php', { method: 'POST', body: fd });
                const data = await res.json();

                if (data.success) {
                    const otpEmailEl = document.getElementById('otpEmail');
                    if (otpEmailEl) otpEmailEl.textContent = emailInput.value;

                    const devOtpAlert = document.getElementById('devOtpAlert');
                    const devOtpCode = document.getElementById('devOtpCode');
                    if (data.dev_otp) {
                        if (devOtpCode) devOtpCode.textContent = data.dev_otp;
                        if (devOtpAlert) devOtpAlert.style.display = 'block';
                    } else {
                        if (devOtpAlert) devOtpAlert.style.display = 'none';
                    }
                    showStep(2);
                } else {
                    throw new Error(data.message || 'Signup failed');
                }
            } catch (err) {
                if (alertBox) alertBox.innerHTML = `<div class="alert alert-danger alert-small">${err.message}</div>`;
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }

    // STEP 2: Verify OTP
    const otpForm = document.getElementById('otpForm');
    if (otpForm) {
        otpForm.addEventListener('submit', async e => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            const alertBox = document.getElementById('otpAlert');
            const originalText = btn.innerHTML;

            btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
            btn.disabled = true;
            if (alertBox) alertBox.innerHTML = '';

            try {
                const emailInput = document.getElementById('signupEmail');
                const otpInput = document.getElementById('otpInput');
                
                const formData = new FormData();
                formData.append('action', 'signup_verify_otp');
                formData.append('email', emailInput ? emailInput.value : '');
                formData.append('otp', otpInput ? otpInput.value : '');

                const res = await fetch('auth_api.php', { method: 'POST', body: formData });
                const data = await res.json();

                if (data.success) {
                    if (alertBox) alertBox.innerHTML = '<div class="alert alert-success alert-small">Success! Redirecting...</div>';
                    setTimeout(() => {
                        let redirectUrl = data.redirect || 'passenger/showGuide/showGuide.php';
                        if (window.Capacitor) {
                            redirectUrl = redirectUrl.replace('.php', '.html');
                        }
                        window.location.href = redirectUrl;
                    }, 1000);
                } else {
                    throw new Error(data.message || 'Verification failed');
                }
            } catch (err) {
                if (alertBox) alertBox.innerHTML = `<div class="alert alert-danger alert-small">${err.message}</div>`;
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }

    // Capacitor Native auth initializers
    let attempts = 0;
    const pollTimer = setInterval(() => {
        if (initNativeCapacitorGoogleAuth() || attempts > 300) {
            clearInterval(pollTimer);
        }
        attempts++;
    }, 100);
});

/**
 * Google Sign-In Callback Handler
 */
function handleGoogleLogin(response) {
    const credential = response.credential;
    const formData = new FormData();
    formData.append('action', 'google_auth');
    formData.append('credential', credential);
    
    fetch('auth_api.php', { method: 'POST', body: formData })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            let redirectUrl = data.redirect || 'passenger/index.php';
            if (window.Capacitor) {
                redirectUrl = redirectUrl.replace('.php', '.html');
            }
            window.location.href = redirectUrl;
        } else {
            const signupAlert = document.getElementById('signupAlert');
            if (signupAlert) {
                signupAlert.innerHTML = `<div class="alert alert-danger alert-small">Google error: ${data.message}</div>`;
            }
        }
    })
    .catch(err => {
        console.error(err);
        const signupAlert = document.getElementById('signupAlert');
        if (signupAlert) {
            signupAlert.innerHTML = `<div class="alert alert-danger alert-small">Server error.</div>`;
        }
    });
}

/**
 * Capacitor plugin checks & Native Google Login initialization.
 */
function initNativeCapacitorGoogleAuth() {
    if (!window.Capacitor) return false;
    
    const isNative = window.Capacitor.isNative || 
                    (window.Capacitor.getPlatform && window.Capacitor.getPlatform() !== 'web');
                    
    if (isNative) {
        const webContainer = document.getElementById('gsi-web-container');
        const nativeContainer = document.getElementById('gsi-native-container');
        
        if (webContainer) webContainer.style.display = 'none';
        if (nativeContainer) {
            nativeContainer.style.setProperty('display', 'flex', 'important');
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
                try {
                    const googleUser = await window.Capacitor.Plugins.GoogleAuth.signIn();
                    if (googleUser?.authentication?.idToken) {
                        handleGoogleLogin({ credential: googleUser.authentication.idToken });
                    }
                } catch (error) {
                    console.error('Native Google error:', error);
                }
            });
        }
        return true;
    }
    return true;
}
