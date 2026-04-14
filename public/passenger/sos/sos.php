<?php
session_start();

if (!isset($_SESSION['user_id'])) {
    header('Location: ../../../public/login.php?redirect=passenger/sos/sos.php', true, 302);
    exit;
}

$pageType = 'sos';
$backLink = '../index.php';
$pageDepth = "../../../";
?>
<!doctype html>
<html lang="en">

<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <title>SOS - ByaHero</title>

    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded" rel="stylesheet" />
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css">
    <meta name="theme-color" content="#1e3a8a">

    <style>
        :root {
            --bs-primary: #1e3a8a;
            --bs-bg-light: #f3f4f6;
            --sos-red-dark: #b02a37;
        }

        body {
            font-family: "Segoe UI", sans-serif;
            background-color: var(--bs-bg-light);
        }

        .sos-btn-container {
            width: 180px;
            height: 180px;
            margin: 0 auto;
            position: relative;
        }

        .main-sos-btn {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background: linear-gradient(145deg, #ff4d5e, #dc3545);
            border: 6px solid #fff;
            box-shadow: 0 10px 30px rgba(220, 53, 69, 0.4);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            position: relative;
            z-index: 2;
            transition: transform 0.2s;
        }

        .main-sos-btn:active {
            transform: scale(0.95);
        }

        .sos-ring {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 100%;
            height: 100%;
            border-radius: 50%;
            border: 2px solid #dc3545;
            animation: pulse 2s infinite;
            z-index: 1;
        }

        .sos-ring:nth-child(2) {
            animation-delay: 0.5s;
        }

        .sos-ring:nth-child(3) {
            animation-delay: 1s;
        }

        @keyframes pulse {
            0% {
                width: 50%;
                height: 50%;
                opacity: 1;
            }

            100% {
                width: 200%;
                height: 200%;
                opacity: 0;
            }
        }

        #sos-countdown-layer {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: #f8f9fa;
            z-index: 2000;
            display: flex;
            flex-direction: column;
        }

        .text-dark-red {
            color: #b02a37;
        }

        .countdown-wrapper {
            width: 140px;
            height: 140px;
        }

        .countdown-inner {
            width: 120px;
            height: 120px;
            font-size: 3.5rem;
        }

        .slider-track {
            height: 70px;
            max-width: 350px;
            background-color: #635f5f;
            touch-action: none;
            position: relative;
            overflow: hidden;
            margin: 0 auto 2rem auto;
        }

        .slider-handle {
            width: 60px;
            height: 60px;
            top: 5px;
            right: 5px;
            cursor: grab;
            position: absolute;
            z-index: 2;
        }

        .slider-handle:active {
            cursor: grabbing;
        }

        .avatar-stack {
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .stack-avatar {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            color: #fff;
            border: 3px solid #fff;
            margin-left: -10px;
            font-size: 14px;
            user-select: none;
        }

        .stack-avatar:first-child {
            margin-left: 0;
        }
    </style>
</head>

<body class="bg-light">

    <?php include "../../../components/navbarPassenger.php"; ?>

    <main id="sos-idle-layer" class="container pt-2 mt-2">
        <div class="row justify-content-center">
            <div class="col-12 col-md-8 col-lg-5">

                <!-- Location card -->
                <div class="card border-0 shadow-sm rounded-4 mb-5">
                    <div class="card-body p-3 d-flex align-items-center justify-content-between">
                        <div class="d-flex align-items-center overflow-hidden">
                            <div class="bg-primary bg-opacity-10 text-primary p-2 rounded-circle me-3 flex-shrink-0">
                                <span class="material-symbols-rounded">my_location</span>
                            </div>
                            <div class="overflow-hidden">
                                <small class="text-muted fw-bold d-block"
                                    style="font-size: 0.7rem; letter-spacing: 0.5px;">YOUR LOCATION</small>
                                <span class="fw-bold text-dark text-truncate d-block"
                                    id="location-text">Locating...</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- SOS button -->
                <div class="sos-btn-container mb-5">
                    <div class="sos-ring"></div>
                    <div class="sos-ring"></div>
                    <button class="main-sos-btn" onclick="startCountdown()">
                        <h1 class="material-symbols-rounded text-white display-1 mb-0"
                            style="font-variation-settings: 'FILL' 1;">sos</h1>
                        <span class="text-white fw-bold mt-1">ALERT CIRCLE</span>
                    </button>
                </div>

                <!-- Friend group section -->
                <section class="text-center my-3">
                    <div id="friends-avatars" class="avatar-stack mb-1"></div>
                    <p id="friends-status" class="small text-muted mb-0">Loading…</p>
                </section>

            </div>
        </div>
    </main>

    <!-- SOS countdown layer -->
    <div id="sos-countdown-layer" class="d-none">
        <main class="flex-grow-1 d-flex flex-column align-items-center pt-5 text-center w-100">
            <h1 class="text-dark-red fw-bold display-6 mb-2">Slide to cancel</h1>
            <p class="text-muted w-75 mb-5 small">
                After 10 seconds, your SOS and location will be sent to your Circle and emergency contacts.
            </p>

            <div class="countdown-wrapper position-relative d-flex justify-content-center align-items-center mb-auto">
                <div class="position-absolute w-100 h-100 rounded-circle border border-2 border-danger opacity-25">
                </div>
                <div class="countdown-inner bg-danger text-white rounded-circle d-flex justify-content-center align-items-center fw-bold shadow-lg z-2"
                    id="timer">10</div>
            </div>

            <div class="slider-track w-100 shadow mb-4 rounded-pill position-relative" id="sliderContainer"
                style="width: 90%;">
                <div
                    class="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center z-1">
                    <span class="text-danger fw-bold fs-5 user-select-none">Slide to cancel SOS</span>
                </div>
                <div class="slider-handle bg-danger rounded-circle shadow-sm d-flex align-items-center justify-content-center z-2"
                    id="sliderHandle">
                    <i class="bi bi-chevron-left text-white opacity-50"></i>
                </div>
            </div>

            <div style="height:80px;"></div>
        </main>
    </div>

    <!-- Friends modal -->
    <div class="modal fade" id="sosFriendsModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content rounded-4">
                <div class="modal-header">
                    <h5 class="modal-title fw-bold">Send In-app SOS Alert</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="d-flex align-items-center justify-content-between mb-2">
                        <small class="text-muted">Select who will receive your SOS.</small>
                        <button class="btn btn-sm btn-light border" type="button" onclick="toggleSelectAllFriends()">
                            Select all
                        </button>
                    </div>
                    <div id="friends-list" class="list-group small">
                        <div class="list-group-item">Loading…</div>
                    </div>
                    <div class="alert alert-info mt-3 mb-0 small">
                        This will send an <strong>in-app SOS alert</strong> to the selected friends.
                        They will see it in <strong>Notifications → SOS Alerts</strong>.
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline-secondary" type="button" data-bs-dismiss="modal">Cancel</button>
                    <button class="btn btn-danger fw-bold" type="button" onclick="sendSosToSelectedFriends()">
                        Send SOS
                    </button>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>

    <script>
        let currentCoords = { lat: null, lng: null };
        let resolvedPlaceName = "";
        let resolvePlacePromise = null;

        async function reverseGeocode(lat, lng) {
            const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`;
            const res = await fetch(url, { headers: { "Accept": "application/json" } });
            if (!res.ok) throw new Error("Reverse geocoding failed");
            return res.json();
        }

        function formatPlaceName(nominatim) {
            const a = nominatim.address || {};
            const barangay = a.barangay || a.neighbourhood || a.suburb || a.village || a.hamlet || "";
            const city = a.city || a.town || a.municipality || a.county || "";
            const province = a.state || a.region || "";
            const parts = [barangay, city, province].filter(Boolean);
            return parts.length ? parts.join(", ") : (nominatim.display_name || "Unknown location");
        }

        function looksLikeCoords(text) {
            return /^\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*$/.test(String(text || ""));
        }

        async function getResolvedLocationText() {
            const elText = document.getElementById("location-text")?.innerText || "";
            if (elText && !looksLikeCoords(elText) && elText !== "Locating..." && elText !== "Unknown Location") {
                resolvedPlaceName = elText;
                return elText;
            }
            if (resolvedPlaceName) return resolvedPlaceName;
            if (currentCoords.lat == null || currentCoords.lng == null) return elText || "Unknown Location";
            if (!resolvePlacePromise) {
                resolvePlacePromise = (async () => {
                    try {
                        const data = await reverseGeocode(currentCoords.lat, currentCoords.lng);
                        const place = formatPlaceName(data);
                        resolvedPlaceName = place;
                        const el = document.getElementById("location-text");
                        if (el) el.innerText = place;
                        return place;
                    } catch (e) {
                        console.warn(e);
                        return `${Number(currentCoords.lat).toFixed(4)}, ${Number(currentCoords.lng).toFixed(4)}`;
                    } finally {
                        resolvePlacePromise = null;
                    }
                })();
            }
            return resolvePlacePromise;
        }

        async function setLocationUI(lat, lng) {
            const el = document.getElementById("location-text");
            if (!el) return;
            el.innerText = `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;
            try {
                const data = await reverseGeocode(lat, lng);
                const place = formatPlaceName(data);
                resolvedPlaceName = place;
                el.innerText = place;
            } catch (e) { console.warn(e); }
        }

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    currentCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                    await setLocationUI(currentCoords.lat, currentCoords.lng);
                },
                () => {
                    const el = document.getElementById("location-text");
                    if (el) el.innerText = "Unknown Location";
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        }
    </script>

    <script>
        let friendsCache = [];
        let sosFriendsModal;

        function initialsFromFriend(f) {
            const base = (f.name || f.email || "??").trim();
            const parts = base.split(/\s+/).filter(Boolean);
            if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
            return base.slice(0, 2).toUpperCase();
        }

        function colorFromString(str) {
            const colors = ["#ec4899", "#3b82f6", "#22c55e", "#f43f5e", "#a855f7", "#06b6d4", "#f97316"];
            let h = 0;
            for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
            return colors[h % colors.length];
        }

        function renderFriendStack() {
            const avatarsEl = document.getElementById('friends-avatars');
            const statusEl = document.getElementById('friends-status');
            if (!avatarsEl || !statusEl) return;

            if (!Array.isArray(friendsCache) || friendsCache.length === 0) {
                avatarsEl.innerHTML = '';
                statusEl.textContent = "No friends in your circle yet";
                return;
            }

            const shown = friendsCache.slice(0, 5);
            avatarsEl.innerHTML = shown.map(f => {
                const init = initialsFromFriend(f);
                const bg = colorFromString(f.email || f.name || init);
                return `<div class="stack-avatar" style="background:${bg}">${init}</div>`;
            }).join("");
            statusEl.textContent = `Your SOS will be sent to ${friendsCache.length} people`;
        }

        async function fetchFriends() {
            const listEl = document.getElementById('friends-list');
            const statusEl = document.getElementById('friends-status');
            try {
                const res = await fetch("../../../backend/groupView.php", { credentials: "include" });
                const data = await res.json();
                if (!data.success) throw new Error(data.message || "Failed to fetch friends");
                friendsCache = Array.isArray(data.friends) ? data.friends : [];
                renderFriendStack();
                if (listEl) {
                    listEl.innerHTML = friendsCache.map(f => {
                        const label = f.name ? `${f.name} (${f.email})` : f.email;
                        return `
                          <label class="list-group-item d-flex align-items-center gap-2">
                            <input class="form-check-input me-1 friend-checkbox" type="checkbox" value="${f.id}">
                            <span class="flex-grow-1 text-truncate">${label}</span>
                          </label>`;
                    }).join("") || `<div class="list-group-item">No friends to alert.</div>`;
                }
            } catch (e) {
                console.error(e);
                if (document.getElementById('friends-avatars')) document.getElementById('friends-avatars').innerHTML = '';
                if (statusEl) statusEl.textContent = "Failed to load friend group";
                if (listEl) listEl.innerHTML = `<div class="list-group-item text-danger">Failed to load friends</div>`;
            }
        }

        function openSosFriendsModal() {
            if (!sosFriendsModal) sosFriendsModal = new bootstrap.Modal(document.getElementById('sosFriendsModal'));
            sosFriendsModal.show();
        }

        function toggleSelectAllFriends() {
            const checks = document.querySelectorAll(".friend-checkbox");
            const anyUnchecked = Array.from(checks).some(c => !c.checked);
            checks.forEach(c => c.checked = anyUnchecked);
        }

        async function sendSosToSelectedFriends() {
            const statusEl = document.getElementById("friends-status");
            const selected = Array.from(document.querySelectorAll(".friend-checkbox:checked")).map(c => parseInt(c.value, 10));
            if (selected.length === 0) { alert("Select at least one friend."); return; }
            const locText = await getResolvedLocationText();
            try {
                if (statusEl) statusEl.textContent = "Sending…";
                const res = await fetch("../../../backend/sendSosAlert.php", {
                    method: "POST", credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ recipients: selected, location_text: locText })
                });
                const data = await res.json();
                if (!data.success) throw new Error(data.message || "Failed to send SOS");
                if (statusEl) statusEl.textContent = `SOS Alert recorded. Sending pushes...`;
                
                if (data.fcm_tokens && data.fcm_tokens.length > 0 && data.jwt && data.project_id) {
                    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
                        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: data.jwt })
                    });
                    const tokenData = await tokenRes.json();
                    if (tokenData.access_token) {
                        const fcmUrl = `https://fcm.googleapis.com/v1/projects/${data.project_id}/messages:send`;
                        await Promise.all(data.fcm_tokens.map(async (token) => {
                            await fetch(fcmUrl, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenData.access_token}` },
                                body: JSON.stringify({
                                    message: {
                                        token: token,
                                        notification: { title: '🚨 SOS Alert', body: `${data.sender_name} needs help!` + (data.location_text ? ` Location: ${data.location_text}` : '') },
                                        data: { type: 'sos_alert', sender_name: data.sender_name, location_text: data.location_text || '' }
                                    }
                                })
                            });
                        }));
                    }
                }
                
                if (statusEl) statusEl.textContent = `SOS sent successfully to ${selected.length} people`;
                if (sosFriendsModal) sosFriendsModal.hide();
            } catch (e) {
                if (statusEl) statusEl.textContent = "Failed to send";
                alert(e.message);
            }
        }

        fetchFriends();
    </script>

    <script>
        const countdownLayer = document.getElementById('sos-countdown-layer');
        const timerElement = document.getElementById('timer');
        let countdownInterval;
        let timeLeft = 10;
        let isSOSActive = false;

        function startCountdown() {
            if (navigator.vibrate) navigator.vibrate([200]);
            countdownLayer.classList.remove('d-none');
            timeLeft = 10;
            timerElement.textContent = timeLeft;
            timerElement.classList.replace('bg-secondary', 'bg-danger');
            document.querySelector('#sos-countdown-layer h1').textContent = "Slide to cancel";
            document.querySelector('#sos-countdown-layer p').textContent = "After 10 seconds, your SOS and location will be sent to your Circle and emergency contacts.";
            sliderHandle.style.transform = `translateX(0px)`;
            isSOSActive = true;
            countdownInterval = setInterval(() => {
                if (!isSOSActive) return;
                timeLeft--;
                timerElement.textContent = timeLeft;
                if (timeLeft <= 0) { clearInterval(countdownInterval); sendSOS(); }
            }, 1000);
        }

        function cancelSOS() {
            isSOSActive = false;
            clearInterval(countdownInterval);
            timerElement.classList.replace('bg-danger', 'bg-secondary');
            timerElement.textContent = "X";
            document.querySelector('#sos-countdown-layer h1').textContent = "Cancelled";
            document.querySelector('#sos-countdown-layer p').textContent = "Your SOS has been cancelled. Returning to home...";
            setTimeout(() => { countdownLayer.classList.add('d-none'); }, 1000);
        }

        async function sendSOS() {
            const statusEl = document.getElementById("friends-status");
            const locText = await getResolvedLocationText();
            const recipients = Array.isArray(friendsCache)
                ? friendsCache.map(f => parseInt(f.id, 10)).filter(Number.isFinite)
                : [];

            if (recipients.length === 0) {
                screenLog("ERROR: No circle members found in the app to notify.");
                countdownLayer.classList.add('d-none');
                isSOSActive = false;
                return;
            }

            try {
                if (statusEl) statusEl.textContent = "Sending SOS…";
                screenLog("1. Button slid. Sending request to backend...");
                screenLog("Payload: " + JSON.stringify({ recipients, location_text: locText }));

                const res = await fetch("../../../backend/sendSosAlert.php", {
                    method: "POST", credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ recipients, location_text: locText })
                });

                const data = await res.json();

                screenLog("2. Backend replied!");
                screenLog(data);

                if (!data.success) throw new Error(data.message || "Failed to send SOS");
                if (statusEl) statusEl.textContent = `Alerting ${recipients.length} people...`;

                if (data.fcm_tokens && data.fcm_tokens.length > 0 && data.jwt && data.project_id) {
                    try {
                        screenLog("3. Bypassing InfinityFree... Fetching Firebase Access Token using JWT...");
                        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                            body: new URLSearchParams({
                                grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                                assertion: data.jwt
                            })
                        });
                        const tokenData = await tokenRes.json();
                        if (!tokenData.access_token) throw new Error("Could not get access token: " + JSON.stringify(tokenData));
                        
                        screenLog("4. Token acquired, blasting push notifications...");
                        const fcmUrl = `https://fcm.googleapis.com/v1/projects/${data.project_id}/messages:send`;
                        
                        await Promise.all(data.fcm_tokens.map(async (token) => {
                            await fetch(fcmUrl, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${tokenData.access_token}`
                                },
                                body: JSON.stringify({
                                    message: {
                                        token: token,
                                        notification: {
                                            title: '🚨 SOS Alert',
                                            body: `${data.sender_name} needs help!` + (data.location_text ? ` Location: ${data.location_text}` : '')
                                        },
                                        data: {
                                            type: 'sos_alert',
                                            sender_name: data.sender_name,
                                            location_text: data.location_text || ''
                                        }
                                    }
                                })
                            });
                        }));
                        screenLog("5. Push notifications sent successfully from frontend!");
                        if (statusEl) statusEl.textContent = `SOS successfully forwarded to ${data.fcm_tokens.length} devices!`;
                    } catch (pushErr) {
                        screenLog("Push Error: " + pushErr.message);
                        if (statusEl) statusEl.textContent = `SOS saved, but push warning: ${pushErr.message}`;
                    }
                } else {
                    if (statusEl) statusEl.textContent = `SOS saved. (No FCM tokens found for friends)`;
                }

            } catch (e) {
                screenLog("3. FATAL ERROR: " + e.message);
                if (statusEl) statusEl.textContent = "Failed to send SOS";
            } finally {
                isSOSActive = false;
                countdownLayer.classList.add('d-none');
            }
        }

        const sliderContainer = document.getElementById('sliderContainer');
        const sliderHandle = document.getElementById('sliderHandle');
        let isDragging = false;
        let startX;

        const startDrag = (e) => {
            if (!isSOSActive) return;
            isDragging = true;
            startX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        };

        const drag = (e) => {
            if (!isDragging) return;
            if (e.type.includes('touch')) e.preventDefault();
            const currentX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
            const containerWidth = sliderContainer.offsetWidth;
            const handleWidth = sliderHandle.offsetWidth;
            const maxMove = containerWidth - handleWidth - 10;
            let delta = startX - currentX;
            if (delta < 0) delta = 0;
            if (delta > maxMove) delta = maxMove;
            sliderHandle.style.transform = `translateX(-${delta}px)`;
            if (delta > (maxMove * 0.75)) {
                isDragging = false;
                sliderHandle.style.transform = `translateX(-${maxMove}px)`;
                cancelSOS();
            }
        };

        const endDrag = () => {
            if (!isDragging) return;
            isDragging = false;
            sliderHandle.style.transition = "transform 0.3s ease";
            sliderHandle.style.transform = `translateX(0px)`;
            setTimeout(() => { sliderHandle.style.transition = ""; }, 300);
        };

        sliderHandle.addEventListener('mousedown', startDrag);
        sliderHandle.addEventListener('touchstart', startDrag, { passive: false });
        document.addEventListener('mousemove', drag);
        document.addEventListener('touchmove', drag, { passive: false });
        document.addEventListener('mouseup', endDrag);
        document.addEventListener('touchend', endDrag);
    </script>
    
    <!-- Debug Console -->
    <div id="debug-console"
        style="display:none; position:fixed; top:50px; left:10px; right:10px; height:250px; background:rgba(0,0,0,0.85); color:#0f0; font-family:monospace; font-size:11px; overflow-y:scroll; z-index:99999; padding:10px; border-radius:8px; pointer-events:auto;">
        <strong style="color:#fff;">Backend Response Console</strong><br>
    </div>

    <script>
        function screenLog(msg) {
            const consoleEl = document.getElementById('debug-console');
            if (consoleEl) {
                const time = new Date().toLocaleTimeString();
                const text = typeof msg === 'object' ? JSON.stringify(msg, null, 2) : msg;
                consoleEl.innerHTML += `<div style="margin-bottom:5px; border-bottom:1px solid #333; padding-bottom:5px;">[${time}] ${text}</div>`;
                consoleEl.scrollTop = consoleEl.scrollHeight;
            }
            console.log(msg);
        }
    </script>
</body>

</html>