<?php
session_start();
require __DIR__ . '/config/db.php';

// Fetch user details if logged in
$currentUser = null;
if (isset($_SESSION['user_id'])) {
    try {
        $pdo = db();
        $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
        $stmt->execute([$_SESSION['user_id']]);
        $currentUser = $stmt->fetch();
    } catch (Exception $e) {}
}
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>ByaHero - Bus Tracker</title>
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded" rel="stylesheet" />
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <link rel="manifest" href="/ByaHero-Prototype-V3/public/manifest.webmanifest">
  <meta name="theme-color" content="#667eea">

  <style>
    /* CORE STYLES */
    :root { --topbar-h: 56px; --bottombar-h: 66px; --accent-start: #667eea; --accent-end: #764ba2; }
    html, body { height: 100%; margin: 0; font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(180deg, #f6f9ff 0%, #e9f0ff 100%); color: #111; }
    .map-container { height: calc(100vh - var(--topbar-h) - var(--bottombar-h)); min-height: 320px; }
    .offcanvas-body { padding: 1rem; }
    .legend .dot { width: 14px; height: 14px; border-radius: 50%; display: inline-block; margin-right: 8px; }
    .leaflet-popup-content { font-size: 0.95rem; line-height: 1.25; }
    .bus-item { padding: 10px; border-radius: 8px; margin-bottom: 8px; cursor: pointer; }
    .map-controls { position: absolute; top: 12px; left: 12px; z-index: 1000; display: flex; gap: 8px; align-items: center; }
    .modal-bottom .modal-dialog { position: fixed; bottom: 0; margin: 0; width: 100%; max-width: 720px; left: 50%; transform: translateX(-50%); transition: transform .2s ease-out; }
    .modal-bottom .modal-content { border-radius: 12px 12px 0 0; overflow: hidden; }

    /* PROFILE STYLES */
    .avatar-circle { width: 70px; height: 70px; background: rgba(255,255,255,0.2); color: white; font-size: 2rem; font-weight: bold; display: flex; align-items: center; justify-content: center; border-radius: 50%; margin: 0 auto 10px; border: 2px solid rgba(255,255,255,0.3); }

    @media (min-width: 992px) {
      .map-and-sidebar { display: grid; grid-template-columns: 1fr 340px; gap: 16px; }
      .map-container { height: calc(100vh - var(--topbar-h) - 32px); margin: 16px; border-radius: 10px; box-shadow: 0 6px 18px rgba(2, 6, 23, 0.06); }
      .desktop-sidebar { margin: 16px; }
      .map-controls { display: flex; }
    }
  </style>
</head>

<body>
  <nav class="navbar navbar-dark" style="background: linear-gradient(135deg, var(--accent-start), var(--accent-end)); height:var(--topbar-h)">
    <div class="container-fluid">
      <div class="d-flex align-items-center gap-3">
        <span class="navbar-brand mb-0 h6">ByaHero: Prototype V3</span>
      </div>
      <div class="ms-auto d-flex align-items-center gap-2">
        <?php if(isset($_SESSION['user_id'])): ?>
            <button class="btn btn-link text-white text-decoration-none small fw-bold d-flex align-items-center gap-1 p-0 border-0" data-bs-toggle="modal" data-bs-target="#profileModal">
                <span class="material-symbols-rounded" style="font-size:1.8rem">account_circle</span>
                <span class="d-none d-sm-inline"><?= htmlspecialchars($_SESSION['user_name'] ?? 'Profile') ?></span>
            </button>
        <?php else: ?>
            <button class="btn btn-sm btn-outline-light rounded-pill px-3" data-bs-toggle="modal" data-bs-target="#loginModal">Login</button>
        <?php endif; ?>
      </div>
    </div>
  </nav>

  <main class="container-fluid p-0">
    <div class="map-and-sidebar">
      <div id="mapWrapper" class="position-relative">
        <div id="map" class="map-container"></div>
        <div class="map-controls d-none d-lg-flex">
          <div class="btn-group" role="group">
            <button class="btn btn-sm btn-light" id="zoomIn" title="Zoom in">+</button>
            <button class="btn btn-sm btn-light" id="zoomOut" title="Zoom out">−</button>
          </div>
        </div>
      </div>
      <aside class="desktop-sidebar d-none d-lg-block">
        <div class="card">
          <div class="card-body">
            <h5 class="card-title">Filters & Active Buses</h5>
            <div class="mb-3">
              <label for="routeFilterDesktop" class="form-label">Filter by Route</label>
              <select id="routeFilterDesktop" class="form-select"><option value="">All Routes</option></select>
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

    <div class="offcanvas offcanvas-start" tabindex="-1" id="sidebarOffcanvas">
      <div class="offcanvas-header">
        <h5 class="offcanvas-title">Menu</h5>
        <button type="button" class="btn-close text-reset" data-bs-dismiss="offcanvas"></button>
      </div>
      <div class="offcanvas-body">
        <div class="mb-4 p-3 bg-light rounded-3 text-center">
            <?php if(isset($_SESSION['user_id'])): ?>
                <div class="fw-bold mb-1">Hello, <?= htmlspecialchars($_SESSION['user_name'] ?? 'User') ?></div>
                <button class="btn btn-primary btn-sm w-100 mb-2" data-bs-toggle="modal" data-bs-target="#profileModal">View Profile</button>
            <?php else: ?>
                <p class="small text-muted mb-2">Sign in to sync preferences.</p>
                <div class="d-grid gap-2">
                    <button class="btn btn-outline-primary btn-sm" data-bs-toggle="modal" data-bs-target="#loginModal">Login</button>
                    <button class="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#signupModal">Sign Up</button>
                </div>
            <?php endif; ?>
        </div>
        <hr class="mb-3">
        
        <div class="mb-3">
          <label for="routeFilter" class="form-label">Filter by Route</label>
          <select id="routeFilter" class="form-select"><option value="">All Routes</option></select>
        </div>

        <div class="mb-3 legend">
          <h6>Bus Status</h6>
          <div class="mb-1"><span class="dot" style="background:#10b981"></span> Available</div>
          <div class="mb-1"><span class="dot" style="background:#f59e0b"></span> On Stop</div>
          <div class="mb-1"><span class="dot" style="background:#ef4444"></span> Full</div>
          <div class="mb-1"><span class="dot" style="background:#6b7280"></span> Unavailable</div>
        </div>

        <h6>Active Buses (<span id="busCount">0</span>)</h6>
        <div id="busList" class="mt-2" aria-live="polite"></div>
      </div>
    </div>
  </main>

  <div class="modal fade" id="activeBusesModal" tabindex="-1">
    <div class="modal-dialog modal-bottom">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Active Buses</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <div id="activeBusesList" class="list-group"></div>
        </div>
      </div>
    </div>
  </div>

  <div class="modal fade" id="loginModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content border-0 shadow">
        <div class="modal-header border-0">
            <h5 class="modal-title fw-bold">Welcome Back</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body px-4 pb-4">
            <div id="loginAlert"></div>
            <form id="loginForm">
                <input type="hidden" name="action" value="login">
                <div class="mb-3"><label class="form-label small fw-bold">Email</label><input type="email" name="email" class="form-control" required></div>
                <div class="mb-3"><label class="form-label small fw-bold">Password</label><input type="password" name="password" class="form-control" required></div>
                <div class="d-grid"><button type="submit" class="btn btn-primary">Login</button></div>
            </form>
            <div class="text-center mt-3 small">Don't have an account? <a href="#" data-bs-target="#signupModal" data-bs-toggle="modal">Sign up</a></div>
        </div>
      </div>
    </div>
  </div>

  <div class="modal fade" id="signupModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content border-0 shadow">
        <div class="modal-header border-0">
            <h5 class="modal-title fw-bold">Create Account</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body px-4 pb-4">
            <div id="signupAlert"></div>
            <form id="signupForm">
                <input type="hidden" name="action" value="signup">
                <div class="mb-3"><label class="form-label small fw-bold">Full Name</label><input type="text" name="name" class="form-control" required></div>
                <div class="mb-3"><label class="form-label small fw-bold">Email</label><input type="email" name="email" class="form-control" required></div>
                <div class="mb-3"><label class="form-label small fw-bold">Password</label><input type="password" name="password" class="form-control" required></div>
                <div class="mb-3"><label class="form-label small fw-bold">Confirm Password</label><input type="password" name="confirm_password" class="form-control" required></div>
                <div class="d-grid"><button type="submit" class="btn btn-primary">Sign Up</button></div>
            </form>
            <div class="text-center mt-3 small">Already have an account? <a href="#" data-bs-target="#loginModal" data-bs-toggle="modal">Login</a></div>
        </div>
      </div>
    </div>
  </div>

  <?php if(isset($_SESSION['user_id'])): ?>
  <div class="modal fade" id="profileModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content border-0 shadow">
        <div class="modal-body p-0">
            <div class="text-center text-white pt-4 pb-3" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                <div class="avatar-circle"><?= strtoupper(substr($_SESSION['user_name'], 0, 1)) ?></div>
                <h5 class="fw-bold mb-1"><?= htmlspecialchars($_SESSION['user_name']) ?></h5>
                <p class="small opacity-75"><?= htmlspecialchars($currentUser['email'] ?? '') ?></p>
            </div>
            <ul class="nav nav-tabs nav-fill" role="tablist">
                <li class="nav-item"><button class="nav-link active" data-bs-toggle="tab" data-bs-target="#tab-info" type="button">My Info</button></li>
                <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#tab-settings" type="button">Settings</button></li>
            </ul>
            <div class="tab-content p-4">
                <div class="tab-pane fade show active" id="tab-info">
                    <div class="d-flex align-items-center mb-3">
                        <span class="material-symbols-rounded text-primary me-3">badge</span>
                        <div><div class="small text-muted">Role</div><div class="fw-medium text-capitalize"><?= htmlspecialchars($_SESSION['user_role'] ?? 'Passenger') ?></div></div>
                    </div>
                    <?php if($_SESSION['user_role'] === 'conductor'): ?>
                    <a href="conductor.php" class="btn btn-outline-success w-100 mt-3">Conductor Dashboard</a>
                    <?php endif; ?>
                </div>
                <div class="tab-pane fade" id="tab-settings">
                    <h6 class="text-primary fw-bold mb-3 small text-uppercase">Preferences</h6>
                    <div class="mb-3">
                        <label class="form-label small fw-bold">Map Refresh Rate</label>
                        <select id="refreshRateSelect" class="form-select form-select-sm">
                            <option value="3000">Fast (3s)</option>
                            <option value="5000">Normal (5s)</option>
                            <option value="10000">Slow (10s)</option>
                        </select>
                    </div>
                    <div class="form-check form-switch mb-4">
                        <input class="form-check-input" type="checkbox" id="darkModeSwitch">
                        <label class="form-check-label small fw-bold" for="darkModeSwitch">Dark Mode</label>
                    </div>
                    <hr>
                    <div id="settingsAlert"></div>
                    <form id="updateProfileForm" class="mb-3">
                        <input type="hidden" name="action" value="update_profile">
                        <div class="input-group input-group-sm mb-2">
                            <input type="text" name="name" class="form-control" value="<?= htmlspecialchars($_SESSION['user_name']) ?>" required>
                            <button class="btn btn-outline-primary" type="submit">Update Name</button>
                        </div>
                    </form>
                    <form id="changePasswordForm">
                        <input type="hidden" name="action" value="change_password">
                        <div class="mb-2"><input type="password" name="current_password" class="form-control form-control-sm" placeholder="Current Password" required></div>
                        <div class="mb-2"><input type="password" name="new_password" class="form-control form-control-sm" placeholder="New Password" required></div>
                        <div class="mb-2"><input type="password" name="confirm_password" class="form-control form-control-sm" placeholder="Confirm" required></div>
                        <button class="btn btn-outline-danger btn-sm w-100" type="submit">Change Password</button>
                    </form>
                </div>
            </div>
            <div class="modal-footer bg-light"><a href="logout.php" class="btn btn-sm btn-secondary w-100">Logout</a></div>
        </div>
      </div>
    </div>
  </div>
  <?php endif; ?>

  <?php include("../components/navbar.php"); ?>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>

  <script>
    document.addEventListener('DOMContentLoaded', () => {
        const ajaxSubmit = (id, alertId, reload=false) => {
            const f = document.getElementById(id);
            if(!f) return;
            f.addEventListener('submit', async e => {
                e.preventDefault();
                const alert = document.getElementById(alertId);
                alert.innerHTML = '';
                try {
                    const r = await fetch('auth_api.php', { method: 'POST', body: new FormData(f) });
                    const d = await r.json();
                    if(d.success) {
                        alert.innerHTML = `<div class="alert alert-success py-1 small">${d.message||'Success'}</div>`;
                        
                        // Check if server provided a specific redirect URL (e.g. for conductors)
                        if (d.redirect) {
                            setTimeout(() => window.location.href = d.redirect, 800);
                        } 
                        // Otherwise fallback to simple reload if requested
                        else if(reload) {
                            setTimeout(() => location.reload(), 800);
                        }
                        
                        f.reset();
                    } else {
                        alert.innerHTML = `<div class="alert alert-danger py-1 small">${d.message||'Error'}</div>`;
                    }
                } catch(err) { alert.innerHTML = `<div class="alert alert-danger py-1 small">Error</div>`; }
            });
        };
        
        ajaxSubmit('loginForm', 'loginAlert', true);
        ajaxSubmit('signupForm', 'signupAlert');
        ajaxSubmit('updateProfileForm', 'settingsAlert', true);
        ajaxSubmit('changePasswordForm', 'settingsAlert');

        const refreshSel = document.getElementById('refreshRateSelect');
        if(refreshSel) {
            refreshSel.value = localStorage.getItem('byahero_refresh_rate') || 3000;
            refreshSel.addEventListener('change', e => {
                localStorage.setItem('byahero_refresh_rate', e.target.value);
                if(window.pollingId) { clearInterval(window.pollingId); window.pollingId = setInterval(updateBuses, parseInt(e.target.value)); }
            });
        }
        const darkSw = document.getElementById('darkModeSwitch');
        const applyDark = (isDark) => {
            document.body.style.background = isDark ? '#1e293b' : '';
            document.body.style.color = isDark ? '#fff' : '';
            const m = document.getElementById('map');
            if(m) m.style.filter = isDark ? "invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%)" : "";
        };
        if(darkSw) {
            const isDark = localStorage.getItem('byahero_dark_mode') === 'true';
            darkSw.checked = isDark;
            applyDark(isDark);
            darkSw.addEventListener('change', e => {
                localStorage.setItem('byahero_dark_mode', e.target.checked);
                applyDark(e.target.checked);
            });
        } else if (localStorage.getItem('byahero_dark_mode') === 'true') {
            applyDark(true);
        }
    });
  </script>

  <script>
    const map = L.map('map', { zoomControl: false }).setView([14.5995, 120.9842], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: 'Maps', maxZoom: 19 }).addTo(map);

    document.getElementById('zoomIn')?.addEventListener('click', () => map.zoomIn());
    document.getElementById('zoomOut')?.addEventListener('click', () => map.zoomOut());

    const offcanvasEl = document.getElementById('sidebarOffcanvas');
    if (offcanvasEl) {
      offcanvasEl.addEventListener('shown.bs.offcanvas', () => setTimeout(() => map.invalidateSize(), 200));
      offcanvasEl.addEventListener('hidden.bs.offcanvas', () => setTimeout(() => map.invalidateSize(), 200));
    }
    window.addEventListener('orientationchange', () => setTimeout(() => map.invalidateSize(), 300));
    window.addEventListener('resize', () => setTimeout(() => map.invalidateSize(), 250));

    const busMarkers = {};
    let selectedRoute = '';
    let _lastFetchedBuses = [];
    const statusColors = { available: '#10b981', on_stop: '#f59e0b', full: '#ef4444', unavailable: '#6b7280' };

    function createBusIcon(status) {
      const color = statusColors[status] || '#6b7280';
      return L.divIcon({
        html: `<div style="background:${color};width:30px;height:30px;border-radius:50%;border:3px solid #fff;box-shadow:0 1px 2px rgba(0,0,0,0.15)"></div>`,
        className: 'bus-marker',
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });
    }

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
      } catch (e) { console.warn('parse error', e); }
      return { coords: null, name: null };
    }

    function getBusCoordinates(bus) {
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

    function isActiveBus(bus) {
      // If explicit status indicates 'unavailable' or 'stopped', treat as inactive
      const rawStatus = (bus.status || (bus.__raw && (bus.__raw.status || bus.__raw.tracking_state || '')) || '').toString().toLowerCase();
      const inactiveStatuses = ['unavailable', 'stopped', 'inactive', 'off', 'not_tracking', 'stopped_tracking', 'disabled', 'offline'];
      if (inactiveStatuses.includes(rawStatus)) return false;

      // If raw flags indicate tracking false, treat as inactive
      const raw = bus.__raw || {};
      if (raw.tracking === false || raw.is_tracking === false || raw.is_active === false) return false;

      // If there's an updated_at and it's stale (older than 5 minutes), consider it inactive
      if (bus.updated_at) {
        const ts = Date.parse(bus.updated_at);
        if (!isNaN(ts) && (Date.now() - ts) > (5 * 60 * 1000)) return false;
      }

      // Otherwise active
      return true;
    }

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
        return `<button type="button" class="list-group-item list-group-item-action active-bus-item d-flex justify-content-between align-items-start" data-bus-id="${escapeHtml(b.id)}"><div class="ms-2 me-auto"><div class="fw-bold">${escapeHtml(b.code)}</div><div class="small text-muted">Route: ${escapeHtml(b.route || 'Not set')}</div><div class="small text-muted">Location: ${loc}</div></div><div class="text-end small text-muted"><div>${seats}</div><div>${status}</div></div></button>`;
      }).join('');
      listEl.querySelectorAll('.active-bus-item').forEach(item => {
        item.addEventListener('click', () => {
          const id = item.getAttribute('data-bus-id');
          const marker = busMarkers[id];
          const modalInstance = bootstrap.Modal.getInstance(document.getElementById('activeBusesModal'));
          if (marker) {
            map.flyTo(marker.getLatLng(), 16, { duration: 0.7 });
            setTimeout(() => marker.openPopup(), 700);
          } else { alert('Location for this bus is not available on the map.'); }
          if (modalInstance) modalInstance.hide();
        });
      });
    }

    const activeBusesModalEl = document.getElementById('activeBusesModal');
    let activeBusesModalInstance = null;
    if (activeBusesModalEl) {
      activeBusesModalEl.addEventListener('hidden.bs.modal', () => { activeBusesModalInstance = null; });
    }

    const activeBtn = document.getElementById('activeBusesBtn');
    activeBtn?.addEventListener('click', () => {
      if (!activeBusesModalEl) return;
      if (activeBusesModalEl.classList.contains('show')) {
        const inst = bootstrap.Modal.getInstance(activeBusesModalEl) || activeBusesModalInstance;
        if (inst) { inst.hide(); } else { activeBusesModalEl.classList.remove('show'); document.querySelectorAll('.modal-backdrop').forEach(b => b.remove()); }
        return;
      }
      renderActiveBusesModal(_lastFetchedBuses || []);
      if (!activeBusesModalInstance) { activeBusesModalInstance = new bootstrap.Modal(activeBusesModalEl, { backdrop: true }); }
      activeBusesModalInstance.show();
    });

    document.getElementById('locateBtn')?.addEventListener('click', () => {
      if (!navigator.geolocation) { alert('Geolocation is not supported by your browser.'); return; }
      navigator.geolocation.getCurrentPosition(pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        map.setView([lat, lng], 16);
        const t = L.circleMarker([lat, lng], { radius: 8, color: '#fff', fillColor: '#2563eb', fillOpacity: 0.9 }).addTo(map);
        setTimeout(() => { try { map.removeLayer(t); } catch (e) {} }, 4000);
      }, err => { console.warn('geo error', err); alert('Unable to determine location.'); }, { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 });
    });

    async function updateBuses() {
      try {
        const res = await fetch('api.php?action=get_buses', { cache: 'no-store' });
        if (!res.ok) throw new Error('Network response was not ok: ' + res.status);
        const json = await res.json();
        if (json && json.buses) {
          // Normalize and filter inactive buses client-side as a safety net.
          const busesRaw = json.buses.map(normalizeBus);
          const buses = busesRaw.filter(isActiveBus);
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
        }
      } catch (e) { console.error('Failed to update buses', e); }
    }

    function updateMap(buses) {
      // Only include buses for display (respecting selectedRoute)
      const filtered = buses.filter(b => !selectedRoute || selectedRoute === '' || b.route === selectedRoute);

      // Remove markers for buses that are no longer in the filtered set OR no longer have coordinates
      Object.keys(busMarkers).forEach(id => {
        const found = filtered.find(b => String(b.id) === String(id));
        const hasCoords = found ? (getBusCoordinates(found) !== null) : false;
        if (!found || !hasCoords) {
          try { map.removeLayer(busMarkers[id]); } catch (e) {}
          delete busMarkers[id];
        }
      });

      // Add/update markers for buses that have coordinates
      filtered.forEach(bus => {
        const pos = getBusCoordinates(bus);
        if (!pos) return;
        const id = String(bus.id);
        const icon = createBusIcon((bus.status || (bus.__raw && bus.__raw.status) || 'unavailable').toLowerCase());
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

      if (!window._mapHasBeenFitted && Object.keys(busMarkers).length > 0) {
        const group = L.featureGroup(Object.values(busMarkers));
        map.fitBounds(group.getBounds().pad(0.08));
        window._mapHasBeenFitted = true;
      }
      setTimeout(() => map.invalidateSize(), 150);
    }

    function updateBusLists(buses) {
      (function() {
        const listEl = document.getElementById('busList');
        const countEl = document.getElementById('busCount');
        const filtered = buses.filter(b => !selectedRoute || selectedRoute === '' || b.route === selectedRoute);
        const visible = filtered.filter(b => getBusCoordinates(b) !== null);
        countEl && (countEl.textContent = visible.length);
        if (!listEl) return;
        if (visible.length === 0) { listEl.innerHTML = '<p class="text-muted small">No buses available</p>'; return; }
        listEl.innerHTML = visible.map(b => {
          const loc = escapeHtml(getBusLocationName(b) || 'Unknown');
          const seats = `${escapeHtml(b.seats_available)} / ${escapeHtml(b.seats_total)}`;
          const status = escapeHtml(b.status || (b.__raw && b.__raw.status) || '');
          return `<div class="bus-item border" data-bus-id="${escapeHtml(b.id)}"><strong>${escapeHtml(b.code)}</strong><div class="small text-muted">Route: ${escapeHtml(b.route || 'Not set')}</div><div class="small text-muted">Location: ${loc}</div><div class="small text-muted">Seats: ${seats} · ${status}</div></div>`;
        }).join('');
        listEl.querySelectorAll('.bus-item').forEach(item => {
          item.addEventListener('click', () => {
            const id = item.getAttribute('data-bus-id');
            const marker = busMarkers[id];
            if (marker) {
              map.flyTo(marker.getLatLng(), 16, { duration: 0.7 });
              setTimeout(() => marker.openPopup(), 700);
              const off = bootstrap.Offcanvas.getInstance(offcanvasEl);
              if (off) off.hide();
            } else { alert('Location for this bus is not available on the map.'); }
          });
        });
      })();

      (function() {
        const listEl = document.getElementById('busListDesktop');
        const countEl = document.getElementById('busCountDesktop');
        const filtered = buses.filter(b => !selectedRoute || selectedRoute === '' || b.route === selectedRoute);
        const visible = filtered.filter(b => getBusCoordinates(b) !== null);
        countEl && (countEl.textContent = visible.length);
        if (!listEl) return;
        if (visible.length === 0) { listEl.innerHTML = '<p class="text-muted small">No buses available</p>'; return; }
        listEl.innerHTML = visible.map(b => {
          const loc = escapeHtml(getBusLocationName(b) || 'Unknown');
          const seats = `${escapeHtml(b.seats_available)} / ${escapeHtml(b.seats_total)}`;
          const status = escapeHtml(b.status || (b.__raw && b.__raw.status) || '');
          return `<div class="bus-item border" data-bus-id="${escapeHtml(b.id)}"><strong>${escapeHtml(b.code)}</strong><div class="small text-muted">Route: ${escapeHtml(b.route || 'Not set')}</div><div class="small text-muted">Location: ${loc}</div><div class="small text-muted">Seats: ${seats} · ${status}</div></div>`;
        }).join('');
        listEl.querySelectorAll('.bus-item').forEach(item => {
          item.addEventListener('click', () => {
            const id = item.getAttribute('data-bus-id');
            const marker = busMarkers[id];
            if (marker) {
              map.flyTo(marker.getLatLng(), 16, { duration: 0.7 });
              setTimeout(() => marker.openPopup(), 700);
            } else { alert('Location for this bus is not available on the map.'); }
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
      forEachSel(document.getElementById('routeFilterDesktop'));
    }

    document.getElementById('routeFilter')?.addEventListener('change', e => { selectedRoute = e.target.value; updateBuses(); });
    document.getElementById('routeFilterDesktop')?.addEventListener('change', e => {
      selectedRoute = e.target.value;
      const mobileSel = document.getElementById('routeFilter');
      if (mobileSel) mobileSel.value = selectedRoute;
      updateBuses();
    });

    document.getElementById('refreshBtn')?.addEventListener('click', () => updateBuses());

    // STARTUP (Modified for dynamic Refresh Rate)
    const savedRate = parseInt(localStorage.getItem('byahero_refresh_rate') || 3000);
    updateBuses();
    window.pollingId = setInterval(updateBuses, savedRate);

    setTimeout(() => map.invalidateSize(), 300);
  </script>

  <script>
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function() {
        navigator.serviceWorker.register('/ByaHero-Prototype-V3/public/sw.js')
          .then(function(reg) { console.log('SW registered', reg); })
          .catch(function(err) { console.warn('SW registration failed', err); });
      });
    }
  </script>
</body>
</html>