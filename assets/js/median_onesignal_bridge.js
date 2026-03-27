/**
 * median_onesignal_bridge.js
 * ─────────────────────────────────────────────────────────────────────────
 * Include this script in EVERY page of your app (e.g. in navbarPassenger.php
 * or your shared layout) so that:
 *
 *  1. When the app starts, the device's OneSignal player_id is saved to
 *     the server so push notifications can reach this user.
 *
 *  2. When a push notification of type "sos_alert" arrives while the app
 *     is OPEN (foreground), a native-style in-app banner is shown.
 *
 * SETUP:
 *  • In Median.co dashboard → Plugins → Push Notifications → enable OneSignal
 *    and paste your OneSignal App ID there.
 *  • Make sure registerOnesignalToken.php is deployed to:
 *      /backend/registerOnesignalToken.php   (relative to your site root)
 *  • Adjust REGISTER_URL below if your folder structure differs.
 * ─────────────────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  var REGISTER_URL = 'https://byahero.free.nf/backend/registerOnesignalToken.php';

  function saveToken(playerId) {
    if (!playerId) return;

    // Add a quick alert so you know it worked!
    alert("Token saved to database: " + playerId);

    fetch(REGISTER_URL, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_id: playerId })
    })
      .then(function (r) { return r.json(); })
      .catch(function (e) { console.warn('[SOS] Token register error:', e); });
  }

  // Handle NEW Median App syntax
  window.median_onesignal_info = function (info) {
    var playerId = info.userId || info.oneSignalUserId || info.playerId;
    if (playerId) saveToken(playerId);
  };

  // Handle OLD GoNative App syntax
  window.gonative_onesignal_info = window.median_onesignal_info;

  // Force the app to fetch the token 1.5 seconds after loading
  setTimeout(function () {
    if (window.median && window.median.onesignal) {
      window.median.onesignal.info();
    } else if (window.gonative && window.gonative.onesignal) {
      window.gonative.onesignal.info();
    } else {
      // Universal fallback command
      window.location.href = 'median://onesignal/info';
    }
  }, 1500);

  // ... (Keep your existing Window.gonative_onesignal_notification_received code below here) ...

  // ── 2. Foreground push handler ───────────────────────────────────────────
  //
  // When the app is OPEN and a push arrives, Median calls
  // window.gonative_onesignal_notification_received(data).
  // We show an in-app SOS banner instead of doing nothing.

  window.gonative_onesignal_notification_received = function (data) {
    try {
      var payload = data || {};
      var type = (payload.additionalData || payload.data || {}).type || '';

      if (type === 'sos_alert') {
        showSosBanner(payload);
      }
    } catch (e) {
      console.warn('[SOS] Notification handler error:', e);
    }
  };

  // Also fired when user TAPS a notification (app was in background/closed)
  window.gonative_onesignal_notification_opened = function (data) {
    try {
      var payload = data || {};
      var type = (payload.additionalData || payload.data || {}).type || '';

      if (type === 'sos_alert') {
        // Navigate to notifications / SOS alerts page
        // Adjust path to wherever you show received SOS alerts
        var base = window.APP_BASE_URL || '';
        window.location.href = base + '/public/passenger/passengerSettings/sosAlerts.php';
      }
    } catch (e) {
      console.warn('[SOS] Notification opened handler error:', e);
    }
  };

  // ── 3. In-app SOS banner ─────────────────────────────────────────────────

  function showSosBanner(payload) {
    // Prevent duplicate banners
    if (document.getElementById('sos-push-banner')) return;

    var additionalData = payload.additionalData || payload.data || {};
    var senderName = additionalData.sender_name || 'Someone in your circle';
    var locationText = additionalData.location_text || '';
    var heading = payload.title || payload.heading || '🚨 SOS Alert';
    var body = payload.message || payload.body || (senderName + ' needs help!');

    var banner = document.createElement('div');
    banner.id = 'sos-push-banner';

    // Inline styles so the banner works on every page without extra CSS
    Object.assign(banner.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      zIndex: '99999',
      background: 'linear-gradient(135deg, #dc3545, #b02a37)',
      color: '#fff',
      padding: '14px 16px 12px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
      cursor: 'pointer',
      fontFamily: '"Segoe UI", sans-serif',
      animation: 'sosBannerSlideIn 0.35s ease',
    });

    banner.innerHTML =
      '<span style="font-size:2rem;line-height:1;flex-shrink:0;">🚨</span>' +
      '<div style="flex:1;min-width:0;">' +
      '<div style="font-weight:700;font-size:0.95rem;margin-bottom:2px;">' + escapeHtml(heading) + '</div>' +
      '<div style="font-size:0.82rem;opacity:0.92;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + escapeHtml(body) + '</div>' +
      (locationText
        ? '<div style="font-size:0.75rem;opacity:0.75;margin-top:3px;">📍 ' + escapeHtml(locationText) + '</div>'
        : '') +
      '</div>' +
      '<button id="sos-push-banner-close" style="background:none;border:none;color:#fff;font-size:1.3rem;line-height:1;padding:0;margin-left:4px;cursor:pointer;flex-shrink:0;" aria-label="Dismiss">✕</button>';

    // Inject keyframe animation once
    if (!document.getElementById('sos-banner-style')) {
      var style = document.createElement('style');
      style.id = 'sos-banner-style';
      style.textContent =
        '@keyframes sosBannerSlideIn{from{transform:translateY(-110%)}to{transform:translateY(0)}}';
      document.head.appendChild(style);
    }

    document.body.appendChild(banner);

    // Tap anywhere on banner → go to SOS alerts page
    banner.addEventListener('click', function (e) {
      if (e.target.id === 'sos-push-banner-close') {
        dismissBanner();
      } else {
        var base = window.APP_BASE_URL || '';
        window.location.href = base + '/public/passenger/passengerSettings/sosAlerts.php';
      }
    });

    // Auto-dismiss after 8 seconds
    var autoDismiss = setTimeout(dismissBanner, 8000);

    document.getElementById('sos-push-banner-close')
      .addEventListener('click', function () {
        clearTimeout(autoDismiss);
        dismissBanner();
      });

    // Vibrate to alert the user (works inside Median's WebView)
    if (navigator.vibrate) navigator.vibrate([300, 100, 300]);
  }

  function dismissBanner() {
    var b = document.getElementById('sos-push-banner');
    if (!b) return;
    b.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
    b.style.transform = 'translateY(-110%)';
    b.style.opacity = '0';
    setTimeout(function () { if (b.parentElement) b.remove(); }, 320);
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]);
    });
  }

})();