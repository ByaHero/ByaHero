<?php
// START SESSION to access user name
session_start();

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
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ByaHero - App Guide</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body {
            background-color: #e9ecef;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        /* Mobile phone simulation container */
        .guide-container {
            width: 100%;
            max-width: 414px; 
            background: #ffffff;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.15);
            position: relative;
            display: flex;
            flex-direction: column;
        }
        
        /* Top Navigation Bar */
        .top-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 20px;
            background: #0c3e87; /* ByaHero Dark Blue */
            border-bottom: none; 
            z-index: 10;
            color: white; 
        }
        
        .step-indicator {
            font-size: 0.9rem;
            color: white; 
            font-weight: 500;
        }

        /* Skip Guide Button (Updated) */
        .top-bar #skipBtn {
            background-color: #0c3e87 !important; /* Matches top bar blue */
            color: white !important; 
            border: 1px solid white !important; /* White border */
            border-radius: 5px;
            padding: 4px 12px;
            font-size: 0.85rem;
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
            aspect-ratio: 9 / 19; 
            background-color: #f8f9fa;
        }
        .guide-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
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
            font-weight: 700;
            text-align: center;
            width: 90%;
            display: none; /* Controlled by JS */
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
        }

        /* Done Slide Overlay */
        #doneOverlay { 
            top: 56%; 
            gap: 15px; 
            flex-direction: row; 
        } 
        .btn-back {
            background-color: #f8f9fa; 
            color: #1e293b; 
            padding: 11px 15px;
            border-radius: 30px;
            border: 1px solid #cbd5e1; 
            font-weight: 600;
            width: 120px;
            font-size: 0.95rem;
        }
        .btn-continue {
            background-color: #0c3e87; 
            color: white;
            padding: 11px 15px;
            border-radius: 30px;
            border: none;
            font-weight: 600;
            width: 120px;
            font-size: 0.95rem;
        }
    </style>
</head>
<body>

    <div class="guide-container">
        
        <div class="top-bar">
            <span class="step-indicator" id="stepCounter"></span>
            
            <div id="spacer" style="display:none; width: 50px;"></div> 
            
            <button class="btn btn-outline-secondary btn-sm" id="skipBtn" onclick="finishGuide()">Skip Guide</button>
        </div>

        <div class="image-wrapper" id="imageContainer">

            <button class="nav-arrow left-arrow" id="leftArrow" onclick="changeStep(-1)">&#10094;</button>
            <button class="nav-arrow right-arrow" id="rightArrow" onclick="changeStep(1)">&#10095;</button>

            <div class="overlay-container" id="startOverlay">
                <div class="personalized-welcome" id="welcomeMessage"><?php echo $personalizedWelcome; ?></div>
                <button class="btn-start" onclick="changeStep(1)">Start</button>
            </div>

            <div class="overlay-container" id="doneOverlay">
                <button class="btn-back" onclick="changeStep(-1)">Back</button>
                <button class="btn-continue" onclick="finishGuide()">Continue</button>
            </div>
        </div>

    </div>

    <script>
        const steps = <?php echo $stepsJson; ?>;
        let currentStep = 0;
        
        const imageContainer = document.getElementById('imageContainer');
        const stepCounter = document.getElementById('stepCounter');
        const spacer = document.getElementById('spacer');
        const welcomeMessage = document.getElementById('welcomeMessage');
        
        const leftArrow = document.getElementById('leftArrow');
        const rightArrow = document.getElementById('rightArrow');
        const startOverlay = document.getElementById('startOverlay');
        const doneOverlay = document.getElementById('doneOverlay');

        // Preload and create image elements
        steps.forEach((src, index) => {
            let img = document.createElement('img');
            img.src = '../../../assets/guide/' + src; 
            img.className = 'guide-image';
            img.id = 'step-' + index;
            if (index === 0) img.classList.add('active');
            imageContainer.insertBefore(img, leftArrow);
        });

        // Initialize the UI on load
        updateUI();

        // --- UI NAVIGATION & UPDATE LOGIC ---
        function changeStep(direction) {
            document.getElementById('step-' + currentStep).classList.remove('active');
            currentStep += direction;
            document.getElementById('step-' + currentStep).classList.add('active');
            updateUI();
        }

        function updateUI() {
            stepCounter.innerText = `Step ${currentStep + 1} of ${steps.length}`;
            
            // Logic for FIRST slide (Welcome)
            if (currentStep === 0) {
                stepCounter.style.display = 'none'; 
                spacer.style.display = 'block'; 
                welcomeMessage.style.display = 'block'; 

                startOverlay.style.display = 'block'; // Changed to block to allow absolute positioning
                doneOverlay.style.display = 'none';
                leftArrow.style.display = 'none';
                rightArrow.style.display = 'none';
            } 
            // Logic for LAST slide (Done)
            else if (currentStep === steps.length - 1) {
                stepCounter.style.display = 'inline'; 
                spacer.style.display = 'none';
                welcomeMessage.style.display = 'none';

                startOverlay.style.display = 'none';
                doneOverlay.style.display = 'flex';
                leftArrow.style.display = 'none';
                rightArrow.style.display = 'none';
            } 
            // Logic for MIDDLE slides (The Tour)
            else {
                stepCounter.style.display = 'inline'; 
                spacer.style.display = 'none';
                welcomeMessage.style.display = 'none';

                startOverlay.style.display = 'none';
                doneOverlay.style.display = 'none';
                leftArrow.style.display = 'flex';
                rightArrow.style.display = 'flex';
            }
        }

        function finishGuide() {
            window.location.href = '../index.php'; 
        }
    </script>
</body>
</html>