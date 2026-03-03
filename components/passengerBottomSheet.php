<div id="bottomSheet"
  class="bottom-sheet bg-white rounded-top-4 shadow-lg d-flex flex-column position-absolute start-0 w-100 sheet-transition"
  style="bottom: 60px; height: 40%; z-index: 1050;">

  <!-- SOS (centered) + Locate button (right-most corner) -->
  <div class="position-absolute w-100" style="top: -60px; z-index: 1060;">
    <!-- Centered SOS -->
    <div class="position-absolute start-50 translate-middle-x">
      <button onclick="window.location.href='sos/sos.php'"
        class="btn bg-white rounded-pill shadow px-4 py-2 d-flex align-items-center gap-2 border-0">
        <span class="material-symbols-rounded fs-2 text-primary"
          style="font-variation-settings: 'FILL' 1;">verified_user</span>
        <span class="text-primary fw-bold">SOS</span>
      </button>
    </div>

    <!-- Right-most Locate/Center button -->
    <div class="position-absolute end-0 me-3">
      <button type="button" onclick="centerToMyLocation()"
        class="btn bg-white rounded-circle shadow border-0 d-flex align-items-center justify-content-center"
        style="width: 48px; height: 48px;" aria-label="Center to my location" title="Center to my location">
        <span class="material-symbols-rounded text-primary"
          style="font-variation-settings: 'FILL' 1;">my_location</span>
      </button>
    </div>
  </div>

  <div id="sheetHeader" class="flex-shrink-0 w-100 bg-white rounded-top-4 cursor-pointer">
    <div class="bg-secondary opacity-25 rounded-pill mx-auto mt-3" style="width: 40px; height: 5px;"></div>

    <div class="container-fluid px-3 pt-3">
      <div class="row g-2">
        <div class="col-4" onclick="switchSheetTab('location')">
          <div id="tab-location"
            class="sheet-tab active bg-primary text-white rounded-4 p-3 d-flex justify-content-center align-items-center shadow-sm h-50 cursor-pointer">
            <span class="material-symbols-rounded fs-2">location_on</span>
          </div>
        </div>

        <div class="col-4" onclick="switchSheetTab('groups')">
          <div id="tab-groups"
            class="sheet-tab bg-primary-subtle border border-primary text-primary rounded-4 p-3 d-flex justify-content-center align-items-center h-50 cursor-pointer">
            <span class="material-symbols-rounded fs-2">groups</span>
          </div>
        </div>

        <!-- ✅ Bus Stops tab -->
        <div class="col-4" onclick="switchSheetTab('busstops')">
          <div id="tab-busstops"
            class="sheet-tab bg-primary-subtle border border-primary text-primary rounded-4 p-3 d-flex justify-content-center align-items-center h-50 cursor-pointer">
            <span class="material-symbols-rounded fs-2">fmd_good</span>
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
<<<<<<< Updated upstream
    include __DIR__ . '/../public/passenger/groupView.php';
    include __DIR__ . '/../public/passenger/pinsListView.php';
=======
      include __DIR__ . '/../public/passenger/groupView.php';
>>>>>>> Stashed changes
    ?>

    <!-- ✅ New Bus Stops view (no pinsListView.php anymore) -->
    <div id="view-busstops" class="mt-2 d-none">
      <div class="d-flex align-items-center justify-content-between mb-2">
        <div class="fw-bold">Bus Stops</div>
        <div class="small text-muted">Stops & terminals</div>
      </div>

      <div id="busStopsListMobile" class="list-group list-group-flush">
        <div class="text-center text-muted mt-4 small">Loading bus stops...</div>
      </div>
    </div>
  </div>
</div>