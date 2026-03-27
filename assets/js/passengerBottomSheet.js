// ===== BOTTOM SHEET DRAG & DROP =====
let sheetStartY = 0;
let sheetStartHeight = 0;
let isDraggingSheet = false;

function initBottomSheetDrag() {
  const sheet = document.getElementById('bottomSheet');
  const dragHandle = document.querySelector('.sheet-drag-handle');

  if (!dragHandle || !sheet) return;

  dragHandle.addEventListener('mousedown', startSheetDrag);
  dragHandle.addEventListener('touchstart', startSheetDrag);

  function startSheetDrag(e) {
    isDraggingSheet = true;
    sheetStartY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
    sheetStartHeight = sheet.offsetHeight;

    document.addEventListener('mousemove', moveSheet);
    document.addEventListener('touchmove', moveSheet);
    document.addEventListener('mouseup', endSheetDrag);
    document.addEventListener('touchend', endSheetDrag);
  }

  function moveSheet(e) {
    if (!isDraggingSheet) return;
    const currentY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
    const delta = sheetStartY - currentY;
    const newHeight = Math.max(150, Math.min(window.innerHeight - 60, sheetStartHeight + delta));
    sheet.style.height = newHeight + 'px';
  }

  function endSheetDrag() {
    isDraggingSheet = false;
    document.removeEventListener('mousemove', moveSheet);
    document.removeEventListener('touchmove', moveSheet);
    document.removeEventListener('mouseup', endSheetDrag);
    document.removeEventListener('touchend', endSheetDrag);
  }
}

// ===== ALL TABS ICON SWAPPING =====
window.updateAllTabsIcons = function (tabName) {
  const base = window.APP_BASE_URL || '';

  // Routes icon - SWAP between active and idle
  const routesIcon = document.getElementById('routes-tab-icon');
  if (routesIcon) {
    if (tabName === 'routes') {
      routesIcon.src = `${base}/assets/images/icons/routes active.svg`;
    } else {
      routesIcon.src = `${base}/assets/images/icons/routes idle.svg`;
    }
  }

  // Location icon - KEEP WHITE (no swapping needed)
  const locationIcon = document.getElementById('location-tab-icon');
  if (locationIcon) {
    if (tabName === 'location') {
      locationIcon.src = `${base}/assets/images/icons/busStopWhiteIcon.png`;
    } else {
      locationIcon.src = `${base}/assets/images/icons/busStopBlueIcon.png`;
    }
  }

  // Groups icon - SWAP between active and idle
  const groupsIcon = document.getElementById('groups-tab-icon');
  if (groupsIcon) {
    if (tabName === 'groups') {
      groupsIcon.src = `${base}/assets/images/icons/groupsActive.png`;
    } else {
      groupsIcon.src = `${base}/assets/images/icons/groupsIdle.png`;
    }
  }

  // Bus Stops icon - KEEP BLUE (no swapping needed)
  const busStopsIcon = document.getElementById('busstops-tab-icon');
  if (busStopsIcon) {
    if (tabName === 'busstops') {
      busStopsIcon.src = `${base}/assets/images/icons/busStopMarkerFinalWhite.svg`;
    } else {
      busStopsIcon.src = `${base}/assets/images/icons/busStopMarkerFinalBlue.svg`;
    }
  }
};

// ===== TAB SWITCHING =====
window.switchSheetTab = function (tabName) {
  // ----- BUS STOPS visibility -----
  if (tabName === 'busstops') {
    if (typeof setBusStopsVisibility === 'function') {
      if (!window.stopsLoaded) {
        window.stopsLoaded = true;
        if (typeof loadStops === 'function') {
          loadStops().then(() => setBusStopsVisibility(true));
        }
      } else {
        setBusStopsVisibility(true);
      }
    }
  } else {
    if (typeof setBusStopsVisibility === 'function') {
      setBusStopsVisibility(false);
    }
  }

  // ----- ROUTES TAB / VIEWS -----
  const viewLocation = document.getElementById('view-location');
  const viewRoutes = document.getElementById('view-routes');
  const viewBusStops = document.getElementById('view-busstops');
  const viewGroups = document.getElementById('view-groups'); // Added viewGroups reference

  if (viewLocation) viewLocation.classList.toggle('d-none', tabName !== 'location');
  if (viewRoutes) viewRoutes.classList.toggle('d-none', tabName !== 'routes');
  if (viewBusStops) viewBusStops.classList.toggle('d-none', tabName !== 'busstops');
  if (viewGroups) viewGroups.classList.toggle('d-none', tabName !== 'groups'); // Toggle visibility for groups

  // ----- UPDATE TAB STYLING -----
  const tabLocation = document.getElementById('tab-location');
  const tabRoutes = document.getElementById('tab-routes');
  const tabBusstops = document.getElementById('tab-busstops');
  const tabGroups = document.getElementById('tab-groups');

  [tabLocation, tabRoutes, tabBusstops, tabGroups].forEach((el) => {
    if (!el) return;
    el.classList.remove('active', 'bg-primary', 'text-white', 'shadow-sm');
    el.classList.add('bg-primary-subtle', 'border', 'border-primary', 'text-primary');
  });

  // Activate the selected tab
  let activeTab = null;
  if (tabName === 'location') activeTab = tabLocation;
  else if (tabName === 'routes') activeTab = tabRoutes;
  else if (tabName === 'busstops') activeTab = tabBusstops;
  else if (tabName === 'groups') activeTab = tabGroups;

  if (activeTab) {
    activeTab.classList.add('active', 'bg-primary', 'text-white', 'shadow-sm');
    activeTab.classList.remove('bg-primary-subtle', 'border', 'border-primary', 'text-primary');
  }

  // ----- UPDATE ALL TABS ICONS -----
  updateAllTabsIcons(tabName);

  // ----- UPDATE ROUTE PILLS -----
  if (typeof updateRoutePills === 'function') {
    updateRoutePills();
  }
};

// ===== ROUTE FILTERING =====
window.setRouteFromSheet = function (route) {
  window.setRoute(route);
  if (typeof window.updateRoutePills === 'function') {
    window.updateRoutePills();
  }
};

// Highlight which route is currently selected
window.updateRoutePills = function () {
  const all = document.getElementById('route-pill-all');
  const lt = document.getElementById('route-pill-laurel-tanauan');
  const tl = document.getElementById('route-pill-tanauan-laurel');

  const route = window.selectedRoute || '';

  // Update All Routes button
  if (all) {
    if (route === '') {
      all.style.backgroundColor = '#1e3a8a';
      all.style.color = 'white';
      all.style.fontWeight = '600';
    } else {
      all.style.backgroundColor = 'white';
      all.style.color = '#1f2937';
      all.style.fontWeight = '500';
      all.style.border = '1px solid #e5e7eb';
    }
  }

  // Update Laurel - Tanauan button
  if (lt) {
    if (route === 'LAUREL - TANAUAN') {
      lt.style.backgroundColor = '#1e3a8a';
      lt.style.color = 'white';
      lt.style.fontWeight = '600';
      lt.style.border = 'none';
    } else {
      lt.style.backgroundColor = 'white';
      lt.style.color = '#1f2937';
      lt.style.fontWeight = '500';
      lt.style.border = '1px solid #e5e7eb';
    }
  }

  // Update Tanauan - Laurel button
  if (tl) {
    if (route === 'TANAUAN - LAUREL') {
      tl.style.backgroundColor = '#1e3a8a';
      tl.style.color = 'white';
      tl.style.fontWeight = '600';
      tl.style.border = 'none';
    } else {
      tl.style.backgroundColor = 'white';
      tl.style.color = '#1f2937';
      tl.style.fontWeight = '500';
      tl.style.border = '1px solid #e5e7eb';
    }
  }
};

// Filter route options
window.filterRouteOptions = function () {
  const input = document.getElementById('routeFilterInput');
  if (!input) return;

  const filterValue = input.value.toLowerCase();
  const options = document.querySelectorAll('.route-filter-option');

  options.forEach(option => {
    const text = option.textContent.toLowerCase();
    option.style.display = text.includes(filterValue) ? 'block' : 'none';
  });
};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function () {
  initBottomSheetDrag();
});