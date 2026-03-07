<?php
session_start();

if (isset($_GET['stopped']) && $_GET['stopped'] == '1') {
    unset($_SESSION['current_bus']);
}

if (!isset($_SESSION['user_id']) || !in_array($_SESSION['user_role'] ?? '', ['conductor', 'driver'])) {
    header("Location: ../index.php");
    exit;
}

$userName = $_SESSION['user_name'] ?? 'User';
$busError = $_GET['error'] ?? null;
?>
<!doctype html>
<html lang="en">

<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <title>ByaHero - Conductor</title>

    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded" rel="stylesheet" />

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

        .custom-select-header .chevron {
            font-weight: bold;
            font-size: 14px;
            color: #000;
            display: inline-block;
            transition: transform 0.3s ease, color 0.2s ease;
        }

        .custom-select-container.open .value-text,
        .custom-select-container.open .chevron {
            color: var(--btn-blue);
        }

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

        .btn-circle-start {
            width: 110px;
            height: 110px;
            border-radius: 50%;
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
            <a href="profile/profile.php" class="text-decoration-none">
                <span class="material-symbols-rounded settings-icon">settings</span>
            </a>
            
            <div class="dropdown">
                <button class="filter-pill dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                    FILTER ROUTES <span class="material-symbols-rounded" style="font-size: 18px;">route</span>
                </button>
                <ul class="dropdown-menu">
                    <li><button class="dropdown-item" type="button" onclick="selectRoute('LAUREL - TANAUAN', 'Laurel')">LAUREL - TANAUAN</button></li>
                    <li><button class="dropdown-item" type="button" onclick="selectRoute('TANAUAN - LAUREL', 'Tanauan')">TANAUAN - LAUREL</button></li>
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
                <div class="custom-option" data-value="LAUREL - TANAUAN" onclick="selectRoute('LAUREL - TANAUAN', 'Laurel')">Laurel</div>
                <div class="custom-option" data-value="TANAUAN - LAUREL" onclick="selectRoute('TANAUAN - LAUREL', 'Tanauan')">Tanauan</div>
            </div>
            <input type="hidden" id="routeSelect" value="">
        </div>

        <button id="startBtn" class="btn-circle-start">
            START<br>TRACKING
        </button>

    </div>

    <div class="footer-bar"></div>

    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>

    <script>
        const el = id => document.getElementById(id);
        const alertBox = el('alertBox');

        function showAlert(message, type = 'danger') {
            const bsType = (type === 'danger') ? 'danger' : 'primary';
            alertBox.innerHTML = `<div class="alert alert-${bsType} border-0 text-center fw-bold shadow-sm" style="border-radius: 12px; padding: 10px;">${message}</div>`;
            setTimeout(() => { if (alertBox) alertBox.innerHTML = ''; }, 3000);
        }

        // --- Map Initialization ---
        let map = null;
        function initMap() {
            map = L.map('mainMap', { zoomControl: false, attributionControl: false }).setView([14.0905, 121.0550], 12);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        }

        // --- Custom Dropdown Logic ---
        function toggleDropdown(containerId) {
            document.querySelectorAll('.custom-select-container').forEach(container => {
                if (container.id !== containerId) {
                    container.classList.remove('open');
                }
            });
            el(containerId).classList.toggle('open');
        }

        // Close dropdowns if user clicks outside of them
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.custom-select-container') && !e.target.closest('.filter-pill')) {
                document.querySelectorAll('.custom-select-container').forEach(container => {
                    container.classList.remove('open');
                });
            }
        });
        
        // Handle selecting Route
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

        // Handle selecting Bus
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

        // Populate Bus Data (hide buses already in use)
        async function loadBuses() {
            try {
                const r = await fetch('../api.php?action=get_buses', { cache: 'no-store' });
                const json = await r.json();
                const list = el('busOptionsList');

                if (json && Array.isArray(json.buses)) {
                    json.buses.forEach(b => {
                        // If API reports current_conductor_id, skip buses already in use
                        if (b.current_conductor_id !== null && b.current_conductor_id !== undefined) {
                            return;
                        }

                        const id = b.id || b.Bus_ID || b.bus_id;
                        const code = b.code || `BUS-${id}`;
                        const meta = { bus_id: String(id), code: code, seats_total: b.seats_total || 25 };

                        const div = document.createElement('div');
                        div.className = 'custom-option';
                        div.dataset.value = String(id);
                        
                        div.innerHTML = `
                            <span>${code}</span>
                            <span class="text-muted small" style="font-weight: 500;">${b.seat_availability || 0}/${meta.seats_total}</span>
                        `;
                        
                        div.addEventListener('click', () => setBus(String(id), code, meta));
                        list.appendChild(div);
                    });
                }
            } catch (e) {
                showAlert('Failed to load buses', 'danger');
            }
        }

        // Form Submit
        function startTracking() {
            const busId = el('busSelect').value;
            const route = el('routeSelect').value;

            if (!busId) return showAlert('Please select a bus first.', 'danger');
            if (!route) return showAlert('Please select a route first.', 'danger');

            const payload = {
                bus_id: busId,
                code: selectedBusMeta?.code || `BUS-${busId}`,
                seats_total: selectedBusMeta?.seats_total || 25,
                route: route
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

        document.addEventListener('DOMContentLoaded', () => {
            initMap();
            loadBuses();

            el('startBtn').addEventListener('click', startTracking);
        });
    </script>
</body>
</html>