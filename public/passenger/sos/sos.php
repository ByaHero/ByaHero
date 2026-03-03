<?php
session_start();
$pageType = 'sos';
$backLink = '../index.php';
$pageDepth = "../../../";
include "../../../components/navbarPassenger.php";
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
            font-family: "Poppins", sans-serif;
            background-color: var(--bs-bg-light);
        }

        .sos-btn-container {
            width: 180px;
            height: 180px;
            margin: 0 auto;
            position: relative;
        }

        .sos-btn {
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

        .sos-btn:active {
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

        .hover-scale {
            transition: transform 0.2s;
        }

        .hover-scale:active {
            transform: scale(0.98);
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

        .bottom-nav-spacer {
            height: 80px;
        }

        /* Friend avatars */
        .small-avatar {
            width: 24px;
            height: 24px;
            margin-right: -8px;
            font-size: 10px;
        }
    </style>
</head>

<body>
    <?php
    $pageType = 'sos';
    $backLink = '../index.php';
    $pageDepth = "../../../";
    include "../../../components/navbarPassenger.php";
    ?>

    <div id="sos-idle-layer" class="container pt-5 mt-2">
        <div class="row justify-content-center">
            <div class="col-12 col-md-8 col-lg-5">

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
                        <button class="btn btn-sm btn-light rounded-pill border fw-bold flex-shrink-0 ms-2"
                            onclick="shareLocation()">
                            Share
                        </button>
                    </div>
                </div>

                <div class="sos-btn-container mb-5">
                    <div class="sos-ring"></div>
                    <div class="sos-ring"></div>
                    <button class="sos-btn" onclick="startCountdown()">
                        <h1 class="material-symbols-rounded text-white display-1 mb-0"
                            style="font-variation-settings: 'FILL' 1;">sos</h1>
                        <span class="text-white fw-bold mt-1">ALERT CIRCLE</span>
                    </button>
                </div>

                <h6 class="fw-bold text-secondary small mb-3 ps-2">QUICK DIAL</h6>
                <div class="row g-3">
                    <div class="col-6">
                        <a href="tel:911" class="text-decoration-none">
                            <div class="card border-0 shadow-sm rounded-4 h-100 hover-scale">
                                <div class="card-body text-center py-4">
                                    <div
                                        class="bg-primary bg-opacity-10 text-primary p-3 rounded-circle d-inline-block mb-3">
                                        <span class="material-symbols-rounded fs-2">local_police</span>
                                    </div>
                                    <h6 class="fw-bold text-dark mb-0">Police</h6>
                                    <small class="text-muted">Nearest Station</small>
                                </div>
                            </div>
                        </a>
                    </div>
                    <div class="col-6">
                        <a href="tel:911" class="text-decoration-none">
                            <div class="card border-0 shadow-sm rounded-4 h-100 hover-scale">
                                <div class="card-body text-center py-4">
                                    <div
                                        class="bg-danger bg-opacity-10 text-danger p-3 rounded-circle d-inline-block mb-3">
                                        <span class="material-symbols-rounded fs-2">ambulance</span>
                                    </div>
                                    <h6 class="fw-bold text-dark mb-0">Medical</h6>
                                    <small class="text-muted">Ambulance</small>
                                </div>
                            </div>
                        </a>
                    </div>

                    <!-- Friend group integration -->
                    <div class="col-12">
                        <div class="card border-0 shadow-sm rounded-4 mt-1">
                            <div class="card-body p-3 d-flex align-items-center">
                                <div class="bg-info bg-opacity-10 text-info p-2 rounded-circle me-3 flex-shrink-0">
                                    <span class="material-symbols-rounded">groups</span>
                                </div>

                                <div class="flex-grow-1 overflow-hidden">
                                    <h6 class="fw-bold text-dark mb-1">Friend Group</h6>

                                    <div class="d-flex align-items-center">
                                        <div id="friends-avatars" class="d-flex align-items-center">
                                            <small class="text-muted" style="font-size:0.75rem;">Loading
                                                friends…</small>
                                        </div>
                                        <small id="friends-status" class="text-muted ms-3 text-truncate"
                                            style="font-size: 0.75rem;"></small>
                                    </div>
                                </div>

                                <button class="btn btn-outline-info rounded-circle p-2 d-flex flex-shrink-0 ms-2"
                                    type="button" onclick="openSosFriendsModal()" title="Send SOS to friends">
                                    <span class="material-symbols-rounded">send</span>
                                </button>
                            </div>
                        </div>
                    </div>
                    <!-- /Friend group integration -->

                </div>

            </div>
        </div>
    </div>

    <!-- SOS countdown layer unchanged -->
    <div id="sos-countdown-layer" class="d-none">
        <?php
        $pageTitle = 'sos';
        $backLink = 'sos.php';
        include '../../../components/navbarPassenger.php';
        ?>
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

            <div class="bottom-nav-spacer"></div>
        </main>
    </div>

    <!-- Modal: choose friends to alert -->
    <div class="modal fade" id="sosFriendsModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content rounded-4">
                <div class="modal-header">
                    <h5 class="modal-title fw-bold">Send SOS to Friends</h5>
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

                    <div class="alert alert-warning mt-3 mb-0 small">
                        This will create an SOS alert record in the system. Real-time notification requires polling or
                        push setup.
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
        // Store coords globally so shareLocation() can always build a correct maps URL
        let currentCoords = { lat: null, lng: null };

        // Cache resolved place name so SOS sends a place instead of coordinates
        let resolvedPlaceName = "";
        let resolvePlacePromise = null;

        async function reverseGeocode(lat, lng) {
            // Nominatim usage policy: include a valid User-Agent/Referer; browser fetch is usually OK for prototypes.
            const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`;

            const res = await fetch(url, {
                headers: {
                    // Some deployments work without this, but adding Accept is safe
                    "Accept": "application/json"
                }
            });

            if (!res.ok) throw new Error("Reverse geocoding failed");
            return res.json();
        }

        function formatPlaceName(nominatim) {
            const a = nominatim.address || {};

            // These keys vary by area/country, so we fall back gracefully.
            const barangay =
                a.barangay || a.neighbourhood || a.suburb || a.village || a.hamlet || "";

            const city =
                a.city || a.town || a.municipality || a.county || "";

            const province =
                a.state || a.region || "";

            // Build "Barangay, City, Province" but omit empty parts
            const parts = [barangay, city, province].filter(Boolean);

            // If nothing matched, fall back to display_name
            return parts.length ? parts.join(", ") : (nominatim.display_name || "Unknown location");
        }

        function looksLikeCoords(text) {
            // Matches "14.2311, 121.1717" etc.
            return /^\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*$/.test(String(text || ""));
        }

        async function getResolvedLocationText() {
            const elText = document.getElementById("location-text")?.innerText || "";

            // If UI already has a place name, use it
            if (elText && !looksLikeCoords(elText) && elText !== "Locating..." && elText !== "Unknown Location") {
                resolvedPlaceName = elText;
                return elText;
            }

            // If we already resolved it before, reuse
            if (resolvedPlaceName) return resolvedPlaceName;

            // Need coordinates to resolve
            if (currentCoords.lat == null || currentCoords.lng == null) {
                // fallback to whatever is on screen
                return elText || "Unknown Location";
            }

            // Avoid duplicate calls if multiple sends happen quickly
            if (!resolvePlacePromise) {
                resolvePlacePromise = (async () => {
                    try {
                        const data = await reverseGeocode(currentCoords.lat, currentCoords.lng);
                        const place = formatPlaceName(data);
                        resolvedPlaceName = place;

                        // Update UI too (optional)
                        const el = document.getElementById("location-text");
                        if (el) el.innerText = place;

                        return place;
                    } catch (e) {
                        console.warn(e);
                        // fallback: coordinates if geocoding fails
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

            // Show coords immediately (fast feedback)
            el.innerText = `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;

            try {
                const data = await reverseGeocode(lat, lng);
                const place = formatPlaceName(data);
                resolvedPlaceName = place; // cache
                el.innerText = place;
            } catch (e) {
                // Keep coords if API fails
                console.warn(e);
            }
        }

        // Replace your existing geolocation logic with this:
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    const lat = pos.coords.latitude;
                    const lng = pos.coords.longitude;

                    currentCoords = { lat, lng };
                    await setLocationUI(lat, lng);
                },
                () => {
                    const el = document.getElementById("location-text");
                    if (el) el.innerText = "Unknown Location";
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        }

        // Update shareLocation() to share a proper maps link even if the UI shows a place name
        function shareLocation() {
            if (currentCoords.lat == null || currentCoords.lng == null) {
                alert("Location not available yet.");
                return;
            }

            const url = `https://maps.google.com/?q=${currentCoords.lat},${currentCoords.lng}`;
            const placeText = document.getElementById("location-text")?.innerText || "My location";

            if (navigator.share) {
                navigator.share({
                    title: "Emergency Help",
                    text: `I need help! My location: ${placeText}`,
                    url: url
                });
            } else {
                navigator.clipboard.writeText(url);
                alert("Location link copied to clipboard!");
            }
        }
    </script>

    <script>
        // --- Friend circle state ---
        let friendsCache = [];
        let sosFriendsModal;

        async function fetchFriends() {
            const avatarsEl = document.getElementById('friends-avatars');
            const listEl = document.getElementById('friends-list');

            try {
                const res = await fetch("../../../backend/groupView.php", { credentials: "include" });
                const data = await res.json();

                if (!data.success) throw new Error(data.message || "Failed to fetch friends");

                friendsCache = Array.isArray(data.friends) ? data.friends : [];

                // Avatars preview (max 3)
                if (friendsCache.length === 0) {
                    avatarsEl.innerHTML = `<small class="text-muted" style="font-size:0.75rem;">No friends in your circle yet</small>`;
                } else {
                    const preview = friendsCache.slice(0, 3).map(f => {
                        const initials = (f.name || f.email || "??")
                            .split(" ")
                            .filter(Boolean)
                            .slice(0, 2)
                            .map(s => s[0].toUpperCase())
                            .join("")
                            .slice(0, 2);

                        return `
                          <div class="rounded-circle bg-info border border-2 border-white d-flex align-items-center justify-content-center text-white small-avatar">
                            ${initials || "??"}
                          </div>`;
                    }).join("");

                    avatarsEl.innerHTML = preview;
                }

                // Modal list
                listEl.innerHTML = friendsCache.map(f => {
                    const label = f.name ? `${f.name} (${f.email})` : f.email;
                    return `
                      <label class="list-group-item d-flex align-items-center gap-2">
                        <input class="form-check-input me-1 friend-checkbox" type="checkbox" value="${f.id}">
                        <span class="flex-grow-1 text-truncate">${label}</span>
                      </label>
                    `;
                }).join("") || `<div class="list-group-item">No friends to alert.</div>`;

            } catch (e) {
                avatarsEl.innerHTML = `<small class="text-danger" style="font-size:0.75rem;">Failed to load</small>`;
                listEl.innerHTML = `<div class="list-group-item text-danger">Failed to load friends</div>`;
                console.error(e);
            }
        }

        function openSosFriendsModal() {
            if (!sosFriendsModal) {
                sosFriendsModal = new bootstrap.Modal(document.getElementById('sosFriendsModal'));
            }
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

            if (selected.length === 0) {
                alert("Select at least one friend.");
                return;
            }

            const locText = await getResolvedLocationText();

            try {
                statusEl.textContent = "Sending…";

                const res = await fetch("../../../backend/sendSosAlert.php", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        recipients: selected,
                        location_text: locText
                    })
                });

                const data = await res.json();
                if (!data.success) throw new Error(data.message || "Failed to send SOS");

                statusEl.textContent = `Sent to ${selected.length} friend(s)`;
                if (sosFriendsModal) sosFriendsModal.hide();

            } catch (e) {
                statusEl.textContent = "Failed to send";
                alert(e.message);
            }
        }

        // Load friends immediately
        fetchFriends();

        // --- Countdown & state logic (your original, mostly unchanged) ---
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

                if (timeLeft <= 0) {
                    clearInterval(countdownInterval);
                    sendSOS();
                }
            }, 1000);
        }

        function cancelSOS() {
            isSOSActive = false;
            clearInterval(countdownInterval);

            timerElement.classList.replace('bg-danger', 'bg-secondary');
            timerElement.textContent = "X";
            document.querySelector('#sos-countdown-layer h1').textContent = "Cancelled";
            document.querySelector('#sos-countdown-layer p').textContent = "Your SOS has been cancelled. Returning to home...";

            setTimeout(() => {
                countdownLayer.classList.add('d-none');
            }, 1000);
        }

        async function sendSOS() {
            const statusEl = document.getElementById("friends-status");
            const locText = await getResolvedLocationText();

            // if your groupView.php returns id per friend (it does in your modal code), use it:
            const recipients = Array.isArray(friendsCache)
                ? friendsCache.map(f => parseInt(f.id, 10)).filter(Number.isFinite)
                : [];

            if (recipients.length === 0) {
                alert("No circle members found to notify.");
                countdownLayer.classList.add('d-none');
                isSOSActive = false;
                return;
            }

            try {
                if (statusEl) statusEl.textContent = "Sending SOS to circle…";

                const res = await fetch("../../../backend/sendSosAlert.php", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        recipients,
                        location_text: locText
                    })
                });

                const data = await res.json();
                if (!data.success) throw new Error(data.message || "Failed to send SOS");

                alert(`SOS sent to ${data.sent_to?.length || recipients.length} circle member(s).`);

                if (statusEl) statusEl.textContent = "SOS sent to circle";
            } catch (e) {
                console.error(e);
                if (statusEl) statusEl.textContent = "Failed to send SOS";
                alert(e.message || "Failed to send SOS");
            } finally {
                isSOSActive = false;
                countdownLayer.classList.add('d-none');
            }
        }
        // --- Slider drag logic (your original) ---
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
</body>

</html>