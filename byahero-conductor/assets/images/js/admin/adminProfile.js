/**
 * adminProfile.js
 * ──────────────────────────────────────────────────────────────────────────
 * Client-side modal and password visibility controls for Admin Profile.
 * Extracted from public/admin/adminProfile.php
 * ──────────────────────────────────────────────────────────────────────────
 */

function openEmailModal() {
    document.getElementById('emailModal').style.display = 'flex';
}

function closeEmailModal() {
    document.getElementById('emailModal').style.display = 'none';
}

function openPasswordModal() {
    document.getElementById('passwordModal').style.display = 'flex';
}

function closePasswordModal() {
    document.getElementById('passwordModal').style.display = 'none';
}

// Toggle bar logic (show.png / shownot.svg)
document.querySelectorAll('.pw-eye').forEach((btn) => {
    btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-target');
        const input = id ? document.getElementById(id) : null;
        if (!input) return;

        const isPw = input.type === 'password';
        input.type = isPw ? 'text' : 'password';

        const config = window.BYAHERO_PROFILE_CONFIG || {};
        btn.innerHTML = isPw
            ? `<img src="${config.iconHide}" alt="Hide">`
            : `<img src="${config.iconShow}" alt="Show">`;
    });
});
