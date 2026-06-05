/**
 * forgotPassword.js
 * ──────────────────────────────────────────────────────────────────────────
 * Password recovery client logic for ByaHero Forgot Password Screen.
 * Handles timers, AJAX OTP generation, verification, and reset calls.
 * ──────────────────────────────────────────────────────────────────────────
 */

let userEmail = '';
let timerInterval = null;

/**
 * Transitions between password recovery steps.
 */
function showStep(stepId) {
    document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
    const target = document.getElementById(stepId);
    if (target) target.classList.add('active');
}

/**
 * Displays error messages on specific forms.
 */
function showError(num, msg) {
    const el = document.getElementById(`err-${num}`);
    if (el) {
        el.textContent = msg;
        el.classList.remove('d-none');
    }
}

/**
 * Hides displayed error messages.
 */
function hideError(num) {
    const el = document.getElementById(`err-${num}`);
    if (el) el.classList.add('d-none');
}

/**
 * Sets submit button loading indicator state.
 */
function setButtonLoading(btnId, isLoading, text) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    if (isLoading) {
        btn.disabled = true;
        btn.textContent = 'Please wait...';
    } else {
        btn.disabled = false;
        btn.textContent = text;
    }
}

/**
 * Starts 15 minutes expiration countdown timer.
 */
function startTimer() {
    let timeLeft = 900; // 15 mins
    const timerEl = document.getElementById('timer');
    
    if (timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        timeLeft--;
        if (timeLeft < 0) {
            clearInterval(timerInterval);
            if (timerEl) timerEl.textContent = "00:00 - Expired";
            return;
        }
        const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
        const s = (timeLeft % 60).toString().padStart(2, '0');
        if (timerEl) timerEl.textContent = `${m}:${s}`;
    }, 1000);
}

document.addEventListener('DOMContentLoaded', () => {
    // STEP 1: Request OTP
    const form1 = document.getElementById('form-1');
    if (form1) {
        form1.addEventListener('submit', async e => {
            e.preventDefault();
            hideError(1);
            
            const emailInput = document.getElementById('email-input');
            const email = emailInput ? emailInput.value.trim() : '';
            if (!email) return;

            setButtonLoading('btn-1', true, 'Send Recovery Code');

            try {
                const fd = new FormData();
                fd.append('action', 'request_otp');
                fd.append('email', email);

                const res = await fetch('auth_api.php', { method: 'POST', body: fd, credentials: 'same-origin' });
                const data = await res.json();

                if (data.success) {
                    userEmail = email;
                    const displayEmail = document.getElementById('display-email');
                    if (displayEmail) displayEmail.textContent = email;
                    
                    const devOtpBox = document.getElementById('dev-otp-display');
                    const devOtpCode = document.getElementById('dev-otp-code');
                    if (data.dev_otp) {
                        if (devOtpCode) devOtpCode.textContent = data.dev_otp;
                        if (devOtpBox) devOtpBox.style.display = 'block';
                    } else {
                        if (devOtpBox) devOtpBox.style.display = 'none';
                    }
                    
                    showStep('step-2');
                    startTimer();
                } else {
                    showError(1, data.message || 'Failed to request OTP');
                }
            } catch (err) {
                showError(1, 'Network error. Please try again.');
            } finally {
                setButtonLoading('btn-1', false, 'Send Recovery Code');
            }
        });
    }

    // STEP 2: Verify OTP
    const form2 = document.getElementById('form-2');
    if (form2) {
        form2.addEventListener('submit', async e => {
            e.preventDefault();
            hideError(2);
            
            const otpInput = document.getElementById('otp-input');
            const otp = otpInput ? otpInput.value.trim() : '';
            if (!otp) return;

            setButtonLoading('btn-2', true, 'Verify Code');

            try {
                const fd = new FormData();
                fd.append('action', 'verify_otp');
                fd.append('email', userEmail);
                fd.append('otp', otp);

                const res = await fetch('auth_api.php', { method: 'POST', body: fd, credentials: 'same-origin' });
                const data = await res.json();

                if (data.success) {
                    if (timerInterval) clearInterval(timerInterval);
                    showStep('step-3');
                } else {
                    showError(2, data.message || 'Invalid code');
                }
            } catch (err) {
                showError(2, 'Network error. Please try again.');
            } finally {
                setButtonLoading('btn-2', false, 'Verify Code');
            }
        });
    }

    // STEP 3: Reset Password
    const form3 = document.getElementById('form-3');
    if (form3) {
        form3.addEventListener('submit', async e => {
            e.preventDefault();
            hideError(3);
            
            const newPasswordEl = document.getElementById('new-password');
            const confirmPasswordEl = document.getElementById('confirm-password');
            const otpInput = document.getElementById('otp-input');

            const password = newPasswordEl ? newPasswordEl.value : '';
            const confirm = confirmPasswordEl ? confirmPasswordEl.value : '';
            const otp = otpInput ? otpInput.value.trim() : '';

            if (password.length < 6) {
                showError(3, 'Password must be at least 6 characters');
                return;
            }
            if (password !== confirm) {
                showError(3, 'Passwords do not match');
                return;
            }

            setButtonLoading('btn-3', true, 'Reset Password');

            try {
                const fd = new FormData();
                fd.append('action', 'reset_password');
                fd.append('email', userEmail);
                fd.append('otp', otp);
                fd.append('new_password', password);

                const res = await fetch('auth_api.php', { method: 'POST', body: fd, credentials: 'same-origin' });
                const data = await res.json();

                if (data.success) {
                    showStep('step-4');
                } else {
                    showError(3, data.message || 'Failed to reset password');
                }
            } catch (err) {
                showError(3, 'Network error. Please try again.');
            } finally {
                setButtonLoading('btn-3', false, 'Reset Password');
            }
        });
    }
});
