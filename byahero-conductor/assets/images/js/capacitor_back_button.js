/**
 * capacitor_back_button.js
 * 
 * Smart Android hardware back-button handling for ByaHero Capacitor app.
 * 
 * Priority order:
 *   1. Close any open Bootstrap offcanvas / modal
 *   2. Collapse the bottom sheet (if expanded)
 *   3. If on a sub-page, navigate back (using the topbar back-link or history)
 *   4. If on a root page (dashboard / login), double-tap to exit
 */
(function () {
  'use strict';

  // Only run inside Capacitor shell
  if (!window.Capacitor || !window.Capacitor.Plugins || !window.Capacitor.Plugins.App) {
    return;
  }

  var App = window.Capacitor.Plugins.App;

  // ---- Double-tap-to-exit state ----
  var lastBackPress = 0;
  var EXIT_DELAY = 2500; // ms window for second tap
  var exitToast = null;

  // ---- Helpers ----

  /** Try to close any visible Bootstrap 5 offcanvas. Returns true if one was closed. */
  function closeOffcanvas() {
    var openCanvas = document.querySelector('.offcanvas.show');
    if (openCanvas) {
      var instance = bootstrap.Offcanvas.getInstance(openCanvas);
      if (instance) { instance.hide(); return true; }
    }
    return false;
  }

  /** Try to close any visible Bootstrap 5 modal. Returns true if one was closed. */
  function closeModal() {
    var openModal = document.querySelector('.modal.show');
    if (openModal) {
      var instance = bootstrap.Modal.getInstance(openModal);
      if (instance) { instance.hide(); return true; }
    }
    return false;
  }

  /** Try to collapse the bottom sheet if it's in an expanded state.
   *  The passenger bottom sheet uses snap heights managed by passengerBottomSheet.js:
   *  85% = expanded, 35% = mid, 15% = collapsed (peek). */
  function collapseBottomSheet() {
    var sheet = document.getElementById('bottomSheet') ||
                document.querySelector('.bottom-sheet') ||
                document.querySelector('.passenger-bottom-sheet');
    if (!sheet) return false;

    // Get the current height as a fraction of the viewport
    var sheetHeight = sheet.clientHeight;
    var viewportHeight = window.innerHeight;
    var heightPercent = (sheetHeight / viewportHeight) * 100;

    // If the sheet is above the collapsed/peek threshold (~20%), collapse it
    if (heightPercent > 20) {
      sheet.classList.add('sheet-transition');
      sheet.style.height = '15%'; // snap to collapsed/peek state
      return true;
    }
    return false;
  }

  /** Determine if the current page is a "root" page where back should exit. */
  function isRootPage() {
    var path = window.location.pathname.toLowerCase();
    // Main dashboards or login — these are the app's entry points
    var rootPatterns = [
      '/passenger/index.php',
      '/passenger/index.html',
      '/passenger/',
      '/conductor/conductor.php',
      '/conductor/index.html',
      '/conductor/conductorlive.php',
      '/admin/admin.php',
      '/admin/index.html',
      '/login.php',
      '/login.html',
      '/signup.php',
      '/signup.html',
      '/signup.html'
    ];
    for (var i = 0; i < rootPatterns.length; i++) {
      if (path.endsWith(rootPatterns[i])) return true;
    }
    // Also check if it ends with just the path base
    if (path.endsWith('/passenger') || path.endsWith('/passenger/') ||
        path.endsWith('/conductor') || path.endsWith('/conductor/') ||
        path.endsWith('/admin') || path.endsWith('/admin/')) return true;
    return false;
  }

  /** Find the topbar back-link (the arrow_back anchor rendered by navbarPassenger.php). */
  function getTopbarBackLink() {
    // The navbar renders an <a> with an arrow_back icon; grab the first one
    var arrows = document.querySelectorAll('.passenger-topbar-sticky a');
    for (var i = 0; i < arrows.length; i++) {
      var icon = arrows[i].querySelector('.material-symbols-rounded');
      if (icon && (icon.textContent.trim() === 'arrow_back' || icon.textContent.trim() === 'close')) {
        return arrows[i].getAttribute('href');
      }
    }
    return null;
  }

  /** Show a small toast telling the user to press back again to exit. */
  function showExitToast() {
    if (exitToast && exitToast.parentElement) exitToast.remove();

    exitToast = document.createElement('div');
    exitToast.textContent = 'Press back again to exit';
    exitToast.style.cssText =
      'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);' +
      'background:rgba(0,0,0,0.78);color:#fff;padding:10px 22px;border-radius:24px;' +
      'font-size:14px;font-weight:600;z-index:99999;pointer-events:none;' +
      'animation:byaheroFadeIn .25s ease;white-space:nowrap;';
    document.body.appendChild(exitToast);

    setTimeout(function () {
      if (exitToast && exitToast.parentElement) {
        exitToast.style.opacity = '0';
        exitToast.style.transition = 'opacity .3s ease';
        setTimeout(function () {
          if (exitToast && exitToast.parentElement) exitToast.remove();
          exitToast = null;
        }, 300);
      }
    }, 2000);
  }

  // Inject the tiny fade-in keyframe if not already present
  if (!document.getElementById('byaheroBackBtnStyles')) {
    var style = document.createElement('style');
    style.id = 'byaheroBackBtnStyles';
    style.textContent = '@keyframes byaheroFadeIn{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}';
    document.head.appendChild(style);
  }

  // ---- Main listener ----
  App.addListener('backButton', function (data) {
    // 1. Close offcanvas (hamburger menu, etc.)
    if (closeOffcanvas()) return;

    // 2. Close any open modal
    if (closeModal()) return;

    // 3. Collapse expanded bottom sheet
    if (collapseBottomSheet()) return;

    // 4. If on a sub-page, navigate back
    if (!isRootPage()) {
      var backHref = getTopbarBackLink();
      if (backHref) {
        window.location.href = backHref;
        return;
      }
      // Fallback to browser history if available
      if (window.history.length > 1) {
        window.history.back();
        return;
      }
    }

    // 5. Root page: double-tap to exit
    var now = Date.now();
    if (now - lastBackPress < EXIT_DELAY) {
      App.exitApp();
    } else {
      lastBackPress = now;
      showExitToast();
    }
  });
})();
