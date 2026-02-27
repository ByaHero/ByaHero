<!-- Settings Button Component -->
<button
  class="btn btn-light rounded-circle shadow p-0 d-flex align-items-center justify-content-center border-0 h-40px w-40px topbar-btn"
  onclick="if(typeof analytics !== 'undefined') analytics.buttonClick('Settings Button'); window.location.href='<?= $settingsButtonPath ?? './passengerSettings/settings.php' ?>';">
  <span class="material-symbols-rounded topbar-icon">settings</span>
</button>

<style>
  /* Settings button styles */
  .topbar-btn {
    width: 46px !important;
    height: 46px !important;
  }

  .h-40px {
    height: 40px;
  }

  .w-40px {
    width: 40px;
  }

  .topbar-btn .material-symbols-rounded.topbar-icon {
    font-size: 30px !important;
    line-height: 1 !important;
  }
</style>