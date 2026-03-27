// Bottom sheet swipe logic
document.addEventListener('DOMContentLoaded', () => {
  const sheet = document.getElementById('bottomSheet');
  const header = document.getElementById('sheetHeader');
  if (!sheet || !header) return;

  let startY = 0;
  let startHeight = 0;
  let isDragging = false;
  let moved = false; // NEW: track whether finger actually moved enough

  header.addEventListener('touchstart', (e) => {
    // Only start drag if the touch is actually on the "handle" area
    // (the small gray pill bar). This prevents starting a drag from deeper content.
    const handle = e.target.closest('.sheet-drag-handle');
    if (!handle) return;

    isDragging = true;
    moved = false;
    startY = e.touches[0].clientY;
    startHeight = sheet.clientHeight;
    sheet.classList.remove('sheet-transition');
  }, { passive: false });

  header.addEventListener('touchmove', (e) => {
    if (!isDragging) return;

    const currentY = e.touches[0].clientY;
    const deltaY = startY - currentY;

    // Only treat as drag if the user moved more than a few pixels
    if (Math.abs(deltaY) > 5) {
      moved = true;
      e.preventDefault();

      const newHeight = startHeight + deltaY;
      const maxHeight = window.innerHeight * 0.95;
      const minHeight = window.innerHeight * 0.10;

      if (newHeight >= minHeight && newHeight <= maxHeight) {
        sheet.style.height = `${newHeight}px`;
      }
    }
  }, { passive: false });

  header.addEventListener('touchend', () => {
    if (!isDragging) return;
    isDragging = false;
    sheet.classList.add('sheet-transition');

    // If touch ended without meaningful movement, treat as a tap and do nothing.
    if (!moved) return;

    const currentHeight = sheet.clientHeight;
    const windowHeight = window.innerHeight;

    if (currentHeight > windowHeight * 0.65) sheet.style.height = '85%';
    else if (currentHeight < windowHeight * 0.25) sheet.style.height = '15%';
    else sheet.style.height = '35%';
  });
});

// Filter route buttons based on search text
window.filterRouteOptions = function () {
  const input = document.getElementById('routeFilterInput');
  if (!input) return;

  const query = input.value.trim().toLowerCase();
  const options = document.querySelectorAll('.route-filter-option');

  options.forEach((btn) => {
    const text = btn.textContent.trim().toLowerCase();
    btn.style.display = text.includes(query) ? '' : 'none';
  });
};

// Extend updateRoutePills so it also highlights new design options
(function patchUpdateRoutePills() {
  const original = window.updateRoutePills || function () { };

  window.updateRoutePills = function () {
    // keep old behavior (for badges etc.)
    original();

    const current = (window.selectedRoute || '').toUpperCase();
    const options = document.querySelectorAll('.route-filter-option');

    options.forEach((btn) => {
      const route = (btn.getAttribute('data-route') || '').toUpperCase();
      const isActive = route === current || (!route && !current); // "" for All Routes
      btn.classList.toggle('route-filter-option--active', isActive);
    });
  };
})();

// Tab switching (needs to be global because HTML uses onclick="")
window.switchSheetTab = function switchSheetTab(tabName) {
  // include 'routes' here so it behaves like the other tabs
  const tabs = ['location', 'routes', 'groups', 'busstops'];

  tabs.forEach(t => {
    const el = document.getElementById('tab-' + t);
    const view = document.getElementById('view-' + t);

    if (el) {
      el.className = (t === tabName)
        ? 'sheet-tab active bg-primary text-white rounded-4 p-3 d-flex justify-content-center align-items-center shadow-sm h-50 cursor-pointer'
        : 'sheet-tab bg-primary-subtle border border-primary text-primary rounded-4 p-3 d-flex justify-content-center align-items-center h-50 cursor-pointer';
    }

    if (view) view.classList.add('d-none');
  });

  const selectedView = document.getElementById('view-' + tabName);
  if (selectedView) selectedView.classList.remove('d-none');

  // optional hooks from your existing code:
  if (typeof hideGroupVisuals === 'function') hideGroupVisuals();

  // bus stops visibility hook
  if (typeof setBusStopsVisibility === 'function') setBusStopsVisibility(false);

  if (tabName === 'groups') {
    if (typeof showGroupVisuals === 'function') showGroupVisuals();
  } else if (tabName === 'busstops') {
    if (typeof setBusStopsVisibility === 'function') setBusStopsVisibility(true);
  }

  // Use the same base URL as PHP, works on localhost and InfinityFree
  const base = (window.APP_BASE_URL || '');

  // 🔄 Toggle Location tab icon (png: white/blue)
  const locationIcon = document.getElementById('location-tab-icon');
  if (locationIcon) {
    if (tabName === 'location') {
      // active: white icon
      locationIcon.src = base + '/assets/images/icons/busStopWhiteIcon.png';
    } else {
      // inactive: blue icon
      locationIcon.src = base + '/assets/images/icons/busStopBlueIcon.png';
    }
  }

  // 🔄 Toggle Bus Stops tab icon (svg: white/blue)
  const busstopsIcon = document.getElementById('busstops-tab-icon');
  if (busstopsIcon) {
    if (tabName === 'busstops') {
      // active: white marker
      busstopsIcon.src = base + '/assets/images/icons/busStopMarkerFinalWhite.svg';
    } else {
      // inactive: blue marker
      busstopsIcon.src = base + '/assets/images/icons/busStopMarkerFinalBlue.svg';
    }
  }

  // Optional: toggle routes icon if you have active/idle variants
  // const routesIcon = document.getElementById('routes-tab-icon');
  // if (routesIcon) {
  //   routesIcon.src = (tabName === 'routes')
  //     ? base + '/assets/images/icons/routes active1.svg'
  //     : base + '/assets/images/icons/routes idle1.svg';
  // }
};