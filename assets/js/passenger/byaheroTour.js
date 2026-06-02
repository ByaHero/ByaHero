/**
 * byaheroTour.js
 * ──────────────────────────────────────────────────────────────────────────
 * ByaHero Interactive Feature Spotlight Tour Class.
 * Renders a full-screen semi-transparent SVG overlay with dynamic mask cutouts
 * wiggling highlighted borders, and responsive popover description cards.
 * Supports active callback hooks for pre-step viewport/tabs preparation.
 * Supports multi-page onboarding transitions seamlessly across index, SOS, and notifications.
 * ──────────────────────────────────────────────────────────────────────────
 */

var ByaheroTour = window.ByaheroTour || class ByaheroTour {
    constructor(steps) {
        this.steps = steps;
        this.currentStep = 0;
        this.overlay = null;
        this.popover = null;
        this.cssInjected = false;
    }

    start() {
        this.injectStyles();
        this.createOverlay();
        this.showStep();
    }

    injectStyles() {
        if (this.cssInjected) return;
        const style = document.createElement('style');
        style.id = 'byahero-tour-styles';
        style.innerHTML = `
            .tour-overlay-wrapper {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                z-index: 2050; /* Above navbar and offcanvas menus */
                pointer-events: none;
            }
            .tour-svg {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: auto;
            }
            .tour-popover {
                position: fixed;
                background: #ffffff;
                color: #334155;
                padding: 18px 20px;
                border-radius: 16px;
                width: 290px;
                box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.15);
                z-index: 2060;
                opacity: 0;
                transform: scale(0.9);
                transform-origin: center center;
                transition: opacity 0.3s cubic-bezier(0.25, 1, 0.5, 1), transform 0.3s cubic-bezier(0.25, 1, 0.5, 1), left 0.3s cubic-bezier(0.25, 1, 0.5, 1), top 0.3s cubic-bezier(0.25, 1, 0.5, 1);
                pointer-events: auto;
                border: 1px solid #f1f5f9;
            }
            .tour-popover h5 {
                color: #1e3a8a; /* ByaHero Primary Blue */
                font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
                font-weight: 800;
                margin-bottom: 6px;
                font-size: 1.15rem;
                letter-spacing: -0.3px;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .tour-popover p {
                font-size: 0.85rem;
                line-height: 1.45;
                margin-bottom: 16px;
                color: #475569;
            }
            .tour-buttons {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .tour-highlight-border {
                fill: none;
                stroke: #3b82f6;
                stroke-width: 2.5px;
                stroke-linecap: round;
                transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1);
                animation: tourBorderPulse 1.5s linear infinite;
            }
            @keyframes tourBorderPulse {
                0% { stroke-dasharray: 6 3; stroke-dashoffset: 0; }
                100% { stroke-dasharray: 6 3; stroke-dashoffset: -18; }
            }
            /* Arrow indicators pointing to target dynamically */
            .tour-arrow {
                position: absolute;
                width: 0;
                height: 0;
                border-width: 8px;
                border-style: solid;
                border-color: transparent;
                transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1);
            }
            .tour-popover.arrow-top .tour-arrow {
                bottom: 100%;
                border-bottom-color: #ffffff;
            }
            .tour-popover.arrow-bottom .tour-arrow {
                top: 100%;
                border-top-color: #ffffff;
            }
        `;
        document.head.appendChild(style);
        this.cssInjected = true;
    }

    createOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'byahero-tour-container';
        overlay.className = 'tour-overlay-wrapper';
        overlay.innerHTML = `
            <svg class="tour-svg" width="100%" height="100%">
                <defs>
                    <mask id="tour-svg-mask">
                        <rect width="100%" height="100%" fill="white" />
                        <rect id="tour-svg-cutout" fill="black" rx="12" ry="12" x="0" y="0" width="0" height="0" style="transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1);" />
                    </mask>
                </defs>
                <rect width="100%" height="100%" fill="rgba(0, 0, 0, 0.65)" mask="url(#tour-svg-mask)" />
                <rect id="tour-svg-border" class="tour-highlight-border" rx="12" ry="12" x="0" y="0" width="0" height="0" />
            </svg>
            <div id="tour-popover" class="tour-popover">
                <div id="tour-arrow" class="tour-arrow"></div>
                <div id="tour-popover-content"></div>
            </div>
        `;
        document.body.appendChild(overlay);
        this.overlay = overlay;
        this.popover = document.getElementById('tour-popover');
    }

    async showStep() {
        const step = this.steps[this.currentStep];

        // Trigger pre-step hook (e.g. tabs switching or sheet expansion)
        if (typeof step.onBefore === 'function') {
            await step.onBefore();
        }

        // Wait brief moment for rendering engines/CSS animation transitions to stabilize
        setTimeout(() => {
            if (!this.popover) return;
            
            const isNoTarget = !step.element;
            let target = null;
            if (!isNoTarget) {
                const els = document.querySelectorAll(step.element);
                for (let el of els) {
                    if (el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0) {
                        target = el;
                        break;
                    }
                }
                if (!target && els.length > 0) {
                    target = els[0];
                }
            }

            // Handle Welcome/Success steps without a screen target
            if (isNoTarget || !target) {
                this.drawNoTargetOverlay();
                this.positionNoTargetPopover(step);
                return;
            }

            // Target exists - scroll into view and position cutout perfectly
            target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            const rect = target.getBoundingClientRect();
            const padding = 6;
            this.drawSpotlightCutout(rect, padding);
            this.positionTargetPopover(rect, step);
        }, 350);
    }

    drawNoTargetOverlay() {
        // Hide overlay spotlight cutout
        const cutout = document.getElementById('tour-svg-cutout');
        const border = document.getElementById('tour-svg-border');
        if (cutout) {
            cutout.setAttribute('x', '0');
            cutout.setAttribute('y', '0');
            cutout.setAttribute('width', '0');
            cutout.setAttribute('height', '0');
        }
        if (border) {
            border.setAttribute('width', '0');
            border.setAttribute('height', '0');
        }
    }

    drawSpotlightCutout(rect, padding) {
        const cutout = document.getElementById('tour-svg-cutout');
        const border = document.getElementById('tour-svg-border');

        const x = rect.left - padding;
        const y = rect.top - padding;
        const w = rect.width + (padding * 2);
        const h = rect.height + (padding * 2);

        if (cutout) {
            cutout.setAttribute('x', x);
            cutout.setAttribute('y', y);
            cutout.setAttribute('width', w);
            cutout.setAttribute('height', h);
        }
        if (border) {
            border.setAttribute('x', x);
            border.setAttribute('y', y);
            border.setAttribute('width', w);
            border.setAttribute('height', h);
        }
    }

    positionNoTargetPopover(step) {
        this.popover.className = 'tour-popover'; // Clear arrow indicators
        
        // Hide dynamic HTML arrow
        const arrow = document.getElementById('tour-arrow');
        if (arrow) arrow.style.display = 'none';

        // Centered perfectly in the screen
        const left = (window.innerWidth - 290) / 2;
        const top = (window.innerHeight - 180) / 2;

        this.popover.style.left = `${left}px`;
        this.popover.style.top = `${top}px`;

        this.renderPopoverContent(step);
    }

    positionTargetPopover(rect, step) {
        this.popover.className = 'tour-popover'; // Clear arrow classes
        
        const popoverWidth = 290;
        let left = rect.left + (rect.width / 2) - (popoverWidth / 2);
        
        // Boundary check for horizontal alignment
        left = Math.max(16, Math.min(window.innerWidth - popoverWidth - 16, left));
        
        // Decide placement: if the highlighted element is extremely large/tall (e.g. takes up more than 60% of viewport),
        // position the popover as a floating card at the bottom of the screen to prevent it from going offscreen.
        const isVeryTall = rect.height > window.innerHeight * 0.6;
        const arrow = document.getElementById('tour-arrow');

        if (isVeryTall) {
            if (arrow) arrow.style.display = 'none';
            const centerLeft = (window.innerWidth - popoverWidth) / 2;
            const popoverHeight = 160;
            const safeTop = window.innerHeight - popoverHeight - 24;
            
            this.popover.style.left = `${centerLeft}px`;
            this.popover.style.top = `${safeTop}px`;
            
            this.renderPopoverContent(step);
            return;
        }

        const isInBottomHalf = (rect.top + rect.height / 2) > (window.innerHeight / 2);
        const popoverHeight = 160; 
        let top;

        if (isInBottomHalf) {
            top = rect.top - popoverHeight - 12;
            this.popover.classList.add('arrow-bottom');
            if (top < 16) { // fallback to bottom if offscreen top
                top = rect.bottom + 12;
                this.popover.classList.remove('arrow-bottom');
                this.popover.classList.add('arrow-top');
            }
        } else {
            top = rect.bottom + 12;
            this.popover.classList.add('arrow-top');
            if (top + popoverHeight > window.innerHeight - 16) { // fallback to top if offscreen bottom
                top = rect.top - popoverHeight - 12;
                this.popover.classList.remove('arrow-top');
                this.popover.classList.add('arrow-bottom');
            }
        }

        // Apply style rules
        this.popover.style.left = `${left}px`;
        this.popover.style.top = `${top}px`;

        // Position arrow dynamically to point EXACTLY to the highlighted element center
        if (arrow) {
            arrow.style.display = 'block';
            const elementCenterX = rect.left + (rect.width / 2);
            let arrowLeft = elementCenterX - left - 8; // offset half of border-width (8px)
            // Prevent arrow from overflowing outside the popover rounded corners
            arrowLeft = Math.max(16, Math.min(popoverWidth - 24, arrowLeft));
            arrow.style.left = `${arrowLeft}px`;
        }

        this.renderPopoverContent(step);
    }

    renderPopoverContent(step) {
        const isLast = this.currentStep === this.steps.length - 1;
        const content = document.getElementById('tour-popover-content') || this.popover;
        content.innerHTML = `
            <h5>
                <span>${step.title}</span>
                <span style="font-size: 0.75rem; font-weight: 700; color: #475569; margin-left: auto; background: #f1f5f9; padding: 2px 8px; border-radius: 6px; border: 1px solid #e2e8f0; font-family: system-ui, -apple-system, sans-serif;">
                    ${this.currentStep + 1}/${this.steps.length}
                </span>
            </h5>
            <p>${step.description}</p>
            <div class="tour-buttons">
                <button class="btn btn-sm btn-link text-secondary p-0 text-decoration-none fw-bold" onclick="window._byaheroTourInstance.stop()">Skip</button>
                <button class="btn btn-sm btn-primary px-3 rounded-pill fw-bold" onclick="window._byaheroTourInstance.next()">
                    ${isLast ? 'Finish' : 'Next'}
                </button>
            </div>
        `;

        // Scale popover smoothly
        this.popover.style.opacity = '1';
        this.popover.style.transform = 'scale(1)';
    }

    next() {
        if (!this.popover) return;
        this.popover.style.opacity = '0';
        this.popover.style.transform = 'scale(0.9)';

        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            
            const nextStep = this.steps[this.currentStep];
            if (nextStep.pagePath) {
                const currentUrl = window.location.pathname.toLowerCase();
                const targetPath = nextStep.pagePath.toLowerCase();
                
                // If target path is different from current page, redirect browser to next stage
                if (!currentUrl.includes(targetPath)) {
                    const basePath = window.PROJECT_BASE || window.APP_BASE_URL || '';
                    const fullUrl = `${basePath}${nextStep.pagePath}?start_tour=true&step=${this.currentStep}`;
                    window.location.href = fullUrl;
                    return;
                }
            }
            
            this.showStep();
        } else {
            this.stop();
        }
    }

    stop() {
        if (this.popover) {
            this.popover.style.opacity = '0';
            this.popover.style.transform = 'scale(0.9)';
        }
        setTimeout(() => {
            if (this.overlay) {
                this.overlay.remove();
                this.overlay = null;
            }
            window._byaheroTourInstance = null;
        }, 300);
    }
}
window.ByaheroTour = ByaheroTour;

// --- GLOBAL MULTI-PAGE TOUR CONFIG & INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('start_tour') === 'true') {
        const stepIndex = parseInt(urlParams.get('step') || '0', 10);
        
        // Mock Location for the Tour if we are on the index page and no location is currently available
        if (window.location.pathname.toLowerCase().includes('/public/passenger/index.php')) {
            const hasLocation = window.userLocation && window.locationPermissionGranted;
            
            if (!hasLocation) {
                window.locationPermissionGranted = true;
                window.userLocation = { lat: 14.0905, lng: 121.0550 };
            }
            
            const checkMapInterval = setInterval(() => {
                if (window._map) {
                    clearInterval(checkMapInterval);
                    
                    if (window.userLocation) {
                        const targetLat = window.userLocation.lat;
                        const targetLng = window.userLocation.lng;
                        
                        if (!window.userMarker) {
                            window.userMarker = L.marker([targetLat, targetLng], { 
                                icon: window.getUserIcon ? window.getUserIcon() : L.divIcon({className: 'user-marker-container'}), 
                                zIndexOffset: 100 
                            }).addTo(window._map);
                            if (window.bindUserMarker) window.bindUserMarker(window.userMarker);
                        } else {
                            window.userMarker.setLatLng([targetLat, targetLng]);
                        }
                        
                        // Auto recenter map to the location
                        window._map.setView([targetLat, targetLng], 15);
                    }
                    
                    if (window.updateUserMarkerWaitingStyle) window.updateUserMarkerWaitingStyle();
                }
            }, 100);
            
            setTimeout(() => clearInterval(checkMapInterval), 5000);
        }
        
        const steps = [
            {
                title: 'Welcome to ByaHero!',
                description: "Let's take a quick interactive tour to show you how to navigate your live commuter dashboard.",
                pagePath: '/public/passenger/index.php'
            },
            {
                element: '#tab-location',
                title: '🚌 Bus Locations',
                description: 'See all live buses operating on routes, including their capacity and real-time ETAs.',
                pagePath: '/public/passenger/index.php',
                onBefore: function() {
                    if (typeof window.switchSheetTab === 'function') window.switchSheetTab('location');
                }
            },
            {
                element: '#tab-routes',
                title: '🗺️ Filter Routes',
                description: 'Filter routes in one click to track only the buses heading in your direction.',
                pagePath: '/public/passenger/index.php',
                onBefore: function() {
                    if (typeof window.switchSheetTab === 'function') window.switchSheetTab('routes');
                }
            },
            {
                element: '#tab-groups',
                title: '👥 Circle Groups',
                description: 'Track your private circle members and friends on the map in real time.',
                pagePath: '/public/passenger/index.php',
                onBefore: function() {
                    if (typeof window.switchSheetTab === 'function') window.switchSheetTab('groups');
                }
            },
            {
                element: '#tab-busstops',
                title: '🚏 Pickup Stops',
                description: 'Discover pick-up terminals and designated boarding stops nearby.',
                pagePath: '/public/passenger/index.php',
                onBefore: function() {
                    if (typeof window.switchSheetTab === 'function') window.switchSheetTab('busstops');
                }
            },
            {
                element: '.my-location-btn-wrap button',
                title: '🎯 Recenter Map',
                description: 'Tap this target button anytime to snap the map view directly back to your live GPS coordinates.',
                pagePath: '/public/passenger/index.php',
                onBefore: function() {
                    if (typeof window.switchSheetTab === 'function') window.switchSheetTab('location');
                }
            },
            {
                element: '.user-marker-container',
                title: '📍 Commuter Location',
                description: 'Focuses on your avatar marker on the map (loading simulated mockup coordinates if your live location is currently unavailable).',
                pagePath: '/public/passenger/index.php',
                onBefore: function() {
                    if (typeof window.switchSheetTab === 'function') window.switchSheetTab('location');
                    if (window._map && window.userLocation) {
                        window._map.setView([window.userLocation.lat, window.userLocation.lng], 15);
                    }
                }
            },
            {
                element: '.user-waiting-chat-bubble',
                title: '🚌 Commuter Waiting Status',
                description: 'Tap on your blue avatar marker or the floating "Waiting" bubble on the map to open the pickup status dialog.',
                pagePath: '/public/passenger/index.php',
                onBefore: function() {
                    if (typeof window.switchSheetTab === 'function') window.switchSheetTab('location');
                    if (window._map && window.userLocation) {
                        window._map.setView([window.userLocation.lat, window.userLocation.lng], 15);
                    }
                    const modalEl = document.getElementById('waitingModal');
                    if (modalEl) {
                        const instance = bootstrap.Modal.getInstance(modalEl);
                        if (instance) instance.hide();
                    }
                }
            },
            {
                element: '#waitingModal .modal-content',
                title: '🚌 Set Waiting Status',
                description: 'Declare that you are actively waiting at your current location so incoming bus drivers can see your coordinates and prepare for pickup.',
                pagePath: '/public/passenger/index.php',
                onBefore: function() {
                    if (typeof window.switchSheetTab === 'function') window.switchSheetTab('location');
                    if (window._map && window.userLocation) {
                        window._map.setView([window.userLocation.lat, window.userLocation.lng], 15);
                    }
                    if (typeof window.openWaitingModal === 'function') {
                        window.openWaitingModal();
                    }
                }
            },
            {
                element: '#btnSetWaiting',
                title: '🚌 Broadcast Status',
                description: 'Tap this primary button to broadcast your active waiting coordinates instantly to all oncoming bus drivers.',
                pagePath: '/public/passenger/index.php',
                onBefore: function() {
                    if (typeof window.switchSheetTab === 'function') window.switchSheetTab('location');
                    if (window._map && window.userLocation) {
                        window._map.setView([window.userLocation.lat, window.userLocation.lng], 15);
                    }
                    if (typeof window.openWaitingModal === 'function') {
                        window.openWaitingModal();
                    }
                }
            },
            {
                element: '.sos-dome, #desktop-nav-links a[href*="sos.php"]',
                title: '🚨 Emergency SOS Indicator',
                description: 'This is the Emergency SOS button. Tap it in case of danger. Let\'s open the Emergency Center to see how it works.',
                pagePath: '/public/passenger/index.php',
                onBefore: function() {
                    if (typeof window.switchSheetTab === 'function') window.switchSheetTab('location');
                    const modalEl = document.getElementById('waitingModal');
                    if (modalEl) {
                        const instance = bootstrap.Modal.getInstance(modalEl);
                        if (instance) instance.hide();
                    }
                }
            },
            {
                element: '.main-sos-btn',
                title: '🚨 Trigger SOS Alert',
                description: 'When in danger, press and hold this SOS button for 5 seconds to broadcast your exact live coordinates to all circles and emergency contacts.',
                pagePath: '/public/passenger/sos/sos.php'
            },
            {
                element: '#topbar-notification-icon',
                title: '🔔 Live Notifications Alert',
                description: 'This is your alert notification bell. It flashes red when you receive circle invitations or warnings. Let\'s check your inbox.',
                pagePath: '/public/passenger/index.php'
            },
            {
                element: '.list-group, .no-notifications-container',
                title: '🔔 Notifications Inbox',
                description: 'Review received alerts, active SOS alerts from circle members, and smart transit announcements here.',
                pagePath: '/public/passenger/notifications.php'
            },
            {
                element: '#nav-info, #desktop-nav-links a[href*="busInfo.php"]',
                title: 'ℹ️ Bus Information Tab',
                description: 'This is the Bus Info tab. It lists scheduled fares, operator numbers, and timetables. Let\'s take a look.',
                pagePath: '/public/passenger/index.php'
            },
            {
                element: '.container > div.border',
                title: 'ℹ️ Schedules & Rates',
                description: 'Access bus schedules, fare rates, and active operator details here.',
                pagePath: '/public/passenger/busInfo/busInfo.php'
            },
            {
                element: '[data-bs-target="#passengerMenu"]',
                title: '🍔 Passenger Menu Drawer',
                description: 'Tap this hamburger menu button to open additional features, profile details, and account settings.',
                pagePath: '/public/passenger/index.php',
                onBefore: function() {
                    const menuEl = document.getElementById('passengerMenu');
                    if (menuEl) {
                        const instance = bootstrap.Offcanvas.getInstance(menuEl);
                        if (instance) instance.hide();
                    }
                }
            },
            {
                element: 'a[href*="rideHistory.php"]',
                title: '📜 Ride History Link',
                description: 'This is your Ride History link. Tap here to view all your past boarding records, routes taken, and operator details. Let\'s check it out.',
                pagePath: '/public/passenger/index.php',
                onBefore: function() {
                    const menuEl = document.getElementById('passengerMenu');
                    if (menuEl) {
                        const instance = bootstrap.Offcanvas.getOrCreateInstance(menuEl);
                        instance.show();
                    }
                }
            },
            {
                element: '.history-container > div.border',
                title: '📜 Ride History Logs',
                description: 'Access all details about your past travel logs, duration, and even report issues with specific buses here.',
                pagePath: '/public/passenger/rideHistory.php'
            },
            {
                element: 'a[href*="feedback.php"]',
                title: '💬 Commuter Feedback Link',
                description: 'This is the Feedback link. Share your ratings and feedback on your commuting experience. Let\'s open it.',
                pagePath: '/public/passenger/index.php',
                onBefore: function() {
                    const menuEl = document.getElementById('passengerMenu');
                    if (menuEl) {
                        const instance = bootstrap.Offcanvas.getOrCreateInstance(menuEl);
                        instance.show();
                    }
                }
            },
            {
                element: '.feedback-card',
                title: '💬 Commuter Feedback Card',
                description: 'Rate your travel experience out of 5 stars and tell us how we can make your ByaHero journeys even better!',
                pagePath: '/public/passenger/passengerSettings/feedback.php'
            },
            {
                element: 'a[href*="report.php"]',
                title: '⚠️ Report a Problem Link',
                description: 'This is the Report a Problem link. Report any transit delays, reckless drivers, or app issues directly. Let\'s open it.',
                pagePath: '/public/passenger/index.php',
                onBefore: function() {
                    const menuEl = document.getElementById('passengerMenu');
                    if (menuEl) {
                        const instance = bootstrap.Offcanvas.getOrCreateInstance(menuEl);
                        instance.show();
                    }
                }
            },
            {
                element: '.report-card',
                title: '⚠️ Report a Problem Form',
                description: 'Submit direct incident reports, choose issue types, specify details, and help keep ByaHero commutes safe and orderly.',
                pagePath: '/public/passenger/report/report.php'
            },
            {
                title: "You're All Set!",
                description: "You've successfully completed the guide! Enjoy smart, safe, and efficient travel with ByaHero.",
                pagePath: '/public/passenger/index.php',
                onBefore: function() {
                    const menuEl = document.getElementById('passengerMenu');
                    if (menuEl) {
                        const instance = bootstrap.Offcanvas.getInstance(menuEl);
                        if (instance) instance.hide();
                    }
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
            }
        ];

        // Start the tour globally on whatever page we are on
        setTimeout(() => {
            window._byaheroTourInstance = new ByaheroTour(steps);
            window._byaheroTourInstance.currentStep = stepIndex;
            window._byaheroTourInstance.start();
        }, 1200);
    }
});

