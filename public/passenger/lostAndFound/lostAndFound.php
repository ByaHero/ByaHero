<?php
require_once __DIR__ . '/../auth_passenger.php';

$pageDepth = '../../../';
$pageType = 'settings';
$pageTitle = 'Lost and Found';
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
    <title>Lost and Found - ByaHero</title>
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0&display=swap"  media="print" onload="this.media='all'"/>
</head>
<body class="bg-light">
    <?php include '../../../components/navbarPassenger.php'; ?>

    <style>
        .custom-form-border {
            border: 1px solid var(--bs-primary) !important;
            box-shadow: none !important;
        }
        .btn-custom-toggle {
            background-color: #adb5bd !important; /* Bootstrap gray-500 */
            color: white !important;
            border: none;
            font-weight: bold;
            font-size: 1.1rem;
            transition: all 0.2s ease;
        }
        .btn-check:checked + .btn-custom-toggle {
            background-color: var(--bs-primary) !important;
            color: white !important;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
    </style>

    <div class="container mt-4 pt-5 pb-5 mb-5 text-center px-4">
        <div class="d-flex justify-content-end mb-4 pt-1">
            <a href="myReports.php" class="btn btn-outline-primary rounded-pill fw-bold py-1 px-3 shadow-sm d-flex align-items-center gap-1" style="font-size: 0.85rem; border-width: 2px;">
                <span class="material-symbols-rounded" style="font-size: 16px;">receipt_long</span>
                Check Status
            </a>
        </div>
        
        <form id="lostFoundForm" action="lostAndFoundDone.php" method="POST" enctype="multipart/form-data">
            
            <!-- Type Selector -->
            <div class="d-flex justify-content-between mb-4 mt-2">
                <input type="radio" class="btn-check" name="itemType" id="btn-lost" value="lost" checked onchange="updateLabels()">
                <label class="btn btn-custom-toggle rounded-pill py-2" for="btn-lost" style="width: 45%;">Lost</label>
 
                <input type="radio" class="btn-check" name="itemType" id="btn-found" value="found" onchange="updateLabels()">
                <label class="btn btn-custom-toggle rounded-pill py-2" for="btn-found" style="width: 45%;">Found</label>
            </div>
 
            <!-- Description -->
            <div class="mb-3 text-start">
                <label for="itemDescription" id="descLabel" class="form-label fw-bold text-primary" style="font-size: 0.95rem;">Describe the item you lost?</label>
                <textarea class="form-control rounded-4 custom-form-border" id="itemDescription" name="description" rows="5" required></textarea>
            </div>
 
            <!-- Image Upload -->
            <div class="mb-3 text-start">
                <label class="form-label fw-bold text-primary" style="font-size: 0.95rem;">Upload Item Photo</label>
                <div class="rounded-4 custom-form-border d-flex align-items-center justify-content-center flex-column bg-white shadow-sm overflow-hidden" 
                     onclick="document.getElementById('imageUpload').click()" 
                     style="height: 120px; cursor: pointer; position: relative;">
                     
                    <img src="../../../assets/images/upload photo.svg" id="uploadIcon" alt="Upload Icon" style="width: 3.5rem; height: auto; margin-bottom: 5px;">
                    <small class="text-muted mt-1 fw-semibold" id="fileCountText">Up to 2 photos</small>
                </div>
                <div class="text-center mt-3">
                    <button type="button" id="clearPhotosBtn" class="btn btn-outline-primary rounded-pill px-4 shadow-sm fw-bold" style="display: none; font-size: 0.85rem; border-width: 2px;" onclick="clearPhotos(event)">Clear Photos</button>
                </div>
                <input type="file" id="imageUpload" name="images[]" accept="image/*" multiple class="d-none" onchange="updateFileCount(this)">
            </div>
 
            <!-- Bus Number -->
            <div class="mb-5 text-start">
                <label for="busNumber" id="busLabel" class="form-label fw-bold text-primary" style="font-size: 0.95rem;">Last Bus lost (optional)</label>
                <input type="text" class="form-control rounded-pill custom-form-border px-3 py-2" id="busNumber" name="bus_number">
            </div>
 
            <!-- Submit Button -->
            <button type="submit" class="btn btn-primary rounded-pill fw-bold shadow mt-2" style="padding-left: 50px; padding-right: 50px; padding-top: 10px; padding-bottom: 10px;">Save</button>
        </form>
    </div>
 
    <!-- UI Logic Script -->
    <script>
        function updateLabels() {
            const isLost = document.getElementById('btn-lost').checked;
            const descLabel = document.getElementById('descLabel');
            const busLabel = document.getElementById('busLabel');
            
            if (isLost) {
                descLabel.innerText = "Describe the item you lost?";
                busLabel.innerText = "Last Bus lost (optional)";
            } else {
                descLabel.innerText = "Describe the item you found?";
                busLabel.innerText = "Last Bus found (optional)";
            }
        }
 
        const dt = new DataTransfer();
 
        function updateFileCount(input) {
            const fileCountText = document.getElementById('fileCountText');
            const clearBtn = document.getElementById('clearPhotosBtn');
            
            // Append newly selected files to our DataTransfer object securely
            if (input.files && input.files.length > 0) {
                for (let i = 0; i < input.files.length; i++) {
                    if (dt.items.length < 2) {
                        dt.items.add(input.files[i]);
                    } else {
                        alert("You can only upload a maximum of 2 photos.");
                        break;
                    }
                }
            }
            
            // Override the native input filelist with our cumulative list
            input.files = dt.files;
            let numFiles = input.files.length;
            
            if (numFiles > 0) {
                fileCountText.innerText = numFiles + (numFiles === 1 ? " photo selected" : " photos selected");
                fileCountText.classList.remove('text-muted');
                fileCountText.style.color = "#198754"; // Bootstrap success green
                clearBtn.style.display = 'inline-block';
            } else {
                fileCountText.innerText = "Up to 2 photos";
                fileCountText.classList.add('text-muted');
                fileCountText.style.color = "";
                clearBtn.style.display = 'none';
            }
        }
 
        function clearPhotos(e) {
            e.preventDefault();
            dt.items.clear();
            const input = document.getElementById('imageUpload');
            input.files = dt.files; // apply empty list to DOM payload
            updateFileCount(input);
        }
    </script>
 
    <!-- Bootstrap Bundle with Popper -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
