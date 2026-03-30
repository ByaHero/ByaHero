/**
 * Notification Permission Handler
 * Manages browser/Median notification permissions
 * Auto-captures OneSignal token after permission granted
 */

(function() {
  'use strict';

  const STORAGE_KEY = 'byahero_notification_permission_shown';
  const PERMISSION_STATUS_KEY = 'byahero_notification_permission';
  const REMINDER_DELAY = 30 * 24 * 60 * 60 * 1000; // 30 days

  const NotificationPermissionPopup = {
    
    // Check if we should show the popup
    shouldShow: function() {
      const lastShown = localStorage.getItem(STORAGE_KEY);
      const permissionDenied = localStorage.getItem(PERMISSION_STATUS_KEY) === 'denied';
      
      // Don't show if already shown or denied
      if (lastShown) {
        const lastShownTime = parseInt(lastShown);
        const now = Date.now();
        
        // If denied less than 30 days ago, don't show
        if (permissionDenied && (now - lastShownTime) < REMINDER_DELAY) {
          return false;
        }
      }
      
      return true;
    },

    // Get current permission status
    getStatus: function() {
      return new Promise((resolve) => {
        // Check browser Notification API
        if ('Notification' in window) {
          resolve(Notification.permission); // 'granted', 'denied', 'default'
        } 
        // Check Median native
        else if (window.gonative && window.gonative.notification) {
          window.gonative.notification.getPermissionStatus()
            .then(status => resolve(status))
            .catch(() => resolve('prompt'));
        }
        else {
          resolve('prompt');
        }
      });
    },

    // Request permission from user
    requestPermission: function() {
      return new Promise((resolve) => {
        // Try Median native first (for iOS/Android)
        if (window.gonative && window.gonative.notification) {
          window.gonative.notification.requestPermission()
            .then((granted) => {
              if (granted) {
                localStorage.setItem(PERMISSION_STATUS_KEY, 'granted');
                this.captureTokenAfterPermission();
              }
              resolve(granted);
            })
            .catch(() => {
              // Fallback to browser API
              this.requestBrowserPermission().then(resolve);
            });
        }
        // Fallback to browser Notification API
        else if ('Notification' in window && Notification.permission === 'default') {
          this.requestBrowserPermission().then(resolve);
        }
        else {
          resolve(false);
        }
      });
    },

    // Request browser notification permission
    requestBrowserPermission: function() {
      return new Promise((resolve) => {
        if ('Notification' in window) {
          Notification.requestPermission()
            .then((permission) => {
              if (permission === 'granted') {
                localStorage.setItem(PERMISSION_STATUS_KEY, 'granted');
                this.captureTokenAfterPermission();
              }
              resolve(permission === 'granted');
            })
            .catch(() => resolve(false));
        } else {
          resolve(false);
        }
      });
    },

    // Capture OneSignal token after permission granted
    captureTokenAfterPermission: function() {
      let attempts = 0;
      const maxAttempts = 15; // Try for 30 seconds (15 * 2s)
      
      const tryCapture = () => {
        attempts++;
        
        // Try to get token from existing bridge
        if (window.sosBridge && window.sosBridge.getPlayerId()) {
          const playerId = window.sosBridge.getPlayerId();
          this.registerToken(playerId);
          return;
        }
        
        // Try Median API directly
        if (window.gonative && window.gonative.onesignal) {
          window.gonative.onesignal.getInfo()
            .then((info) => {
              const playerId = this.extractPlayerId(info);
              if (playerId) {
                this.registerToken(playerId);
              }
            })
            .catch(() => {
              if (attempts < maxAttempts) {
                setTimeout(tryCapture, 2000);
              }
            });
        } else if (attempts < maxAttempts) {
          // Keep trying
          setTimeout(tryCapture, 2000);
        }
      };
      
      setTimeout(tryCapture, 500);
    },

    // Extract player ID from OneSignal info object
    extractPlayerId: function(info) {
      if (!info) return null;
      return info.oneSignalId
        || info.userId
        || info.subscriptionId
        || info.oneSignalUserId
        || (info.subscription && info.subscription.id)
        || null;
    },

    // Register token with backend
    registerToken: function(playerId) {
      if (!playerId) return;
      
      fetch('/backend/registerOnesignalToken.php', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: playerId })
      })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          console.log('[NotificationPermission] ✓ Token registered:', playerId);
          localStorage.setItem(PERMISSION_STATUS_KEY, 'granted');
        }
      })
      .catch(e => console.warn('[NotificationPermission] Token register failed:', e));
    },

    // Show the permission popup modal
    show: function() {
      // Check if already granted
      this.getStatus().then((status) => {
        if (status === 'granted') {
          console.log('[NotificationPermission] Already granted');
          return;
        }
        
        this.displayModal();
      });
    },

    // Check and show if needed
    checkAndShow: function() {
      if (!this.shouldShow()) {
        console.log('[NotificationPermission] Not showing (already shown or denied recently)');
        return;
      }
      
      this.getStatus().then((status) => {
        if (status === 'default') {
          // Permission not yet requested
          setTimeout(() => this.show(), 1000);
        }
      });
    },

    // Display the modal
    displayModal: function() {
      // Remove if already exists
      const existing = document.getElementById('notification-permission-modal');
      if (existing) existing.remove();
      
      const modal = document.createElement('div');
      modal.id = 'notification-permission-modal';
      modal.className = 'notification-permission-modal-overlay';
      modal.innerHTML = `
        <div class="notification-permission-modal">
          <div class="notification-permission-header">
            <span class="material-symbols-rounded notification-permission-icon">notifications_active</span>
            <h2>Enable Notifications</h2>
          </div>
          
          <div class="notification-permission-body">
            <p class="notification-permission-subtitle">Stay safe with ByaHero</p>
            
            <div class="notification-permission-benefits">
              <div class="benefit-item">
                <span class="material-symbols-rounded benefit-icon">emergency</span>
                <div>
                  <strong>SOS Alerts</strong>
                  <p>Get instant alerts when friends need help</p>
                </div>
              </div>
              
              <div class="benefit-item">
                <span class="material-symbols-rounded benefit-icon">schedule</span>
                <div>
                  <strong>Bus Updates</strong>
                  <p>Real-time schedule & arrival notifications</p>
                </div>
              </div>
              
              <div class="benefit-item">
                <span class="material-symbols-rounded benefit-icon">event_seat</span>
                <div>
                  <strong>Seat Availability</strong>
                  <p>Know when seats open up on your route</p>
                </div>
              </div>
            </div>
          </div>
          
          <div class="notification-permission-footer">
            <button class="btn btn-secondary btn-sm" onclick="NotificationPermissionPopup.handleRemindLater()">
              Remind Later
            </button>
            <button class="btn btn-danger btn-sm" onclick="NotificationPermissionPopup.handleDeny()">
              Don't Allow
            </button>
            <button class="btn btn-primary btn-sm" onclick="NotificationPermissionPopup.handleEnable()">
              Enable
            </button>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      // Add CSS if not already present
      if (!document.getElementById('notification-permission-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-permission-styles';
        style.textContent = this.getStyles();
        document.head.appendChild(style);
      }
    },

    // Handle Enable button
    handleEnable: function() {
      this.requestPermission().then((granted) => {
        if (granted) {
          localStorage.setItem(STORAGE_KEY, Date.now().toString());
          this.closeModal();
          this.showSuccessMessage();
        }
      });
    },

    // Handle Remind Later button
    handleRemindLater: function() {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
      this.closeModal();
    },

    // Handle Don't Allow button
    handleDeny: function() {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
      localStorage.setItem(PERMISSION_STATUS_KEY, 'denied');
      this.closeModal();
    },

    // Close modal
    closeModal: function() {
      const modal = document.getElementById('notification-permission-modal');
      if (modal) {
        modal.classList.add('fade-out');
        setTimeout(() => modal.remove(), 300);
      }
    },

    // Show success message
    showSuccessMessage: function() {
      const toast = document.createElement('div');
      toast.className = 'notification-permission-toast';
      toast.innerHTML = `
        <span class="material-symbols-rounded">check_circle</span>
        <span>Notifications enabled!</span>
      `;
      
      document.body.appendChild(toast);
      
      setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    },

    // Get inline CSS
    getStyles: function() {
      return `
        .notification-permission-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: fadeIn 0.3s ease-in-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .notification-permission-modal {
          background: white;
          border-radius: 16px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
          max-width: 400px;
          width: 90%;
          overflow: hidden;
          animation: slideUp 0.3s ease-out;
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .notification-permission-header {
          background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
          color: white;
          padding: 24px 20px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .notification-permission-icon {
          font-size: 48px;
          font-weight: bold;
        }

        .notification-permission-header h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
        }

        .notification-permission-body {
          padding: 24px 20px;
        }

        .notification-permission-subtitle {
          margin: 0 0 16px 0;
          color: #6b7280;
          font-size: 14px;
          text-align: center;
        }

        .notification-permission-benefits {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .benefit-item {
          display: flex;
          gap: 12px;
          padding: 12px;
          background: #f3f4f6;
          border-radius: 8px;
        }

        .benefit-icon {
          color: #1e3a8a;
          font-size: 24px;
          flex-shrink: 0;
        }

        .benefit-item strong {
          display: block;
          color: #1f2937;
          font-size: 14px;
          margin-bottom: 2px;
        }

        .benefit-item p {
          margin: 0;
          color: #6b7280;
          font-size: 12px;
        }

        .notification-permission-footer {
          padding: 16px 20px 20px 20px;
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }

        .notification-permission-footer .btn {
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .notification-permission-footer .btn-primary {
          background: #1e3a8a;
          color: white;
        }

        .notification-permission-footer .btn-primary:hover {
          background: #1e40af;
        }

        .notification-permission-footer .btn-secondary {
          background: #e5e7eb;
          color: #374151;
        }

        .notification-permission-footer .btn-secondary:hover {
          background: #d1d5db;
        }

        .notification-permission-footer .btn-danger {
          background: #f3f4f6;
          color: #6b7280;
        }

        .notification-permission-footer .btn-danger:hover {
          background: #e5e7eb;
        }

        .notification-permission-toast {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: #10b981;
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 10000;
          animation: slideUp 0.3s ease-out;
        }

        .notification-permission-toast .material-symbols-rounded {
          font-size: 20px;
        }

        .fade-out {
          animation: fadeOut 0.3s ease-out !important;
        }

        @keyframes fadeOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }

        @media (max-width: 480px) {
          .notification-permission-modal {
            width: 95%;
          }

          .notification-permission-footer {
            flex-direction: column;
          }

          .notification-permission-footer .btn {
            width: 100%;
          }
        }
      `;
    }
  };

  // Export globally
  window.NotificationPermissionPopup = NotificationPermissionPopup;

})();