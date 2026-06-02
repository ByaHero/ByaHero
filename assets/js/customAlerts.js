/**
 * ByaHero Global Custom Premium Alert Modals
 * Overrides the native browser `window.alert` with a high-fidelity,
 * beautifully animated custom HTML dialog that works across all portals.
 */
(function() {
  // Queue to handle multiple alert dialogs in sequence without overlapping
  const alertQueue = [];
  let isAlertActive = false;

  // Store the original native alert
  const nativeAlert = window.alert;

  // Intercept early console overrides
  window.alert = function(message, customIconUrl = null) {
    // Log to console as well for debugging purposes
    console.log("[Alert Intercepted]:", message);

    return new Promise((resolve) => {
      alertQueue.push({ message: String(message), customIconUrl, resolve });
      processQueue();
    });
  };

  /**
   * Process the queue sequentially
   */
  function processQueue() {
    if (isAlertActive || alertQueue.length === 0) return;

    isAlertActive = true;
    const currentAlert = alertQueue.shift();
    showAlertOverlay(currentAlert.message, () => {
      isAlertActive = false;
      if (currentAlert.resolve) currentAlert.resolve();
      // Introduce a slight buffer delay between successive popups
      setTimeout(processQueue, 150);
    }, currentAlert.customIconUrl);
  }

  /**
   * Dynamically build, inject, and present the Custom Alert
   */
  function showAlertOverlay(message, onCloseCallback, customIconUrl = null) {
    ensureStylesheetInjected();

    // Context analysis to select appropriate icons, titles, and color palettes
    const alertContext = analyzeMessageContext(message);

    // Build the Dialog elements
    const overlay = document.createElement('div');
    overlay.className = 'byahero-alert-overlay byahero-alert-hidden';
    overlay.id = 'byaheroCustomAlert';

    const card = document.createElement('div');
    card.className = 'byahero-alert-card';

    // Elegant close "X" in top right
    const closeBtnX = document.createElement('button');
    closeBtnX.type = 'button';
    closeBtnX.className = 'byahero-alert-close-x';
    closeBtnX.innerHTML = '&times;';
    closeBtnX.setAttribute('aria-label', 'Close');

    // Inner Body Container
    const body = document.createElement('div');
    body.className = 'byahero-alert-body';

    // Circular Animated Icon container
    const iconContainer = document.createElement('div');
    iconContainer.className = `byahero-alert-icon-container byahero-alert-${alertContext.theme}`;
    
    if (customIconUrl) {
      iconContainer.innerHTML = `<img src="${customIconUrl}" alt="User Icon" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;" />`;
    } else {
      let iconWidth = alertContext.theme === 'transit' ? '65px' : '45px';
      iconContainer.innerHTML = `<img src="${alertContext.icon}" alt="Alert Icon" style="width: ${iconWidth}; height: ${iconWidth}; object-fit: contain;" />`;
    }

    // Title Block
    const title = document.createElement('h5');
    title.className = 'byahero-alert-title';
    title.textContent = alertContext.title;

    // Cleaned Message block (stripping leading emojis that we display at top)
    const cleanMsg = cleanAlertMessage(message);
    const msgElement = document.createElement('p');
    msgElement.className = 'byahero-alert-message';
    msgElement.textContent = cleanMsg;

    // Action Confirmation Button
    const btnOk = document.createElement('button');
    btnOk.type = 'button';
    btnOk.className = `byahero-alert-btn-ok byahero-alert-btn-${alertContext.theme}`;
    btnOk.textContent = 'OK';

    // Assemble components
    body.appendChild(iconContainer);
    body.appendChild(title);
    body.appendChild(msgElement);

    if (alertContext.theme === 'transit') {
      const ratingBanner = document.createElement('div');
      ratingBanner.className = 'byahero-alert-rating-banner';
      ratingBanner.innerHTML = `
        <div class="byahero-alert-rating-stars">
          <span class="byahero-alert-star">★</span>
          <span class="byahero-alert-star">★</span>
          <span class="byahero-alert-star">★</span>
          <span class="byahero-alert-star">★</span>
          <span class="byahero-alert-star">★</span>
        </div>
        <div class="byahero-alert-rating-text">Help us improve ByaHero. Please rate our system!</div>
      `;
      body.appendChild(ratingBanner);

      ratingBanner.addEventListener('click', function() {
        const base = window.APP_BASE_URL || '/ByaHero';
        window.location.href = base + '/public/passenger/passengerSettings/feedback.php';
      });
    }

    body.appendChild(btnOk);

    card.appendChild(closeBtnX);
    card.appendChild(body);
    overlay.appendChild(card);

    document.body.appendChild(overlay);

    // Dismissal Handler
    function dismissAlert() {
      // Transition out
      overlay.classList.add('byahero-alert-hidden');
      card.style.transform = 'scale(0.9) translateY(20px)';
      card.style.opacity = '0';
      
      // Clean up DOM after transition finishes
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
        if (onCloseCallback) onCloseCallback();
      }, 250);
    }

    // Set up button listeners
    btnOk.addEventListener('click', dismissAlert);
    closeBtnX.addEventListener('click', dismissAlert);
    
    // Close on overlay backdrop click
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) {
        dismissAlert();
      }
    });

    // Handle enter key press to submit/close
    const handleKeydown = function(e) {
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        window.removeEventListener('keydown', handleKeydown);
        dismissAlert();
      }
    };
    window.addEventListener('keydown', handleKeydown);

    // Force DOM layout calculation before removing hidden class to trigger smooth transitions
    overlay.getBoundingClientRect();

    // Trigger opening transitions
    overlay.classList.remove('byahero-alert-hidden');
    setTimeout(() => {
      card.style.transform = 'scale(1) translateY(0)';
      card.style.opacity = '1';
      btnOk.focus();
    }, 20);
  }

  /**
   * Helper to determine appropriate theme styling, emojis, and headers
   */
  function analyzeMessageContext(message) {
    const text = String(message).toLowerCase();
    
    // 1) Transit specific wait alerts
    if (text.includes('waiting') || text.includes('marked as waiting') || text.includes('🚌') || text.includes('🚏') || text.includes('bus') || text.includes('stop')) {
      return {
        theme: 'transit',
        icon: '../../assets/images/WAITING.svg',
        title: 'Status Update'
      };
    }
    
    // 2) Circle / User updates
    if (text.includes('joined') || text.includes('circle') || text.includes('left') || text.includes('status')) {
      return {
        theme: 'circle',
        icon: '../../assets/images/icons/profileBlack.svg',
        title: 'Circle Status'
      };
    }

    // 3) Success indicators
    if (text.includes('success') || text.includes('welcome') || text.includes('successfully') || text.includes('copied') || text.includes('enabled') || text.includes('on')) {
      return {
        theme: 'success',
        icon: '../../assets/images/icons/verified_user.svg',
        title: 'Success!'
      };
    }
    
    // 3) Failure & Error warnings
    if (text.includes('error') || text.includes('failed') || text.includes('unable') || text.includes('invalid') || text.includes('cannot') || text.includes('disabled') || text.includes('permission')) {
      return {
        theme: 'error',
        icon: '../../assets/images/icons/safetyBlack.svg',
        title: 'Notice'
      };
    }
    
    // 4) Default fallback
    return {
      theme: 'info',
      icon: '../../assets/images/icons/locationBlack.svg',
      title: 'ByaHero Alert'
    };
  }

  /**
   * Clean leading emoji characters from message string to prevent double emojis on display
   */
  function cleanAlertMessage(message) {
    let clean = String(message).trim();
    
    // Strips emoji characters at the very start if matching our theme icon (like 🚌)
    if (clean.startsWith('🚌')) {
      clean = clean.substring(2).trim();
    }
    if (clean.startsWith('🎉')) {
      clean = clean.substring(2).trim();
    }
    if (clean.startsWith('⚠️')) {
      clean = clean.substring(2).trim();
    }
    if (clean.startsWith('🔔')) {
      clean = clean.substring(2).trim();
    }
    if (clean.startsWith('👤')) {
      clean = clean.substring(2).trim();
    }
    
    // Strip leading colons or hyphens left behind from emojis
    if (clean.startsWith(':') || clean.startsWith('-')) {
      clean = clean.substring(1).trim();
    }
    
    return clean;
  }

  /**
   * Inject high-fidelity glassmorphic overlay stylesheets into document head
   */
  let isStylesheetInjected = false;
  function ensureStylesheetInjected() {
    if (isStylesheetInjected) return;
    
    const css = `
      /* --- Custom Alert Base Overlay --- */
      .byahero-alert-overlay {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        background: rgba(15, 23, 42, 0.4) !important;
        backdrop-filter: blur(10px) !important;
        -webkit-backdrop-filter: blur(10px) !important;
        z-index: 10099999 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        opacity: 1 !important;
        visibility: visible !important;
        transition: opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1), visibility 0.25s !important;
      }
      
      .byahero-alert-overlay.byahero-alert-hidden {
        opacity: 0 !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }
      
      /* --- Premium Modal Card Container --- */
      .byahero-alert-card {
        background: #ffffff !important;
        border-radius: 40px !important;
        padding: 3rem 2.2rem 2.5rem 2.2rem !important;
        border: none !important;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.2) !important;
        width: 90% !important;
        max-width: 410px !important;
        position: relative !important;
        opacity: 0 !important;
        transform: scale(0.9) translateY(20px) !important;
        transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s !important;
      }
      
      .byahero-alert-overlay:not(.byahero-alert-hidden) .byahero-alert-card {
        opacity: 1 !important;
        transform: scale(1) translateY(0) !important;
      }
      
      /* --- Top-Right Close "X" Button --- */
      .byahero-alert-close-x {
        position: absolute !important;
        top: 24px !important;
        right: 26px !important;
        background: none !important;
        border: none !important;
        font-size: 1.95rem !important;
        line-height: 1 !important;
        color: #9ca3af !important;
        opacity: 0.6 !important;
        cursor: pointer !important;
        padding: 0 !important;
        transition: opacity 0.2s, transform 0.2s !important;
        z-index: 10 !important;
      }
      
      .byahero-alert-close-x:hover {
        opacity: 1 !important;
        transform: scale(1.1) !important;
        color: #1f2937 !important;
      }
      
      /* --- Inner Content --- */
      .byahero-alert-body {
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        text-align: center !important;
      }
      
      /* --- Dynamically Colored Icons --- */
      .byahero-alert-icon-container {
        width: 108px !important;
        height: 108px !important;
        border-radius: 50% !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        margin-bottom: 2rem !important;
        box-shadow: 0 10px 25px -5px rgba(0,0,0,0.03) !important;
        position: relative !important;
        transition: transform 0.3s ease !important;
      }
      
      .byahero-alert-card:hover .byahero-alert-icon-container {
        transform: scale(1.08) rotate(3deg) !important;
      }
      
      .byahero-alert-emoji {
        font-size: 50px !important;
        line-height: 1 !important;
        display: block !important;
      }
      
      /* --- Theme Customizations --- */
      .byahero-alert-icon-container.byahero-alert-transit {
        background-color: #eff6ff !important;
        border: 2px solid #dbeafe !important;
        animation: alertTransitPulse 2.5s infinite !important;
      }
      
      .byahero-alert-icon-container.byahero-alert-success {
        background-color: #f0fdf4 !important;
        border: 2px solid #dcfce7 !important;
        animation: alertSuccessPulse 2.5s infinite !important;
      }
      
      .byahero-alert-icon-container.byahero-alert-error {
        background-color: #fef2f2 !important;
        border: 2px solid #fee2e2 !important;
        animation: alertErrorPulse 2.2s infinite !important;
      }
      
      .byahero-alert-icon-container.byahero-alert-info {
        background-color: #f5f3ff !important;
        border: 2px solid #ede9fe !important;
      }

      .byahero-alert-icon-container.byahero-alert-circle {
        background-color: #f8fafc !important;
        border: 2px solid #e2e8f0 !important;
        animation: alertCirclePulse 2.5s infinite !important;
      }
      
      /* --- Pulse Keyframe Animations --- */
      @keyframes alertTransitPulse {
        0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
        70% { box-shadow: 0 0 0 18px rgba(59, 130, 246, 0); }
        100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
      }
      @keyframes alertSuccessPulse {
        0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
        70% { box-shadow: 0 0 0 18px rgba(34, 197, 94, 0); }
        100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
      }
      @keyframes alertErrorPulse {
        0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
        70% { box-shadow: 0 0 0 18px rgba(239, 68, 68, 0); }
        100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
      }
      @keyframes alertCirclePulse {
        0% { box-shadow: 0 0 0 0 rgba(100, 116, 139, 0.3); }
        70% { box-shadow: 0 0 0 18px rgba(100, 116, 139, 0); }
        100% { box-shadow: 0 0 0 0 rgba(100, 116, 139, 0); }
      }
      
      /* --- Typography --- */
      .byahero-alert-title {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        font-size: 1.88rem !important;
        font-weight: 800 !important;
        color: #111827 !important;
        margin: 0 0 0.85rem 0 !important;
        letter-spacing: -0.6px !important;
        line-height: 1.2 !important;
      }
      
      .byahero-alert-message {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        font-size: 1.08rem !important;
        font-weight: 500 !important;
        color: #4b5563 !important;
        line-height: 1.55 !important;
        margin: 0 0 2.2rem 0 !important;
        max-width: 92% !important;
        word-break: break-word !important;
      }
      
      /* --- Confirmation Pill Button --- */
      .byahero-alert-btn-ok {
        display: block !important;
        width: 100% !important;
        border: none !important;
        border-radius: 24px !important;
        padding: 1.1rem 2rem !important;
        font-size: 1.22rem !important;
        font-weight: 750 !important;
        color: #ffffff !important;
        box-shadow: 0 8px 20px rgba(0,0,0,0.08) !important;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
        cursor: pointer !important;
        text-align: center !important;
        outline: none !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      }
      
      .byahero-alert-btn-ok.byahero-alert-btn-transit {
        background: linear-gradient(135deg, #1e3a8a, #0f3878) !important;
      }
      
      .byahero-alert-btn-ok.byahero-alert-btn-success {
        background: linear-gradient(135deg, #10b981, #047857) !important;
      }
      
      .byahero-alert-btn-ok.byahero-alert-btn-error {
        background: linear-gradient(135deg, #ef4444, #b91c1c) !important;
      }
      
      .byahero-alert-btn-ok.byahero-alert-btn-info {
        background: linear-gradient(135deg, #2563eb, #1d4ed8) !important;
      }
      
      .byahero-alert-btn-ok:hover {
        transform: translateY(-2px) !important;
        box-shadow: 0 12px 24px rgba(0, 0, 0, 0.14) !important;
      }
      
      .byahero-alert-btn-ok:active {
        transform: translateY(1px) !important;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08) !important;
      }
      
      /* --- Dynamic Rating Reminder Banner --- */
      .byahero-alert-rating-banner {
        background: #f8fafc !important;
        border: 1px solid #e2e8f0 !important;
        border-radius: 20px !important;
        padding: 0.9rem 1.2rem !important;
        margin-bottom: 1.8rem !important;
        width: 100% !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        cursor: pointer !important;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
      }
      
      .byahero-alert-rating-banner:hover {
        border-color: #bfdbfe !important;
        background: #f0f7ff !important;
        transform: translateY(-2px) !important;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.08) !important;
      }
      
      .byahero-alert-rating-stars {
        display: flex !important;
        gap: 6px !important;
        margin-bottom: 4px !important;
      }
      
      .byahero-alert-star {
        font-size: 24px !important;
        color: #fbbf24 !important;
        line-height: 1 !important;
        transition: transform 0.2s !important;
      }
      
      .byahero-alert-rating-banner:hover .byahero-alert-star {
        transform: scale(1.12) !important;
      }
      
      .byahero-alert-rating-text {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        font-size: 0.85rem !important;
        font-weight: 700 !important;
        color: #4b5563 !important;
        text-align: center !important;
      }
    `;
    
    const style = document.createElement('style');
    style.id = 'byahero-alert-styles';
    style.textContent = css;
    document.head.appendChild(style);
    
    isStylesheetInjected = true;
  }
})();
