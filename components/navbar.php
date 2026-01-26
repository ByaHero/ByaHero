<style>
  /* Minimal custom styles — rely on Bootstrap utilities where possible */
  .bottom-nav-custom {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1100;
    /* respect safe area inset on iOS */
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 6px);
    box-shadow: 0 -6px 18px rgba(2, 6, 23, 0.08);
  }

  .bottom-nav-btn { min-width: 56px; border-radius: 10px; }

  @media (min-width: 992px) {
    .bottom-nav-custom { display: none; }
    .map-controls { display: flex; }
  }
</style>

<nav class="bottom-nav-custom d-flex d-lg-none justify-content-around align-items-center px-2 py-2" role="navigation" aria-label="Bottom navigation" style="background: linear-gradient(135deg, var(--accent-start), var(--accent-end)); color:#fff;">
  <button class="btn btn-outline-light btn-sm d-flex flex-column align-items-center gap-1 bottom-nav-btn" id="menuBtn" title="Open menu" aria-label="Open menu" data-bs-toggle="offcanvas" data-bs-target="#sidebarOffcanvas" aria-controls="#sidebarOffcanvas">
    <span class="material-symbols-rounded">menu</span>
    <small class="text-nowrap">Menu</small>
  </button>

  <button class="btn btn-outline-light btn-sm d-flex flex-column align-items-center gap-1 bottom-nav-btn" id="activeBusesBtn" title="Active buses" aria-label="Active buses">
    <span class="material-symbols-rounded">directions_bus</span>
    <small class="text-nowrap">Active</small>
  </button>

  <button class="btn btn-outline-light btn-sm d-flex flex-column align-items-center gap-1 bottom-nav-btn" id="locateBtn" title="Locate me" aria-label="Locate me">
    <span class="material-symbols-rounded">my_location</span>
    <small class="text-nowrap">Locate</small>
  </button>

  <button class="btn btn-outline-light btn-sm d-flex flex-column align-items-center gap-1 bottom-nav-btn" id="refreshBtn" title="Refresh" aria-label="Refresh">
    <span class="material-symbols-rounded">refresh</span>
    <small class="text-nowrap">Refresh</small>
  </button>
</nav>