// Analytics Helper - Respects user privacy settings
class ByaHeroAnalytics {
    constructor() {
        this.enabled = localStorage.getItem('byahero_analytics') !== '0';
    }

    // Check if analytics is enabled
    isEnabled() {
        return localStorage.getItem('byahero_analytics') !== '0';
    }

    // Log an event
    async logEvent(eventType, eventData = {}) {
        if (!this.isEnabled()) {
            console.log('[Analytics] Disabled - not logging:', eventType);
            return;
        }

        try {
            await fetch('/ByaHero-Prototype-V3/backend/logAnalytics.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    event_type: eventType,
                    event_data: eventData,
                    page: window.location.pathname,
                    analytics_enabled: this.isEnabled()
                })
            });
        } catch (error) {
            console.error('[Analytics] Error logging event:', error);
        }
    }

    // Common events
    pageView() {
        this.logEvent('page_view', {
            url: window.location.href,
            title: document.title
        });
    }

    buttonClick(buttonName) {
        this.logEvent('button_click', {
            button: buttonName
        });
    }

    featureUsed(featureName) {
        this.logEvent('feature_used', {
            feature: featureName
        });
    }

    busTracked(busId) {
        this.logEvent('bus_tracked', {
            bus_id: busId
        });
    }

    settingChanged(settingName, value) {
        this.logEvent('setting_changed', {
            setting: settingName,
            value: value
        });
    }

    error(errorMessage) {
        this.logEvent('error', {
            message: errorMessage,
            stack: new Error().stack
        });
    }
}

// Initialize global analytics instance
const analytics = new ByaHeroAnalytics();

// Auto-log page views
document.addEventListener('DOMContentLoaded', () => {
    analytics.pageView();
});

// Example: Track errors automatically
window.addEventListener('error', (event) => {
    analytics.error(event.message);
});