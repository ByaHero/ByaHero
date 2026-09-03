/**
 * main.js - Core application entry point
 * Initializes animations, feature walkthroughs, and release download links
 */
document.addEventListener('DOMContentLoaded', () => {
    if (typeof initAnimations === 'function') {
        initAnimations();
    }

    if (typeof initWalkthroughs === 'function') {
        initWalkthroughs();
    }

    if (typeof resolveLatestApkDownloadLink === 'function') {
        resolveLatestApkDownloadLink();
    }
});
