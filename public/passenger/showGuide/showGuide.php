<?php
require_once __DIR__ . '/../auth_passenger.php';

// Personalized Welcome Text
$userName = $_SESSION['user_name'] ?? ''; 
if (!empty($userName)) {
    // Splits name to show only first name for sleekness
    $firstName = explode(' ', $userName)[0];
    $personalizedWelcome = "Welcome, <span class='fw-extrabold' style='color: #0c2b5e;'>" . htmlspecialchars($firstName) . "</span>!";
} else {
    $personalizedWelcome = "Welcome, <span class='fw-extrabold' style='color: #0c2b5e;'>User</span>!";
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <link rel="icon" href="../../../assets/images/byaheroLogoBlue.svg" type="image/svg+xml">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Welcome to ByaHero</title>
    <!-- Premium Fonts & Bootstrap -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    
    <style>
        :root {
            --primary: #1e3a8a;
            --accent: #2563eb;
            --bg-card: #dbeafe; /* Custom soft blue background matching mockup */
            --text-title: #0c2b5e;
            --text-paragraph: #2e4a7d;
        }

        body {
            background-color: #0c3e87; /* Sleek dark blue desktop backdrop */
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            width: 100vw;
            overflow: hidden;
            margin: 0;
            font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
        }

        /* Mobile phone viewport simulator container */
        .guide-container {
            width: 100vw;
            max-width: 440px; /* Simulated device frame size */
            height: 100%;
            max-height: 880px;
            background: #ffffff;
            position: relative;
            display: flex;
            flex-direction: column;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
            overflow: hidden;
            border-radius: 40px; /* Sleek device roundness */
            border: 8px solid #000000; /* Simulated bezel */
        }

        @media (max-width: 480px) {
            .guide-container {
                border-radius: 0;
                border: none;
                max-height: 100%;
            }
        }

        /* Top half (White Logo Section) */
        .logo-section {
            flex: 1.1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            background-color: #ffffff;
            padding: 30px;
        }

        .logo-image {
            width: 85%;
            max-width: 250px;
            height: auto;
            object-fit: contain;
            margin-bottom: 5px;
            animation: floatLogo 3s ease-in-out infinite;
        }

        @keyframes floatLogo {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-8px); }
            100% { transform: translateY(0px); }
        }

        /* Curved Bottom Section (Soft Blue Welcome Panel) */
        .welcome-panel {
            flex: 1;
            background-color: var(--bg-card);
            border-top-left-radius: 42px;
            border-top-right-radius: 42px;
            padding: 35px 30px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: center;
            text-align: center;
            box-shadow: 0 -10px 25px -5px rgba(0, 0, 0, 0.05);
            position: relative;
            z-index: 5;
        }

        .welcome-panel::after {
            content: '';
            position: absolute;
            top: 15px;
            width: 48px;
            height: 5px;
            background: rgba(30, 58, 138, 0.15);
            border-radius: 99px;
        }

        .welcome-title {
            font-family: 'Outfit', sans-serif;
            color: var(--text-title);
            font-size: 1.85rem;
            font-weight: 600;
            margin-top: 10px;
            margin-bottom: 12px;
            letter-spacing: -0.5px;
            line-height: 1.2;
        }

        .welcome-title .fw-extrabold {
            font-weight: 800;
        }

        .welcome-text {
            color: var(--text-paragraph);
            font-size: 0.95rem;
            line-height: 1.6;
            margin-bottom: 25px;
            font-weight: 500;
            padding: 0 10px;
        }

        /* Action Buttons */
        .button-group {
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
        }

        .btn-start {
            background-color: #1a488e; /* Rich custom primary blue from mockup */
            color: #ffffff;
            font-family: 'Outfit', sans-serif;
            font-size: 1.35rem;
            font-weight: 700;
            padding: 12px 0;
            width: 65%;
            min-width: 200px;
            border-radius: 25px;
            border: none;
            box-shadow: 0 8px 20px rgba(26, 72, 142, 0.25);
            transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            text-decoration: none;
            text-align: center;
        }

        .btn-start:hover {
            background-color: #153a72;
            color: #ffffff;
            transform: translateY(-2px);
            box-shadow: 0 10px 24px rgba(26, 72, 142, 0.35);
        }

        .btn-start:active {
            transform: translateY(1px);
        }

        .btn-skip {
            color: #2563eb;
            font-size: 0.9rem;
            font-weight: 600;
            text-decoration: underline;
            background: none;
            border: none;
            padding: 5px 10px;
            transition: color 0.2s;
        }

        .btn-skip:hover {
            color: #1d4ed8;
        }
    </style>
</head>
<body>

    <div class="guide-container">
        
        <!-- Top Half - White Section centering custom Logo and Wordmark -->
        <div class="logo-section">
            <img src="../../../assets/images/Group_150.svg" alt="ByaHero Logo" class="logo-image">
        </div>

        <!-- Bottom Half - Beautiful Curved Soft Blue Welcoming Card -->
        <div class="welcome-panel">
            
            <div class="welcome-content">
                <h1 class="welcome-title"><?php echo $personalizedWelcome; ?></h1>
                <p class="welcome-text">
                    Welcome to ByaHero, your reliable bus tracking app. Track buses in real time, find pick-up points, and check fares for a safer and more convenient commute.
                </p>
            </div>

            <div class="button-group">
                <a href="../index.php?start_tour=true" class="btn-start">Start</a>
                <button class="btn-skip" onclick="location.href = '../index.php';">Skip</button>
            </div>
            
        </div>

    </div>

    <script>
        window.APP_BASE_URL = "../../../";
    </script>
    <script src="../../../assets/js/capacitor_firebase_bridge.js"></script>
    <script src="../../../assets/js/capacitor_back_button.js"></script>
</body>
</html>