<?php
session_start();

// If we returned from live tracking with stopped=1, clear stored current bus
if (isset($_GET['stopped']) && $_GET['stopped'] == '1') {
    unset($_SESSION['current_bus']);
}

// Enforce Access Control
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
        }

        body {
            background-color: var(--bg-light);
            font-family: 'Segoe UI', sans-serif;
            padding-bottom: 80px;
            overflow-x: hidden;
            margin:0;
        }

        /* Keep selection page layout spacing consistent with navbar include */
        .main-content-wrapper {
            padding: 12px 16px 28px 16px;
            position: relative;
            z-index: 10;
        }

        .filter-section { display:flex; justify-content:center; margin-bottom:12px; }
        .filter-pill {
            background: white; padding: 8px 22px; border-radius:50px;
            box-shadow: 0 6px 18px rgba(0,0,0,0.08); font-weight:700; font-size:0.8rem;
            color:#333; display:flex; align-items:center; gap:8px; text-transform:uppercase;
            cursor:pointer; border:1px solid rgba(0,0,0,0.03);
        }

        .map-card-wrapper { position: relative; border-radius:16px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,0.06); background:white; height:320px; margin-bottom:18px; border:4px solid white; }
        #mainMap { width:100%; height:100%; z-index:1; }

        .selection-card { background:white; border-radius:12px; height:64px; box-shadow:0 6px 18px rgba(0,0,0,0.06); position:relative; display:flex; align-items:center; padding:0 18px; margin-bottom:12px; }
        .selection-display { font-weight:700; font-size:1rem; color:#222; width:100%; display:flex; justify-content:space-between; align-items:center; }
        .custom-select { position:absolute; top:0; left:0; width:100%; height:100%; opacity:0; cursor:pointer; z-index:2; }

        .start-btn-wrapper { display:flex; justify-content:center; margin-top:12px; }
        .btn-circle-start {
            width:96px; height:96px; border-radius:50%; background-color:var(--btn-blue); color:white; border:none;
            box-shadow:0 10px 30px rgba(28,90,181,0.28); display:flex; flex-direction:column; align-items:center; justify-content:center;
            font-weight:800; font-size:0.85rem; line-height:1.1; transition:transform 0.1s;
        }
        .btn-circle-start:active { transform:scale(0.96); }

        .footer-bar { position: fixed; bottom: 0; left: 0; width: 100%; height: 40px; background-color: #0f3878; z-index:1000; }

        .alert-area { position: absolute; bottom: 20px; left: 20px; right: 20px; z-index: 900; pointer-events: none; }
        .alert-area .alert { pointer-events: auto; }
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
            <div class="selection-card">
                <span id="busDisplay" class="selection-display">
                    Select Bus <span class="small fw-bold">v</span>
                </span>
                <select id="busSelect" class="custom-select" onchange="updateDisplay(this, 'busDisplay', 'Select Bus')">
                    <option value="">-- Choose --</option>
                </select>
            </div>

            <div class="selection-card">
                <span id="routeDisplay" class="selection-display">
                    Select Route <span class="small fw-bold">v</span>
                </span>
                <select id="routeSelect" class="custom-select" onchange="updateDisplay(this, 'routeDisplay', 'Select Route')">
                    <option value="">-- Choose --</option>
                    <option value="LAUREL - TANAUAN">LAUREL - TANAUAN</option>
                    <option value="TANAUAN - LAUREL">TANAUAN - LAUREL</option>
                </select>
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
        setTimeout(() => { if (alertBox) alertBox.innerHTML = ''; }, 2500);
    }

    function updateDisplay(select, displayId, defaultText) {
        const text = select.options[select.selectedIndex].text;
        const val = select.value;
        const displayEl = document.getElementById(displayId);
        if (val) {
            displayEl.innerHTML = `<span>${text}</span> <span class="small fw-bold">v</span>`;
            displayEl.style.color = '#000';
        } else {
            displayEl.innerHTML = `<span>${defaultText}</span> <span class="small fw-bold">v</span>`;
            displayEl.style.color = '#222';
        }
    }

    // --- Map (visual only on selection page) ---
    let map = null;
    function initMap() {
        if (map) return;
        map = L.map('mainMap', { zoomControl: false, attributionControl: false }).setView([14.0905, 121.0550], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    }

    // --- Load buses into select ---
    async function loadBuses() {
        try {
            const r = await fetch('../api.php?action=get_buses', { cache: 'no-store' });
            const json = await r.json();
            if (json && Array.isArray(json.buses)) {
                const sel = el('busSelect');
                sel.innerHTML = '<option value="">-- Choose --</option>';
                json.buses.forEach(b => {
                    const id = b.id || b.Bus_ID || b.bus_id;
                    const o = document.createElement('option');
                    o.value = id;
                    o.textContent = `${b.code || 'BUS-' + id} (${b.seats_total || 25} seats)`;
                    o.dataset.code = b.code || `BUS-${id}`;
                    o.dataset.seats = b.seats_total || 25;
                    sel.appendChild(o);
                });
            }
        } catch (e) {
            console.error(e);
            showAlert('Failed to load buses', 'danger');
        }
    }

    // --- Start Tracking: POST to conductorLive.php (server will store in session) ---
    function startTracking() {
        const busId = el('busSelect').value;
        const sel = el('busSelect');
        const route = el('routeSelect').value;

        if (!busId) return showAlert('Please select a bus', 'danger');
        if (!route) return showAlert('Please select a route', 'danger');

        const selectedOption = sel.options[sel.selectedIndex];
        const payload = {
            bus_id: busId,
            code: selectedOption.dataset.code || selectedOption.text,
            seats_total: selectedOption.dataset.seats || 25,
            route: route
        };

        // create and submit a POST form so server can set session and render live page
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