/**
 * busFare.js
 * ──────────────────────────────────────────────────────────────────────────
 * Client-side calculations and matrix generator controls for Bus Fares.
 * Extracted and corrected from public/admin/busFare.php
 * ──────────────────────────────────────────────────────────────────────────
 */

document.addEventListener('DOMContentLoaded', function() {
    // 1. Matrix Generator Auto-Calculation
    const regBase = document.querySelector('input[name="reg_base"]');
    const discBase = document.querySelector('input[name="disc_base"]');
    const regRate = document.querySelector('input[name="reg_rate"]');
    const discRate = document.querySelector('input[name="disc_rate"]');

    function extractNumber(val) {
        // Remove anything that isn't a digit or a period
        let clean = val.replace(/[^0-9.]/g, '');
        return parseFloat(clean);
    }

    if (regBase && discBase) {
        regBase.addEventListener('input', function() {
            let val = extractNumber(this.value);
            if (!isNaN(val)) {
                discBase.value = (val * 0.8).toFixed(2);
            } else {
                discBase.value = '';
            }
        });
    }

    if (regRate && discRate) {
        regRate.addEventListener('input', function() {
            let val = extractNumber(this.value);
            if (!isNaN(val)) {
                discRate.value = (val * 0.8).toFixed(2);
            } else {
                discRate.value = '';
            }
        });
    }

    // Automatically calculate discounted fare when regular fare is changed in the table
    const tableRegInputs = document.querySelectorAll('input[name^="regular_fare["]');
    tableRegInputs.forEach(function(input) {
        input.addEventListener('input', function() {
            let val = extractNumber(this.value);
            // Find the corresponding discounted_fare input in the same row
            const row = this.closest('tr');
            const discInput = row.querySelector('input[name^="discounted_fare["]');
            
            if (discInput) {
                if (!isNaN(val)) {
                    discInput.value = (val * 0.8).toFixed(2);
                } else {
                    discInput.value = '';
                }
            }
        });
    });
});
