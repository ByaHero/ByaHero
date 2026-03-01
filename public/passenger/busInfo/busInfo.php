<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Database connection - adjust path based on your structure
require_once __DIR__ . '/../../../config/db_connection.php';

// Load stops
try {
    $pdo = new PDO("mysql:host=localhost;dbname=byahero", "root", "");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $stmt = $pdo->query("SELECT stop_id, location_name FROM bus_stops ORDER BY km_marker ASC");
    $stops = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    $stops = [];
    error_log("Database error: " . $e->getMessage());
}

/**
 * Navbar configuration for navbarPassenger.php (TOP BAR)
 */
$pageDepth = '../../../';
$pageTitle = 'Bus Information';
$backLink  = 'javascript:history.back()';
?>
<!doctype html>
<html lang="en">

<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <title>Bus Information - ByaHero</title>

    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded" rel="stylesheet" />
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

    <style>
        :root {
            --bs-primary: #0d47a1;
            --bs-blue-border: #3b82f6;
            --bs-bg-light: #f3f4f6;
            --bs-active-bg: #eff6ff; /* Soft blue for the click state */
        }

        body {
            font-family: "Segoe UI", sans-serif;
            background-color: #fff;
            padding-top: 55px;
            padding-bottom: 80px;
        }

        /* BUS INFO TYPOGRAPHY */
        .section-title {
            color: var(--bs-primary);
            font-weight: 700;
            margin-top: 25px;
            margin-bottom: 15px;
            font-size: 1.1rem;
            padding-left: 5px;
        }

        /* SCHEDULE CARDS */
        .schedule-card {
            background-color: white;
            border-radius: 12px;
            padding: 15px 20px;
            margin-bottom: 12px;
            border: 1px solid #e5e7eb;
            box-shadow: 0 2px 4px rgba(0,0,0,0.02);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .route-name {
            font-size: 1.05rem;
            color: var(--bs-primary);
            font-weight: 600;
        }

        .route-time {
            font-weight: 700;
            font-size: 0.9rem;
            color: #4b5563;
        }

        /* FARE CHECK CONTAINER */
        .content-sheet {
            background-color: #f8fafc;
            border-top-left-radius: 30px;
            border-top-right-radius: 30px;
            padding: 30px 20px 80px 20px;
            margin-top: 20px;
            min-height: calc(100vh - 280px);
            box-shadow: 0 -4px 20px rgba(0,0,0,0.03);
        }

        /* CUSTOM UI DROPDOWNS */
        .custom-dropdown {
            margin-bottom: 15px;
            width: 100%;
        }

        .custom-btn-toggle {
            background-color: white;
            border: 2px solid #e5e7eb;
            border-radius: 14px;
            padding: 12px 16px;
            width: 100%;
            text-align: left;
            display: flex;
            justify-content: space-between;
            align-items: center;
            color: #6b7280;
            font-weight: 500;
            font-size: 0.95rem;
            transition: all 0.25s ease;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
        }

        .custom-btn-toggle:focus,
        .custom-btn-toggle:active {
            outline: none;
            box-shadow: none;
        }

        /* VISUAL CLICK STATE - Adds the color and pop you wanted */
        .custom-btn-toggle[aria-expanded="true"] {
            background-color: var(--bs-active-bg);
            border-color: var(--bs-blue-border);
            color: var(--bs-primary);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
            transform: translateY(-2px);
        }

        .input-icon {
            font-size: 1rem;
            color: #9ca3af;
            transition: transform 0.3s ease, color 0.3s ease;
        }

        /* Rotates the arrow when open */
        .custom-btn-toggle[aria-expanded="true"] .input-icon {
            transform: rotate(180deg);
            color: var(--bs-primary);
        }

        .custom-dropdown-menu {
            border: none;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            padding: 8px;
            margin-top: 5px !important;
            max-height: 250px;
            overflow-y: auto;
        }

        .custom-dropdown-menu .dropdown-item {
            border-radius: 8px;
            padding: 10px 15px;
            font-weight: 500;
            color: #374151;
            transition: background-color 0.2s;
        }

        .custom-dropdown-menu .dropdown-item:hover,
        .custom-dropdown-menu .dropdown-item:focus {
            background-color: var(--bs-active-bg);
            color: var(--bs-primary);
        }

        /* Discount Specifics */
        .discount-container {
            display: flex;
            justify-content: center;
            margin-top: 5px;
        }

        .discount-btn {
            border-radius: 25px;
            padding: 8px 20px;
            width: auto;
            min-width: 160px;
            justify-content: center;
            gap: 10px;
        }

        /* PRICE DISPLAY - Scaled down to stop overlapping */
        .price-display {
            color: var(--bs-primary) !important;
            font-weight: 900 !important;
            text-align: center !important;
            margin-top: 30px !important;
            display: flex !important;
            align-items: baseline !important;
            justify-content: center !important;
            letter-spacing: -1px !important;
            gap: 10px !important;
        }

        .price-display .peso-sign {
            font-size: 2.5rem !important; /* Smaller peso sign */
            line-height: 1 !important;
            font-weight: 700 !important;
        }

        .price-display #fareAmount {
            /* clamp() ensures it fits perfectly on small and large screens */
            font-size: clamp(3rem, 12vw, 4.5rem) !important; 
            line-height: 1 !important;
            font-weight: 900 !important;
        }

        .error-message {
            color: #dc3545;
            font-size: 0.85rem;
            text-align: center;
            margin-top: 15px;
            font-weight: 500;
            min-height: 20px;
        }
    </style>
</head>

<body>

    <?php include __DIR__ . "/../../../components/navbarPassenger.php"; ?>

    <div class="container px-4">
        <h4 class="section-title">Bus Operation Schedule</h4>

        <div class="schedule-card">
            <span class="route-name">Laurel</span>
            <span class="route-time">3:30 am - 8:45 pm</span>
        </div>

        <div class="schedule-card">
            <span class="route-name">Tanauan</span>
            <span class="route-time">4:30 am - 10:00 pm</span>
        </div>

        <h4 class="section-title mt-4">Bus Fare Check</h4>
    </div>

    <div class="content-sheet">
        <div class="container p-0">
            <div class="row">
                <div class="col-6 pe-2">
                    <div class="dropdown custom-dropdown">
                        <button class="custom-btn-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                            <span class="selection-text text-truncate">Pick up</span>
                            <i class="fas fa-chevron-down input-icon ms-2"></i>
                        </button>
                        <ul class="dropdown-menu w-100 custom-dropdown-menu">
                            <?php foreach ($stops as $stop): ?>
                                <li><a class="dropdown-item location-item" href="#" data-target="pickupLocation" data-value="<?php echo (int)$stop['stop_id']; ?>"><?php echo htmlspecialchars($stop['location_name']); ?></a></li>
                            <?php endforeach; ?>
                        </ul>
                        <input type="hidden" id="pickupLocation" value="">
                    </div>
                </div>

                <div class="col-6 ps-2">
                    <div class="dropdown custom-dropdown">
                        <button class="custom-btn-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                            <span class="selection-text text-truncate">Drop off</span>
                            <i class="fas fa-chevron-down input-icon ms-2"></i>
                        </button>
                        <ul class="dropdown-menu w-100 custom-dropdown-menu">
                            <?php foreach ($stops as $stop): ?>
                                <li><a class="dropdown-item location-item" href="#" data-target="dropoffLocation" data-value="<?php echo (int)$stop['stop_id']; ?>"><?php echo htmlspecialchars($stop['location_name']); ?></a></li>
                            <?php endforeach; ?>
                        </ul>
                        <input type="hidden" id="dropoffLocation" value="">
                    </div>
                </div>
            </div>

            <div class="discount-container">
                <div class="dropdown custom-dropdown" style="width: auto;">
                    <button class="custom-btn-toggle discount-btn" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                        <span class="selection-text">Regular</span>
                        <i class="fas fa-chevron-down input-icon"></i>
                    </button>
                    <ul class="dropdown-menu custom-dropdown-menu text-center">
                        <li><a class="dropdown-item discount-item" href="#" data-value="regular">Regular</a></li>
                        <li><a class="dropdown-item discount-item" href="#" data-value="discounted">Student</a></li>
                        <li><a class="dropdown-item discount-item" href="#" data-value="discounted">Senior Citizen</a></li>
                        <li><a class="dropdown-item discount-item" href="#" data-value="discounted">PWD</a></li>
                    </ul>
                    <input type="hidden" id="discountType" value="regular">
                </div>
            </div>

            <div id="errorMessage" class="error-message"></div>

            <div class="price-display">
                <span class="peso-sign">Php</span>
                <span id="fareAmount">0.00</span>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>

    <script>
        // Logic to make the custom dropdowns behave like standard <select> tags
        document.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Find elements within the clicked dropdown's wrapper
                const dropdown = this.closest('.custom-dropdown');
                const btnText = dropdown.querySelector('.selection-text');
                const hiddenInput = dropdown.querySelector('input[type="hidden"]');
                const btn = dropdown.querySelector('.custom-btn-toggle');
                
                // Update the visible text and the hidden value
                btnText.textContent = this.textContent;
                hiddenInput.value = this.getAttribute('data-value');
                
                // Darken text to show it has been selected
                btn.style.color = '#1f2937';
                
                // Trigger the fare calculation
                calculateFare();
            });
        });

        // Fare Calculation Logic
        const fareDisplay = document.getElementById('fareAmount');
        const errorMessage = document.getElementById('errorMessage');

        async function calculateFare() {
            const pickup = document.getElementById('pickupLocation').value;
            const dropoff = document.getElementById('dropoffLocation').value;
            const fareType = document.getElementById('discountType').value;

            errorMessage.textContent = '';

            if (!pickup || !dropoff) {
                fareDisplay.textContent = '0.00';
                return;
            }

            if (pickup === dropoff) {
                errorMessage.textContent = 'Pick-up and drop-off cannot be the same';
                fareDisplay.textContent = '0.00';
                return;
            }

            try {
                const response = await fetch('getFare.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ origin: pickup, destination: dropoff, fareType })
                });

                if (!response.ok) throw new Error('Network response was not ok');

                const data = await response.json();

                if (data.success) {
                    fareDisplay.textContent = Number.parseFloat(data.fare).toFixed(2);
                } else {
                    errorMessage.textContent = data.message || 'No route found for this combination';
                    fareDisplay.textContent = '0.00';
                }
            } catch (error) {
                console.error('Error calculating fare:', error);
                errorMessage.textContent = 'Error calculating fare. Please try again.';
                fareDisplay.textContent = '0.00';
            }
        }
    </script>
</body>

</html>