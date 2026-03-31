<?php
session_start();

// Redirect to login if not logged in
if (!isset($_SESSION['user_id'])) {
    header("Location: ../../../public/login.php?redirect=" . urlencode($_SERVER['REQUEST_URI']));
    exit;
}
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>Smart Notifications - ByaHero</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css">
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded" rel="stylesheet">
  
  <!-- Global Accessibility -->
  <link rel="stylesheet" href="../../../assets/css/accessibility.css">
  
  <style>
    body {
      font-family: "Segoe UI", sans-serif;
      background-color: #f8f9fa;
      padding-bottom: 80px;
    }
    .notification-container {
      margin-top: 70px;
    }
    .section-heading {
      font-weight: bold;
      font-size: 1.2rem;
      color: #1e3a8a;
    }
    .notification-description {
      background-color: white;
      padding: 16px;
      border-radius: 10px;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
      margin-top: 1rem;
      margin-bottom: 1rem;
      font-size: 0.9rem;
      color: #6b7280;
    }
    .notification-item {
      padding: 12px 16px;
      background-color: #f3f4f6;
      margin-bottom: 0.5rem;
      border-radius: 10px;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .notification-item .icon-wrapper {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background-color: #1e3a8a;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 1.5rem;
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
  $backLink = 'settings.php';
  $pageDepth = "../../../";
  include "../../../components/navbarPassenger.php";
  ?>

  <div class="container notification-container">
    <div class="section-heading">Smart Notifications</div>
    <div class="notification-description">
      Stay informed about the most relevant updates while tracking buses. Enable Smart Notifications to receive alerts for bus schedule changes, arrivals, and seat availability.
    </div>
    <div class="notification-description">
      <div class="d-flex align-items-start gap-3">
        <div class="flex-grow-1">
          <div class="fw-semibold text-dark mb-1">Enable push notifications</div>
          <div class="small text-muted mb-1">Allow alerts on this device and re-sync your OneSignal subscription.</div>
          <div class="small text-muted">You must be logged in to link this device to your account.</div>
        </div>
        <button type="button" class="btn btn-primary btn-sm align-self-center" id="openPushPermissionModal">
          Enable
        </button>
      </div>
    </div>

    <div class="notification-item">
      <div class="d-flex align-items-center">
        <div class="icon-wrapper">
          <span class="material-symbols-rounded">schedule</span>
        </div>
        <span class="ms-2">Bus Schedule Update</span>
      </div>
      <div class="form-check form-switch">
        <input class="form-check-input" type="checkbox" id="notify_bus_schedule" onchange="updateSetting('notify_bus_schedule', this.checked)">
      </div>
    </div>

    <div class="notification-item">
      <div class="d-flex align-items-center">
        <div class="icon-wrapper">
          <span class="material-symbols-rounded">directions_bus</span>
        </div>
        <span class="ms-2">Bus Arrival</span>
      </div>
      <div class="form-check form-switch">
        <input class="form-check-input" type="checkbox" id="notify_bus_arrival" onchange="updateSetting('notify_bus_arrival', this.checked)">
      </div>
    </div>

    <div class="notification-item">
      <div class="d-flex align-items-center">
        <div class="icon-wrapper">
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
          <p class="mb-2">We will ask your device for notification permission and sync your OneSignal subscription.</p>
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
  <script src="../../../assets/js/analytics.js"></script>
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
          
          // Track error
          if (typeof analytics !== 'undefined') {
            analytics.error('Failed to fetch notification settings: ' + error.message);
          }
        });
    };

    // Update setting
    function updateSetting(settingName, value) {
      const formData = new FormData();
      formData.append('setting_name', settingName);
      formData.append('setting_value', value ? 1 : 0);

      // Track setting change before saving
      if (typeof analytics !== 'undefined') {
        const settingDisplayNames = {
          'notify_bus_schedule': 'Bus Schedule Notification',
          'notify_bus_arrival': 'Bus Arrival Notification',
          'notify_seat_availability': 'Seat Availability Notification'
        };
        
        analytics.settingChanged(
          settingDisplayNames[settingName] || settingName, 
          value ? 'ON' : 'OFF'
        );
      }

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
          
          // Track error
          if (typeof analytics !== 'undefined') {
            analytics.error('Failed to update notification setting: ' + data.message);
          }
        }
      })
      .catch(error => {
        console.error('Error updating setting:', error);
        alert('An error occurred while updating the setting.');
        
        // Track error
        if (typeof analytics !== 'undefined') {
          analytics.error('Error updating notification setting: ' + error.message);
        }
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
