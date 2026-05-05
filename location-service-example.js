/**
 * Example usage of LocationService in your web app
 *
 * This example shows how to integrate the native location service
 * into your ByaHero app for background location tracking.
 */

// Example: Start location tracking when conductor starts a session
async function startLocationTracking() {
    try {
        const locationService = new LocationService();

        // Check if service is already running
        const isRunning = await locationService.isServiceRunning();
        if (isRunning) {
            console.log('Location service is already running');
            return;
        }

        // Start the foreground service with custom intervals
        await locationService.start({
            interval: 5000,        // Update every 5 seconds
            fastestInterval: 3000  // Fastest update interval
        });

        // Listen for location updates
        locationService.onLocationUpdate((location) => {
            console.log('Location update:', location);
            // Send location to your backend
            // fetch('/api/update-location', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(location)
            // });
        });

        console.log('Location service started successfully');
    } catch (error) {
        console.error('Failed to start location service:', error);
    }
}

// Example: Stop location tracking when conductor ends session
async function stopLocationTracking() {
    try {
        const locationService = new LocationService();
        await locationService.stop();
        console.log('Location service stopped');
    } catch (error) {
        console.error('Failed to stop location service:', error);
    }
}

// Example integration with your existing conductor code
// Add this to your conductor's "Start Trip" button handler:
/*
document.getElementById('startTripBtn').addEventListener('click', async () => {
    await startLocationTracking();
    // ... your existing start trip logic
});
*/

// Add this to your conductor's "End Trip" button handler:
/*
document.getElementById('endTripBtn').addEventListener('click', async () => {
    await stopLocationTracking();
    // ... your existing end trip logic
});
*/
