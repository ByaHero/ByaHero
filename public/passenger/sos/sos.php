<?php
@session_start();

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
    <link rel="icon" href="../../../assets/images/byaheroLogoBlue.svg" type="image/svg+xml">
    <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <title>SOS - ByaHero</title>

    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0&display=swap" rel="stylesheet" media="print" onload="this.media='all'" />
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css">
    <meta name="theme-color" content="#1e3a8a">

    <style>
        :root {
            --bs-primary: #1e3a8a;
            --bs-bg-light: #f3f4f6;
            --sos-red-dark: #b02a37;
            --sos-btn-size: 220px;
        }

        @media (max-width: 380px) {
            :root { --sos-btn-size: 190px; }
        }

        @media (min-height: 800px) {
            :root { --sos-btn-size: 250px; }
        }

        html, body {
            height: 100%;
            margin: 0;
            padding: 0;
            overflow: hidden;
            overscroll-behavior: none;
        }

        body {
            font-family: "Segoe UI", sans-serif;
            background-color: var(--bs-bg-light);
        }

        /* Set up the main layer to take full height */
        #sos-idle-layer {
            min-height: calc(100vh - 80px); /* Full height minus navbar */
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }

        .sos-btn-container {
            width: var(--sos-btn-size);
            height: var(--sos-btn-size);
            margin: 0 auto;
            position: relative;
            transition: width 0.3s ease, height 0.3s ease;
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
            -webkit-tap-highlight-color: transparent;
        }

        .main-sos-btn:active {
            transform: scale(0.92);
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
            animation: pulse 2.5s infinite;
            z-index: 1;
        }

        .sos-ring:nth-child(2) {
            animation-delay: 0.8s;
        }

        @keyframes pulse {
            0% {
                width: 80%;
                height: 80%;
                opacity: 0.8;
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
            background-color: #ffffff;
            z-index: 3000; /* Higher than navbar */
            display: flex;
            flex-direction: column;
            animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .text-dark-red {
            color: #b02a37;
        }

        /* Circular progress countdown */
        .countdown-container {
            position: relative;
            width: 170px;
            height: 170px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 1.5rem auto;
        }

        .progress-ring {
            position: absolute;
            top: 0;
            left: 0;
            transform: rotate(-90deg);
        }

        .progress-ring__circle {
            transition: stroke-dashoffset 1s linear;
            stroke-dasharray: 439.82; /* 2 * PI * r (r=70) */
            stroke-dashoffset: 0;
        }

        .countdown-inner {
            width: 120px;
            height: 120px;
            font-size: 3.8rem;
            display: flex;
            align-items: center;
            justify-content: center;
            line-height: 1;
            z-index: 10;
        }

        .slider-track {
            height: 76px;
            max-width: 400px;
            width: 90%;
            background-color: #f1f5f9;
            border: 2px solid #e2e8f0;
            touch-action: none;
            position: relative;
            overflow: hidden;
            margin: auto auto 3rem auto;
            border-radius: 100px;
        }

        .slider-handle {
            width: 64px;
            height: 64px;
            top: 4px;
            right: 4px;
            cursor: grab;
            position: absolute;
            z-index: 2;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #dc3545;
            color: white;
            border-radius: 50%;
            box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
        }

        .slider-handle:active {
            cursor: grabbing;
        }

        .slider-text {
            position: absolute;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #dc3545;
            font-weight: 700;
            font-size: 1rem;
            letter-spacing: 0.5px;
            user-select: none;
            padding-right: 50px; /* Offset for handle */
            animation: glow 2s infinite ease-in-out;
        }

        @keyframes glow {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; }
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
            margin-left: -12px;
            font-size: 14px;
            user-select: none;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            overflow: hidden;
        }

        .stack-avatar:first-child {
            margin-left: 0;
        }
    </style>
</head>

<body class="bg-light">

    <?php include "../../../components/navbarPassenger.php"; ?>

    <main id="sos-idle-layer" class="container pt-5">
        <div class="row justify-content-center flex-grow-1">
            <div class="col-12 col-md-8 col-lg-5 d-flex flex-column">

                <div class="card border-0 shadow-sm rounded-4 mb-3 w-100">
                    <div class="card-body p-3 d-flex align-items-center justify-content-between">
                        <div class="d-flex align-items-center overflow-hidden">
                            <div class="bg-primary bg-opacity-10 text-primary p-2 rounded-circle me-3 flex-shrink-0">
                                <span class="material-symbols-rounded">my_location</span>
                            </div>
                            <div class="text-start overflow-hidden">
                                <small class="text-muted fw-bold d-block"
                                    style="font-size: 0.7rem; letter-spacing: 0.5px;">YOUR LOCATION</small>
                                <span class="fw-bold text-dark text-truncate d-block"
                                    id="location-text">Locating...</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="d-flex flex-column justify-content-center align-items-center flex-grow-1 pb-5">
                    
                    <div class="sos-btn-container mb-4">
                        <div class="sos-ring"></div>
                        <div class="sos-ring"></div>
                        <button class="main-sos-btn" onclick="startCountdown()">
                            <h1 class="material-symbols-rounded text-white mb-0"
                                style="font-variation-settings: 'FILL' 1; font-size: 4rem;">sos</h1>
                            <span class="text-white fw-bold mt-1">ALERT CIRCLE</span>
                        </button>
                    </div>

                    <section class="text-center mt-3">
                        <div id="friends-avatars" class="avatar-stack mb-1"></div>
                        <div id="friends-status" class="small text-muted mb-0">
                            <div class="spinner-border text-primary" role="status" style="width: 1.5rem; height: 1.5rem;">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                        </div>
                    </section>
                </div>

            </div>
        </div>
    </main>

    <div id="sos-countdown-layer" class="d-none">
        <main class="flex-grow-1 d-flex flex-column align-items-center pt-5 text-center w-100">
            <h1 class="text-dark-red fw-bold display-6 mb-2">Slide to cancel</h1>
            <p class="text-muted w-75 mb-4 small">
                After 5 seconds, your SOS and location will be sent to your Circle and emergency contacts.
            </p>

            <!-- Circular progress count down -->
            <div class="countdown-container">
                <svg class="progress-ring" width="170" height="170">
                    <circle class="progress-ring__circle-bg" stroke="#f1f5f9" stroke-width="8" fill="transparent" r="70" cx="85" cy="85" />
                    <circle class="progress-ring__circle" stroke="#dc3545" stroke-width="8" stroke-linecap="round" fill="transparent" r="70" cx="85" cy="85" />
                </svg>
                <div class="countdown-inner bg-danger text-white rounded-circle d-flex justify-content-center align-items-center fw-bold shadow-lg z-2"
                    id="timer">5</div>
            </div>

            <div class="slider-track shadow-sm position-relative" id="sliderContainer">
                <div class="slider-text">
                    <span>Slide left to cancel SOS</span>
                </div>
                <div class="slider-handle shadow-sm" id="sliderHandle">
                    <span class="material-symbols-rounded" style="font-size: 32px;">chevron_left</span>
                </div>
            </div>

            <div style="height:80px;"></div>
        </main>
    </div>

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
                        <div class="list-group-item text-center py-3">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                        </div>
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
                if (f.profile_picture) {
                    const basePath = window.APP_BASE_URL || "<?php echo isset($pageDepth) ? $pageDepth : '../../../'; ?>";
                    const isAbsolute = /^https?:\/\/|^data:/i.test(f.profile_picture);
                    const safePath = isAbsolute ? f.profile_picture : basePath + (f.profile_picture.startsWith('/') ? f.profile_picture.substring(1) : f.profile_picture);
                    return `<div class="stack-avatar" style="background:${bg}"><img src="${safePath}" alt="Friend Avatar" style="width: 100%; height: 100%; object-fit: cover;"></div>`;
                }
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
                                        notification: { 
                                            title: '🚨 SOS Alert', 
                                            body: `${data.sender_name} needs help!` + (data.location_text ? ` Location: ${data.location_text}` : '') 
                                        },
                                        data: { 
                                            type: 'sos_alert', 
                                            sender_name: data.sender_name, 
                                            location_text: data.location_text || '' 
                                        },
                                        android: {
                                            priority: 'high',
                                            notification: {
                                                channel_id: 'sos_alerts',
                                                sound: 'default',
                                                notification_priority: 'PRIORITY_HIGH',
                                                visibility: 'public'
                                            }
                                        },
                                        apns: {
                                            payload: {
                                                aps: {
                                                    alert: {
                                                        title: '🚨 SOS Alert',
                                                        body: `${data.sender_name} needs help!`
                                                    },
                                                    sound: 'default',
                                                    'mutable-content': 1
                                                }
                                            },
                                            headers: {
                                                'apns-priority': '10'
                                            }
                                        }
                                    }
                                })
                            });
                        }));
                    }
                }
                
                if (statusEl) statusEl.textContent = `SOS successfully received by ${selected.length} friends!`;
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
        const progressCircle = document.querySelector('.progress-ring__circle');
        const progressCircumference = 2 * Math.PI * 70; // 439.82

        // Initial setup for the SVG progress stroke
        progressCircle.style.strokeDasharray = `${progressCircumference} ${progressCircumference}`;
        progressCircle.style.strokeDashoffset = `${progressCircumference}`;

        let countdownInterval;
        let timeLeft = 5;
        let isSOSActive = false;

        function setProgress(percent) {
            const offset = progressCircumference - (percent / 100) * progressCircumference;
            progressCircle.style.strokeDashoffset = offset;
        }

        function startCountdown() {
            if (navigator.vibrate) navigator.vibrate([200]);
            countdownLayer.classList.remove('d-none');
            
            document.querySelector('#sos-countdown-layer h1').textContent = "Slide to cancel";
            document.querySelector('#sos-countdown-layer p').textContent = "After 5 seconds, your SOS and location will be sent to your Circle and emergency contacts.";
            
            timeLeft = 5;
            timerElement.textContent = timeLeft;
            setProgress(100);
            sliderHandle.style.transform = `translateX(0px)`;
            isSOSActive = true;
            
            _attachDragListeners();
            
            if (countdownInterval) clearInterval(countdownInterval);

            countdownInterval = setInterval(() => {
                if (!isSOSActive) return;
                timeLeft--;
                timerElement.textContent = timeLeft;
                setProgress((timeLeft / 5) * 100);
                if (timeLeft <= 0) { 
                    clearInterval(countdownInterval); 
                    sendSOS(); 
                }
            }, 1000);
        }

        function cancelSOS() {
            isSOSActive = false;
            clearInterval(countdownInterval);
            timerElement.textContent = "✕";
            setProgress(0);
            document.querySelector('#sos-countdown-layer h1').textContent = "Cancelled";
            document.querySelector('#sos-countdown-layer p').textContent = "Your SOS has been cancelled. Returning to home...";
            _cleanupDragListeners();
            setTimeout(() => {
                countdownLayer.classList.add('d-none');
                _attachDragListeners();
            }, 1200);
        }

        async function sendSOS() {
            isSOSActive = false;
            clearInterval(countdownInterval);
            setProgress(0);

            const statusEl = document.getElementById("friends-status");
            const locText = await getResolvedLocationText();
            const recipients = Array.isArray(friendsCache)
                ? friendsCache.map(f => parseInt(f.id, 10)).filter(Number.isFinite)
                : [];

            if (recipients.length === 0) {
                countdownLayer.classList.add('d-none');
                isSOSActive = false;
                return;
            }

            try {
                if (statusEl) statusEl.textContent = "Sending SOS…";

                const res = await fetch("../../../backend/sendSosAlert.php", {
                    method: "POST", credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ recipients, location_text: locText })
                });

                const data = await res.json();

                if (!data.success) throw new Error(data.message || "Failed to send SOS");
                if (statusEl) statusEl.textContent = `Alerting ${recipients.length} people...`;

                if (data.fcm_tokens && data.fcm_tokens.length > 0 && data.jwt && data.project_id) {
                    try {
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
                                        },
                                        android: {
                                            priority: 'high',
                                            notification: {
                                                channel_id: 'sos_alerts',
                                                sound: 'default',
                                                notification_priority: 'PRIORITY_HIGH',
                                                visibility: 'public'
                                            }
                                        },
                                        apns: {
                                            payload: {
                                                aps: {
                                                    alert: {
                                                        title: '🚨 SOS Alert',
                                                        body: `${data.sender_name} needs help!`
                                                    },
                                                    sound: 'default',
                                                    'mutable-content': 1
                                                }
                                            },
                                            headers: {
                                                'apns-priority': '10'
                                            }
                                        }
                                    }
                                })
                            });
                        }));
                        if (statusEl) statusEl.textContent = `SOS successfully received by ${recipients.length} friends!`;
                    } catch (pushErr) {
                        if (statusEl) statusEl.textContent = `SOS saved, but push warning: ${pushErr.message}`;
                    }
                } else {
                    if (statusEl) statusEl.textContent = `SOS saved. (No FCM tokens found for friends)`;
                }

            } catch (e) {
                if (statusEl) statusEl.textContent = "Failed to send SOS";
            } finally {
                isSOSActive = false;
                _cleanupDragListeners();
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

        function _attachDragListeners() {
            sliderHandle.addEventListener('mousedown', startDrag);
            sliderHandle.addEventListener('touchstart', startDrag, { passive: false });
            document.addEventListener('mousemove', drag);
            document.addEventListener('touchmove', drag, { passive: false });
            document.addEventListener('mouseup', endDrag);
            document.addEventListener('touchend', endDrag);
        }

        _attachDragListeners();

        function _cleanupDragListeners() {
            sliderHandle.removeEventListener('mousedown', startDrag);
            sliderHandle.removeEventListener('touchstart', startDrag);
            document.removeEventListener('mousemove', drag);
            document.removeEventListener('touchmove', drag);
            document.removeEventListener('mouseup', endDrag);
            document.removeEventListener('touchend', endDrag);
        }
        window.addEventListener('beforeunload', _cleanupDragListeners);
        window.addEventListener('pagehide', _cleanupDragListeners);
    </script>
    
</body>

</html>