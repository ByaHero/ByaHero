/**
 * manageLostAndFound.js
 * ──────────────────────────────────────────────────────────────────────────
 * Client-side script for previewing lost and found image attachments.
 * Extracted from public/admin/manageLostAndFound.php
 * ──────────────────────────────────────────────────────────────────────────
 */

function openImageModal(imgSrc) {
    const display = document.getElementById('modalImageDisplay');
    const modalEl = document.getElementById('imageModal');
    if (!display || !modalEl) return;
    
    display.src = imgSrc;
    const imageModal = new bootstrap.Modal(modalEl);
    imageModal.show();
}
