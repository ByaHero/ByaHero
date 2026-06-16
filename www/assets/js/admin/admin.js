/**
 * admin.js
 * ──────────────────────────────────────────────────────────────────────────
 * Map update logic and live updates polling for ByaHero Admin Dashboard.
 * Extracted from public/admin/admin.php
 * ──────────────────────────────────────────────────────────────────────────
 */

document.addEventListener('DOMContentLoaded', () => {
    let _updateBusMapIntervalId = null;
    const map = L.map('map').setView([14.0905, 121.0550], 12);
    const mapTileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    L.tileLayer(mapTileUrl, {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }).addTo(map);

    const activeBusIcon = L.icon({
        iconUrl: '../../assets/images/icons/marker.svg',
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -17]
    });

    let _updateBusMapTimer = null;
    let _updateBusMapInProgress = false;
    let busMarkers = {};

    /**
     * Polls active bus locations and updates markers on the Leaflet map.
     */
    async function updateBusMap() {
        if (_updateBusMapInProgress) return;
        _updateBusMapInProgress = true;
        try {
            const res = await fetch('../api.php?action=get_buses');
            const data = await res.json();

            if (data.success && data.buses) {
                const buses = data.buses;
                const fetchedIds = new Set();

                buses.forEach(bus => {
                    if (['available', 'on_stop', 'full'].includes(bus.status)) {
                        let coords = null;

                        if (bus.lat && bus.lng) {
                            coords = [bus.lat, bus.lng];
                        } else if (bus.current_location) {
                            try {
                                const geo = JSON.parse(bus.current_location);
                                if (geo.geometry && geo.geometry.coordinates) {
                                    coords = [geo.geometry.coordinates[1], geo.geometry.coordinates[0]];
                                }
                            } catch (e) {}
                        }

                        if (!coords) return;

                        const id = bus.Bus_ID || bus.id;
                        fetchedIds.add(String(id));

                        const popupContent = `
                            <div class="fw-bold">${bus.code}</div>
                            <div class="small text-muted mb-1">${bus.route || 'No Route'}</div>
                            <div class="small">Status: <strong>${String(bus.status).toUpperCase()}</strong></div>
                            <div class="small mt-1">${bus.seat_availability}/${bus.total_seats} Seats</div>
                        `;

                        if (busMarkers[id]) {
                            busMarkers[id].setLatLng(coords);
                            busMarkers[id].setIcon(activeBusIcon);
                            busMarkers[id].setPopupContent(popupContent);
                        } else {
                            const marker = L.marker(coords, {
                                icon: activeBusIcon
                            }).addTo(map);
                            marker.bindPopup(popupContent);
                            busMarkers[id] = marker;
                        }
                    }
                });

                // Clear out stale markers
                Object.keys(busMarkers).forEach(id => {
                    if (!fetchedIds.has(id)) {
                        map.removeLayer(busMarkers[id]);
                        delete busMarkers[id];
                    }
                });
            }
        } catch (e) {
            console.error("Map Update Error:", e);
        } finally {
            _updateBusMapInProgress = false;
        }
    }

    /**
     * Poll loop schedules.
     */
    function scheduleNextBusMapUpdate() {
        _updateBusMapTimer = setTimeout(async () => {
            await updateBusMap();
            scheduleNextBusMapUpdate();
        }, 3000);
    }

    // Initialize map update and schedule polling
    updateBusMap();
    scheduleNextBusMapUpdate();

    // Prevent memory leaks on unload
    function _cleanup() {
        if (_updateBusMapTimer) {
            clearTimeout(_updateBusMapTimer);
            _updateBusMapTimer = null;
        }
        _updateBusMapInProgress = false;
    }
    window.addEventListener('beforeunload', _cleanup);
    window.addEventListener('pagehide', _cleanup);
});
