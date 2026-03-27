<?php
// The exact order of the ByaHero guide images
$guideSteps = [
    "WELCOME.svg",
    "BUS LOC.svg",
    "CIRCLE.svg",
    "FILTER ROUTES.svg",
    "FILTER ROUTES-1.svg",
    "PICKUP PNTS.svg",
    "BUS INFO.svg",
    "SOS.svg",
    "LOCATION.svg",
    "HOMEPAGE.svg",
    "HOMEPAGE-1.svg",
    "NOTIFICATION.svg",
    "DONE.svg"
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
            touch-action: pan-y; /* Prevents browser from doing weird things on horizontal swipe */
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
        .image-wrapper {
            position: relative;
            width: 100%;
            aspect-ratio: 9 / 19; 
            background-color: #f8f9fa;
            /* Cursor to indicate it's draggable/swipeable on desktop testing */
            cursor: grab; 
        }
        .image-wrapper:active {
            cursor: grabbing;
        }
        .guide-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
            position: absolute;
            top: 0;
            left: 0;
            opacity: 0;
            transition: opacity 0.3s ease-in-out; /* Smooth fade effect */
            z-index: 1;
            user-select: none; /* Prevent accidental image highlighting */
            pointer-events: none; /* Let the wrapper handle the touch events */
        }
        .guide-image.active {
            opacity: 1;
            z-index: 2;
        }
        .controls {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 20px;
            background: #ffffff;
            border-top: 1px solid #dee2e6;
            z-index: 10;
        }
        .step-indicator {
            font-size: 0.9rem;
            color: #6c757d;
            font-weight: 500;
        }
        .swipe-hint {
            position: absolute;
            top: 20px;
            width: 100%;
            text-align: center;
            color: #fff;
            background: rgba(0,0,0,0.5);
            padding: 5px 0;
            font-size: 0.8rem;
            z-index: 10;
            animation: fadeOut 3s forwards;
            pointer-events: none;
        }
        @keyframes fadeOut {
            0% { opacity: 1; }
            70% { opacity: 1; }
            100% { opacity: 0; display: none; }
        }
    </style>
</head>
<body>

    <div class="guide-container">
        <div class="swipe-hint" id="swipeHint">Swipe left to continue</div>

        <div class="image-wrapper" id="imageContainer">
            </div>

        <div class="controls">
            <span class="step-indicator" id="stepCounter"></span>
            <button class="btn btn-outline-secondary btn-sm" id="actionBtn" onclick="finishGuide()">Skip Tour</button>
        </div>
    </div>

    <script>
        // Load the array of filenames from PHP
        const steps = <?php echo $stepsJson; ?>;
        let currentStep = 0;
        
        // Setup the DOM elements
        const imageContainer = document.getElementById('imageContainer');
        const stepCounter = document.getElementById('stepCounter');
        const actionBtn = document.getElementById('actionBtn');

        // Preload and create image elements using your corrected path
        steps.forEach((src, index) => {
            let img = document.createElement('img');
            img.src = '../../../assets/guide/' + src; 
            img.className = 'guide-image';
            img.id = 'step-' + index;
            if (index === 0) img.classList.add('active');
            imageContainer.appendChild(img);
        });

        // Initialize the counter
        updateUI();

        // --- SWIPE LOGIC ---
        let touchstartX = 0;
        let touchendX = 0;
        const swipeThreshold = 50; // Minimum pixels to drag to register a swipe

        // Listen for touch start
        imageContainer.addEventListener('touchstart', function(event) {
            touchstartX = event.changedTouches[0].screenX;
        }, {passive: true});

        // Listen for touch end
        imageContainer.addEventListener('touchend', function(event) {
            touchendX = event.changedTouches[0].screenX;
            handleSwipe();
        }, {passive: true});

        // Logic to determine swipe direction
        function handleSwipe() {
            let difference = touchstartX - touchendX;
            
            if (difference > swipeThreshold) {
                // Swiped Left (Go to Next)
                if (currentStep < steps.length - 1) {
                    changeStep(1);
                }
            } else if (difference < -swipeThreshold) {
                // Swiped Right (Go to Previous)
                if (currentStep > 0) {
                    changeStep(-1);
                }
            }
        }

        // Mouse events for testing on desktop (Click and Drag)
        let isDragging = false;
        imageContainer.addEventListener('mousedown', function(event) {
            isDragging = true;
            touchstartX = event.screenX;
        });
        window.addEventListener('mouseup', function(event) {
            if (isDragging) {
                touchendX = event.screenX;
                handleSwipe();
                isDragging = false;
            }
        });

        // --- UI UPDATE LOGIC ---
        function changeStep(direction) {
            // Fade out current image
            document.getElementById('step-' + currentStep).classList.remove('active');
            
            // Update step index
            currentStep += direction;

            // Fade in new image
            document.getElementById('step-' + currentStep).classList.add('active');

            // Update counter and button
            updateUI();
            
            // Hide the hint if they figured out how to swipe
            document.getElementById('swipeHint').style.display = 'none';
        }

        function updateUI() {
            stepCounter.innerText = `Step ${currentStep + 1} of ${steps.length}`;
            
            // Change the button on the very last slide
            if (currentStep === steps.length - 1) {
                actionBtn.innerText = "Get Started!";
                actionBtn.classList.replace('btn-outline-secondary', 'btn-primary');
            } else {
                actionBtn.innerText = "Skip Tour";
                actionBtn.classList.replace('btn-primary', 'btn-outline-secondary');
            }
        }

        // Final redirect function
        function finishGuide() {
            // Sends the user back to the main passenger index
            window.location.href = '../index.php'; 
        }
    </script>
</body>
</html>