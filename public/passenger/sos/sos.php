<?php session_start(); ?>
<!doctype html>
<html lang="en">

<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
    <title>SOS - ByaHero</title>

    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded" rel="stylesheet" />
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <meta name="theme-color" content="#1e3a8a">

    <style>
        /* === PROTOTYPE BRANDING === */
        :root {
            --bs-primary: #1e3a8a;
            --bs-primary-rgb: 30, 58, 138;
            --bs-bg-light: #f3f4f6;
        }

        body {
            font-family: "Poppins", sans-serif;
            background-color: var(--bs-bg-light);
            /* Padding bottom is now handled by navbarPassenger.php globally */
        }

        /* Pulse Animation for SOS Button */
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

        /* Rings */
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
    </style>
</head>

<body>

    <?php
    $pageType = 'sos';        // Triggers the "Settings" header
    $backLink = '../index.php';    // Tells the arrow where to go
    $pageDepth = "../../../";      // Fixes the logo path (for the bottom nav if needed)
    include "../../../components/navbarPassenger.php";
    ?>

    <div class="container pt-5 mt-2">
        <div class="row justify-content-center">
            <div class="col-12 col-md-8 col-lg-5">

                <div class="card border-0 shadow-sm rounded-4 mb-5">
                    <div class="card-body p-3 d-flex align-items-center justify-content-between">
                        <div class="d-flex align-items-center overflow-hidden">
                            <div class="bg-primary bg-opacity-10 text-primary p-2 rounded-circle me-3 flex-shrink-0">
                                <span class="material-symbols-rounded">my_location</span>
                            </div>
                            <div class="overflow-hidden">
                                <small class="text-muted fw-bold d-block" style="font-size: 0.7rem; letter-spacing: 0.5px;">YOUR
                                    LOCATION</small>
                                <span class="fw-bold text-dark text-truncate d-block" id="location-text">Locating...</span>
                            </div>
                        </div>
                        <button class="btn btn-sm btn-light rounded-pill border fw-bold flex-shrink-0 ms-2" onclick="shareLocation()">
                            Share
                        </button>
                    </div>
                </div>

                <div class="sos-btn-container mb-5">
                    <div class="sos-ring"></div>
                    <div class="sos-ring"></div>
                    <button class="sos-btn" onclick="triggerSOS()">
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
                                    <div class="bg-primary bg-opacity-10 text-primary p-3 rounded-circle d-inline-block mb-3">
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
                                    <div class="bg-danger bg-opacity-10 text-danger p-3 rounded-circle d-inline-block mb-3">
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
                                        <div class="rounded-circle bg-secondary border border-2 border-white d-flex align-items-center justify-content-center text-white"
                                            style="width: 24px; height: 24px; margin-right: -8px; font-size: 10px;">JD</div>
                                        <div class="rounded-circle bg-success border border-2 border-white d-flex align-items-center justify-content-center text-white"
                                            style="width: 24px; height: 24px; margin-right: -8px; font-size: 10px;">AM</div>
                                        <div class="rounded-circle bg-warning border border-2 border-white d-flex align-items-center justify-content-center text-white"
                                            style="width: 24px; height: 24px; font-size: 10px;">KD</div>

                                        <small class="text-muted ms-3 text-truncate" style="font-size: 0.75rem;">Alert sent</small>
                                    </div>
                                </div>

                                <button class="btn btn-outline-info rounded-circle p-2 d-flex flex-shrink-0 ms-2" onclick="shareLocation()">
                                    <span class="material-symbols-rounded">send</span>
                                </button>

                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>

    <script>
        // 1. Fetch Location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const lat = pos.coords.latitude.toFixed(4);
                    const lng = pos.coords.longitude.toFixed(4);
                    document.getElementById('location-text').innerText = `${lat}, ${lng}`;
                },
                (err) => {
                    document.getElementById('location-text').innerText = "Unknown Location";
                }, {
                    enableHighAccuracy: true
                }
            );
        }

        // 2. SOS Trigger
        function triggerSOS() {
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
            if (confirm("Confirm Emergency Call to 911?")) {
                window.location.href = "tel:911";
            }
        }

        // 3. Share Location
        function shareLocation() {
            const locText = document.getElementById('location-text').innerText;
            const url = `https://maps.google.com/?q=${locText}`;

            if (navigator.share) {
                navigator.share({
                    title: 'Emergency Help',
                    text: 'I need help! My location: ' + locText,
                    url: url
                });
            } else {
                alert("Location copied to clipboard!");
                navigator.clipboard.writeText(url);
            }
        }
    </script>
</body>

</html>