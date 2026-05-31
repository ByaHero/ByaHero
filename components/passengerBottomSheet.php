<?php
// Optional safety: if $baseUrl is not defined by the parent, default to empty string
if (!isset($baseUrl)) {
  $scriptName = $_SERVER['SCRIPT_NAME'] ?? '';
  $publicDir = rtrim(str_replace('\\', '/', dirname($scriptName)), '/');
  // This strips "/public/..." from the URL path so it works in localhost and InfinityFree
  $baseUrl = preg_replace('~/public/.*$~', '', $publicDir) ?: '';
}
?>

<script>
  window.APP_BASE_URL = <?= json_encode($baseUrl, JSON_UNESCAPED_SLASHES) ?>;
</script>

<div id="bottomSheet"
  class="bottom-sheet bg-white rounded-top-4 shadow-lg d-flex flex-column position-absolute start-0 w-100 sheet-transition"
  style="bottom: 60px; height: 35%; z-index: 1050;">

  <div id="my-location-btn-container" class="position-absolute w-100" style="top: -60px; z-index: 1060;">
    <div class="my-location-btn-wrap position-absolute end-0 me-3">
      <button type="button" onclick="centerToMyLocation()"
        class="btn bg-white rounded-circle shadow border-0 d-flex align-items-center justify-content-center"
        style="width: 48px; height: 48px;" aria-label="Center to my location" title="Center to my location">

        <span class="bg-primary" style="width: 24px; height: 24px; 
                     -webkit-mask: url('../../assets/images/icons/my_location.svg') no-repeat center / contain; 
                     mask: url('../../assets/images/icons/my_location.svg') no-repeat center / contain;">
        </span>

      </button>
    </div>
  </div>

  <div id="sheetHeader" class="flex-shrink-0 w-100 bg-white rounded-top-4">
    <div class="sheet-drag-handle bg-secondary opacity-25 rounded-pill mx-auto mt-3"
      style="width: 100px; height: 7px; cursor: pointer;">
    </div>

    <div class="container-fluid px-3 pt-4">
      <div class="row g-3">
        <div class="col-3" onclick="switchSheetTab('location')">
          <div id="tab-location"
            class="sheet-tab active bg-primary text-white rounded-pill d-flex justify-content-center align-items-center cursor-pointer"
            style="height: 44px; padding: 0 18px;">
            <img class="tab-icon-active"
              src="<?= htmlspecialchars($baseUrl, ENT_QUOTES) ?>/assets/images/icons/busStopWhiteIcon.png"
              alt="Location" style="width: 26px; height: 26px; object-fit: contain;" />
            <img class="tab-icon-idle"
              src="<?= htmlspecialchars($baseUrl, ENT_QUOTES) ?>/assets/images/icons/busStopBlueIcon.png"
              alt="Location" style="width: 26px; height: 26px; object-fit: contain;" />
          </div>
        </div>

        <div class="col-3" onclick="switchSheetTab('routes')">
          <div id="tab-routes"
            class="sheet-tab bg-primary-subtle text-primary rounded-pill d-flex justify-content-center align-items-center cursor-pointer"
            style="height: 44px; padding: 0 18px;">
            <img class="tab-icon-active"
              src="<?= htmlspecialchars($baseUrl, ENT_QUOTES) ?>/assets/images/icons/routes active.svg" alt="Routes"
              style="width: 26px; height: 26px; object-fit: contain;" />
            <img class="tab-icon-idle"
              src="<?= htmlspecialchars($baseUrl, ENT_QUOTES) ?>/assets/images/icons/routes idle.svg" alt="Routes"
              style="width: 26px; height: 26px; object-fit: contain;" />
          </div>
        </div>

        <div class="col-3" onclick="switchSheetTab('groups')">
          <div id="tab-groups"
            class="sheet-tab bg-primary-subtle text-primary rounded-pill d-flex justify-content-center align-items-center cursor-pointer"
            style="height: 44px; padding: 0 18px;">
            <img class="tab-icon-active"
              src="<?= htmlspecialchars($baseUrl, ENT_QUOTES) ?>/assets/images/icons/groupsActive.svg"
              alt="Groups" style="width: 26px; height: 26px; object-fit: contain;" />
            <img class="tab-icon-idle"
              src="<?= htmlspecialchars($baseUrl, ENT_QUOTES) ?>/assets/images/icons/groupsIdle.svg"
              alt="Groups" style="width: 26px; height: 26px; object-fit: contain;" />
          </div>
        </div>

        <div class="col-3" onclick="switchSheetTab('busstops')">
          <div id="tab-busstops"
            class="sheet-tab bg-primary-subtle text-primary rounded-pill d-flex justify-content-center align-items-center cursor-pointer"
            style="height: 44px; padding: 0 18px;">
            <img class="tab-icon-active"
              src="<?= htmlspecialchars($baseUrl, ENT_QUOTES) ?>/assets/images/icons/busStopMarkerFinalWhite.svg"
              alt="Bus Stops" style="width: 26px; height: 26px; object-fit: contain;" />
            <img class="tab-icon-idle"
              src="<?= htmlspecialchars($baseUrl, ENT_QUOTES) ?>/assets/images/icons/busStopMarkerFinalBlue.svg"
              alt="Bus Stops" style="width: 26px; height: 26px; object-fit: contain;" />
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="flex-grow-1 pb-4 px-3 bottom-sheet-body" style="min-height: 0;">
    
    <div id="view-location" class="mt-3">
      <div class="d-flex align-items-center justify-content-between mb-3">
        <div class="fw-bold text-black" style="font-size: 0.95rem; letter-spacing: 0.03em; text-transform: uppercase;">
          BUS LOCATION
        </div>
      </div>
      
      <div id="busListMobile">
        <div class="text-center mt-4">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    </div>

    <div id="view-routes" class="mt-3 d-none">
      
      <div class="d-flex align-items-center justify-content-between mb-3">
        <div class="fw-bold text-black" style="font-size: 0.95rem; letter-spacing: 0.03em;">
          FILTER ROUTES
        </div>
      </div>

      <div class="route-filter-options d-flex flex-column gap-2">
        <div class="route-filter-option" id="route-pill-tanauan-laurel" data-route="TANAUAN - LAUREL"
          onclick="setRouteFromSheet('TANAUAN - LAUREL')">
          Tanauan - Laurel
        </div>

        <div class="route-filter-option" id="route-pill-laurel-tanauan" data-route="LAUREL - TANAUAN"
          onclick="setRouteFromSheet('LAUREL - TANAUAN')">
          Laurel - Tanauan
        </div>

        <div class="route-filter-option route-filter-option--all" id="route-pill-all" data-route=""
          onclick="setRouteFromSheet('')">
          All Routes
        </div>
      </div>
    </div>

    <?php
    include __DIR__ . '/../public/passenger/groupView.php';
    ?>

    <div id="view-busstops" class="mt-3 d-none">
      <div class="d-flex align-items-center justify-content-between mb-3">
        <div class="fw-bold text-black" style="font-size: 0.95rem; letter-spacing: 0.03em;">
          BUS PICK UP POINTS 
        </div>
        <button id="stopsRouteToggle" class="btn rounded-pill d-flex align-items-center gap-1 px-3 py-1 border-0" onclick="toggleStopsRoute()" style="background-color: #f3f4f6; color: #000000; font-size: 0.7rem; font-weight: bold; letter-spacing: 0.02em;">
          <span id="stopsRouteText">LAUREL - TANAUAN</span>
          <img src="<?= htmlspecialchars($baseUrl, ENT_QUOTES) ?>/assets/images/swap.svg" id="stopsRouteIcon" style="width: 16px; height: 16px; transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);" alt="swap">
        </button>
      </div>

      <div id="busStopsListMobile" class="bus-stops-list">
        <div class="text-center mt-4">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>