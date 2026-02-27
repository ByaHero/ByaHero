<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Database connection - adjust path based on your structure
require_once __DIR__ . '/../../../config/db_connection.php';

// Load stops
try {
    // If your db_connection.php already creates $pdo, you can remove this block.
    // Keeping it here to match your current setup.
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
 * - pageType/pageTitle controls what it renders on top
 * - backLink controls the back button target
 * - pageDepth controls asset/link prefixes inside the component
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
            --bs-blue-border: #2196f3;
            --bs-bg-light: #f3f4f6;
        }

        body {
            font-family: "Segoe UI", sans-serif;
            background-color: #fff;
            /* Top bar in navbarPassenger.php is position-absolute; give space so content doesn't hide behind it */
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
            border: 1px solid var(--bs-primary);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .route-name {
            font-size: 1.1rem;
            color: #1f2937;
            font-weight: 500;
        }

        .route-time {
            font-weight: 700;
            font-size: 0.9rem;
            color: #000;
        }

        /* FARE CHECK CONTAINER */
        .content-sheet {
            background-color: #eff1f5;
            border-top-left-radius: 25px;
            border-top-right-radius: 25px;
            padding: 25px 20px 80px 20px;
            margin-top: 25px;
            min-height: calc(100vh - 300px);
        }

        /* Custom Select Fields */
        .custom-input-group {
            background-color: white;
            border-radius: 12px;
            padding: 8px 15px;
            display: flex;
            align-items: center;
            margin-bottom: 15px;
            position: relative;
        }

        .custom-input-group select {
            border: none;
            box-shadow: none;
            padding-left: 5px;
            padding-right: 25px;
            font-size: 0.85rem;
            color: #374151;
            width: 100%;
            background: transparent;
            cursor: pointer;
            appearance: none;
            -webkit-appearance: none;
            -moz-appearance: none;
        }

        .custom-input-group select:focus {
            outline: none;
        }

        .input-icon {
            font-size: 1.1rem;
            color: #000;
            pointer-events: none;
            position: absolute;
            right: 15px;
        }

        /* Discount Dropdown */
        .discount-select-container {
            display: flex;
            justify-content: center;
            margin-top: 10px;
        }

        .form-select.custom-select {
            border-radius: 25px;
            border: none;
            padding: 10px 35px 10px 20px;
            width: auto;
            color: var(--bs-primary);
            font-weight: 600;
            font-size: 0.9rem;
            text-align: center;
            background-color: white;
        }

        /* Price Display */
        .price-display {
            color: var(--bs-primary) !important;
            font-weight: 900 !important;
            text-align: center !important;
            margin-top: 30px !important;
            display: flex !important;
            align-items: baseline !important;
            justify-content: center !important;
            letter-spacing: -2px !important;
            gap: 10px !important;
        }

        .price-display .peso-sign,
        .price-display .fare-amount,
        .price-display #fareAmount {
            font-size: 5.5rem !important;
            line-height: 0.95 !important;
            font-weight: 900 !important;
            display: inline-block !important;
        }

        .error-message {
            color: #dc3545;
            font-size: 0.85rem;
            text-align: center;
            margin-top: 10px;
            font-weight: 500;
        }
    </style>
</head>

<body>

    <!-- TOP + BOTTOM NAVBARS (from navbarPassenger.php) -->
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
                    <div class="custom-input-group">
                        <select id="pickupLocation">
                            <option value="">Pick up Location</option>
                            <?php foreach ($stops as $stop): ?>
                                <option value="<?php echo (int)$stop['stop_id']; ?>">
                                    <?php echo htmlspecialchars($stop['location_name']); ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                        <i class="fas fa-chevron-down input-icon"></i>
                    </div>
                </div>

                <div class="col-6 ps-2">
                    <div class="custom-input-group">
                        <select id="dropoffLocation">
                            <option value="">Drop off Location</option>
                            <?php foreach ($stops as $stop): ?>
                                <option value="<?php echo (int)$stop['stop_id']; ?>">
                                    <?php echo htmlspecialchars($stop['location_name']); ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                        <i class="fas fa-chevron-down input-icon"></i>
                    </div>
                </div>
            </div>

            <div class="discount-select-container">
                <select class="form-select custom-select" id="discountType" aria-label="Select Discount">
                    <option value="regular" selected>Regular</option>
                    <option value="discounted">Student</option>
                    <option value="discounted">Senior Citizen</option>
                    <option value="discounted">PWD</option>
                </select>
            </div>

            <div id="errorMessage" class="error-message"></div>

            <div class="price-display">
                <span class="peso-sign">Php</span>
                <span id="fareAmount" class="fare-amount">0.00</span>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>

    <script>
        const pickupSelect = document.getElementById('pickupLocation');
        const dropoffSelect = document.getElementById('dropoffLocation');
        const discountSelect = document.getElementById('discountType');
        const fareDisplay = document.getElementById('fareAmount');
        const errorMessage = document.getElementById('errorMessage');

        pickupSelect.addEventListener('change', calculateFare);
        dropoffSelect.addEventListener('change', calculateFare);
        discountSelect.addEventListener('change', calculateFare);

        async function calculateFare() {
            const pickup = pickupSelect.value;
            const dropoff = dropoffSelect.value;
            const fareType = discountSelect.value;

            errorMessage.textContent = '';

            if (!pickup || !dropoff) {
                fareDisplay.textContent = '0.00';
                return;
            }

            if (pickup === dropoff) {
                errorMessage.textContent = 'Pick-up and drop-off cannot be the same location';
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