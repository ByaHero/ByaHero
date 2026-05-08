<?php
require_once __DIR__ . '/../auth_passenger.php';

// Use PDO-only connection helper
require_once __DIR__ . '/../../../config/db.php';

try {
    $conn = db();

    $result = $conn->query("SELECT stop_id, location_name FROM bus_stops ORDER BY km_marker ASC");
    $stops = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
} catch (Throwable $e) {
    $stops = [];
    error_log("Database error: " . $e->getMessage());
}

/**
 * Navbar configuration for navbarPassenger.php (TOP BAR)
 */
$pageDepth = '../../../';
$pageTitle = 'Bus Information';
$backLink = 'javascript:history.back()';
?>
<!doctype html>
<html lang="en">

<head>
    <meta charset="utf-8" />
    <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <title>Bus Information - ByaHero</title>

    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0&display=swap" rel="stylesheet" media="print" onload="this.media='all'" />
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

    <style>
        body {
            font-family: "Segoe UI", sans-serif;
            padding-top: 55px;
            padding-bottom: 80px;
        }

        .text-primary { color: #1d4ed8 !important; }
        .shadow-sm { box-shadow: none !important; }
        .border { border-color: #e2e8f0 !important; }
        .btn-custom-toggle { border: 1px solid #e2e8f0 !important; }

        #fareAmount.fare-text {
            font-weight: 900 !important;
            font-size: clamp(3rem, 12vw, 4.5rem) !important;
            line-height: 1 !important;
        }

        .transition-icon {
            transition: transform 0.3s ease, color 0.3s ease;
        }

        .btn-custom-toggle[aria-expanded="true"] {
            background-color: var(--bs-primary-bg-subtle) !important;
            border-color: var(--bs-primary) !important;
            color: var(--bs-primary) !important;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(13, 71, 161, 0.15) !important;
        }

        .btn-custom-toggle[aria-expanded="true"] .transition-icon {
            transform: rotate(180deg);
            color: var(--bs-primary) !important;
        }

        .dropdown-menu-custom {
            max-height: 250px;
            overflow-y: auto;
        }

        .dropdown-item-custom:hover,
        .dropdown-item-custom:focus {
            background-color: var(--bs-primary-bg-subtle);
            color: var(--bs-primary);
        }
    </style>
</head>

<body class="bg-white">

    <?php include __DIR__ . "/../../../components/navbarPassenger.php"; ?>

    <div class="container px-4">
        <h4 class="text-primary fw-bold mt-4 mb-3 fs-5 ps-1">Bus Operation Schedule</h4>

        <?php
        // NEW: Read schedule from DB (bus_schedule)
        try {
            $resSched = $conn->query("
                SELECT terminal_name, time_open, time_close, is_suspended, suspend_message
                FROM bus_schedule
                ORDER BY terminal_name ASC
            ");
            $schedules = $resSched ? $resSched->fetch_all(MYSQLI_ASSOC) : [];
        } catch (Throwable $e) {
            $schedules = [];
            error_log("Schedule load error: " . $e->getMessage());
        }
        ?>

        <?php if (empty($schedules)): ?>
            <div class="bg-white rounded-4 p-3 mb-3 border shadow-sm text-center text-muted">
                No schedule posted yet.
            </div>
        <?php else: ?>
            <?php foreach ($schedules as $row): ?>
                <?php
                $isSusp = (int)($row['is_suspended'] ?? 0) === 1;

                $open = !empty($row['time_open']) ? date('g:i a', strtotime((string)$row['time_open'])) : '';
                $close = !empty($row['time_close']) ? date('g:i a', strtotime((string)$row['time_close'])) : '';
                $timeText = ($open && $close) ? "{$open} - {$close}" : 'Schedule not set';

                $msg = trim((string)($row['suspend_message'] ?? ''));
                ?>
                <div class="bg-white rounded-4 p-3 mb-3 border shadow-sm d-flex justify-content-between align-items-center">
                    <div>
                        <span class="fs-6 text-primary fw-semibold"><?= htmlspecialchars((string)$row['terminal_name']) ?></span>
                        <?php if ($isSusp): ?>
                            <div class="small text-danger fw-bold">
                                SUSPENDED<?= $msg ? ': ' . htmlspecialchars($msg) : '' ?>
                            </div>
                        <?php endif; ?>
                    </div>

                    <span class="fw-bold small <?= $isSusp ? 'text-danger' : 'text-secondary' ?>">
                        <?= $isSusp ? 'No Operations' : htmlspecialchars($timeText) ?>
                    </span>
                </div>
            <?php endforeach; ?>
        <?php endif; ?>

        <h4 class="text-primary fw-bold mt-4 mb-3 fs-5 ps-1">Bus Fare Check</h4>

        <div class="row g-2 mb-3">

                <div class="col-6">
                    <div class="dropdown w-100">
                        <button
                            class="btn btn-custom-toggle bg-white border border-2 rounded-4 p-3 w-100 text-start d-flex justify-content-between align-items-center text-secondary fw-medium shadow-sm transition-all"
                            type="button" data-bs-toggle="dropdown" aria-expanded="false">
                            <span class="selection-text text-truncate">Pick up</span>
                            <i class="fas fa-chevron-down text-secondary transition-icon ms-2"></i>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-custom w-100 border-0 shadow-lg rounded-4 p-2 mt-1">
                            <?php foreach ($stops as $stop): ?>
                                <li>
                                    <a class="dropdown-item dropdown-item-custom rounded-3 py-2 px-3 fw-medium text-dark transition-all"
                                        href="#"
                                        data-target="pickupLocation"
                                        data-value="<?php echo (int) $stop['stop_id']; ?>">
                                        <?php echo htmlspecialchars($stop['location_name']); ?>
                                    </a>
                                </li>
                            <?php endforeach; ?>
                        </ul>
                        <input type="hidden" id="pickupLocation" value="">
                    </div>
                </div>

                <div class="col-6">
                    <div class="dropdown w-100">
                        <button
                            class="btn btn-custom-toggle bg-white border border-2 rounded-4 p-3 w-100 text-start d-flex justify-content-between align-items-center text-secondary fw-medium shadow-sm transition-all"
                            type="button" data-bs-toggle="dropdown" aria-expanded="false">
                            <span class="selection-text text-truncate">Drop off</span>
                            <i class="fas fa-chevron-down text-secondary transition-icon ms-2"></i>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-custom w-100 border-0 shadow-lg rounded-4 p-2 mt-1">
                            <?php foreach ($stops as $stop): ?>
                                <li>
                                    <a class="dropdown-item dropdown-item-custom rounded-3 py-2 px-3 fw-medium text-dark transition-all"
                                        href="#"
                                        data-target="dropoffLocation"
                                        data-value="<?php echo (int) $stop['stop_id']; ?>">
                                        <?php echo htmlspecialchars($stop['location_name']); ?>
                                    </a>
                                </li>
                            <?php endforeach; ?>
                        </ul>
                        <input type="hidden" id="dropoffLocation" value="">
                    </div>
                </div>
            </div>

            <div class="d-flex justify-content-center mt-2">
                <div class="dropdown">
                    <button
                        class="btn btn-custom-toggle bg-white border border-2 rounded-pill py-2 px-4 d-flex align-items-center justify-content-center gap-2 text-secondary fw-medium shadow-sm transition-all"
                        style="min-width: 160px;" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                        <span class="selection-text">Regular</span>
                        <i class="fas fa-chevron-down text-secondary transition-icon"></i>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-custom border-0 shadow-lg rounded-4 p-2 mt-1 text-center">
                        <li><a class="dropdown-item dropdown-item-custom rounded-3 py-2 px-3 fw-medium text-dark transition-all"
                                href="#" data-value="regular">Regular</a></li>
                        <li><a class="dropdown-item dropdown-item-custom rounded-3 py-2 px-3 fw-medium text-dark transition-all"
                                href="#" data-value="discounted">Student</a></li>
                        <li><a class="dropdown-item dropdown-item-custom rounded-3 py-2 px-3 fw-medium text-dark transition-all"
                                href="#" data-value="discounted">Senior Citizen</a></li>
                        <li><a class="dropdown-item dropdown-item-custom rounded-3 py-2 px-3 fw-medium text-dark transition-all"
                                href="#" data-value="discounted">PWD</a></li>
                    </ul>
                    <input type="hidden" id="discountType" value="regular">
                </div>
            </div>

            <div id="errorMessage" class="text-danger small text-center mt-3 fw-medium" style="min-height: 20px;"></div>

            <div class="text-primary text-center mt-4 pb-5 d-flex align-items-baseline justify-content-center gap-2">
                <span class="fs-1 fw-bold lh-1" style="font-size: clamp(3rem, 12vw, 4.5rem) !important;">Php</span>
                <span id="fareAmount" class="fare-text fw-bolder">0.00</span>
            </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>

    <script>
        document.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', function (e) {
                e.preventDefault();

                const dropdown = this.closest('.dropdown');
                const btnText = dropdown.querySelector('.selection-text');
                const hiddenInput = dropdown.querySelector('input[type="hidden"]');
                const btn = dropdown.querySelector('.btn-custom-toggle');

                btnText.textContent = this.textContent;
                hiddenInput.value = this.getAttribute('data-value');

                btn.classList.remove('text-secondary');
                btn.classList.add('text-dark');

                calculateFare();
            });
        });

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