<?php
require_once __DIR__ . '/../auth_passenger.php';
?>
<!doctype html>
<html lang="en">

<head>
  <meta charset="utf-8">
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

    .location-container {
      margin-top: 70px;
      text-align: center;
    }

    .location-heading {
      font-weight: bold;
      font-size: 1.5rem;
      color: #1e3a8a;
      margin-top: 0.5rem;
    }

    .location-description {
      font-size: 1rem;
      color: #6b7280;
      line-height: 1.5;
      margin: 0.5rem auto 1.5rem auto;
    }

    .location-button {
      padding: 12px 20px;
      font-size: 1rem;
      border-radius: 10px;
      margin: 0.5rem auto;
      width: 90%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    .location-button .material-symbols-rounded {
      font-size: 1.5rem;
      margin-right: 8px;
    }

    .location-button.current {
      color: white;
      background-color: #1e3a8a;
    }

    .location-button.map {
      color: #1e3a8a;
      background-color: white;
      border: 1px solid #1e3a8a;
    }

    .location-button.stop {
      color: white;
      background-color: #dc3545;
    }

    .location-button:hover {
      opacity: 0.9;
    }

    .status-pill {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 999px;
      font-size: 0.85rem;
    }
  </style>
</head>

<body>
  <?php
  $pageType = 'settings';
  $backLink = 'settings.php';
  $pageDepth = "../../../";
  include "../../../components/navbarPassenger.php";
  ?>

  <div class="container location-container">
    <div class="location-heading">Share My Location</div>
    <p class="location-description">
      Turn on Share Location to appear live in your Circle. If it’s off, friends will see “Last seen…”.
    </p>

    <div class="mb-3">
      <span id="share-status" class="status-pill bg-secondary text-white">Checking…</span>
    </div>

    <div class="location-buttons">
      <div class="location-button current" onclick="enableShareLocation()">
        <span class="material-symbols-rounded">my_location</span> Turn ON Share Location
      </div>

      <div class="location-button map" onclick="enableShareLocation()">
        <span class="material-symbols-rounded">location_on</span> Turn ON (then select on map later)
      </div>

      <div class="location-button stop" onclick="disableShareLocation()">
        <span class="material-symbols-rounded">cancel</span> Turn OFF Share Location
      </div>
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
        el.className = 'status-pill ' + (on ? 'bg-success text-white' : 'bg-secondary text-white');
      } catch (e) {
        el.textContent = 'Status unavailable';
        el.className = 'status-pill bg-secondary text-white';
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