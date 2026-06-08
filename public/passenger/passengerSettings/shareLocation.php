<?php
require_once __DIR__ . '/../auth_passenger.php';
?>
<!doctype html>
<html lang="en">

<head>
  <meta charset="utf-8">
    <link rel="icon" href="../../../assets/images/byaheroLogoBlue.svg" type="image/svg+xml">
    <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>Share My Location - ByaHero</title>

  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css">
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0&display=swap" rel="stylesheet" media="print" onload="this.media='all'">

  <style>
    body {
      font-family: "Segoe UI", sans-serif;
      background-color: #f8f9fa;
      padding-bottom: 80px;
    }
  </style>
</head>

<body>
  <?php
  $pageType = 'settings';
  $backLink = '../index.php';
  $pageDepth = "../../../";
  include "../../../components/navbarPassenger.php";
  ?>

  <div class="container text-center mt-5 pt-3" style="margin-top: 70px !important;">
    <div class="fw-bold text-primary mt-1" style="font-size: 1.5rem;">Share My Location</div>
    <p class="small text-secondary mx-auto mb-4" style="font-size: 1rem; line-height: 1.5; max-width: 500px;">
      Turn on Share Location to appear live in your Circle. If it’s off, friends will see “Last seen…”.
    </p>

    <div class="mb-4">
      <span id="share-status" class="badge rounded-pill py-2 px-3 bg-secondary text-white">Checking…</span>
    </div>

    <div class="d-flex flex-column gap-2 align-items-center">
      <button class="btn btn-primary w-100 py-3 d-flex align-items-center justify-content-center mb-2" onclick="enableShareLocation()" style="border-radius: 10px; max-width: 400px; background-color: #1e3a8a; border-color: #1e3a8a;">
        <span class="material-symbols-rounded me-2" style="font-size: 1.5rem;">my_location</span> Turn ON Share Location
      </button>

      <button class="btn btn-outline-primary w-100 py-3 d-flex align-items-center justify-content-center mb-2" onclick="enableShareLocation()" style="border-radius: 10px; max-width: 400px; background-color: white; border-color: #1e3a8a; color: #1e3a8a;">
        <span class="material-symbols-rounded me-2" style="font-size: 1.5rem;">location_on</span> Turn ON (then select on map later)
      </button>

      <button class="btn btn-danger w-100 py-3 d-flex align-items-center justify-content-center mb-2" onclick="disableShareLocation()" style="border-radius: 10px; max-width: 400px;">
        <span class="material-symbols-rounded me-2" style="font-size: 1.5rem;">cancel</span> Turn OFF Share Location
      </button>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
  <script>
    async function postSetting(setting_name, setting_value) {
      const fd = new FormData();
      fd.append('setting_name', setting_name);
      fd.append('setting_value', String(setting_value));

      const res = await fetch('../../../backend/updateSettings.php', {
        method: 'POST',
        body: fd
      });
      return res.json();
    }

    async function refreshStatus() {
      const el = document.getElementById('share-status');
      try {
        const res = await fetch('../../../backend/getShareLocationSetting.php', { cache: 'no-store' });
        const data = await res.json();
        const on = data && data.success && parseInt(data.share_location) === 1;

        el.textContent = on ? 'Share Location: ON' : 'Share Location: OFF';
        el.className = 'badge rounded-pill py-2 px-3 ' + (on ? 'bg-success text-white' : 'bg-secondary text-white');
      } catch (e) {
        el.textContent = 'Status unavailable';
        el.className = 'badge rounded-pill py-2 px-3 bg-secondary text-white';
      }
    }

    async function enableShareLocation() {
      const r = await postSetting('share_location', 1);
      if (!r.success) {
        alert(r.message || 'Failed to enable Share Location');
        return;
      }
      alert('Share Location is ON. Open Circle to appear live.');
      refreshStatus();
    }

    async function disableShareLocation() {
      const r = await postSetting('share_location', 0);
      if (!r.success) {
        alert(r.message || 'Failed to disable Share Location');
        return;
      }
      alert('Share Location is OFF.');
      refreshStatus();
    }

    document.addEventListener('DOMContentLoaded', refreshStatus);
  </script>
</body>

</html>