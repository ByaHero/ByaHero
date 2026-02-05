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
?>
<!doctype html>
<html lang="en">

<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <title>ByaHero - Conductor</title>

    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet">

    <style>
        :root {
            --btn-blue: #1c5ab5;
            --bg-light: #f5f7fa;
            --card-radius: 16px;
            --shadow-soft: 0 10px 30px rgba(0, 0, 0, 0.06);
            --shadow-strong: 0 18px 40px rgba(15, 56, 120, 0.14);
            --border-soft: 1px solid rgba(15, 56, 120, 0.10);
        }

        body {
            background-color: var(--bg-light);
            font-family: 'Segoe UI', sans-serif;
            padding-bottom: 80px;
            overflow-x: hidden;
            margin: 0;
        }

        .main-content-wrapper {
            padding: 12px 16px 28px 16px;
            position: relative;
            z-index: 10;
        }

        .filter-section {
            display: flex;
            justify-content: center;
            margin-bottom: 12px;
        }

        .filter-pill {
            background: white;
            padding: 10px 22px;
            border-radius: 999px;
            box-shadow: 0 10px 22px rgba(0, 0, 0, 0.08);
            font-weight: 800;
            font-size: 0.78rem;
            color: #2b2b2b;
            display: flex;
            align-items: center;
            gap: 8px;
            text-transform: uppercase;
            cursor: pointer;
            border: 1px solid rgba(0, 0, 0, 0.03);
            letter-spacing: 0.5px;
        }

        .map-card-wrapper {
            position: relative;
            border-radius: var(--card-radius);
            overflow: hidden;
            box-shadow: var(--shadow-soft);
            background: white;
            height: 320px;
            margin-bottom: 18px;
            border: 4px solid white;
        }

        #mainMap {
            width: 100%;
            height: 100%;
            z-index: 1;
        }

        /* ===== Modern dropdown field ===== */
        .modern-field {
            background: rgba(255, 255, 255, 0.95);
            border: var(--border-soft);
            border-radius: var(--card-radius);
            height: 70px;
            box-shadow: var(--shadow-soft);
            padding: 12px 14px;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 12px;
            transition: transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease;
        }

        .modern-field:active {
            transform: scale(0.99);
        }

        .modern-field:focus-within,
        .modern-field:hover {
            border-color: rgba(28, 90, 181, 0.35);
            box-shadow: var(--shadow-strong);
        }

        .field-icon {
            width: 44px;
            height: 44px;
            border-radius: 14px;
            background: rgba(28, 90, 181, 0.10);
            color: var(--btn-blue);
            display: flex;
            align-items: center;
            justify-content: center;
            flex: 0 0 auto;
        }

        .field-text {
            min-width: 0;
            flex: 1 1 auto;
            display: flex;
            flex-direction: column;
            line-height: 1.1;
        }

        .field-label {
            font-size: 0.72rem;
            font-weight: 800;
            letter-spacing: 0.6px;
            color: rgba(15, 56, 120, 0.70);
            text-transform: uppercase;
        }

        .field-value {
            font-size: 1.02rem;
            font-weight: 800;
            color: #1b1b1b;
            margin-top: 4px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .field-chevron {
            width: 42px;
            height: 42px;
            border-radius: 14px;
            background: rgba(15, 56, 120, 0.06);
            display: flex;
            align-items: center;
            justify-content: center;
            flex: 0 0 auto;
            color: rgba(15, 56, 120, 0.85);
        }

        .modern-dropdown-toggle::after {
            display: none !important;
        }

        .dropdown-menu.modern-menu {
            border-radius: 16px;
            border: 1px solid rgba(15, 56, 120, 0.10);
            padding: 10px;
            box-shadow: 0 24px 60px rgba(15, 56, 120, 0.18);
        }

        .dropdown-menu.modern-menu.scrollable {
            max-height: 280px;
            overflow-y: auto;
        }

        .dropdown-menu.modern-menu .dropdown-item {
            border-radius: 12px;
            padding: 12px 12px;
            font-weight: 800;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
        }

        .dropdown-menu.modern-menu .dropdown-item:hover {
            background: rgba(28, 90, 181, 0.08);
        }

        .dropdown-menu.modern-menu .dropdown-item.active,
        .dropdown-menu.modern-menu .dropdown-item:active {
            background: rgba(28, 90, 181, 0.15);
            color: #0f3878;
        }

        .menu-search {
            position: sticky;
            top: 0;
            background: white;
            padding: 6px 6px 10px 6px;
            z-index: 2;
        }

        .menu-search input {
            border-radius: 12px;
            border: 1px solid rgba(15, 56, 120, 0.12);
            padding: 10px 12px;
            font-weight: 700;
        }

        .start-btn-wrapper {
            display: flex;
            justify-content: center;
            margin-top: 12px;
        }

        .btn-circle-start {
            width: 96px;
            height: 96px;
            border-radius: 50%;
            background-color: var(--btn-blue);
            color: white;
            border: none;
            box-shadow: 0 10px 30px rgba(28, 90, 181, 0.28);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-weight: 900;
            font-size: 0.85rem;
            line-height: 1.1;
            transition: transform 0.1s;
        }

        .btn-circle-start:active {
            transform: scale(0.96);
        }

        .footer-bar {
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 40px;
            background-color: #0f3878;
            z-index: 1000;
        }

        .alert-area {
            position: absolute;
            bottom: 20px;
            left: 20px;
            right: 20px;
            z-index: 900;
            pointer-events: none;
        }

        .alert-area .alert {
            pointer-events: auto;
        }
    </style>
</head>

<body>

    <?php include __DIR__ . '/../../components/navbarConductor.php'; ?>

    <div class="main-content-wrapper">

        <div class="filter-section">
            <div class="filter-pill">
                FILTER ROUTES <span class="material-icons-round" style="font-size: 18px;">tune</span>
            </div>
        </div>

        <div class="map-card-wrapper">
            <div class="alert-area" id="alertBox"></div>
            <div id="mainMap"></div>
        </div>

        <section id="setupSection">

            <!-- BUS: modern dropdown (name only) -->
            <div class="dropdown w-100 mb-2">
                <button
                    class="modern-field modern-dropdown-toggle w-100 border-0 text-start d-flex"
                    type="button"
                    id="busDropdownBtn"
                    data-bs-toggle="dropdown"
                    data-bs-auto-close="true"
                    aria-expanded="false">
                    <div class="field-icon">
                        <span class="material-icons-round">directions_bus</span>
                    </div>

                    <div class="field-text">
                        <div class="field-label">Bus</div>
                        <div class="field-value" id="busDropdownValue">Select bus</div>
                    </div>

                    <div class="field-chevron">
                        <span class="material-icons-round">expand_more</span>
                    </div>
                </button>

                <ul class="dropdown-menu w-100 modern-menu scrollable" aria-labelledby="busDropdownBtn" id="busDropdownMenu">
                    <li class="menu-search">
                        <input id="busSearch" class="form-control" type="text" placeholder="Search bus..." autocomplete="off">
                    </li>
                    <li>
                        <button class="dropdown-item" type="button" onclick="setBus('', 'Select bus')">-- Choose --</button>
                    </li>
                    <!-- bus items injected by JS -->
                </ul>

                <input type="hidden" id="busSelect" value="">
            </div>

            <!-- ROUTE: modern dropdown -->
            <div class="dropdown w-100 mb-2">
                <button
                    class="modern-field modern-dropdown-toggle w-100 border-0 text-start d-flex"
                    type="button"
                    id="routeDropdownBtn"
                    data-bs-toggle="dropdown"
                    data-bs-auto-close="true"
                    aria-expanded="false">
                    <div class="field-icon">
                        <span class="material-icons-round">route</span>
                    </div>

                    <div class="field-text">
                        <div class="field-label">Route</div>
                        <div class="field-value" id="routeDropdownValue">Select route</div>
                    </div>

                    <div class="field-chevron">
                        <span class="material-icons-round">expand_more</span>
                    </div>
                </button>

                <ul class="dropdown-menu w-100 modern-menu scrollable" aria-labelledby="routeDropdownBtn" id="routeDropdownMenu">
                    <li>
                        <button class="dropdown-item" type="button" onclick="setRoute('', 'Select route')">-- Choose --</button>
                    </li>
                    <li>
                        <button class="dropdown-item" type="button" onclick="setRoute('LAUREL - TANAUAN')">LAUREL - TANAUAN</button>
                    </li>
                    <li>
                        <button class="dropdown-item" type="button" onclick="setRoute('TANAUAN - LAUREL')">TANAUAN - LAUREL</button>
                    </li>
                </ul>

                <input type="hidden" id="routeSelect" value="">
            </div>

            <div class="start-btn-wrapper">
                <button id="startBtn" class="btn-circle-start">START<br>TRACKING</button>
            </div>

        </section>
    </div>

    <div class="footer-bar"></div>

    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>

    <script>
        // --- Helpers ---
        const el = id => document.getElementById(id);
        const alertBox = el('alertBox');

        function showAlert(message, type = 'info') {
            const bsType = (type === 'danger') ? 'danger' : 'primary';
            alertBox.innerHTML = `<div class="alert alert-${bsType} border-0 text-center fw-bold shadow-sm" style="border-radius: 12px;">${message}</div>`;
            setTimeout(() => {
                if (alertBox) alertBox.innerHTML = '';
            }, 2500);
        }

        // --- Map (visual only on selection page) ---
        let map = null;

        function initMap() {
            if (map) return;
            map = L.map('mainMap', {
                zoomControl: false,
                attributionControl: false
            }).setView([14.0905, 121.0550], 12);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19
            }).addTo(map);
        }

        // --- Dropdown state ---
        let selectedBusMeta = null;

        function setBus(busId, label, meta = null) {
            el('busSelect').value = busId || '';
            el('busDropdownValue').textContent = label || 'Select bus';
            selectedBusMeta = meta;

            const search = el('busSearch');
            if (search) {
                search.value = '';
                filterBusMenu('');
            }
        }

        function setRoute(route, labelOverride = null) {
            el('routeSelect').value = route || '';
            el('routeDropdownValue').textContent = labelOverride || route || 'Select route';
        }

        function filterBusMenu(term) {
            const q = String(term || '').toLowerCase();
            const items = document.querySelectorAll('#busDropdownMenu li[data-bus-item="1"]');
            items.forEach(li => {
                const text = (li.dataset.searchText || '').toLowerCase();
                li.style.display = text.includes(q) ? '' : 'none';
            });
        }

        // --- Load buses into BUS dropdown menu (NAME ONLY) ---
        async function loadBuses() {
            try {
                const r = await fetch('../api.php?action=get_buses', {
                    cache: 'no-store'
                });
                const json = await r.json();

                const menu = el('busDropdownMenu');
                menu.querySelectorAll('li[data-bus-item="1"]').forEach(n => n.remove());

                if (json && Array.isArray(json.buses)) {
                    json.buses.forEach(b => {
                        const id = b.id || b.Bus_ID || b.bus_id;
                        const code = b.code || `BUS-${id}`;

                        // keep meta for POST, but don't show seat/id in UI
                        const meta = {
                            bus_id: String(id),
                            code,
                            seats_total: b.seats_total || 25
                        };

                        const li = document.createElement('li');
                        li.setAttribute('data-bus-item', '1');
                        li.dataset.searchText = `${code} ${id}`;

                        const btn = document.createElement('button');
                        btn.type = 'button';
                        btn.className = 'dropdown-item';
                        btn.textContent = code;

                        btn.addEventListener('click', () => {
                            setBus(String(id), code, meta);
                        });

                        li.appendChild(btn);
                        menu.appendChild(li);
                    });
                }
            } catch (e) {
                console.error(e);
                showAlert('Failed to load buses', 'danger');
            }
        }

        // --- Start Tracking: POST to conductorLive.php ---
        function startTracking() {
            const busId = el('busSelect').value;
            const route = el('routeSelect').value;

            if (!busId) return showAlert('Please select a bus', 'danger');
            if (!route) return showAlert('Please select a route', 'danger');

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

            const search = el('busSearch');
            if (search) {
                search.addEventListener('input', (e) => filterBusMenu(e.target.value));
            }
        });
    </script>
</body>

</html>