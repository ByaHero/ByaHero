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