/**
 * manageStops.js
 * ──────────────────────────────────────────────────────────────────────────
 * Client-side map initialization, marker customization, and Sortable.js order management.
 * Extracted from public/admin/manageStops.php
 * ──────────────────────────────────────────────────────────────────────────
 */

document.addEventListener('DOMContentLoaded', () => {
    const config = window.BYAHERO_STOPS_CONFIG || {};
    const BASE_URL = config.baseUrl || '';
    const existingStops = config.existingStops || [];
    const ROUTE_FORWARD = config.routeForward || 'LAUREL - TANAUAN';
    const ROUTE_REVERSE = config.routeReverse || 'TANAUAN - LAUREL';

    const map = L.map('stopMap').setView([14.0905, 121.0550], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }).addTo(map);

    const PICKUP_URL = BASE_URL + '/assets/images/icons/busStopMarkerFinal1.svg';
    const STOP_URL   = BASE_URL + '/assets/images/icons/busStopMarkerFinal1.svg';

    let MARKER_SIZE = 42;

    function makeIcons() {
        const size = MARKER_SIZE;
        const anchorX = Math.round(size / 2);
        const anchorY = size;

        const pickupIcon = L.icon({
            iconUrl: PICKUP_URL,
            iconSize: [size, size],
            iconAnchor: [anchorX, anchorY],
            popupAnchor: [0, -Math.round(size * 0.9)]
        });

        const stopIcon = L.icon({
            iconUrl: STOP_URL,
            iconSize: [size, size],
            iconAnchor: [anchorX, anchorY],
            popupAnchor: [0, -Math.round(size * 0.9)]
        });

        const terminalIcon = stopIcon;

        return { pickupIcon, stopIcon, terminalIcon };
    }

    let ICONS = makeIcons();

    function iconForType(type) {
        const t = String(type || '').toLowerCase();
        if (t === 'pickup_point') return ICONS.pickupIcon;
        if (t === 'terminal') return ICONS.terminalIcon;
        return ICONS.stopIcon;
    }

    function escapeHtml(str) {
        return String(str ?? '').replace(/[&<>"']/g, s => ({
            '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
        }[s]));
    }

    const stopMarkers = [];

    function renderExistingStops() {
        existingStops.forEach(s => {
            if (!s.lat || !s.lng) return;

            const popup = `
              <b>${escapeHtml(s.name)}</b><br>
              ${escapeHtml(s.location_name)}<br>
              <small>${escapeHtml(s.type)}</small>
              ${s.location_landmark ? `<br><small>Landmark: ${escapeHtml(s.location_landmark)}</small>` : ''}
            `;

            const m = L.marker([parseFloat(s.lat), parseFloat(s.lng)], { icon: iconForType(s.type) })
              .addTo(map)
              .bindPopup(popup);
              
            m.stopData = s;
            stopMarkers.push(m);
        });
    }

    window.filterMapStops = function() {
        const selectedRoute = document.getElementById('mapRouteFilter').value;
        stopMarkers.forEach(m => {
            const route = m.stopData.route || '';
            if (selectedRoute === 'ALL' || route === selectedRoute) {
                if (!map.hasLayer(m)) map.addLayer(m);
            } else {
                if (map.hasLayer(m)) map.removeLayer(m);
            }
        });
    };

    renderExistingStops();

    let pickMarker = null;
    const coordsEl = document.getElementById('pickedCoords');
    const latField = document.getElementById('latField');
    const lngField = document.getElementById('lngField');
    const typeSelect = document.getElementById('typeSelect');

    function refreshPickedMarkerIcon() {
        if (!pickMarker) return;
        pickMarker.setIcon(iconForType(typeSelect.value));
    }
    if (typeSelect) {
        typeSelect.addEventListener('change', refreshPickedMarkerIcon);
    }

    let routeGeoJSON = null;
    fetch(BASE_URL + '/public/routes/laurel-talisay-tanauan.geojson')
        .then(res => res.json())
        .then(data => { routeGeoJSON = data; })
        .catch(err => console.error("Could not load route GeoJSON", err));

    map.on('click', (e) => {
        const { lat, lng } = e.latlng;

        if (pickMarker) map.removeLayer(pickMarker);

        pickMarker = L.marker([lat, lng], { icon: iconForType(typeSelect.value) })
          .addTo(map)
          .bindPopup('Selected location')
          .openPopup();

        if (latField) latField.value = lat.toFixed(7);
        if (lngField) lngField.value = lng.toFixed(7);
        if (coordsEl) coordsEl.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

        // Auto-fill location name if point is inside a route polygon
        if (routeGeoJSON && typeof turf !== 'undefined') {
            const pt = turf.point([lng, lat]);
            for (const feature of routeGeoJSON.features) {
                if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
                    if (turf.booleanPointInPolygon(pt, feature)) {
                        const locName = feature.properties['Current Location'];
                        if (locName) {
                            const input = document.querySelector('input[name="location_name"]');
                            if (input) input.value = locName;
                            break;
                        }
                    }
                }
            }
        }
    });

    const slider = document.getElementById('iconSizeSlider');
    const sizeValue = document.getElementById('iconSizeValue');

    function applyMarkerSize(newSize) {
        MARKER_SIZE = newSize;
        if (sizeValue) sizeValue.textContent = String(newSize);

        ICONS = makeIcons();

        stopMarkers.forEach((m, idx) => {
            const s = existingStops[idx];
            m.setIcon(iconForType(s?.type));
        });

        refreshPickedMarkerIcon();
    }

    if (slider) {
        slider.addEventListener('input', () => {
            applyMarkerSize(parseInt(slider.value, 10) || 42);
        });
        applyMarkerSize(parseInt(slider.value, 10) || 42);
    }

    // ---- Drag & drop ordering with SortableJS ----
    function initSortable(listId, inputId) {
        const list = document.getElementById(listId);
        const hiddenInput = document.getElementById(inputId);
        if (!list || !hiddenInput) return;

        new Sortable(list, {
            animation: 150,
            handle: ".route-item",
            onSort: function () {
                const ids = Array.from(list.querySelectorAll(".route-item"))
                    .map(li => li.getAttribute("data-id"));
                hiddenInput.value = ids.join(",");
            }
        });

        // Initial order
        const initialIds = Array.from(list.querySelectorAll(".route-item"))
            .map(li => li.getAttribute("data-id"));
        hiddenInput.value = initialIds.join(",");
    }

    initSortable("route-forward-list", "route-forward-order-input");
    initSortable("route-reverse-list", "route-reverse-order-input");
});
