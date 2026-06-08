/**
 * manageConductors.js
 * ──────────────────────────────────────────────────────────────────────────
 * Client-side script for managing password visibility on Conductor/Staff screen.
 * Extracted from public/admin/manageConductors.php
 * ──────────────────────────────────────────────────────────────────────────
 */

document.addEventListener('DOMContentLoaded', function() {
    const pw = document.getElementById('pwField');
    const toggle = document.getElementById('togglePw');
    const eye = document.getElementById('eyeIcon');

    function syncIcon() {
        if (!pw || !eye || !toggle) return;
        if (pw.type === 'password') {
            eye.src = '../../assets/images/hash.svg';
            toggle.setAttribute('aria-pressed', 'false');
            toggle.setAttribute('title', 'Show password');
            toggle.setAttribute('aria-label', 'Show password');
        } else {
            eye.src = '../../assets/images/pass.svg';
            toggle.setAttribute('aria-pressed', 'true');
            toggle.setAttribute('title', 'Hide password');
            toggle.setAttribute('aria-label', 'Hide password');
        }
    }

    syncIcon();

    toggle?.addEventListener('click', () => {
        if (!pw) return;
        pw.type = (pw.type === 'password') ? 'text' : 'password';
        syncIcon();
        pw.focus();
        const val = pw.value;
        pw.value = '';
        pw.value = val;
    });
});
