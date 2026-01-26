<!doctype html>
<html lang="en">

<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>ByaHero - Bus Tracker (Passenger View)</title>

  <!-- Material Symbols (required by integrated navbar) -->
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded" rel="stylesheet" />

  <!-- Bootstrap CSS (mobile-first) -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css" rel="stylesheet">

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

    /* Small touch target improvements — prefer Bootstrap list-group items */
    .bus-list-item {
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
      .map-container {
        height: calc(100vh - var(--topbar-h) - 32px);
      }

      /* Desktop: keep the floating controls for map */
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
      </div>
    </div>
  </nav>

  <!-- Main content: map + offcanvas sidebar (mobile) / grid (desktop) -->
  <main class="container-fluid p-0">
    <div class="row g-0">
      <div class="col-12 col-lg-10">
        <!-- Map -->
        <div id="mapWrapper" class="position-relative">
          <div id="map" class="map-container rounded-3 shadow-sm"></div>

          <!-- Floating controls (desktop/tablet) -->
          <div class="map-controls d-none d-lg-flex">
            <div class="btn-group" role="group" aria-label="Map controls">
              <button class="btn btn-sm btn-light" id="zoomIn" title="Zoom in">+</button>
              <button class="btn btn-sm btn-light" id="zoomOut" title="Zoom out">−</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Desktop sidebar: visible on lg+; hidden on small screens because offcanvas is used -->
      <aside class="desktop-sidebar col-12 col-lg-2 d-none d-lg-block">
        <div class="card h-100">
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
            <div id="busListDesktop" class="list-group mt-2" aria-live="polite"></div>

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

  <!-- Bottom navigation (included component) -->
  <?php include("../components/navbar.php"); ?>

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
      attribution: 'Maps',
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

    // Normalize API bus object to expected keys used by the UI
    function normalizeBus(raw) {
      const bus = Object.assign({}, raw);
      const id = bus.id ?? bus.Bus_ID ?? bus.id ?? bus.BusId ?? bus.bus_id;
      const seats_total = bus.seats_total ?? bus.total_seats ?? bus.totalSeats ?? 25;
      const seats_available = bus.seats_available ?? bus.seat_availability ?? bus.seatAvailability ?? seats_total;
      const updated_at = bus.updated_at ?? bus.updated ?? null;

      return {
        id: (typeof id !== 'undefined' && id !== null) ? String(id) : (bus.code ? String(bus.code) : null),
        code: bus.code ?? bus.Code ?? null,
        route: bus.route ?? null,
        seats_total: Number.isFinite(Number(seats_total)) ? Number(seats_total) : null,
        seats_available: Number.isFinite(Number(seats_available)) ? Number(seats_available) : null,
        current_location: bus.current_location ?? bus.currentLocation ?? null,
        lat: (typeof bus.lat !== 'undefined') ? bus.lat : (bus.latitude ?? null),
        lng: (typeof bus.lng !== 'undefined') ? bus.lng : (bus.longitude ?? null),
        updated_at: updated_at,
        status: bus.status ?? (bus.__raw && bus.__raw.status) ?? null,
        __raw: bus
      };
    }

    // Parse GeoJSON stored in current_location to extract coordinates and friendly name
    function parseCurrentLocationField(bus) {
      const cl = bus.current_location;
      if (!cl) return { coords: null, name: null };
      try {
        const gj = (typeof cl === 'string') ? JSON.parse(cl) : cl;
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
      // bus is normalized
      const parsed = parseCurrentLocationField(bus);
      if (parsed.coords) return parsed.coords;
      if (bus.lat && bus.lng) return [parseFloat(bus.lat), parseFloat(bus.lng)];
      const raw = bus.__raw || {};
      if (raw.lat && raw.lng) return [parseFloat(raw.lat), parseFloat(raw.lng)];
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
      const status = escapeHtml(bus.status || (bus.__raw && bus.__raw.status) || '');
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
        const status = escapeHtml(b.status || (b.__raw && b.__raw.status) || '');
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

    // Fetch + update loop — NOTE: relative URLs (no leading slash)
    async function updateBuses() {
      try {
        const res = await fetch('api.php?action=get_buses', { cache: 'no-store' });
        if (!res.ok) throw new Error('Network response was not ok: ' + res.status);
        const json = await res.json();
        if (json && json.buses) {
          // Normalize all buses for UI
          const buses = json.buses.map(normalizeBus);
          _lastFetchedBuses = buses;
          updateMap(buses);
          updateBusLists(buses);
          updateRouteFilters(buses);
          renderActiveBusesModal(buses);
          const ts = new Date().toLocaleTimeString();
          const headerEl = document.getElementById('lastUpdateHeader');
          if (headerEl) headerEl.textContent = ts;
          document.getElementById('lastUpdateFooter') && (document.getElementById('lastUpdateFooter').textContent = ts);
          document.getElementById('lastUpdateFooterDesktop') && (document.getElementById('lastUpdateFooterDesktop').textContent = ts);
        } else {
          // no buses property — log for debugging
          console.warn('api.php returned no buses:', json);
        }
      } catch (e) {
        console.error('Failed to update buses', e);
      }
    }

    function updateMap(buses) {
      const filtered = buses.filter(b => !selectedRoute || selectedRoute === '' || b.route === selectedRoute);
      const visible = filtered.filter(b => getBusCoordinates(b) !== null);

      // If there are no visible buses (e.g., tracking stopped), remove all existing markers.
      if (visible.length === 0) {
        Object.keys(busMarkers).forEach(id => {
          try { map.removeLayer(busMarkers[id]); } catch (e) { /* ignore */ }
          delete busMarkers[id];
        });
        return;
      }

      // remove markers that are no longer present in the visible set
      const visibleIds = visible.map(b => String(b.id));
      Object.keys(busMarkers).forEach(id => {
        if (!visibleIds.includes(String(id))) {
          try { map.removeLayer(busMarkers[id]); } catch (e) { /* ignore */ }
          delete busMarkers[id];
        }
      });

      // add/update visible markers
      visible.forEach(bus => {
        const pos = getBusCoordinates(bus);
        if (!pos) return;
        const id = String(bus.id);
        const icon = createBusIcon(bus.status || (bus.__raw && bus.__raw.status) || 'unavailable');
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
          const status = escapeHtml(b.status || (b.__raw && b.__raw.status) || '');
          return `<button type="button" class="list-group-item list-group-item-action bus-list-item" data-bus-id="${escapeHtml(b.id)}">
              <div class="d-flex w-100 justify-content-between">
                <h6 class="mb-1">${escapeHtml(b.code)}</h6>
                <small class="text-muted">${seats}</small>
              </div>
              <p class="mb-1 small text-muted">Route: ${escapeHtml(b.route || 'Not set')}</p>
              <p class="mb-0 small text-muted">Location: ${loc} · ${status}</p>
            </button>`;
        }).join('');

        listEl.querySelectorAll('.bus-list-item').forEach(item => {
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
          const status = escapeHtml(b.status || (b.__raw && b.__raw.status) || '');
          return `<button type="button" class="list-group-item list-group-item-action bus-list-item" data-bus-id="${escapeHtml(b.id)}">
              <div class="d-flex w-100 justify-content-between">
                <h6 class="mb-1">${escapeHtml(b.code)}</h6>
                <small class="text-muted">${seats}</small>
              </div>
              <p class="mb-1 small text-muted">Route: ${escapeHtml(b.route || 'Not set')}</p>
              <p class="mb-0 small text-muted">Location: ${loc} · ${status}</p>
            </button>`;
        }).join('');

        listEl.querySelectorAll('.bus-list-item').forEach(item => {
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

    // Real-time update: prefer Server-Sent Events (SSE) and fall back to polling.
    let pollingIntervalId = null;
    let sse = null;

    function startPolling() {
      if (pollingIntervalId) return;
      updateBuses();
      pollingIntervalId = setInterval(updateBuses, 3000);
    }

    if (window.EventSource) {
      try {
        sse = new EventSource('stream_buses.php');
        sse.onmessage = (e) => {
          try {
            const json = JSON.parse(e.data);
            if (json && json.buses) {
              const buses = json.buses.map(normalizeBus);
              _lastFetchedBuses = buses;
              updateMap(buses);
              updateBusLists(buses);
              updateRouteFilters(buses);
              renderActiveBusesModal(buses);
              const ts = new Date().toLocaleTimeString();
              document.getElementById('lastUpdateFooter') && (document.getElementById('lastUpdateFooter').textContent = ts);
              document.getElementById('lastUpdateFooterDesktop') && (document.getElementById('lastUpdateFooterDesktop').textContent = ts);
            }
          } catch (err) {
            console.error('SSE parse error', err);
          }
        };
        sse.onerror = (err) => {
          console.warn('SSE error, falling back to polling', err);
          if (sse) try { sse.close(); } catch (e) {}
          sse = null;
          startPolling();
        };
        // initial fetch as a safety net
        updateBuses();
      } catch (e) {
        console.warn('SSE init failed, using polling', e);
        startPolling();
      }
    } else {
      startPolling();
    }

    // Ensure initial invalidation so Leaflet draws correctly on some mobile browsers
    setTimeout(() => map.invalidateSize(), 300);
  </script>
</body>

</html>