<?php
// Optional safety: if $baseUrl is not defined by the parent, default to empty string
if (!isset($baseUrl)) {
  $scriptName = $_SERVER['SCRIPT_NAME'] ?? '';
  $publicDir = rtrim(str_replace('\\', '/', dirname($scriptName)), '/');
  // This strips "/public/..." from the URL path so it works in localhost and InfinityFree
  $baseUrl = preg_replace('~/public/.*$~', '', $publicDir) ?: '';
}
?>

<!-- Expose base URL to JS so icons work both locally and on InfinityFree -->
<script>
  window.APP_BASE_URL = <?= json_encode($baseUrl, JSON_UNESCAPED_SLASHES) ?>;
</script>

<div id="bottomSheet"
  class="bottom-sheet bg-white rounded-top-4 shadow-lg d-flex flex-column position-absolute start-0 w-100 sheet-transition"
  style="bottom: 60px; height: 35%; z-index: 1050;">

  <!-- SOS (centered) + Locate button (right-most corner) -->
  <div class="position-absolute w-100" style="top: -60px; z-index: 1060;">
    <!-- Right-most Locate/Center button -->
    <div class="position-absolute end-0 me-3">
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
    <!-- Add a class so JS knows this small pill is the drag handle -->
    <div class="sheet-drag-handle bg-secondary opacity-25 rounded-pill mx-auto mt-3"
      style="width: 40px; height: 5px; cursor: pointer;"></div>

    <div class="container-fluid px-3 pt-3">
      <div class="row g-2">
        <!-- 1) Location tab (same as before) -->
        <div class="col-3" onclick="switchSheetTab('location')">
          <div id="tab-location"
            class="sheet-tab active bg-primary text-white rounded-4 p-3 d-flex justify-content-center align-items-center shadow-sm h-50 cursor-pointer">
            <img id="location-tab-icon"
              src="<?= htmlspecialchars($baseUrl, ENT_QUOTES) ?>/assets/images/icons/busStopWhiteIcon.png"
              alt="Location" style="width: 30px; height: 30px; object-fit: contain;" />
          </div>
        </div>

        <!-- 2) NEW Routes tab (using your new icons) -->
        <div class="col-3" onclick="switchSheetTab('routes')">
          <div id="tab-routes"
            class="sheet-tab bg-primary-subtle border border-primary text-primary rounded-4 p-3 d-flex justify-content-center align-items-center h-50 cursor-pointer">
            <img id="routes-tab-icon"
              src="<?= htmlspecialchars($baseUrl, ENT_QUOTES) ?>/assets/images/icons/routes idle1.svg"
              alt="Routes" style="width: 30px; height: 30px; object-fit: contain;" />
          </div>
        </div>

        <!-- 3) Groups tab (unchanged, but column width adjusted) -->
        <div class="col-3" onclick="switchSheetTab('groups')">
          <div id="tab-groups"
            class="sheet-tab bg-primary-subtle border border-primary text-primary rounded-4 p-3 d-flex justify-content-center align-items-center h-50 cursor-pointer">
            <span class="material-symbols-rounded fs-2">groups</span>
          </div>
        </div>

        <!-- 4) Bus Stops tab -->
        <div class="col-3" onclick="switchSheetTab('busstops')">
          <div id="tab-busstops"
            class="sheet-tab bg-primary-subtle border border-primary text-primary rounded-4 p-3 d-flex justify-content-center align-items-center h-50 cursor-pointer">
            <img id="busstops-tab-icon"
              src="<?= htmlspecialchars($baseUrl, ENT_QUOTES) ?>/assets/images/icons/busStopMarkerFinalBlue.svg"
              alt="Bus Stops" style="width: 30px; height: 30px; object-fit: contain;" />
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="flex-grow-1 overflow-y-auto pb-4 px-3" style="min-height: 0;">
    <!-- LOCATION VIEW (same) -->
    <div id="view-location" class="mt-2">
      <div id="busListMobile">
        <div class="text-center text-muted mt-4 small">Loading buses...</div>
      </div>
    </div>

    <!-- ROUTES VIEW (updated design only) -->
    <div id="view-routes" class="mt-2 d-none">
      <div class="fw-bold mb-2">Filter Route</div>

      <div class="route-filter-card">
        <!-- Search pill -->
        <div class="route-filter-search d-flex align-items-center">
          <span class="material-symbols-rounded route-filter-search-icon">search</span>
          <input type="text"
            id="routeFilterInput"
            class="route-filter-input"
            placeholder="Filter Route"
            oninput="filterRouteOptions()" />
        </div>

        <!-- Options list -->
        <div class="route-filter-options mt-2">
          <!-- Tanauan - Laurel -->
          <button type="button"
            class="route-filter-option"
            data-route="TANAUAN - LAUREL"
            onclick="setRouteFromSheet('TANAUAN - LAUREL')">
            Tanauan - Laurel
          </button>

          <!-- Laurel - Tanauan -->
          <button type="button"
            class="route-filter-option"
            data-route="LAUREL - TANAUAN"
            onclick="setRouteFromSheet('LAUREL - TANAUAN')">
            Laurel - Tanauan
          </button>

          <!-- All routes -->
          <button type="button"
            class="route-filter-option route-filter-option--all"
            data-route=""
            onclick="setRouteFromSheet('')">
            All Routes
          </button>
        </div>
      </div>
    </div>

    <?php
    include __DIR__ . '/../public/passenger/groupView.php';
    ?>

    <!-- Bus Stops view -->
    <div id="view-busstops" class="mt-2 d-none">
      <div class="d-flex align-items-center justify-content-between mb-2">
        <div class="fw-bold">Bus Stops</div>
        <div class="small text-muted">Stops &amp; terminals</div>
      </div>

      <div id="busStopsListMobile" class="list-group list-group-flush">
        <div class="text-center text-muted mt-4 small">Loading bus stops...</div>
      </div>
    </div>
  </div>
</div>