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
  style="bottom: 60px; height: 40%; z-index: 1050;">

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

  <div id="sheetHeader" class="flex-shrink-0 w-100 bg-white rounded-top-4 cursor-pointer">
    <div class="bg-secondary opacity-25 rounded-pill mx-auto mt-3" style="width: 40px; height: 5px;"></div>

    <div class="container-fluid px-3 pt-3">
      <div class="row g-2">
        <!-- Location tab with image icon (white when active by default) -->
        <div class="col-4" onclick="switchSheetTab('location')">
          <div id="tab-location"
            class="sheet-tab active bg-primary text-white rounded-4 p-3 d-flex justify-content-center align-items-center shadow-sm h-50 cursor-pointer">
            <img id="location-tab-icon"
              src="<?= htmlspecialchars($baseUrl, ENT_QUOTES) ?>/assets/images/icons/busStopWhiteIcon.png"
              alt="Location" style="width: 30px; height: 30px; object-fit: contain;" />
          </div>
        </div>

        <div class="col-4" onclick="switchSheetTab('groups')">
          <div id="tab-groups"
            class="sheet-tab bg-primary-subtle border border-primary text-primary rounded-4 p-3 d-flex justify-content-center align-items-center h-50 cursor-pointer">
            <span class="material-symbols-rounded fs-2">groups</span>
          </div>
        </div>

        <!-- Bus Stops tab (blue by default, will turn white when active) -->
        <div class="col-4" onclick="switchSheetTab('busstops')">
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
    <div id="view-location" class="mt-2">
      <div id="busListMobile">
        <div class="text-center text-muted mt-4 small">Loading buses...</div>
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