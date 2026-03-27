/**
 * passengerBottomSheet.js
 * ──────────────────────────────────────────────────────────────────────────
 * All bottom-sheet logic lives here.
 * Merged from: passengerBottomSheet.js + public/passenger/index.php
 *
 * Load order in index.php (after Leaflet + Bootstrap):
 *   <script src="../../assets/js/passengerBottomSheet.js?v=2"></script>
 *
 * APP_BASE_URL and PROJECT_BASE must be set on window BEFORE this script
 * runs, OR this file will detect them automatically using the same logic
 * that was previously inline in index.php.
 * ──────────────────────────────────────────────────────────────────────────
 */

// ---------------------------------------------------------------------------
// 0. BASE-URL DETECTION
//    Mirrors the inline snippet in index.php so icon paths always resolve
//    correctly on both localhost (/Byahero-Prototype-v3/...) and InfinityFree
//    (root /...).  If index.php already sets window.APP_BASE_URL we skip this.
// ---------------------------------------------------------------------------
(function detectBase() {
  if (window.APP_BASE_URL !== undefined) return; // already set by PHP/inline JS

  var PROJECT_FOLDER = 'Byahero-Prototype-v3';
  var path = window.location.pathname || '/';
  var base = path.toLowerCase().startsWith('/' + PROJECT_FOLDER.toLowerCase() + '/')
    ? '/' + PROJECT_FOLDER
    : '';

  window.PROJECT_BASE   = base;
  window.APP_BASE_URL   = base;          // alias used by icon-swap code below
  window.ICON_BASE      = base + '/assets/images/icons';
})();


// ---------------------------------------------------------------------------
// 1. BOTTOM SHEET – SWIPE / DRAG LOGIC
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function () {
  var sheet  = document.getElementById('bottomSheet');
  var header = document.getElementById('sheetHeader');
  if (!sheet || !header) return;

  var startY     = 0;
  var startHeight = 0;
  var isDragging = false;
  var moved      = false;

  header.addEventListener('touchstart', function (e) {
    // Only start drag from the small pill handle, not from tab/content taps
    var handle = e.target.closest('.sheet-drag-handle');
    if (!handle) return;

    isDragging  = true;
    moved       = false;
    startY      = e.touches[0].clientY;
    startHeight = sheet.clientHeight;
    sheet.classList.remove('sheet-transition');
  }, { passive: false });

  header.addEventListener('touchmove', function (e) {
    if (!isDragging) return;

    var currentY = e.touches[0].clientY;
    var deltaY   = startY - currentY;

    if (Math.abs(deltaY) > 5) {
      moved = true;
      e.preventDefault();

      var newHeight = startHeight + deltaY;
      var maxHeight = window.innerHeight * 0.95;
      var minHeight = window.innerHeight * 0.10;

      if (newHeight >= minHeight && newHeight <= maxHeight) {
        sheet.style.height = newHeight + 'px';
      }
    }
  }, { passive: false });

  header.addEventListener('touchend', function () {
    if (!isDragging) return;
    isDragging = false;
    sheet.classList.add('sheet-transition');

    if (!moved) return; // treat as tap – do nothing

    var currentHeight = sheet.clientHeight;
    var windowHeight  = window.innerHeight;

    if (currentHeight > windowHeight * 0.65)      sheet.style.height = '85%';
    else if (currentHeight < windowHeight * 0.25) sheet.style.height = '15%';
    else                                           sheet.style.height = '35%';
  });
});


// ---------------------------------------------------------------------------
// 2. ROUTE FILTER – search input
// ---------------------------------------------------------------------------
window.filterRouteOptions = function () {
  var input = document.getElementById('routeFilterInput');
  if (!input) return;

  var query   = input.value.trim().toLowerCase();
  var options = document.querySelectorAll('.route-filter-option');

  options.forEach(function (btn) {
    var text = btn.textContent.trim().toLowerCase();
    btn.style.display = text.includes(query) ? '' : 'none';
  });
};


// ---------------------------------------------------------------------------
// 3. ROUTE PILLS – highlight active route
//    updateRoutePills() is defined FULLY here (merged from index.php).
//    index.php no longer needs its own copy.
// ---------------------------------------------------------------------------
window.updateRoutePills = function () {
  var route = (window.selectedRoute || '').toUpperCase();

  // ── new-design filter options (route-filter-option buttons in the sheet) ──
  var options = document.querySelectorAll('.route-filter-option');
  options.forEach(function (btn) {
    var r        = (btn.getAttribute('data-route') || '').toUpperCase();
    var isActive = r === route || (!r && !route);
    btn.classList.toggle('route-filter-option--active', isActive);
  });

  // ── legacy pill buttons (route-pill-* ids used by the Routes tab) ──
  var all = document.getElementById('route-pill-all');
  var lt  = document.getElementById('route-pill-laurel-tanauan');
  var tl  = document.getElementById('route-pill-tanauan-laurel');

  function activePillStyle(el, active) {
    if (!el) return;
    if (active) {
      el.style.backgroundColor = '#1e3a8a';
      el.style.color           = 'white';
      el.style.fontWeight      = '600';
      el.style.border          = 'none';
    } else {
      el.style.backgroundColor = 'white';
      el.style.color           = '#1f2937';
      el.style.fontWeight      = '500';
      el.style.border          = '1px solid #e5e7eb';
    }
  }

  activePillStyle(all, route === '');
  activePillStyle(lt,  route === 'LAUREL - TANAUAN');
  activePillStyle(tl,  route === 'TANAUAN - LAUREL');
};


// ---------------------------------------------------------------------------
// 4. TAB SWITCHING
//    Merged: original switchSheetTab + the index.php override that handled
//    bus-stop visibility, view toggling, tab class management, and icon swaps.
//    index.php no longer needs its own wrapper around this function.
// ---------------------------------------------------------------------------
window.switchSheetTab = function switchSheetTab(tabName) {
  var tabs = ['location', 'routes', 'groups', 'busstops'];

  // ── Hide all views ──
  tabs.forEach(function (t) {
    var view = document.getElementById('view-' + t);
    if (view) view.classList.add('d-none');
  });

  // ── Show selected view ──
  var selectedView = document.getElementById('view-' + tabName);
  if (selectedView) selectedView.classList.remove('d-none');

  // ── Reset all tab styles ──
  var tabLocation  = document.getElementById('tab-location');
  var tabRoutes    = document.getElementById('tab-routes');
  var tabBusstops  = document.getElementById('tab-busstops');
  var tabGroups    = document.getElementById('tab-groups');

  [tabLocation, tabRoutes, tabBusstops, tabGroups].forEach(function (el) {
    if (!el) return;
    el.classList.remove('active', 'bg-primary', 'text-white', 'shadow-sm');
    el.classList.add('bg-primary-subtle', 'border', 'border-primary', 'text-primary');
  });

  // ── Activate selected tab ──
  var activeTab = null;
  if (tabName === 'location') activeTab = tabLocation;
  else if (tabName === 'routes')   activeTab = tabRoutes;
  else if (tabName === 'busstops') activeTab = tabBusstops;
  else if (tabName === 'groups')   activeTab = tabGroups;

  if (activeTab) {
    activeTab.classList.add('active', 'bg-primary', 'text-white', 'shadow-sm');
    activeTab.classList.remove('bg-primary-subtle', 'border', 'border-primary', 'text-primary');
  }

  // ── Group visuals hooks ──
  if (typeof hideGroupVisuals === 'function') hideGroupVisuals();
  if (tabName === 'groups' && typeof showGroupVisuals === 'function') showGroupVisuals();

  // ── Bus stops visibility ──
  // setBusStopsVisibility is defined in section 5 below.
  // loadStops is defined in index.php (it depends on map/Leaflet vars).
  if (typeof setBusStopsVisibility === 'function') setBusStopsVisibility(false);

  if (tabName === 'busstops') {
    if (!window._stopsLoaded) {
      window._stopsLoaded = true;
      if (typeof loadStops === 'function') {
        loadStops().then(function () {
          if (typeof setBusStopsVisibility === 'function') setBusStopsVisibility(true);
        });
      }
    } else {
      if (typeof setBusStopsVisibility === 'function') setBusStopsVisibility(true);
    }
  }

  // ── Icon swaps ──
  var base = window.APP_BASE_URL || '';

  // Location tab icon
  var locationIcon = document.getElementById('location-tab-icon');
  if (locationIcon) {
    locationIcon.src = tabName === 'location'
      ? base + '/assets/images/icons/busStopWhiteIcon.png'
      : base + '/assets/images/icons/busStopBlueIcon.png';
  }

  // Bus stops tab icon
  var busstopsIcon = document.getElementById('busstops-tab-icon');
  if (busstopsIcon) {
    busstopsIcon.src = tabName === 'busstops'
      ? base + '/assets/images/icons/busStopMarkerFinalWhite.svg'
      : base + '/assets/images/icons/busStopMarkerFinalBlue.svg';
  }

  // Routes tab icon
  var routesIcon = document.getElementById('routes-tab-icon');
  if (routesIcon) {
    routesIcon.src = tabName === 'routes'
      ? base + '/assets/images/icons/routes active.svg'
      : base + '/assets/images/icons/routes idle.svg';
  }

  var groupsIcon = document.getElementById('groups-tab-icon');
  if (groupsIcon) {
    groupsIcon.src = tabName === 'groups'
      ? base + '/assets/images/icons/groupsActive.png'
      : base + '/assets/images/icons/groupsIdle.png';
  }

  // ── Sync route pills ──
  if (typeof window.updateRoutePills === 'function') {
    window.updateRoutePills();
  }
};


// ---------------------------------------------------------------------------
// 5. BUS STOP VISIBILITY HELPERS
//    Moved from index.php. These are pure bottom-sheet concerns: show/hide
//    stop markers when the Bus Stops tab is open.
//    NOTE: stopMarkers and map objects are still owned by index.php because
//    they depend on Leaflet which loads after this file.  We expose thin
//    wrappers here that delegate to whatever index.php put on window.
// ---------------------------------------------------------------------------

/**
 * Show or hide all bus-stop markers on the map.
 * index.php defines window._stopMarkers and window._map after Leaflet loads.
 * We read them at call-time so load order doesn't matter.
 */
window.setBusStopsVisibility = function setBusStopsVisibility(show) {
  var markers = window._stopMarkers;
  var map     = window._map;
  if (!markers || !map) return;

  Object.values(markers).forEach(function (m) {
    var onMap = map.hasLayer(m);
    if (show && !onMap) m.addTo(map);
    if (!show && onMap) map.removeLayer(m);
  });
};

/**
 * Fly the map to a specific bus stop and open its popup.
 */
window.focusStop = function focusStop(id) {
  var markers = window._stopMarkers;
  var map     = window._map;
  if (!markers || !map) return;

  var m = markers[String(id)];
  if (!m) return;
  map.flyTo(m.getLatLng(), 16);
  m.openPopup();
};


// ---------------------------------------------------------------------------
// 6. BOTTOM SHEET HEIGHT UTILITY
//    Used by flyToMyLocationKeepingMarkerVisible in index.php.
//    Moved here so it's co-located with the sheet DOM concerns.
// ---------------------------------------------------------------------------
window.getBottomSheetHeightPx = function getBottomSheetHeightPx() {
  var sheet =
    document.querySelector('#bottomSheet') ||
    document.querySelector('.bottom-sheet') ||
    document.querySelector('.passenger-bottom-sheet') ||
    document.querySelector('[data-bottom-sheet]');

  if (!sheet) return 0;

  var rect = sheet.getBoundingClientRect();
  return Math.max(0, Math.min(window.innerHeight, rect.height));
};