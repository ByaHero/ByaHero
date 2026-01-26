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

    @media (min-width: 992px) {
      .map-container {
        height: calc(100vh - var(--topbar-h) - 32px);
      }

      /* Desktop: keep the floating controls for map */
      .map-controls { display: flex; }
    }
  </style>