// ===== BOTTOM SHEET SWIPE LOGIC (Restored from Original) =====
document.addEventListener('DOMContentLoaded', () => {
  const sheet = document.getElementById('bottomSheet');
  const header = document.getElementById('sheetHeader');
  if (!sheet || !header) return;

  let startY = 0;
  let startHeight = 0;
  let isDragging = false;
  let moved = false; 

  header.addEventListener('touchstart', (e) => {
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

    if (!moved) return;

    const currentHeight = sheet.clientHeight;
    const windowHeight = window.innerHeight;

    // Snapping logic
    if (currentHeight > windowHeight * 0.65) sheet.style.height = '85%';
    else if (currentHeight < windowHeight * 0.25) sheet.style.height = '15%';
    else sheet.style.height = '35%';
  });
});

// ===== TAB SWITCHING LOGIC =====
window.switchSheetTab = function (tabName) {
  const tabs = ['location', 'routes', 'groups', 'busstops'];

  // 1. Toggle styling and visibility for all views
  tabs.forEach(t => {
    const el = document.getElementById('tab-' + t);
    const view = document.getElementById('view-' + t);

    if (el) {
      if (t === tabName) {
        el.className = 'sheet-tab active bg-primary text-white rounded-4 p-3 d-flex justify-content-center align-items-center shadow-sm h-50 cursor-pointer';
      } else {
        el.className = 'sheet-tab bg-primary-subtle border border-primary text-primary rounded-4 p-3 d-flex justify-content-center align-items-center h-50 cursor-pointer';
      }
    }

    if (view) {
      if (t === tabName) {
        view.classList.remove('d-none');
      } else {
        view.classList.add('d-none');
      }
    }
  });

  // 2. Handle Map Visuals (Groups & Bus Stops)
  if (typeof hideGroupVisuals === 'function') hideGroupVisuals();
  if (typeof setBusStopsVisibility === 'function') setBusStopsVisibility(false);

  if (tabName === 'groups') {
    if (typeof showGroupVisuals === 'function') showGroupVisuals();
  } else if (tabName === 'busstops') {
    if (!window.stopsLoaded && typeof loadStops === 'function') {
      window.stopsLoaded = true;
      loadStops().then(() => setBusStopsVisibility(true));
    } else if (typeof setBusStopsVisibility === 'function') {
      setBusStopsVisibility(true);
    }
  }

  // 3. Swap Icons
  const base = (window.APP_BASE_URL || '');

  const locationIcon = document.getElementById('location-tab-icon');
  if (locationIcon) {
    locationIcon.src = (tabName === 'location')
      ? base + '/assets/images/icons/busStopWhiteIcon.png'
      : base + '/assets/images/icons/busStopBlueIcon.png';
  }

  const busstopsIcon = document.getElementById('busstops-tab-icon');
  if (busstopsIcon) {
    busstopsIcon.src = (tabName === 'busstops')
      ? base + '/assets/images/icons/busStopMarkerFinalWhite.svg'
      : base + '/assets/images/icons/busStopMarkerFinalBlue.svg';
  }

  const routesIcon = document.getElementById('routes-tab-icon');
  if (routesIcon) {
    routesIcon.src = (tabName === 'routes')
      ? base + '/assets/images/icons/routes active.svg'
      : base + '/assets/images/icons/routes idle.svg';
  }

  const groupsIcon = document.getElementById('groups-tab-icon');
  if (groupsIcon) {
    groupsIcon.src = (tabName === 'groups')
      ? base + '/assets/images/icons/groupsActive.png'
      : base + '/assets/images/icons/groupsIdle.png';
  }

  // Refresh routing highlights
  if (typeof window.updateRoutePills === 'function') {
    window.updateRoutePills();
  }
};

// ===== ROUTE FILTERING LOGIC =====
window.setRouteFromSheet = function (route) {
  // Fix strict title-case for the DB
  let fixedRoute = route;
  if (route.toUpperCase() === 'TANAUAN - LAUREL') fixedRoute = 'Tanauan - Laurel';
  if (route.toUpperCase() === 'LAUREL - TANAUAN') fixedRoute = 'Laurel - Tanauan';

  if (typeof window.setRoute === 'function') {
    window.setRoute(fixedRoute);
  } else {
    window.selectedRoute = fixedRoute;
  }

  if (typeof window.updateRoutePills === 'function') {
    window.updateRoutePills();
  }
};

window.updateRoutePills = function () {
  const all = document.getElementById('route-pill-all');
  const lt = document.getElementById('route-pill-laurel-tanauan');
  const tl = document.getElementById('route-pill-tanauan-laurel');

  const route = (window.selectedRoute || '').toUpperCase();

  const setStyles = (el, isActive) => {
    if (!el) return;
    if (isActive) {
      el.style.setProperty('background-color', '#1e3a8a', 'important');
      el.style.setProperty('color', 'white', 'important');
      el.style.setProperty('font-weight', '600', 'important');
      el.style.setProperty('border', 'none', 'important');
    } else {
      el.style.setProperty('background-color', 'white', 'important');
      el.style.setProperty('color', '#1f2937', 'important');
      el.style.setProperty('font-weight', '500', 'important');
      el.style.setProperty('border', '1px solid #e5e7eb', 'important');
    }
  };

  setStyles(all, route === '');
  setStyles(lt, route === 'LAUREL - TANAUAN');
  setStyles(tl, route === 'TANAUAN - LAUREL');
};

window.filterRouteOptions = function () {
  const input = document.getElementById('routeFilterInput');
  if (!input) return;

  const query = input.value.trim().toLowerCase();
  const options = document.querySelectorAll('.route-filter-option');

  options.forEach((btn) => {
    const text = btn.textContent.trim().toLowerCase();
    btn.style.display = text.includes(query) ? 'block' : 'none';
  });
};