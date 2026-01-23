<?php
/**
 * Bottom navigation component for ByaHero (mobile-first).
 *
 * Copy this file to public/components/navbar.php and include it from your
 * index.php where the bottom navigation used to be:
 *
 *   <?php include __DIR__ . '/components/navbar.php'; ?>
 *
 * Important:
 * - Keep the Bootstrap and Leaflet <link> tags in your <head> (do NOT duplicate them here).
 * - This component contains the bottom-nav CSS copied from index.php so you can
 *   edit the navbar styling and markup in one place.
 */
?>
<style>
  /* Bottom fixed navigation (copied from index.php) */
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

  /* Mirror index.php behavior: hide bottom-nav on large screens */
  @media (min-width: 992px) {
    .bottom-nav { display: none; }
    .map-controls { display: flex; } /* kept for parity with index page */
  }
</style>

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