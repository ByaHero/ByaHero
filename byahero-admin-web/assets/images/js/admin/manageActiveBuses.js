/**
 * manageActiveBuses.js
 * ──────────────────────────────────────────────────────────────────────────
 * Client-side auto-refresh logic for Active Buses.
 * Extracted and corrected from public/admin/manageActiveBuses.php
 * ──────────────────────────────────────────────────────────────────────────
 */

// Auto-refresh the bus list every 5 seconds without full page reload
function _autoRefreshTick() {
    (async () => {
        try {
            const res = await fetch(window.location.href);
            const html = await res.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const newList = doc.getElementById('bus-list-container');
            const currentList = document.getElementById('bus-list-container');
            if (newList && currentList) {
                currentList.innerHTML = newList.innerHTML;
            }
        } catch (e) {
            console.error('Failed to auto-refresh active buses', e);
        }
    })().finally(() => {
        setTimeout(_autoRefreshTick, 5000);
    });
}

_autoRefreshTick();
