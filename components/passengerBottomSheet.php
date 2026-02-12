<div id="bottomSheet"
  class="bottom-sheet bg-white rounded-top-4 shadow-lg d-flex flex-column position-absolute start-0 w-100 sheet-transition"
  style="bottom: 60px; height: 40%; z-index: 1050;">

  <div class="position-absolute start-50 translate-middle-x" style="top: -60px; z-index: 1060;">
    <button onclick="window.location.href='sos/sos.php'"
      class="btn bg-white rounded-pill shadow px-4 py-2 d-flex align-items-center gap-2 border-0">
      <span class="material-symbols-rounded fs-2 text-primary"
        style="font-variation-settings: 'FILL' 1;">verified_user</span>
      <span class="text-primary fw-bold">SOS</span>
    </button>
  </div>

  <div id="sheetHeader" class="flex-shrink-0 w-100 bg-white rounded-top-4 cursor-pointer">
    <div class="bg-secondary opacity-25 rounded-pill mx-auto mt-3" style="width: 40px; height: 5px;"></div>

    <div class="container-fluid px-3 pt-3">
      <div class="row g-2">
        <div class="col-4" onclick="switchSheetTab('location')">
          <div id="tab-location"
            class="sheet-tab active bg-primary text-white rounded-4 p-3 d-flex justify-content-center align-items-center shadow-sm h-50 cursor-pointer">
            <!-- enlarged icon -->
            <span class="material-symbols-rounded fs-2">location_on</span>
          </div>
        </div>

        <div class="col-4" onclick="switchSheetTab('groups')">
          <div id="tab-groups"
            class="sheet-tab bg-primary-subtle border border-primary text-primary rounded-4 p-3 d-flex justify-content-center align-items-center h-50 cursor-pointer">
            <!-- enlarged icon -->
            <span class="material-symbols-rounded fs-2">groups</span>
          </div>
        </div>

        <div class="col-4" onclick="switchSheetTab('pins')">
          <div id="tab-pins"
            class="sheet-tab bg-primary-subtle border border-primary text-primary rounded-4 p-3 d-flex justify-content-center align-items-center h-50 cursor-pointer">
            <span class="material-symbols-rounded fs-2">push_pin</span>
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
      // components/ -> project root -> public/passenger/...
      include __DIR__ . '/../public/passenger/groupView.php';
      include __DIR__ . '/../public/passenger/pinsListView.php';
    ?>
  </div>
</div>