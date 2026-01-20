<!doctype html>
<html lang="en">

<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>ByaHero - Bus Tracker (Passenger View)</title>

  <!-- Bootstrap CSS (mobile-first) -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">

  <!-- Leaflet CSS -->
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

  <style>
    :root {
      --topbar-h: 56px; /* top title bar height */
      --bottombar-h: 66px; /* bottom navigation height */
      --accent-start: #667eea;
      --accent-end: #764ba2;
    }

    html,
    body {
      height: 100%;
      margin: 0;
      font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(180deg, #f6f9ff 0%, #e9f0ff 100%);
      color: #111;
    }

    /* Map height accounts for top + bottom nav */
    .map-container {
      height: calc(100vh - var(--topbar-h) - var(--bottombar-h));
      min-height: 320px;
    }

    /* Minimal card-like offcanvas body */
    .offcanvas-body {
      padding: 1rem;
    }

    .legend .dot {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      display: inline-block;
      margin-right: 8px;
    }

    /* Improve popup font-size for mobile readability */
    .leaflet-popup-content {
      font-size: 0.95rem;
      line-height: 1.25;
    }

    /* Small touch target improvements */
    .bus-item {
      padding: 10px;
      border-radius: 8px;
      margin-bottom: 8px;
      cursor: pointer;
    }

    /* Floating controls over the map (desktop/tablet) */
    .map-controls {
      position: absolute;
      top: 12px;
      left: 12px;
      z-index: 1000;
      display: flex;
      gap: 8px;
      align-items: center;
    }

    /* Bottom fixed navigation (Life360-like) */
    .bottom-nav {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      height: var(--bottombar-h);
      display: flex;
      align-items: center;
      justify-content: space-around;
      padding: 8px 12px;
      background: linear-gradient(135deg, var(--accent-start), var(--accent-end));
      color: #fff;
      z-index: 1100;
      box-shadow: 0 -6px 18px rgba(2, 6, 23, 0.12);
      gap: 6px;
      /* respect safe area inset on iOS */
      padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 8px);
    }

    .bottom-nav .btn {
      min-width: 56px;
      background: rgba(255,255,255,0.08);
      border: 0;
      color: #fff;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 8px;
      border-radius: 10px;
    }

    .bottom-nav .btn:active {
      transform: translateY(1px);
    }

    .bottom-nav .btn .label {
      font-size: 11px;
      opacity: 0.95;
      margin-top: 4px;
    }

    /* Modal bottom-sheet styling for active buses */
    .modal-bottom .modal-dialog {
      position: fixed;
      bottom: 0;
      margin: 0;
      width: 100%;
      max-width: 720px;
      left: 50%;
      transform: translateX(-50%);
      transition: transform .2s ease-out;
    }

    .modal-bottom .modal-content {
      border-radius: 12px 12px 0 0;
      overflow: hidden;
    }

    @media (min-width: 992px) {
      /* On large screens allow a sidebar next to the map (non-offcanvas) */
      .map-and-sidebar {
        display: grid;
        grid-template-columns: 1fr 340px;
        gap: 16px;
      }

      .map-container {
        height: calc(100vh - var(--topbar-h) - 32px);
        margin: 16px;
        border-radius: 10px;
        box-shadow: 0 6px 18px rgba(2, 6, 23, 0.06);
      }

      .desktop-sidebar {
        margin: 16px;
      }

      /* Desktop: hide bottom nav and keep the floating controls for map */
      .bottom-nav { display: none; }
      .map-controls { display: flex; }
    }
  </style>
</head>

<body>
  <!-- Top title bar -->
  <nav class="navbar navbar-dark" style="background: linear-gradient(135deg, var(--accent-start), var(--accent-end)); height:var(--topbar-h)">
    <div class="container-fluid">
      <div class="d-flex align-items-center gap-3">
        <span class="navbar-brand mb-0 h6">ByaHero: Prototype V3</span>
        <small class="text-white-50 d-none d-sm-inline">Real-time bus tracking</small>
      </div>
    </div>
  </nav>

  <!-- Main content: map + offcanvas sidebar (mobile) / grid (desktop) -->
  <main class="container-fluid p-0">
    <div class="map-and-sidebar">
      <!-- Map -->
      <div id="mapWrapper" class="position-relative">
        <div id="map" class="map-container"></div>

        <!-- Floating controls (desktop/tablet) -->
        <div class="map-controls d-none d-lg-flex">
          <div class="btn-group" role="group" aria-label="Map controls">
            <button class="btn btn-sm btn-light" id="zoomIn" title="Zoom in">+</button>
            <button class="btn btn-sm btn-light" id="zoomOut" title="Zoom out">−</button>
          </div>
        </div>
      </div>

      <!-- Desktop sidebar: visible on lg+; hidden on small screens because offcanvas is used -->
      <aside class="desktop-sidebar d-none d-lg-block">
        <div class="card">
          <div class="card-body">
            <h5 class="card-title">Filters & Active Buses</h5>

            <div class="mb-3">
              <label for="routeFilterDesktop" class="form-label">Filter by Route</label>
              <select id="routeFilterDesktop" class="form-select" aria-label="Route filter (desktop)">
                <option value="">All Routes</option>
              </select>
            </div>

            <div class="mb-3 legend">
              <h6>Bus Status</h6>
              <div class="mb-1"><span class="dot" style="background:#10b981"></span> Available</div>
              <div class="mb-1"><span class="dot" style="background:#f59e0b"></span> On Stop</div>
              <div class="mb-1"><span class="dot" style="background:#ef4444"></span> Full</div>
              <div class="mb-1"><span class="dot" style="background:#6b7280"></span> Unavailable</div>
            </div>

            <h6>Active Buses (<span id="busCountDesktop">0</span>)</h6>
            <div id="busListDesktop" class="mt-2" aria-live="polite"></div>

            <div class="mt-3 text-muted small">Last updated: <span id="lastUpdateFooterDesktop">Never</span></div>
          </div>
        </div>
      </aside>
    </div>

    <!-- Offcanvas for mobile filters & list -->
    <div class="offcanvas offcanvas-start" tabindex="-1" id="sidebarOffcanvas" aria-labelledby="sidebarOffcanvasLabel">
      <div class="offcanvas-header">
        <h5 class="offcanvas-title" id="sidebarOffcanvasLabel">Filters & Active Buses</h5>
        <button type="button" class="btn-close text-reset" data-bs-dismiss="offcanvas" aria-label="Close"></button>
      </div>
      <div class="offcanvas-body">
        <div class="mb-3">
          <label for="routeFilter" class="form-label">Filter by Route</label>
          <select id="routeFilter" class="form-select" aria-label="Route filter">
            <option value="">All Routes</option>
          </select>
        </div>

        <div class="mb-3 legend">
          <h6>Bus Status</h6>
          <div><span class="dot" style="background:#10b981"></span> Available</div>
          <div><span class="dot" style="background:#f59e0b"></span> On Stop</div>
          <div><span class="dot" style="background:#ef4444"></span> Full</div>
          <div><span class="dot" style="background:#6b7280"></span> Unavailable</div>
        </div>

        <h6>Active Buses (<span id="busCount">0</span>)</h6>
        <div id="busList" class="mt-2" aria-live="polite"></div>

        <div class="mt-3 text-muted small">Last updated: <span id="lastUpdateFooter">Never</span></div>
      </div>
    </div>
  </main>

  <!-- Active Buses modal (bottom sheet style on mobile) -->
  <div class="modal fade" id="activeBusesModal" tabindex="-1" aria-labelledby="activeBusesModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-bottom">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="activeBusesModalLabel">Active Buses</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div id="activeBusesList" class="list-group"></div>
        </div>
      </div>
    </div>
  </div>

  <!-- Bottom navigation (mobile-first) -->
  <nav class="bottom-nav" role="navigation" aria-label="Bottom navigation">
    <button class="btn" id="menuBtn" title="Open menu" aria-label="Open menu" data-bs-toggle="offcanvas" data-bs-target="#sidebarOffcanvas" aria-controls="sidebarOffcanvas">
      <div class="icon">☰</div>
      <div class="label">Menu</div>
    </button>

    <button class="btn" id="activeBusesBtn" title="Active buses" aria-label="Active buses">
      <div class="icon">🚌</div>
      <div class="label">Active</div>
    </button>

    <button class="btn" id="locateBtn" title="Locate me" aria-label="Locate me">
      <div class="icon">🧭</div>
      <div class="label">Locate</div>
    </button>

    <button class="btn" id="refreshBtn" title="Refresh" aria-label="Refresh">
      <div class="icon">⟳</div>
      <div class="label">Refresh</div>
    </button>
  </nav>

  <!-- Leaflet JS -->
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <!-- Bootstrap JS bundle (includes Popper) -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>

  <script>
    // Initialize map
    const map = L.map('map', {
      zoomControl: false // we'll add custom controls (or use the floating ones)
    }).setView([14.5995, 120.9842], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    // Optional zoom controls hooked to floating buttons
    document.getElementById('zoomIn')?.addEventListener('click', () => map.zoomIn());
    document.getElementById('zoomOut')?.addEventListener('click', () => map.zoomOut());

    // Ensure the map resizes correctly when offcanvas toggles, orientations change, or window resizes
    const offcanvasEl = document.getElementById('sidebarOffcanvas');
    if (offcanvasEl) {
      offcanvasEl.addEventListener('shown.bs.offcanvas', () => setTimeout(() => map.invalidateSize(), 200));
      offcanvasEl.addEventListener('hidden.bs.offcanvas', () => setTimeout(() => map.invalidateSize(), 200));
    }
    window.addEventListener('orientationchange', () => setTimeout(() => map.invalidateSize(), 300));
    window.addEventListener('resize', () => setTimeout(() => map.invalidateSize(), 250));

    // Data structures and utils
    const busMarkers = {};
    let selectedRoute = '';
    let _lastFetchedBuses = [];
    const statusColors = {
      available: '#10b981',
      on_stop: '#f59e0b',
      full: '#ef4444',
      unavailable: '#6b7280'
    };

    function createBusIcon(status) {
      const color = statusColors[status] || '#6b7280';
      return L.divIcon({
        html: `<div style="background:${color};width:30px;height:30px;border-radius:50%;border:3px solid #fff;box-shadow:0 1px 2px rgba(0,0,0,0.15)"></div>`,
        className: 'bus-marker',
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });
    }

    function parseCurrentLocationField(bus) {
      if (!bus.current_location) return { coords: null, name: null };
      try {
        const gj = (typeof bus.current_location === 'string') ? JSON.parse(bus.current_location) : bus.current_location;
        if (!gj) return { coords: null, name: null };
        if (gj.type === 'Feature') {
          const props = gj.properties || {};
          const coords = gj.geometry && gj.geometry.coordinates ? [parseFloat(gj.geometry.coordinates[1]), parseFloat(gj.geometry.coordinates[0])] : null;
          if (props.current_location_name) return { coords, name: props.current_location_name };
          if (props['Current Location']) return { coords, name: props['Current Location'] };
          if (props.name) return { coords, name: props.name };
          const keys = Object.keys(props);
          if (keys.length === 1) {
            const v = props[keys[0]];
            if (typeof v === 'string' && v.trim() !== '') return { coords, name: v.trim() };
            return { coords, name: keys[0] };
          }
        }
        if (gj.type === 'FeatureCollection' && Array.isArray(gj.features) && gj.features.length > 0) {
          const f = gj.features[0];
          if (f.geometry && f.geometry.type === 'Point' && f.geometry.coordinates) {
            const coords = [parseFloat(f.geometry.coordinates[1]), parseFloat(f.geometry.coordinates[0])];
            const props = f.properties || {};
            if (props.current_location_name) return { coords, name: props.current_location_name };
            if (props['Current Location']) return { coords, name: props['Current Location'] };
            const keys = Object.keys(props);
            if (keys.length > 0) {
              const v = props[keys[0]];
              if (typeof v === 'string' && v.trim() !== '') return { coords, name: v.trim() };
              return { coords, name: keys[0] };
            }
            return { coords, name: null };
          }
        }
        if (gj.type && gj.coordinates && gj.type === 'Point') return { coords: [parseFloat(gj.coordinates[1]), parseFloat(gj.coordinates[0])], name: null };
      } catch (e) {
        console.warn('parse error', e);
      }
      return { coords: null, name: null };
    }

    function getBusCoordinates(bus) {
      const parsed = parseCurrentLocationField(bus);
      if (parsed.coords) return parsed.coords;
      if (bus.lat && bus.lng) return [parseFloat(bus.lat), parseFloat(bus.lng)];
      return null;
    }

    function getBusLocationName(bus) {
      const parsed = parseCurrentLocationField(bus);
      if (parsed.name) return parsed.name;
      const coords = getBusCoordinates(bus);
      if (coords) return `${coords[0].toFixed(6)}, ${coords[1].toFixed(6)}`;
      return null;
    }

    function escapeHtml(s) {
      if (s == null) return '';
      const d = document.createElement('div');
      d.textContent = String(s);
      return d.innerHTML;
    }

    function createPopupContent(bus) {
      const loc = escapeHtml(getBusLocationName(bus) || 'Location not available');
      const route = escapeHtml(bus.route || 'Not set');
      const status = escapeHtml(bus.status || '');
      const updated = bus.updated_at ? new Date(bus.updated_at).toLocaleString() : '';
      return `<div style="min-width:170px"><strong>${escapeHtml(bus.code)}</strong><br><strong>Route:</strong> ${route}<br><strong>Location:</strong> ${loc}<br><strong>Status:</strong> ${status}<br><strong>Seats:</strong> ${escapeHtml(bus.seats_available)} / ${escapeHtml(bus.seats_total)}<br><small style="color:#666;">Updated: ${escapeHtml(updated)}</small></div>`;
    }

    // Render active buses into the bottom-sheet modal
    function renderActiveBusesModal(buses) {
      const listEl = document.getElementById('activeBusesList');
      if (!listEl) return;
      const filtered = (buses || []).filter(b => !selectedRoute || selectedRoute === '' || b.route === selectedRoute);
      const visible = filtered.filter(b => getBusCoordinates(b) !== null);
      if (visible.length === 0) {
        listEl.innerHTML = '<div class="text-center text-muted small py-3">No active buses available</div>';
        return;
      }
      listEl.innerHTML = visible.map(b => {
        const loc = escapeHtml(getBusLocationName(b) || 'Unknown');
        const seats = `${escapeHtml(b.seats_available)} / ${escapeHtml(b.seats_total)}`;
        const status = escapeHtml(b.status || '');
        return `<button type="button" class="list-group-item list-group-item-action active-bus-item d-flex justify-content-between align-items-start" data-bus-id="${escapeHtml(b.id)}">
            <div class="ms-2 me-auto">
              <div class="fw-bold">${escapeHtml(b.code)}</div>
              <div class="small text-muted">Route: ${escapeHtml(b.route || 'Not set')}</div>
              <div class="small text-muted">Location: ${loc}</div>
            </div>
            <div class="text-end small text-muted">
              <div>${seats}</div>
              <div>${status}</div>
            </div>
          </button>`;
      }).join('');
      // wire up clicks
      listEl.querySelectorAll('.active-bus-item').forEach(item => {
        item.addEventListener('click', () => {
          const id = item.getAttribute('data-bus-id');
          const marker = busMarkers[id];
          const modalInstance = bootstrap.Modal.getInstance(document.getElementById('activeBusesModal'));
          if (marker) {
            map.flyTo(marker.getLatLng(), 16, { duration: 0.7 });
            setTimeout(() => marker.openPopup(), 700);
          } else {
            alert('Location for this bus is not available on the map.');
          }
          if (modalInstance) modalInstance.hide();
        });
      });
    }

    // Toggleable modal instance for Active Buses (prevents multiple backdrops)
    const activeBusesModalEl = document.getElementById('activeBusesModal');
    let activeBusesModalInstance = null;
    if (activeBusesModalEl) {
      // Clear stored instance when modal is fully hidden
      activeBusesModalEl.addEventListener('hidden.bs.modal', () => {
        activeBusesModalInstance = null;
      });
    }

    // Bottom nav handlers (Active button now toggles modal)
    const activeBtn = document.getElementById('activeBusesBtn');
    activeBtn?.addEventListener('click', () => {
      if (!activeBusesModalEl) return;
      // If modal is already visible, hide it (toggle off)
      if (activeBusesModalEl.classList.contains('show')) {
        const inst = bootstrap.Modal.getInstance(activeBusesModalEl) || activeBusesModalInstance;
        if (inst) {
          inst.hide();
        } else {
          // fallback: remove show class and backdrop if any (defensive)
          activeBusesModalEl.classList.remove('show');
          document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
        }
        return;
      }

      // otherwise render and show (toggle on)
      renderActiveBusesModal(_lastFetchedBuses || []);
      // reuse existing instance if present
      if (!activeBusesModalInstance) {
        activeBusesModalInstance = new bootstrap.Modal(activeBusesModalEl, { backdrop: true });
      }
      activeBusesModalInstance.show();
    });

    document.getElementById('locateBtn')?.addEventListener('click', () => {
      if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser.');
        return;
      }
      navigator.geolocation.getCurrentPosition(pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        map.setView([lat, lng], 16);
        // optionally add a temporary marker
        const t = L.circleMarker([lat, lng], { radius: 8, color: '#fff', fillColor: '#2563eb', fillOpacity: 0.9 }).addTo(map);
        setTimeout(() => { try { map.removeLayer(t); } catch (e) {} }, 4000);
      }, err => {
        console.warn('geo error', err);
        alert('Unable to determine location.');
      }, { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 });
    });

    // Fetch + update loop
    async function updateBuses() {
      try {
        const res = await fetch('/api.php?action=get_buses', { cache: 'no-store' });
        if (!res.ok) throw new Error('Network response was not ok');
        const json = await res.json();
        if (json && json.buses) {
          const buses = json.buses;
          _lastFetchedBuses = buses;
          updateMap(buses);
          updateBusLists(buses);
          updateRouteFilters(buses);
          // update active buses modal content (keeps it in sync)
          // Only re-render; do not open/close modal automatically
          renderActiveBusesModal(buses);
          const ts = new Date().toLocaleTimeString();
          // Keep backwards compatibility if header element exists
          const headerEl = document.getElementById('lastUpdateHeader');
          if (headerEl) headerEl.textContent = ts;
          document.getElementById('lastUpdateFooter') && (document.getElementById('lastUpdateFooter').textContent = ts);
          document.getElementById('lastUpdateFooterDesktop') && (document.getElementById('lastUpdateFooterDesktop').textContent = ts);
        }
      } catch (e) {
        console.error('Failed to update buses', e);
      }
    }

    function updateMap(buses) {
      const filtered = buses.filter(b => !selectedRoute || selectedRoute === '' || b.route === selectedRoute);

      // remove markers that are no longer present
      Object.keys(busMarkers).forEach(id => {
        if (!filtered.find(b => String(b.id) === String(id))) {
          try { map.removeLayer(busMarkers[id]); } catch (e) { /* ignore */ }
          delete busMarkers[id];
        }
      });

      filtered.forEach(bus => {
        const pos = getBusCoordinates(bus);
        if (!pos) return;
        const id = String(bus.id);
        const icon = createBusIcon(bus.status);
        if (busMarkers[id]) {
          busMarkers[id].setLatLng(pos);
          busMarkers[id].setIcon(icon);
          busMarkers[id].setPopupContent(createPopupContent(bus));
        } else {
          const marker = L.marker(pos, { icon }).addTo(map);
          marker.bindPopup(createPopupContent(bus));
          busMarkers[id] = marker;
        }
      });

      // Fit bounds to markers on first load
      if (!window._mapHasBeenFitted && Object.keys(busMarkers).length > 0) {
        const group = L.featureGroup(Object.values(busMarkers));
        map.fitBounds(group.getBounds().pad(0.08));
        window._mapHasBeenFitted = true;
      }

      // Ensure tiles are rendered if container size changed
      setTimeout(() => map.invalidateSize(), 150);
    }

    function updateBusLists(buses) {
      // Mobile list
      (function () {
        const listEl = document.getElementById('busList');
        const countEl = document.getElementById('busCount');
        const filtered = buses.filter(b => !selectedRoute || selectedRoute === '' || b.route === selectedRoute);
        const visible = filtered.filter(b => getBusCoordinates(b) !== null);
        countEl && (countEl.textContent = visible.length);
        if (!listEl) return;
        if (visible.length === 0) {
          listEl.innerHTML = '<p class="text-muted small">No buses available</p>';
          return;
        }

        listEl.innerHTML = visible.map(b => {
          const loc = escapeHtml(getBusLocationName(b) || 'Unknown');
          const seats = `${escapeHtml(b.seats_available)} / ${escapeHtml(b.seats_total)}`;
          const status = escapeHtml(b.status || '');
          return `<div class="bus-item border" data-bus-id="${escapeHtml(b.id)}"><strong>${escapeHtml(b.code)}</strong><div class="small text-muted">Route: ${escapeHtml(b.route || 'Not set')}</div><div class="small text-muted">Location: ${loc}</div><div class="small text-muted">Seats: ${seats} · ${status}</div></div>`;
        }).join('');

        listEl.querySelectorAll('.bus-item').forEach(item => {
          item.addEventListener('click', () => {
            const id = item.getAttribute('data-bus-id');
            const marker = busMarkers[id];
            if (marker) {
              map.flyTo(marker.getLatLng(), 16, { duration: 0.7 });
              setTimeout(() => marker.openPopup(), 700);
              // Close offcanvas on mobile to reveal the map
              const off = bootstrap.Offcanvas.getInstance(offcanvasEl);
              if (off) off.hide();
            } else {
              alert('Location for this bus is not available on the map.');
            }
          });
        });
      })();

      // Desktop list
      (function () {
        const listEl = document.getElementById('busListDesktop');
        const countEl = document.getElementById('busCountDesktop');
        const filtered = buses.filter(b => !selectedRoute || selectedRoute === '' || b.route === selectedRoute);
        const visible = filtered.filter(b => getBusCoordinates(b) !== null);
        countEl && (countEl.textContent = visible.length);
        if (!listEl) return;
        if (visible.length === 0) {
          listEl.innerHTML = '<p class="text-muted small">No buses available</p>';
          return;
        }

        listEl.innerHTML = visible.map(b => {
          const loc = escapeHtml(getBusLocationName(b) || 'Unknown');
          const seats = `${escapeHtml(b.seats_available)} / ${escapeHtml(b.seats_total)}`;
          const status = escapeHtml(b.status || '');
          return `<div class="bus-item border" data-bus-id="${escapeHtml(b.id)}"><strong>${escapeHtml(b.code)}</strong><div class="small text-muted">Route: ${escapeHtml(b.route || 'Not set')}</div><div class="small text-muted">Location: ${loc}</div><div class="small text-muted">Seats: ${seats} · ${status}</div></div>`;
        }).join('');

        listEl.querySelectorAll('.bus-item').forEach(item => {
          item.addEventListener('click', () => {
            const id = item.getAttribute('data-bus-id');
            const marker = busMarkers[id];
            if (marker) {
              map.flyTo(marker.getLatLng(), 16, { duration: 0.7 });
              setTimeout(() => marker.openPopup(), 700);
            } else {
              alert('Location for this bus is not available on the map.');
            }
          });
        });
      })();
    }

    function updateRouteFilters(buses) {
      const forEachSel = sel => {
        if (!sel) return;
        const routes = Array.from(new Set(buses.map(b => b.route).filter(r => r && String(r).trim() !== '')));
        const current = sel.value;
        sel.innerHTML = '<option value="">All Routes</option>';
        routes.sort().forEach(r => {
          const opt = document.createElement('option');
          opt.value = r;
          opt.textContent = r;
          if (r === current) opt.selected = true;
          sel.appendChild(opt);
        });
      };

      forEachSel(document.getElementById('routeFilter'));
      forEachSel(document.getElementById('routeFilterDesktop'));
      forEachSel(document.getElementById('routeFilterDesktop')); // safe to call twice for idempotency
    }

    // Wire up route filters
    document.getElementById('routeFilter')?.addEventListener('change', e => {
      selectedRoute = e.target.value;
      updateBuses();
    });
    document.getElementById('routeFilterDesktop')?.addEventListener('change', e => {
      selectedRoute = e.target.value;
      // synchronize mobile select if present
      const mobileSel = document.getElementById('routeFilter');
      if (mobileSel) mobileSel.value = selectedRoute;
      updateBuses();
    });

    // Refresh button
    document.getElementById('refreshBtn')?.addEventListener('click', () => updateBuses());

    // Start polling
    updateBuses();
    setInterval(updateBuses, 3000);

    // Ensure initial invalidation so Leaflet draws correctly on some mobile browsers
    setTimeout(() => map.invalidateSize(), 300);
  </script>
</body>

</html>