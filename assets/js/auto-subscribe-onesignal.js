/**
 * auto-subscribe-onesignal.js
 * Automatically subscribes device to OneSignal on app load
 * Works on all platforms: Web, iOS (Median), Android (Median)
 */

(function() {
  'use strict';

  const AutoSubscribeOneSignal = {
    // Configuration
    config: {
      maxRetries: 15,
      retryDelay: 2000, // 2 seconds
      timeout: 30000, // 30 seconds total
      logEnabled: true
    },

    // State
    state: {
      attempted: false,
      subscribed: false,
      playerId: null,
      attempts: 0
    },

    // Logging
    log: function(message, type = 'info') {
      if (!this.config.logEnabled) return;
      
      const prefix = `[AutoSubscribe-${type.toUpperCase()}]`;
      const timestamp = new Date().toLocaleTimeString();
      
      console.log(`${prefix} [${timestamp}] ${message}`);
      
      // Store in window for debugging
      if (!window._autoSubscribeLogs) {
        window._autoSubscribeLogs = [];
      }
      window._autoSubscribeLogs.push({
        time: timestamp,
        type: type,
        message: message
      });

      // Keep only last 50 logs
      if (window._autoSubscribeLogs.length > 50) {
        window._autoSubscribeLogs.shift();
      }
    },

    // Extract token from OneSignal info object
    extractToken: function(info) {
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
      if (!playerId) {
        this.log('Empty player ID, skipping registration', 'warning');
        return Promise.reject('Empty player ID');
      }

      this.log(`Registering token with backend: ${playerId}`, 'info');

      return fetch('/backend/registerOnesignalToken.php', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ player_id: playerId })
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          this.log(`✓ Token registered successfully for user ${data.user_id}`, 'success');
          this.state.subscribed = true;
          this.state.playerId = playerId;
          
          // Fire custom event
          window.dispatchEvent(new CustomEvent('onesignal_subscribed', {
            detail: { playerId: playerId, userId: data.user_id }
          }));
          
          return data;
        } else {
          this.log(`✗ Backend error: ${data.message}`, 'error');
          throw new Error(data.message);
        }
      })
      .catch(error => {
        this.log(`✗ Registration failed: ${error.message}`, 'error');
        throw error;
      });
    },

    // Method 1: Try Median callback
    tryMedianCallback: function() {
      return new Promise((resolve, reject) => {
        this.log('Method 1: Waiting for Median callback...', 'info');

        const timeout = setTimeout(() => {
          this.log('Method 1: No callback received (timeout)', 'warning');
          reject('Callback timeout');
        }, 3000);

        const originalCallback = window.gonative_onesignal_info;
        
        window.gonative_onesignal_info = (info) => {
          clearTimeout(timeout);
          this.log('Method 1: Median callback received!', 'success');
          
          const token = this.extractToken(info);
          
          if (originalCallback) {
            originalCallback(info);
          }

          if (token) {
            this.log(`Method 1: Token extracted: ${token}`, 'success');
            resolve(token);
          } else {
            reject('No token in callback');
          }
        };

        // Also handle median_onesignal_info
        window.median_onesignal_info = window.gonative_onesignal_info;
      });
    },

    // Method 2: Direct Median API
    tryMedianAPI: function() {
      return new Promise((resolve, reject) => {
        this.log('Method 2: Calling gonative.onesignal.getInfo()...', 'info');

        if (!window.gonative || !window.gonative.onesignal) {
          this.log('Method 2: Median OneSignal API not available', 'warning');
          reject('API not available');
          return;
        }

        const timeout = setTimeout(() => {
          this.log('Method 2: API call timeout', 'warning');
          reject('API timeout');
        }, 3000);

        window.gonative.onesignal.getInfo()
          .then((info) => {
            clearTimeout(timeout);
            this.log('Method 2: API call successful', 'success');
            
            const token = this.extractToken(info);
            if (token) {
              this.log(`Method 2: Token extracted: ${token}`, 'success');
              resolve(token);
            } else {
              reject('No token in API response');
            }
          })
          .catch(error => {
            clearTimeout(timeout);
            this.log(`Method 2: API error: ${error}`, 'warning');
            reject(error);
          });
      });
    },

    // Method 3: OneSignal Web SDK
    tryOneSignalSDK: function() {
      return new Promise((resolve, reject) => {
        this.log('Method 3: Trying OneSignal Web SDK...', 'info');

        if (!window.OneSignal) {
          this.log('Method 3: OneSignal SDK not loaded', 'warning');
          reject('SDK not loaded');
          return;
        }

        const timeout = setTimeout(() => {
          this.log('Method 3: SDK call timeout', 'warning');
          reject('SDK timeout');
        }, 3000);

        try {
          window.OneSignal.User.getOnesignalId()
            .then((id) => {
              clearTimeout(timeout);
              if (id) {
                this.log(`Method 3: OneSignal ID retrieved: ${id}`, 'success');
                resolve(id);
              } else {
                reject('No OneSignal ID');
              }
            })
            .catch(error => {
              clearTimeout(timeout);
              this.log(`Method 3: SDK error: ${error}`, 'warning');
              reject(error);
            });
        } catch (e) {
          clearTimeout(timeout);
          this.log(`Method 3: Exception: ${e.message}`, 'warning');
          reject(e);
        }
      });
    },

    // Method 4: Retry with exponential backoff
    retryWithBackoff: function() {
      return new Promise((resolve, reject) => {
        this.log('Method 4: Retrying with exponential backoff...', 'info');

        const attemptRetry = () => {
          this.state.attempts++;
          this.log(`Retry attempt ${this.state.attempts}/${this.config.maxRetries}`, 'info');

          // Try callback first
          this.tryMedianCallback()
            .then(token => {
              resolve(token);
            })
            .catch(() => {
              // Try API next
              this.tryMedianAPI()
                .then(token => {
                  resolve(token);
                })
                .catch(() => {
                  if (this.state.attempts >= this.config.maxRetries) {
                    this.log('Method 4: Max retries exceeded', 'error');
                    reject('Max retries exceeded');
                  } else {
                    setTimeout(attemptRetry, this.config.retryDelay);
                  }
                });
            });
        };

        attemptRetry();
      });
    },

    // Main subscribe function
    subscribe: function() {
      if (this.state.attempted) {
        this.log('Already attempted subscription', 'warning');
        return Promise.resolve(this.state.subscribed);
      }

      this.state.attempted = true;
      this.log('Starting auto-subscription...', 'info');

      // Try all methods in sequence
      return this.tryMedianCallback()
        .catch(() => this.tryMedianAPI())
        .catch(() => this.tryOneSignalSDK())
        .catch(() => this.retryWithBackoff())
        .then((token) => {
          this.log(`✓ Token acquired: ${token}`, 'success');
          return this.registerToken(token);
        })
        .catch((error) => {
          this.log(`✗ Auto-subscription failed: ${error}`, 'error');
          this.state.subscribed = false;
          throw error;
        });
    },

    // Check if already subscribed
    isSubscribed: function() {
      return this.state.subscribed;
    },

    // Get current player ID
    getPlayerId: function() {
      return this.state.playerId;
    },

    // Get all logs (for debugging)
    getLogs: function() {
      return window._autoSubscribeLogs || [];
    },

    // Reset state (for testing)
    reset: function() {
      this.state = {
        attempted: false,
        subscribed: false,
        playerId: null,
        attempts: 0
      };
      this.log('State reset', 'info');
    }
  };

  // Export globally
  window.AutoSubscribeOneSignal = AutoSubscribeOneSignal;

  // Auto-subscribe on DOM ready
  document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in (check for session/auth indicator)
    if (document.body.dataset.userId || window.USER_ID || document.querySelector('[data-user-id]')) {
      AutoSubscribeOneSignal.subscribe().catch(error => {
        AutoSubscribeOneSignal.log(`Auto-subscription error: ${error}`, 'error');
      });
    }
  });

  // Also try immediately on app launch (before DOM ready)
  if (document.readyState === 'loading') {
    AutoSubscribeOneSignal.log('Waiting for DOM...', 'info');
  } else {
    AutoSubscribeOneSignal.subscribe().catch(error => {
      AutoSubscribeOneSignal.log(`Immediate subscription error: ${error}`, 'error');
    });
  }

})();