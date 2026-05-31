<?php
require_once __DIR__ . '/../auth_passenger.php';

// Personalized Welcome Text
$userName = $_SESSION['user_name'] ?? ''; 
if (!empty($userName)) {
    // Escapes the name for security 
    $personalizedWelcome = "Welcome, " . htmlspecialchars($userName) . "!";
} else {
    $personalizedWelcome = "Welcome!";
}

// Set this once: 'png' or 'svg'
$imgExt = 'png';

// The exact order of the ByaHero guide images
$guideSteps = [
    "WELCOME.$imgExt", 
    "BUS LOC.$imgExt",
    "CIRCLE.$imgExt",
    "FILTER ROUTES.$imgExt",
    "FILTER ROUTES-1.$imgExt",
    "PICKUP PNTS.$imgExt",
    "BUS INFO.$imgExt",
    "SOS.$imgExt",
    "SOS-1.$imgExt",
    "LOCATION.$imgExt",
    "HOMEPAGE.$imgExt",
    "HOMEPAGE-1.$imgExt",
    "NOTIFICATION.$imgExt",
    "DONE.$imgExt"
];
// Convert the PHP array to a JSON format for JavaScript
$stepsJson = json_encode($guideSteps);
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <link rel="icon" href="../../../assets/images/byaheroLogoBlue.svg" type="image/svg+xml">
    <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ByaHero - App Guide</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body {
            background-color: #0c3e87;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            width: 100vw;
            overflow: hidden; /* prevents all scrolling */
            margin: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        /* Mobile phone simulation container */
        .guide-container {
            width: 100vw;
            max-width: 100vw; 
            height: 100%;
            background: #ffffff;
            position: relative;
            display: flex;
            flex-direction: column;
        }
        
        /* Top Navigation Bar */
        .top-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 6px 15px; /* Lessened thickness for bigger images */
            background: #0c3e87; /* ByaHero Dark Blue */
            border-bottom: none; 
            z-index: 10;
            color: white; 
        }
        
        .step-indicator {
            font-size: 0.8rem;
            color: white; 
            font-weight: 500;
        }

        /* Skip Guide Button (Updated) */
        .top-bar #skipBtn {
            background-color: #0c3e87 !important; /* Matches top bar blue */
            color: white !important; 
            border: 1px solid white !important; /* White border */
            border-radius: 4px;
            padding: 2px 10px;
            font-size: 0.75rem;
            transition: all 0.2s ease;
        }
        .top-bar #skipBtn:hover {
            background-color: white !important;
            color: #0c3e87 !important; 
        }

        /* Image Wrapper */
        .image-wrapper {
            position: relative;
            width: 100%;
            flex: 1; /* fills remaining space */
            background-color: #ffffff;
            overflow: hidden;
        }
        .guide-image {
            width: 100%;
            height: 100%;
            object-fit: fill; /* Stretches to completely eliminate all margins */
            position: absolute;
            top: 0;
            left: 0;
            opacity: 0;
            transition: opacity 0.3s ease-in-out; 
            z-index: 1;
            user-select: none; 
            pointer-events: none; 
        }
        .guide-image.active {
            opacity: 1;
            z-index: 2;
        }

        /* Side Navigation Arrows */
        .nav-arrow {
            position: absolute;
            top: 42%; 
            transform: translateY(-50%);
            width: 45px;
            height: 45px;
            background-color: rgba(255, 255, 255, 0.9);
            border: none;
            border-radius: 50%;
            font-size: 20px;
            color: #333;
            box-shadow: 0 4px 10px rgba(0,0,0,0.15);
            z-index: 15;
            cursor: pointer;
            display: flex;
            justify-content: center;
            align-items: center;
            transition: background 0.2s;
        }
        .nav-arrow:hover { background-color: #f1f1f1; }
        .left-arrow { left: 15px; }
        .right-arrow { right: 15px; }

        /* Custom Overlay Containers */
        .overlay-container {
            position: absolute;
            left: 0;
            width: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 20;
        }
        
        /* Welcome Slide Overlay (Absolute Positioning for perfect spacing) */
        #startOverlay { 
            top: 0; left: 0; width: 100%; height: 100%;
            pointer-events: none; /* Let clicks pass through empty space */
        } 
        #startOverlay > * {
            pointer-events: auto; /* Make button clickable */
        }
        
        .personalized-welcome {
            position: absolute;
            top: 60%; /* Locked perfectly above the text */
            left: 50%;
            transform: translateX(-50%);
            font-size: 1.6rem;
            color: #1a4f9c; 
        .personalized-welcome {
            position: absolute;
            top: 60%; /* Locked perfectly above the text */
            left: 50%;
            transform: translateX(-50%);
            font-size: 1.6rem;
            color: #1a4f9c; 
            font-weight: 700;
            text-align: center;
            width: 90%;
            display: block; /* Visible immediately */
        }

        .btn-start {
            position: absolute;
            bottom: 4%; /* Pushed safely to the bottom */
            left: 50%;
            transform: translateX(-50%);
            background-color: #1e4b9b; 
            color: white;
            width: 75%;
            padding: 14px;
            border-radius: 30px;
            border: none;
            font-size: 1.3rem;
            font-weight: bold;
            box-shadow: 0 4px 10px rgba(30, 75, 155, 0.3);
            text-decoration: none;
            text-align: center;
        }
    </style>
</head>
<body>

    <div class="guide-container">
        
        <div class="top-bar">
            <span class="step-indicator">ByaHero Commuter Tour</span>
            <button class="btn btn-outline-secondary btn-sm" id="skipBtn" onclick="finishGuide()">Skip Guide</button>
        </div>

        <div class="image-wrapper" id="imageContainer">
            <!-- Welcome Slide Background Cover (Clean fallback image or background color) -->
            <img src="../../../assets/images/icons/USER GUIDE.svg" style="width: 50%; height: auto; position: absolute; top: 20%; left: 50%; transform: translateX(-50%); opacity: 0.85; pointer-events: none;" alt="ByaHero Logo" />

            <div class="overlay-container" id="startOverlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;">
                <div class="personalized-welcome" id="welcomeMessage"><?php echo $personalizedWelcome; ?></div>
                <a href="../index.php?start_tour=true" class="btn-start">Start Tour</a>
            </div>
        </div>

    </div>

    <script>
        function finishGuide() {
            window.location.href = '../index.php'; 
        }
    </script>
</body>
</html>