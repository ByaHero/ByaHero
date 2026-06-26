/**
 * manageWaitingPassengers.js
 * ──────────────────────────────────────────────────────────────────────────
 * Client-side waiting passenger filtering and auto-refresh countdown logic.
 * Extracted from public/admin/manageWaitingPassengers.php
 * ──────────────────────────────────────────────────────────────────────────
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Search & filter logic
    const locationSelect = document.getElementById('filterLocation');
    const passengerCards = document.querySelectorAll('.passenger-card');
    const noResultsDiv = document.getElementById('noResultsMessage');

    function filterPassengers() {
        if (!locationSelect) return;
        const selectedLocation = locationSelect.value;

        let visibleCount = 0;

        passengerCards.forEach(card => {
            const location = card.getAttribute('data-location');
            const matchesLocation = !selectedLocation || location === selectedLocation;

            if (matchesLocation) {
                card.classList.remove('d-none');
                visibleCount++;
            } else {
                card.classList.add('d-none');
            }
        });

        if (noResultsDiv) {
            if (visibleCount === 0 && passengerCards.length > 0) {
                noResultsDiv.classList.remove('d-none');
            } else {
                noResultsDiv.classList.add('d-none');
            }
        }
    }

    if (locationSelect) {
        locationSelect.addEventListener('change', filterPassengers);
    }

    // 2. Real-time auto-refresh countdown
    let countdown = 30;
    const maxCountdown = 30;
    const countdownText = document.getElementById('countdown-sec');
    const progressBar = document.getElementById('countdown-progress');
    const refreshBtn = document.getElementById('btn-manual-refresh');

    const refreshInterval = setInterval(() => {
        countdown--;
        if (countdownText) countdownText.textContent = String(countdown);
        if (progressBar) {
            const percent = ((maxCountdown - countdown) / maxCountdown) * 100;
            progressBar.style.width = percent + '%';
        }

        if (countdown <= 0) {
            clearInterval(refreshInterval);
            window.location.reload();
        }
    }, 1000);

    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            clearInterval(refreshInterval);
            window.location.reload();
        });
    }
});
