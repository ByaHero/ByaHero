/**
 * LocationService - Capacitor plugin wrapper for foreground location tracking
 *
 * This plugin provides a way to start/stop a foreground service that continues
 * tracking location even after the app is swiped away.
 *
 * IMPORTANT: On Android 12+, swiping away the app WILL stop the service.
 * The plugin will attempt to restart it automatically. For best results:
 * 1. Grant "Allow background location" permission
 * 2. Disable battery optimization for this app
 * 3. On some devices, add app to "autostart" whitelist
 *
 * Usage:
 *   const service = new LocationService();
 *   await service.start();
 *   service.onLocationUpdate((location) => { console.log(location); });
 */

class LocationService {
    constructor() {
        this.listeners = [];
        this.isRunning = false;
        this.CAPACITOR_PLUGIN = 'LocationService';
        this.restartInterval = null;
    }

    /**
     * Start the foreground location service
     * @param {Object} options
     * @param {number} options.interval - Location update interval in ms (default: 5000)
     * @param {number} options.fastestInterval - Fastest update interval in ms (default: 3000)
     */
    async start(options = {}) {
        if (!this._isCapacitorAvailable()) {
            throw new Error('Capacitor not available');
        }

        const interval = options.interval || 5000;
        const fastestInterval = options.fastestInterval || 3000;

        try {
            // Request battery optimization ignore first
            try {
                await Capacitor.Plugins.LocationService.requestIgnoreBatteryOptimization();
            } catch (e) {
                console.warn('Could not request battery optimization ignore:', e);
            }

            const result = await Capacitor.Plugins.LocationService.startLocationService({
                interval,
                fastestInterval
            });
            this.isRunning = true;
            this._registerListener();
            this._startRestartCheck();
            return result;
        } catch (error) {
            throw new Error(`Failed to start location service: ${error.message}`);
        }
    }

    /**
     * Stop the foreground location service
     */
    async stop() {
        if (!this._isCapacitorAvailable()) {
            throw new Error('Capacitor not available');
        }

        try {
            const result = await Capacitor.Plugins.LocationService.stopLocationService();
            this.isRunning = false;
            this._unregisterListener();
            this._stopRestartCheck();
            return result;
        } catch (error) {
            throw new Error(`Failed to stop location service: ${error.message}`);
        }
    }

    /**
     * Check if the service is currently running
     */
    async isServiceRunning() {
        if (!this._isCapacitorAvailable()) {
            return false;
        }

        try {
            const result = await Capacitor.Plugins.LocationService.isServiceRunning();
            this.isRunning = result.isRunning;
            return result.isRunning;
        } catch (error) {
            return false;
        }
    }

    /**
     * Register a callback for location updates
     * @param {Function} callback - Called with location object {latitude, longitude, accuracy, speed, bearing, time}
     */
    onLocationUpdate(callback) {
        this.listeners.push(callback);
        if (this.isRunning && !this._listenerRegistered) {
            this._registerListener();
        }
    }

    /**
     * Remove a location update callback
     */
    offLocationUpdate(callback) {
        this.listeners = this.listeners.filter(cb => cb !== callback);
    }

    /**
     * Check if battery optimization is ignored
     */
    async isIgnoringBatteryOptimization() {
        if (!this._isCapacitorAvailable()) {
            return false;
        }

        try {
            const result = await Capacitor.Plugins.LocationService.isIgnoringBatteryOptimization();
            return result.isIgnoring;
        } catch (error) {
            return false;
        }
    }

    _registerListener() {
        if (this._listenerRegistered) return;
        this._listenerRegistered = true;

        if (Capacitor.Plugins.LocationService.addListener) {
            Capacitor.Plugins.LocationService.addListener('locationUpdate', (location) => {
                this.listeners.forEach(cb => cb(location));
            });
        }
    }

    _unregisterListener() {
        this._listenerRegistered = false;
        if (Capacitor.Plugins.LocationService.removeAllListeners) {
            Capacitor.Plugins.LocationService.removeAllListeners();
        }
    }

    _startRestartCheck() {
        this._stopRestartCheck();
        // Check every 5 seconds if service is still running
        // If not, try to restart it
        this.restartInterval = setInterval(async () => {
            if (!this.isRunning) return;

            try {
                const running = await this.isServiceRunning();
                if (!running && this.isRunning) {
                    console.log('Service stopped, attempting to restart...');
                    try {
                        await this.start();
                    } catch (e) {
                        console.error('Failed to restart service:', e);
                    }
                }
            } catch (e) {
                // Ignore errors
            }
        }, 5000);
    }

    _stopRestartCheck() {
        if (this.restartInterval) {
            clearInterval(this.restartInterval);
            this.restartInterval = null;
        }
    }

    _isCapacitorAvailable() {
        return typeof Capacitor !== 'undefined' && Capacitor.Plugins && Capacitor.Plugins.LocationService;
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LocationService };
}
if (typeof window !== 'undefined') {
    window.LocationService = LocationService;
}
