<style>
  :root {
    --bs-primary: #1e3a8a;
    --bs-primary-rgb: 30, 58, 138;
    --bs-bg-light: #f3f4f6;
  }
</style>

<div
  class="bg-primary d-flex align-items-center rounded-bottom-4 px-3 shadow-sm position-absolute top-0 start-0 z-3 w-100"
  style="height: 40px;">
  <img src="../../images/topBarLogo.svg" alt="ByaHero" height="30">
</div>

<div class="fixed-bottom bg-white border-top shadow-lg" style="height: 60px; z-index: 1060;">
  <div class="row h-100 m-0">

    <div class="col-3 h-100 p-0">
      <button
        class="btn w-100 h-100 d-flex flex-column align-items-center justify-content-center p-0 border-0 bg-transparent nav-btn text-primary"
        onclick="selectNav(this, 'location')">
        <span class="material-symbols-rounded fs-1 mb-1">location_on</span>
        <span class="fw-bold small" style="font-size: 0.75rem;">LOCATION</span>
      </button>
    </div>

    <div class="col-3 h-100 p-0">
      <button
        class="btn w-100 h-100 d-flex flex-column align-items-center justify-content-center p-0 border-0 bg-transparent nav-btn text-dark"
        onclick="window.location.href='/Byahero-Prototype-v3/public/passenger/safety/safety.php'">
        <span class="material-symbols-rounded fs-1 mb-1">security</span>
        <span class="fw-bold small" style="font-size: 0.75rem;">SAFETY</span>
      </button>
    </div>

    <div class="col-3 h-100 p-0">
      <button
        class="btn w-100 h-100 d-flex flex-column align-items-center justify-content-center p-0 border-0 bg-transparent nav-btn text-dark"
        onclick="selectNav(this, 'info')"
        data-bs-toggle="modal"
        data-bs-target="#infoModal">
        <span class="material-symbols-rounded fs-1 mb-1">directions_bus</span>
        <span class="fw-bold small" style="font-size: 0.75rem;">INFO</span>
      </button>
    </div>

    <div class="col-3 h-100 p-0">
      <button
        class="btn w-100 h-100 d-flex flex-column align-items-center justify-content-center p-0 border-0 bg-transparent nav-btn text-dark"
        onclick="selectNav(this, 'profile')"
        data-bs-toggle="modal"
        data-bs-target="#profileModal">
        <span class="material-symbols-rounded fs-1 mb-1">person</span>
        <span class="fw-bold small" style="font-size: 0.75rem;">PROFILE</span>
      </button>
    </div>

  </div>
</div>
