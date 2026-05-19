<?php
session_start();

if (isset($_GET['stopped']) && $_GET['stopped'] == '1') {
    // Explicitly stopped tracking: clear any current bus session
    unset($_SESSION['current_bus']);
}

if (!isset($_SESSION['user_id']) || !in_array($_SESSION['user_role'] ?? '', ['conductor', 'driver'])) {
    header("Location: ../index.php");
    exit;
}

require_once __DIR__ . '/../../config/db.php';
$conn = db();

$userId   = (int)($_SESSION['user_id'] ?? 0);
$userName = $_SESSION['user_name'] ?? 'User';
$busError = $_GET['error'] ?? null;

/**
 * AUTO-RESUME:
 * If this conductor already has a current_bus_id and that bus is still
 * assigned to them (current_conductor_id), send them straight to
 * conductorLive.php so they continue managing the same bus.
 */
if (!isset($_GET['stopped']) || $_GET['stopped'] != '1') {
    $stmt = $conn->prepare("SELECT current_bus_id FROM conductors WHERE id = ? LIMIT 1");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();

    $currentBusId = isset($row['current_bus_id']) ? (int)$row['current_bus_id'] : 0;

    if ($currentBusId > 0) {
        $stmtBus = $conn->prepare("
            SELECT Bus_ID
            FROM busses
            WHERE Bus_ID = ? AND current_conductor_id = ?
            LIMIT 1
        ");
        $stmtBus->bind_param("ii", $currentBusId, $userId);
        $stmtBus->execute();
        $busRow = $stmtBus->get_result()->fetch_assoc();

        if ($busRow) {
            header("Location: conductorLive.php");
            exit;
        }
    }
}
?>
<!doctype html>
<html lang="en">

<head>
    <meta charset="utf-8" />
    <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <title>ByaHero - Conductor</title>

    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css" />
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0&display=swap" rel="stylesheet" media="print" onload="this.media='all'" />

    <style>
        :root {
            --btn-blue: #1c5ab5;
            --bg-light: #f3f4f6;
            --card-radius: 20px;
        }

        body {
            background-color: var(--bg-light);
            font-family: 'Segoe UI', sans-serif;
            padding-bottom: 35px; 
            margin: 0;
            min-height: 100vh;
        }

        .action-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 15px;
            margin-bottom: 15px;
            padding: 0 10px;
        }

        .settings-icon {
            color: #0f3878;
            font-size: 32px;
        }

        .filter-pill {
            background: white;
            padding: 8px 24px;
            border-radius: 999px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
            font-weight: 700;
            font-size: 0.75rem;
            color: #374151;
            display: flex;
            align-items: center;
            gap: 8px;
            border: 1px solid #e5e7eb;
            text-transform: uppercase;
        }
        .filter-pill::after { display: none !important; }

        .map-card-wrapper {
            position: relative;
            border-radius: var(--card-radius);
            overflow: hidden;
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
            background: white;
            height: 320px;
            margin-bottom: 20px;
            border: 4px solid white;
        }
        #mainMap { width: 100%; height: 100%; z-index: 1; }

        .custom-select-container {
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.08);
            background: white;
            margin-bottom: 15px;
            border: 1px solid #e5e7eb;
            transition: all 0.2s ease;
            position: relative;
        }

        .custom-select-container.open {
            border-radius: 12px 12px 0 0;
            z-index: 100;
            border-color: var(--btn-blue);
            box-shadow: 0 0 0 3px rgba(28, 90, 181, 0.15);
        }

        .custom-select-header {
            padding: 16px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
            background: white;
            user-select: none;
            border-radius: inherit;
        }

        .custom-select-header .value-text {
            font-weight: 800;
            font-size: 1.1rem;
            color: #000;
            transition: color 0.2s ease;
        }

        /* ONLY CHANGE (UI): replace the visible "v" with dropdownConductor.png, keep the same HTML */
        .custom-select-header .chevron {
            width: 18px;
            height: 18px;
            display: inline-block;
            background: url("../../assets/images/icons/dropdownConductor.png") center/contain no-repeat;
            transition: transform 0.3s ease, color 0.2s ease;

            /* hides the "v" text but keeps the element (doesn't affect JS/map) */
            text-indent: -9999px;
            overflow: hidden;
            white-space: nowrap;
        }

        .custom-select-container.open .value-text,
        .custom-select-container.open .chevron {
            color: var(--btn-blue);
        }

        /* ONLY CHANGE (UI): flip the icon when open */
        .custom-select-container.open .chevron {
            transform: rotate(180deg);
        }

        .custom-select-options {
            display: none;
            flex-direction: column;
            position: absolute; 
            top: 100%;
            left: -1px; 
            right: -1px;
            background: white;
            z-index: 99;
            box-shadow: 0 10px 20px rgba(0,0,0,0.15);
            border-radius: 0 0 12px 12px;
            border: 1px solid var(--btn-blue);
            border-top: none;
            max-height: 220px; 
            overflow-y: auto;
        }

        .custom-select-container.open .custom-select-options {
            display: flex;
        }

        .custom-option {
            padding: 14px 20px;
            font-weight: 700;
            font-size: 1.05rem;
            color: #000;
            cursor: pointer;
            background: white;
            border-bottom: 1px solid #f0f0f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: background-color 0.15s ease, color 0.15s ease;
        }

        .custom-option:last-child {
            border-bottom: none;
        }

        .custom-option:hover, 
        .custom-option.selected {
            background-color: var(--btn-blue); 
            color: white;
        }

        .custom-option:hover .text-muted,
        .custom-option.selected .text-muted {
            color: #e0e6ed !important; 
        }

        /* CHANGED: Start tracking button -> pill shape (still blue) */
        .btn-circle-start {
            width: 100%;
            height: auto;
            border-radius: 999px;
            background-color: var(--btn-blue);
            color: white;
            border: none;
            box-shadow: 0 8px 20px rgba(28, 90, 181, 0.3);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-weight: 900;
            font-size: 0.85rem;
            line-height: 1.2;
            margin: 20px auto;
            padding: 18px 16px;
            transition: transform 0.1s;
        }
        .btn-circle-start:active { transform: scale(0.95); }

        .footer-bar {
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 35px;
            background-color: #0f3878;
            z-index: 1000;
        }

        .alert-area {
            position: absolute;
            bottom: 10px;
            left: 10px;
            right: 10px;
            z-index: 900;
        }

        /* Marker CSS to ensure they click properly */
        .leaflet-marker-icon {
            pointer-events: auto;
        }
    </style>
</head>

<body>

    <?php include __DIR__ . '/../../components/navbarConductor.php'; ?>

    <div class="container px-3" style="padding-top: 5px;">
        <?php if ($busError === 'bus_taken'): ?>
            <div class="alert alert-danger mt-2 mb-2 text-center fw-bold" style="border-radius: 12px;">
                That bus is already in use by another conductor.
            </div>
        <?php endif; ?>

        <div class="action-row">
            <div style="width: 32px;"></div>

            <div class="dropdown">
                <button id="filterBtnLabel" class="filter-pill dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                    FILTER ROUTES <span class="material-symbols-rounded" style="font-size: 18px;">route</span>
                </button>
                <ul class="dropdown-menu">
                    <li><button class="dropdown-item" type="button" onclick="setMapFilter('', 'ALL ROUTES')">ALL ROUTES</button></li>
                    <li><button class="dropdown-item" type="button" onclick="setMapFilter('LAUREL - TANAUAN', 'LAUREL - TANAUAN')">LAUREL - TANAUAN</button></li>
                    <li><button class="dropdown-item" type="button" onclick="setMapFilter('TANAUAN - LAUREL', 'TANAUAN - LAUREL')">TANAUAN - LAUREL</button></li>
                </ul>
            </div>

            <div style="width: 32px;"></div> 
        </div>

        <div class="map-card-wrapper">
            <div class="alert-area" id="alertBox"></div>
            <div id="mainMap"></div>
        </div>

        <div class="custom-select-container" id="busSelectContainer">
            <div class="custom-select-header" onclick="toggleDropdown('busSelectContainer')">
                <span id="busDropdownValue" class="value-text">Select Bus</span>
                <span class="chevron">v</span>
            </div>
            <div class="custom-select-options" id="busOptionsList"></div>
            <input type="hidden" id="busSelect" value="">
        </div>

        <div class="custom-select-container" id="routeSelectContainer">
            <div class="custom-select-header" onclick="toggleDropdown('routeSelectContainer')">
                <span id="routeDropdownValue" class="value-text">Select Route</span>
                <span class="chevron">v</span>
            </div>
            <div class="custom-select-options">
                <!-- FIX UI: the dropdown label should show the FULL selected route text -->
                <div class="custom-option" data-value="LAUREL - TANAUAN" onclick="selectRoute('LAUREL - TANAUAN', 'LAUREL - TANAUAN')">LAUREL - TANAUAN</div>
                <div class="custom-option" data-value="TANAUAN - LAUREL" onclick="selectRoute('TANAUAN - LAUREL', 'TANAUAN - LAUREL')">TANAUAN - LAUREL</div>
            </div>
            <input type="hidden" id="routeSelect" value="">
        </div>

        <button id="startBtn" class="btn-circle-start">
            START<br>TRACKING
        </button>

    </div>

    <div class="footer-bar"></div>

    <!-- PRE-DEPARTURE MODAL -->
    <div class="modal fade" id="preDepartureModal" tabindex="-1" aria-hidden="true" style="z-index: 2000;">
        <div class="modal-dialog modal-dialog-centered px-4">
            <div class="modal-content" style="border-radius: var(--card-radius); border: none;">
                <div class="modal-header border-0 pb-0">
                    <h5 class="modal-title fw-bold" style="color: var(--btn-blue);">Pre-Departure Check</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body text-center pt-2">
                    <p class="text-muted small mb-4">How many passengers have already boarded?</p>
                    <div class="d-flex justify-content-center align-items-center gap-3 mb-2">
                        <input type="number" id="boardedCount" class="form-control text-center fw-bold fs-1 border-0 shadow-sm mx-auto" placeholder="0" min="0" style="width: 150px; height: 80px; border-radius: 20px;">
                    </div>
                    <small id="seatsTotalHelper" class="text-muted d-block mt-3"></small>
                </div>
                <div class="modal-footer border-0 pt-0 pb-4 justify-content-center">
                    <button type="button" class="btn w-100 fw-bold py-3 text-white" style="border-radius: 12px; background-color: var(--btn-blue);" onclick="confirmStartTracking()">CONFIRM & START</button>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>

    <script>
        const el = id => document.getElementById(id);
        const alertBox = el('alertBox');

        function showAlert(message, type = 'danger') {
            const bsType = (type === 'danger') ? 'danger' : 'primary';
            alertBox.innerHTML = `<div class="alert alert-${bsType} border-0 text-center fw-bold shadow-sm" style="border-radius: 12px; padding: 10px;">${message}</div>`;
            setTimeout(() => { if (alertBox) alertBox.innerHTML = ''; }, 3000);
        }

        // --- MAP INITIALIZATION ---
        let map = null;
        let _fetchLiveBusesIntervalId = null;
        function initMap() {
            // Centers map correctly over the Batangas area
            map = L.map('mainMap', { zoomControl: false, attributionControl: false }).setView([14.0905, 121.0550], 12);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        }

        // --- LIVE BUS TRACKING ---
        const busMarkers = {};
        const statusColors = {
            available: '#10b981',
            on_stop: '#f59e0b',
            full: '#ef4444',
            unavailable: '#6b7280'
        };

        // Perfectly aligned paths based on your file structure
        const ICON_CACHE = {
            available: L.icon({
                iconUrl: '../../assets/images/icons/marker.svg',
                iconSize: [40, 40],
                iconAnchor: [18, 36],
                popupAnchor: [0, -36]
            }),
            full: L.icon({
                iconUrl: '../../assets/images/icons/marker.svg',
                iconSize: [40, 40],
                iconAnchor: [18, 36],
                popupAnchor: [0, -36]
            })
        };

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
        function setMapFilter(route, label) {
            currentMapFilter = route;
            document.getElementById('filterBtnLabel').innerHTML = `${label} <span class="material-symbols-rounded" style="font-size: 18px;">route</span>`;
            fetchLiveBuses(); 
        }

        var _fetchLiveBusesInProgress = false;
        var _fetchLiveBusesTimer = null;

        async function fetchLiveBuses() {
            if (_fetchLiveBusesInProgress) return;
            _fetchLiveBusesInProgress = true;
            try {
                // Pointing to the public/api.php
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

        function scheduleNextLiveBusesUpdate() {
            _fetchLiveBusesTimer = setTimeout(async () => {
                await fetchLiveBuses();
                scheduleNextLiveBusesUpdate();
            }, 4000);
        }

        function updateMap(buses) {
            const filtered = buses.filter(b => 
                (!currentMapFilter || b.route === currentMapFilter) &&
                b.status !== 'unavailable' &&
                b.coords !== null
            );

            const currentIds = new Set(filtered.map(b => String(b.id)));

            // Remove markers for buses that are no longer active or don't match the filter
            Object.keys(busMarkers).forEach(id => {
                if (!currentIds.has(id)) {
                    map.removeLayer(busMarkers[id]);
                    delete busMarkers[id];
                }
            });

            // Update existing or create new bus markers
            filtered.forEach(b => {
                const iconForBus = createBusIcon(b.status);
                
                if (busMarkers[b.id]) {
                    busMarkers[b.id].setLatLng(b.coords).setIcon(iconForBus);
                    busMarkers[b.id].bindPopup(`<b>${b.code}</b><br>${b.locName}`);
                } else {
                    const m = L.marker(b.coords, { icon: iconForBus }).addTo(map);
                    m.bindPopup(`<b>${b.code}</b><br>${b.locName}`);
                    busMarkers[b.id] = m;
                }
            });
        }

        // --- CUSTOM TRACKING FORM DROPDOWN LOGIC ---
        function toggleDropdown(containerId) {
            document.querySelectorAll('.custom-select-container').forEach(container => {
                if (container.id !== containerId) {
                    container.classList.remove('open');
                }
            });
            el(containerId).classList.toggle('open');
        }

        document.addEventListener('click', (e) => {
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

        async function loadBusesDropdown() {
            try {
                const r = await fetch('../api.php?action=get_buses_conductor', { cache: 'no-store' });
                const json = await r.json();
                const list = el('busOptionsList');

                if (json.success && json.buses) {
                    json.buses.forEach(b => {
                        if (b.current_conductor_id !== null && b.current_conductor_id !== undefined) return;

                        const id = b.id || b.Bus_ID || b.bus_id;
                        const code = b.code || `BUS-${id}`;
                        const meta = { bus_id: String(id), code: code, seats_total: b.total_seats || b.seats_total || 25 };

                        const div = document.createElement('div');
                        div.className = 'custom-option';
                        div.dataset.value = String(id);
                        
                        div.innerHTML = `
                            <span>${code}</span>
                        `;
                        
                        div.addEventListener('click', () => setBus(String(id), code, meta));
                        list.appendChild(div);
                    });
                }
            } catch (e) {
                showAlert('Failed to load buses for selection', 'danger');
            }
        }

        let preDepartureModalInstance = null;

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

        // --- RUN ON LOAD ---
        document.addEventListener('DOMContentLoaded', () => {
            initMap();
            loadBusesDropdown();

            // Fetch active buses immediately and set 4-second update interval
            fetchLiveBuses();
            scheduleNextLiveBusesUpdate();

            el('startBtn').addEventListener('click', startTracking);
        });

        function _cleanup() {
            if (_fetchLiveBusesTimer) { clearTimeout(_fetchLiveBusesTimer); _fetchLiveBusesTimer = null; }
            _fetchLiveBusesInProgress = false;
        }
        window.addEventListener('beforeunload', _cleanup);
        window.addEventListener('pagehide', _cleanup);
    </script>
</body>
</html>