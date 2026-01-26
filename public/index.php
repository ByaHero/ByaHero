<!doctype html>
<html lang="en">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>ByaHero - Bus Tracker (Passenger View)</title>
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css" rel="stylesheet">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">

  <link rel="manifest" href="/ByaHero-Prototype-V3/public/manifest.webmanifest">
  <meta name="theme-color" content="#667eea">
  <link rel="apple-touch-icon" href="/ByaHero-Prototype-V3/public/icons/icon-192x192.png">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">

  <style>
    :root {
      --topbar-h: 56px;
      /* top title bar height */
      --bottombar-h: 66px;
      /* bottom navigation height */
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

    /* User location marker (person icon inside circular background) */
    .user-marker-icon {
      width: 34px;
      height: 34px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: #2563eb;
      color: #fff;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.18);
    }
    .user-marker-icon svg {
      width: 16px;
      height: 16px;
      fill: #fff;
      display: block;
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
              <div class="btn-group ms-2" role="group" aria-label="User controls">
                <button class="btn btn-sm btn-light" id="locateBtnDesktop" title="Locate me" aria-label="Locate me">
                  <span class="material-symbols-rounded">my_location</span>
                </button>
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

  <?php include("../components/scripts.php"); ?>
</body>

</html>