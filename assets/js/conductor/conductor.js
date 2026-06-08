/**
 * conductor.js
 * ──────────────────────────────────────────────────────────────────────────
 * Dispatch and setup mapping controls for ByaHero Conductor Panel.
 * Extracted from public/conductor/conductor.php
 * ──────────────────────────────────────────────────────────────────────────
 */

const el = id => document.getElementById(id);
const alertBox = el('alertBox');

/**
 * Triggers modal alert banners.
 */
function showAlert(message, type = 'danger') {
    const bsType = (type === 'danger') ? 'danger' : 'primary';
    if (alertBox) {
        alertBox.innerHTML = `<div class="alert alert-${bsType} border-0 text-center fw-bold shadow-sm" style="border-radius: 12px; padding: 10px;">${message}</div>`;
    }
    setTimeout(() => { if (alertBox) alertBox.innerHTML = ''; }, 3000);
}

// Map variables
let map = null;
let _fetchLiveBusesIntervalId = null;

/**
 * Initializes Leaflet Map.
 */
function initMap() {
    map = L.map('mainMap', { zoomControl: false, attributionControl: false }).setView([14.0905, 121.0550], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
}

// Markers & Icons variables
const busMarkers = {};
const statusColors = {
    available: '#10b981',
    on_stop: '#f59e0b',
    full: '#ef4444',
    unavailable: '#6b7280'
};

const ICON_CACHE = {
    available: L.icon({
        iconUrl: '../../assets/images/icons/marker.svg',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20]
    }),
    full: L.icon({
        iconUrl: '../../assets/images/icons/marker.svg',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20]
    })
};

/**
 * Builds or fetches the standard marker icon based on bus status.
 */
function createBusIcon(status) {
    const s = String(status || '').toLowerCase();
    if (s === 'available') return ICON_CACHE.available;
    if (s === 'full') return ICON_CACHE.full;

    const color = statusColors[s] || '#999';
    return L.divIcon({
        html: `<div style="background:${color};width:16px;height:16px;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 5px rgba(0,0,0,0.3)"></div>`,
        className: 'bus-marker-dot',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });
}

/**
 * Parses raw bus response into clean JSON structure.
 */
function normalizeBus(bus) {
    let coords = null;
    if (bus.current_location) {
        try {
            const geo = JSON.parse(bus.current_location);
            if (geo.geometry) coords = [geo.geometry.coordinates[1], geo.geometry.coordinates[0]];
        } catch (e) {}
    }
    if (!coords && bus.lat && bus.lng) coords = [bus.lat, bus.lng];

    return {
        id: bus.Bus_ID || bus.id,
        code: bus.code || 'BUS',
        route: bus.route || '',
        status: bus.status || 'unavailable',
        coords: coords,
        locName: bus.current_location_name || 'Updating...'
    };
}

let currentMapFilter = ''; 

/**
 * Set and apply filters to the active Leaflet markers.
 */
function setMapFilter(route, label) {
    currentMapFilter = route;
    const filterBtnLabel = document.getElementById('filterBtnLabel');
    if (filterBtnLabel) {
        filterBtnLabel.innerHTML = `${label} <span class="material-symbols-rounded" style="font-size: 18px;">route</span>`;
    }
    fetchLiveBuses(); 
}

var _fetchLiveBusesInProgress = false;
var _fetchLiveBusesTimer = null;

/**
 * Pulls current bus telemetries to update display markers.
 */
async function fetchLiveBuses() {
    if (_fetchLiveBusesInProgress) return;
    _fetchLiveBusesInProgress = true;
    try {
        const res = await fetch('../api.php?action=get_buses');
        const json = await res.json();

        if (json.success && json.buses) {
            const buses = json.buses.map(normalizeBus);
            updateMap(buses);
        }
    } catch (e) {
        console.error("Bus fetch error:", e);
    } finally {
        _fetchLiveBusesInProgress = false;
    }
}

/**
 * Schedules periodic AJAX fetches for active bus details.
 */
function scheduleNextLiveBusesUpdate() {
    _fetchLiveBusesTimer = setTimeout(async () => {
        await fetchLiveBuses();
        scheduleNextLiveBusesUpdate();
    }, 4000);
}

/**
 * Renders or removes Leaflet bus markers according to active filters.
 */
function updateMap(buses) {
    const filtered = buses.filter(b => 
        (!currentMapFilter || b.route === currentMapFilter) &&
        b.status !== 'unavailable' &&
        b.coords !== null
    );

    const currentIds = new Set(filtered.map(b => String(b.id)));

    // Remove markers not in active dataset
    Object.keys(busMarkers).forEach(id => {
        if (!currentIds.has(id)) {
            map.removeLayer(busMarkers[id]);
            delete busMarkers[id];
        }
    });

    // Update or add map layers
    filtered.forEach(b => {
        const iconForBus = createBusIcon(b.status);
        const popupContent = `<b>${b.code}</b><br>${b.locName}`;
        
        if (busMarkers[b.id]) {
            busMarkers[b.id].setLatLng(b.coords).setIcon(iconForBus);
            if (busMarkers[b.id].getPopup()) {
                busMarkers[b.id].setPopupContent(popupContent);
            } else {
                busMarkers[b.id].bindPopup(popupContent);
            }
        } else {
            const m = L.marker(b.coords, { icon: iconForBus }).addTo(map);
            m.bindPopup(popupContent);
            busMarkers[b.id] = m;
        }
    });
}

// Dropdown form selectors
function toggleDropdown(containerId) {
    document.querySelectorAll('.custom-select-container').forEach(container => {
        if (container.id !== containerId) {
            container.classList.remove('open');
        }
    });
    el(containerId).classList.toggle('open');
}

document.addEventListener('click', e => {
    if (!e.target.closest('.custom-select-container') && !e.target.closest('.filter-pill')) {
        document.querySelectorAll('.custom-select-container').forEach(container => {
            container.classList.remove('open');
        });
    }
});

function selectRoute(value, displayText) {
    el('routeSelect').value = value;
    el('routeDropdownValue').textContent = displayText;

    const container = el('routeSelectContainer');
    container.querySelectorAll('.custom-option').forEach(opt => {
        opt.classList.remove('selected');
        if (opt.dataset.value === value) {
            opt.classList.add('selected');
        }
    });
    container.classList.remove('open');
}

let selectedBusMeta = null;

function setBus(busId, label, meta = null) {
    el('busSelect').value = busId;
    el('busDropdownValue').textContent = label;
    selectedBusMeta = meta;

    const container = el('busSelectContainer');
    container.querySelectorAll('.custom-option').forEach(opt => {
        opt.classList.remove('selected');
        if (opt.dataset.value === String(busId)) {
            opt.classList.add('selected');
        }
    });
    container.classList.remove('open');
}

/**
 * Loads unassigned active buses for Conductor to choose on boot.
 */
async function loadBusesDropdown() {
    try {
        const r = await fetch('../api.php?action=get_buses_conductor', { cache: 'no-store' });
        const json = await r.json();
        const list = el('busOptionsList');

        if (json.success && json.buses && list) {
            json.buses.forEach(b => {
                if (b.current_conductor_id !== null && b.current_conductor_id !== undefined) return;

                const id = b.id || b.Bus_ID || b.bus_id;
                const code = b.code || `BUS-${id}`;
                const meta = { bus_id: String(id), code: code, seats_total: b.total_seats || b.seats_total || 25 };

                const div = document.createElement('div');
                div.className = 'custom-option';
                div.dataset.value = String(id);
                div.innerHTML = `<span>${code}</span>`;
                
                div.addEventListener('click', () => setBus(String(id), code, meta));
                list.appendChild(div);
            });
        }
    } catch (e) {
        showAlert('Failed to load buses for selection', 'danger');
    }
}

let preDepartureModalInstance = null;

/**
 * Opens pre-departure count modal checklist before dispatching tracking.
 */
function startTracking() {
    const busId = el('busSelect').value;
    const route = el('routeSelect').value;

    if (!busId) return showAlert('Please select a bus first.', 'danger');
    if (!route) return showAlert('Please select a route first.', 'danger');

    const seatsTotal = selectedBusMeta?.seats_total || 25;
    el('seatsTotalHelper').textContent = `Maximum seats: ${seatsTotal}`;
    el('boardedCount').value = "";

    if (!preDepartureModalInstance) {
        preDepartureModalInstance = new bootstrap.Modal(el('preDepartureModal'));
    }
    preDepartureModalInstance.show();
}

/**
 * Packages current tracking setup fields and POST-submits to Conductor Live screen.
 */
function confirmStartTracking() {
    const busId = el('busSelect').value;
    const route = el('routeSelect').value;
    const seatsTotal = selectedBusMeta?.seats_total || 25;
    const boarded = parseInt(el('boardedCount').value) || 0;
    const initialAvailableSeats = Math.max(0, seatsTotal - boarded);

    const payload = {
        bus_id: busId,
        code: selectedBusMeta?.code || `BUS-${busId}`,
        seats_total: seatsTotal,
        route: route,
        initial_available_seats: initialAvailableSeats,
        pre_departure_count: boarded
    };

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'conductorLive.php';

    for (const k in payload) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = k;
        input.value = payload[k];
        form.appendChild(input);
    }

    document.body.appendChild(form);
    form.submit();
}

// Boot setup
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    loadBusesDropdown();
    fetchLiveBuses();
    scheduleNextLiveBusesUpdate();

    const startBtn = el('startBtn');
    if (startBtn) {
        startBtn.addEventListener('click', startTracking);
    }
});

// Window Unload Cleans
function _cleanup() {
    if (_fetchLiveBusesTimer) {
        clearTimeout(_fetchLiveBusesTimer);
        _fetchLiveBusesTimer = null;
    }
    _fetchLiveBusesInProgress = false;
}
window.addEventListener('beforeunload', _cleanup);
window.addEventListener('pagehide', _cleanup);