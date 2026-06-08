<?php
include_once __DIR__ . '/../auth_passenger.php';
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
  <title>Smart Notifications - ByaHero</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css">
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
  
  <!-- Global Accessibility -->
  <link rel="stylesheet" href="../../../assets/css/accessibility.css">
  
  <style>
    body {
      font-family: "Segoe UI", sans-serif;
      background-color: #f8f9fa;
      padding-bottom: 80px;
    }
    .form-check .form-check-input[type='checkbox'] {
      width: 1.5em;
      height: 1.5em;
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

  <div class="container mt-5 pt-3" style="margin-top: 70px !important;">
    <div class="fw-bold text-primary mb-2" style="font-size: 1.2rem;">Smart Notifications</div>
    
    <div class="p-3 bg-white mb-3 rounded-3 shadow-sm text-secondary small" style="border-radius: 10px !important;">
      Stay informed about the most relevant updates while tracking buses. Enable Smart Notifications to receive alerts for bus schedule changes, arrivals, and seat availability.
    </div>

    <div class="p-3 bg-white mb-3 rounded-3 shadow-sm text-secondary small" style="border-radius: 10px !important;">
      <div class="d-flex align-items-start gap-3">
        <div class="flex-grow-1">
          <div class="fw-semibold text-dark mb-1">Enable push notifications</div>
          <div class="small text-muted mb-1">Allow alerts on this device and sync your notification settings.</div>
          <div class="small text-muted">You must be logged in to link this device to your account.</div>
        </div>
        <button type="button" class="btn btn-primary btn-sm align-self-center" id="openPushPermissionModal">
          Enable
        </button>
      </div>
    </div>

    <div class="p-3 bg-light mb-2 rounded-3 shadow-sm d-flex align-items-center justify-content-between" style="border-radius: 10px !important; padding: 12px 16px !important;">
      <div class="d-flex align-items-center">
        <div class="d-flex align-items-center justify-content-center bg-primary text-white rounded-circle" style="width: 40px; height: 40px; font-size: 1.5rem;">
          <span class="material-symbols-rounded">schedule</span>
        </div>
        <span class="ms-2">Bus Schedule Update</span>
      </div>
      <div class="form-check form-switch">
        <input class="form-check-input" type="checkbox" id="notify_bus_schedule" onchange="updateSetting('notify_bus_schedule', this.checked)">
      </div>
    </div>

    <div class="p-3 bg-light mb-2 rounded-3 shadow-sm d-flex align-items-center justify-content-between" style="border-radius: 10px !important; padding: 12px 16px !important;">
      <div class="d-flex align-items-center">
        <div class="d-flex align-items-center justify-content-center bg-primary text-white rounded-circle" style="width: 40px; height: 40px; font-size: 1.5rem;">
          <span class="material-symbols-rounded">directions_bus</span>
        </div>
        <span class="ms-2">Bus Arrival</span>
      </div>
      <div class="form-check form-switch">
        <input class="form-check-input" type="checkbox" id="notify_bus_arrival" onchange="updateSetting('notify_bus_arrival', this.checked)">
      </div>
    </div>

    <div class="p-3 bg-light mb-2 rounded-3 shadow-sm d-flex align-items-center justify-content-between" style="border-radius: 10px !important; padding: 12px 16px !important;">
      <div class="d-flex align-items-center">
        <div class="d-flex align-items-center justify-content-center bg-primary text-white rounded-circle" style="width: 40px; height: 40px; font-size: 1.5rem;">
          <span class="material-symbols-rounded">event_seat</span>
        </div>
        <span class="ms-2">Seat Availability</span>
      </div>
      <div class="form-check form-switch">
        <input class="form-check-input" type="checkbox" id="notify_seat_availability" onchange="updateSetting('notify_seat_availability', this.checked)">
      </div>
    </div>
  </div>

  <!-- Push permission modal -->
  <div class="modal fade" id="pushPermissionModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Allow notifications</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <p class="mb-2">We will ask your device for notification permission and sync your notification ID.</p>
          <p class="small text-muted mb-0">Tap "Allow & Subscribe" to continue, then accept the permission prompt.</p>
          <div class="mt-3 small text-muted" id="push-permission-status"></div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
          <button type="button" class="btn btn-primary" id="confirmPushPermission">Allow & Subscribe</button>
        </div>
      </div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
  <script src="../../../assets/js/accessibility.js"></script>
  <script>
    // Fetch settings on page load
    window.onload = function() {
      fetch('../../../backend/fetchSettings.php')
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            document.getElementById('notify_bus_schedule').checked = data.settings.notify_bus_schedule == 1;
            document.getElementById('notify_bus_arrival').checked = data.settings.notify_bus_arrival == 1;
            document.getElementById('notify_seat_availability').checked = data.settings.notify_seat_availability == 1;
          }
        })
        .catch(error => {
          console.error('Error fetching settings:', error);
        });
    };

    // Update setting
    function updateSetting(settingName, value) {
      const formData = new FormData();
      formData.append('setting_name', settingName);
      formData.append('setting_value', value ? 1 : 0);

      fetch('../../../backend/updateSettings.php', {
        method: 'POST',
        body: formData
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          console.log('Setting updated successfully');
        } else {
          alert('Failed to update setting: ' + data.message);
        }
      })
      .catch(error => {
        console.error('Error updating setting:', error);
        alert('An error occurred while updating the setting.');
      });
    }

    // Manual push permission request (delay lets users read the success message)
    const MODAL_AUTO_CLOSE_DELAY_MS = 1200;
    document.addEventListener('DOMContentLoaded', function () {
      var openBtn = document.getElementById('openPushPermissionModal');
      var modalEl = document.getElementById('pushPermissionModal');
      var statusEl = document.getElementById('push-permission-status');
      var confirmBtn = document.getElementById('confirmPushPermission');

      if (!openBtn || !modalEl) return;

      var modal = bootstrap.Modal.getOrCreateInstance(modalEl);

      openBtn.addEventListener('click', function () {
        if (statusEl) {
          statusEl.textContent = 'Select "Allow & Subscribe" to start the notification request.';
          statusEl.classList.remove('text-danger', 'text-success');
          statusEl.classList.add('text-muted');
        }
        modal.show();
      });

      if (confirmBtn) {
        confirmBtn.addEventListener('click', function () {
          var btn = this;
          var resetButtonState = function () {
            btn.disabled = false;
            btn.textContent = 'Allow & Subscribe';
          };
          btn.disabled = true;
          btn.textContent = 'Requesting...';

          if (statusEl) {
            statusEl.textContent = 'Requesting permission...';
            statusEl.classList.remove('text-danger', 'text-success');
            statusEl.classList.add('text-muted');
          }

          if (!(window.sosBridge && typeof window.sosBridge.requestPushPermission === 'function')) {
            if (statusEl) {
              statusEl.textContent = 'Push subscription is not available on this device.';
              statusEl.classList.remove('text-muted');
              statusEl.classList.add('text-danger');
            }
            resetButtonState();
            return;
          }

          window.sosBridge.requestPushPermission()
            .then(function () {
              if (statusEl) {
                statusEl.textContent = 'Permission requested. Please allow notifications when prompted to sync your device.';
                statusEl.classList.remove('text-muted');
                statusEl.classList.add('text-success');
              }
              setTimeout(function () {
                modal.hide();
                resetButtonState();
              }, MODAL_AUTO_CLOSE_DELAY_MS);
            })
            .catch(function (e) {
              if (statusEl) {
                statusEl.textContent = 'Something went wrong: ' + (e && e.message ? e.message : 'Please try again.');
                statusEl.classList.remove('text-muted');
                statusEl.classList.add('text-danger');
              }
              resetButtonState();
            });
        });
      }
    });
  </script>
</body>
</html>