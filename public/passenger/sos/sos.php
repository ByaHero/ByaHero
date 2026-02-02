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
        /* === GLOBAL STYLES === */
        :root {
            --bs-primary: #1e3a8a;
            --bs-bg-light: #f3f4f6;
            --sos-red-dark: #b02a37;
        }

        body {
            font-family: "Poppins", sans-serif;
            background-color: var(--bs-bg-light);
        }

        /* === IDLE STATE (DASHBOARD) STYLES === */
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

        /* === ACTIVE STATE (COUNTDOWN OVERLAY) STYLES === */
        #sos-countdown-layer {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: #f8f9fa;
            z-index: 2000;
            /* Above everything */
            display: flex;
            flex-direction: column;
        }

        .bg-deep-blue {
            background-color: #154284;
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

        /* Slider Styles */
        .slider-track {
            height: 70px;
            max-width: 350px;
            background-color: #635f5f;
            touch-action: none;
            position: relative;
            overflow: hidden;
            margin: 0 auto 2rem auto;
            /* Center horizontally */
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
    </style>
</head>

<body>
    <?php
    $pageType = 'sos';        // Triggers the "Settings" header
    $backLink = '../index.php';    // Tells the arrow where to go
    $pageDepth = "../../../";      // Fixes the logo path (for the bottom nav if needed)
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
                        <span class="material-symbols-rounded text-white display-1 mb-0"
                            style="font-variation-settings: 'FILL' 1;">sos</span>
                        <span class="text-white fw-bold mt-1">CALL 911</span>
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
                    <div class="col-12">
                        <div class="card border-0 shadow-sm rounded-4 mt-1">
                            <div class="card-body p-3 d-flex align-items-center">
                                <div class="bg-info bg-opacity-10 text-info p-2 rounded-circle me-3 flex-shrink-0">
                                    <span class="material-symbols-rounded">groups</span>
                                </div>
                                <div class="flex-grow-1 overflow-hidden">
                                    <h6 class="fw-bold text-dark mb-1">Friend Group</h6>
                                    <div class="d-flex align-items-center">
                                        <div
                                            class="rounded-circle bg-secondary border border-2 border-white d-flex align-items-center justify-content-center text-white small-avatar">
                                            JD</div>
                                        <div
                                            class="rounded-circle bg-success border border-2 border-white d-flex align-items-center justify-content-center text-white small-avatar">
                                            AM</div>
                                        <div
                                            class="rounded-circle bg-warning border border-2 border-white d-flex align-items-center justify-content-center text-white small-avatar">
                                            KD</div>
                                        <small class="text-muted ms-3 text-truncate" style="font-size: 0.75rem;">Alert
                                            sent</small>
                                    </div>
                                </div>
                                <button class="btn btn-outline-info rounded-circle p-2 d-flex flex-shrink-0 ms-2"
                                    onclick="shareLocation()">
                                    <span class="material-symbols-rounded">send</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    </div>

    <div id="sos-countdown-layer" class="d-none">
        <?php
        $pageTitle = 'sos';
        $backLink = 'sos.php'; // Optional: defaults to index
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
                    id="timer">
                    10
                </div>
            </div>

            <div class="slider-track w-100 shadow mb-4 rounded-pill position-relative" id="sliderContainer" style="width: 90%;">
                <div class="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center z-1">
                    <span class="text-danger fw-bold fs-5 user-select-none">
                        Slide to cancel SOS
                    </span>
                </div>

                <div class="slider-handle bg-danger rounded-circle shadow-sm d-flex align-items-center justify-content-center z-2" id="sliderHandle">
                    <i class="bi bi-chevron-left text-white opacity-50"></i>
                </div>
            </div>

            <div class="bottom-nav-spacer"></div>
        </main>

        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>

        <script>
            // --- 1. Location Logic (Always runs) ---
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        const lat = pos.coords.latitude.toFixed(4);
                        const lng = pos.coords.longitude.toFixed(4);
                        const el = document.getElementById('location-text');
                        if (el) el.innerText = `${lat}, ${lng}`;
                    },
                    (err) => {
                        const el = document.getElementById('location-text');
                        if (el) el.innerText = "Unknown Location";
                    }, { enableHighAccuracy: true }
                );
            }

            function shareLocation() {
                const locText = document.getElementById('location-text').innerText;
                const url = `http://maps.google.com/?q=${locText}`;
                if (navigator.share) {
                    navigator.share({ title: 'Emergency Help', text: 'I need help! My location: ' + locText, url: url });
                } else {
                    alert("Location copied to clipboard!");
                    navigator.clipboard.writeText(url);
                }
            }

            // --- 2. Countdown & State Logic ---
            const idleLayer = document.getElementById('sos-idle-layer');
            const countdownLayer = document.getElementById('sos-countdown-layer');
            const timerElement = document.getElementById('timer');
            let countdownInterval;
            let timeLeft = 10;
            let isSOSActive = false;

            function startCountdown() {
                // Vibrate to indicate urgency
                if (navigator.vibrate) navigator.vibrate([200]);

                // Switch UI
                countdownLayer.classList.remove('d-none');

                // Reset Timer
                timeLeft = 10;
                timerElement.textContent = timeLeft;
                timerElement.classList.replace('bg-secondary', 'bg-danger'); // Ensure it's red
                document.querySelector('#sos-countdown-layer h1').textContent = "Slide to cancel";
                document.querySelector('#sos-countdown-layer p').textContent = "After 10 seconds, your SOS and location will be sent to your Circle and emergency contacts.";

                // Reset Slider Visuals
                sliderHandle.style.transform = `translateX(0px)`;

                isSOSActive = true;

                // Start Interval
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

                // Visual Feedback
                timerElement.classList.replace('bg-danger', 'bg-secondary');
                timerElement.textContent = "X";
                document.querySelector('#sos-countdown-layer h1').textContent = "Cancelled";
                document.querySelector('#sos-countdown-layer p').textContent = "Your SOS has been cancelled. Returning to home...";

                // Wait a moment then close overlay
                setTimeout(() => {
                    countdownLayer.classList.add('d-none');
                }, 1000);
            }

            function sendSOS() {
                alert("SOS SENT! Calling 911...");
                window.location.href = "tel:911";
                // Optionally close overlay after call logic
                isSOSActive = false;
                countdownLayer.classList.add('d-none');
            }

            // --- 3. Slider Logic (Drag to Cancel) ---
            const sliderContainer = document.getElementById('sliderContainer');
            const sliderHandle = document.getElementById('sliderHandle');
            let isDragging = false;
            let startX;

            // Note: Using a fixed calculation for maxMove can be tricky if container changes size.
            // We calculate it dynamically inside the drag function.

            // Mouse/Touch Start
            const startDrag = (e) => {
                if (!isSOSActive) return;
                isDragging = true;
                startX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
            };

            // Mouse/Touch Move
            const drag = (e) => {
                if (!isDragging) return;
                if (e.type.includes('touch')) e.preventDefault(); // Stop scrolling

                const currentX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
                const containerWidth = sliderContainer.offsetWidth;
                const handleWidth = sliderHandle.offsetWidth;
                const maxMove = containerWidth - handleWidth - 10; // 10px padding safety

                // Dragging Logic: We are moving from Right (0) to Left (negative)
                // But visually, the handle starts at `right: 5px`. 
                // So we need to translate X negatively.
                let delta = startX - currentX; // How much we moved left

                if (delta < 0) delta = 0; // Can't move right
                if (delta > maxMove) delta = maxMove; // Can't move past end

                sliderHandle.style.transform = `translateX(-${delta}px)`;

                // Check for cancel threshold (75%)
                if (delta > (maxMove * 0.75)) {
                    isDragging = false;
                    sliderHandle.style.transform = `translateX(-${maxMove}px)`; // Snap to end
                    cancelSOS();
                }
            };

            // Mouse/Touch End
            const endDrag = () => {
                if (!isDragging) return;
                isDragging = false;

                // If we are here, we didn't reach threshold, so snap back
                sliderHandle.style.transition = "transform 0.3s ease";
                sliderHandle.style.transform = `translateX(0px)`;
                setTimeout(() => { sliderHandle.style.transition = ""; }, 300);
            };

            // Bind Events
            sliderHandle.addEventListener('mousedown', startDrag);
            sliderHandle.addEventListener('touchstart', startDrag, { passive: false });

            document.addEventListener('mousemove', drag);
            document.addEventListener('touchmove', drag, { passive: false });

            document.addEventListener('mouseup', endDrag);
            document.addEventListener('touchend', endDrag);

            // Styling helper for avatar circles
            const avatars = document.querySelectorAll('.small-avatar');
            avatars.forEach(av => {
                av.style.width = '24px';
                av.style.height = '24px';
                av.style.marginRight = '-8px';
                av.style.fontSize = '10px';
            });
            // Remove margin from last one
            if (avatars.length > 0) avatars[avatars.length - 1].style.marginRight = '0';

        </script>
</body>

</html>