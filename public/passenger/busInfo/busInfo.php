<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
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
            padding-bottom: 80px; 
        }

        /* HEADER (Matched to profile.php) */
        .profile-header {
            background-color: var(--bs-primary);
            color: white;
            padding: 15px 20px;
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .header-title {
            font-size: 1.1rem;
            margin: 0;
            font-weight: 500;
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

        /* FARE CHECK CONTAINER (Matches content-sheet from profile.php) */
        .content-sheet {
            background-color: #eff1f5;
            border-top-left-radius: 25px;
            border-top-right-radius: 25px;
            padding: 25px 20px 80px 20px;
            margin-top: 25px;
            min-height: calc(100vh - 300px);
        }

        /* Custom Input Fields */
        .custom-input-group {
            background-color: white;
            border-radius: 12px;
            padding: 8px 15px;
            display: flex;
            align-items: center;
            margin-bottom: 15px;
        }
        
        .custom-input-group input {
            border: none;
            box-shadow: none;
            padding-left: 5px;
            font-size: 0.85rem;
            color: #374151; 
            width: 100%;
            background: transparent;
        }
        
        .custom-input-group input:focus {
            outline: none;
        }

        .input-icon {
            font-size: 1.1rem;
            color: #000;
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
        }

        /* Price Display */
        .price-display {
            color: var(--bs-primary);
            font-size: 5rem;
            font-weight: 800;
            text-align: center;
            margin-top: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            letter-spacing: -2px;
        }
        
        .peso-sign {
            font-size: 4rem;
            margin-right: 5px;
        }
    </style>
</head>

<body>

    <div class="profile-header">
        <span class="material-symbols-rounded" style="cursor: pointer; font-size: 28px;" onclick="history.back()">close</span>
        <h1 class="header-title">Bus Information</h1>
    </div>

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
                        <input type="text" placeholder="Pick up Location">
                        <i class="fas fa-search input-icon"></i>
                    </div>
                </div>
                <div class="col-6 ps-2">
                    <div class="custom-input-group">
                        <input type="text" placeholder="Drop off Location">
                        <i class="fas fa-search input-icon"></i>
                    </div>
                </div>
            </div>

            <div class="discount-select-container">
                <select class="form-select custom-select" aria-label="Select Discount">
                    <option selected>Select Discount</option>
                    <option value="1">Student</option>
                    <option value="2">Senior Citizen</option>
                    <option value="3">PWD</option>
                </select>
            </div>

            <div class="price-display">
                <span class="peso-sign">Php</span>
                <span id="fareAmount" class="fare-amount">0.00</span>
            </div>
        </div>
    </div>

    <div class="fixed-bottom" style="z-index: 1050;">
        <?php include __DIR__ . "/../../../components/navbarPassenger.php"; ?>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>