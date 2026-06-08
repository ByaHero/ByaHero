<?php
require_once __DIR__ . '/../auth_passenger.php';

$pageDepth = '../../../';
$pageType = 'settings';
$pageTitle = 'Report a Problem';
$bus_number = $_GET['bus_number'] ?? '';

$busOptions = [];
if (empty($bus_number)) {
    $conn = db();
    $busesQuery = $conn->query("SELECT code FROM busses ORDER BY code ASC");
    if ($busesQuery) {
        while ($row = $busesQuery->fetch_assoc()) {
            $busOptions[] = $row['code'];
        }
    }
}
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
    <title>Report a Problem - ByaHero</title>
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0&display=swap"  media="print" onload="this.media='all'"/>
    <style>
        body {
            background-color: #ffffff;
            font-family: 'Inter', sans-serif;
        }
        
        /* Custom Radio Buttons */
        .custom-radio-input {
            appearance: none;
            width: 22px;
            height: 22px;
            border: 1px solid #0f172a;
            border-radius: 50%;
            margin: 0;
            cursor: pointer;
            position: relative;
            outline: none;
            background-color: transparent;
        }
        .custom-radio-input:checked {
            border-width: 6px;
            border-color: #1e3a8a;
        }

        .custom-textarea:focus {
            outline: none;
            box-shadow: 0 0 0 2px rgba(30, 58, 138, 0.2) !important;
        }

        .btn-submit-hover:hover {
            background-color: #152c6b !important;
            border-color: #152c6b !important;
        }
    </style>
</head>
<body class="bg-light">
    <?php include '../../../components/navbarPassenger.php'; ?>

    <div class="container mt-4 pt-5 pb-5 mb-5 px-3">
        
        <!-- Main Header Card -->
        <div class="d-flex align-items-start gap-3 mb-4 mt-3 px-2">
            <div class="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0 mt-1" style="width: 45px; height: 45px; background-color: #0c2b5e;">
                <img src="../../../assets/images/report.svg" alt="Report Icon" style="width: 24px; height: 24px; filter: brightness(0) invert(1);">
            </div>
            <div>
                <h4 class="fw-bold text-dark text-start mb-1" style="font-size: 1.15rem;">Report a Problem</h4>
                <p class="small text-secondary text-start mb-0" style="font-size: 0.85rem; line-height: 1.3;">Submit a report if you encountered any issues during your trip so we can take appropriate action.</p>
            </div>
        </div>

        <?php if (isset($_SESSION['report_success'])): ?>
            <div class="alert alert-success alert-dismissible fade show" role="alert">
                <strong>Success!</strong> <?= htmlspecialchars($_SESSION['report_success']) ?>
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
            <?php unset($_SESSION['report_success']); ?>
        <?php endif; ?>

        <?php if (isset($_SESSION['report_error'])): ?>
            <div class="alert alert-danger alert-dismissible fade show" role="alert">
                <strong>Error:</strong> <?= htmlspecialchars($_SESSION['report_error']) ?>
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
            <?php unset($_SESSION['report_error']); ?>
        <?php endif; ?>

        <!-- Form Card -->
        <div class="bg-light border-0 p-4" style="border-radius: 20px;">
            <form id="reportProblemForm" action="submitReport.php" method="POST">
                
                <div class="mb-4">
                    <label class="d-block small fw-bold text-dark text-start mb-2" for="busNumberInput" style="font-size: 0.85rem;">Bus Number:</label>
                    <?php if (!empty($bus_number)): ?>
                        <input type="text" class="form-control" id="busNumberInput" name="bus_number" value="<?= htmlspecialchars($bus_number) ?>" readonly style="border-radius: 12px; padding: 12px; background-color: #e2e8f0; cursor: not-allowed;">
                        <div class="form-text small" style="margin-top: 4px; color: #64748b;">Selected from your <strong>Ride History</strong>.</div>
                    <?php else: ?>
                        <select class="form-select border p-3" id="busNumberInput" name="bus_number" required style="border-radius: 12px; font-size: 0.9rem;">
                            <option value="" disabled selected>Select a bus</option>
                            <?php foreach ($busOptions as $busCode): ?>
                                <option value="<?= htmlspecialchars($busCode) ?>"><?= htmlspecialchars($busCode) ?></option>
                            <?php endforeach; ?>
                        </select>
                        <div class="form-text small" style="margin-top: 4px; color: #64748b;">Please select the bus number you want to report.</div>
                    <?php endif; ?>
                </div>
                
                <div class="d-flex flex-column gap-3 mb-4">
                    <div class="d-flex align-items-center justify-content-between">
                        <label class="small fw-bold text-dark m-0 cursor-pointer text-start" for="reason1" style="font-size: 0.85rem; width: 85%; line-height: 1.3;">No Air Conditioning / Poor Ventilation in Bus</label>
                        <input type="radio" id="reason1" name="report_reason" value="No Air Conditioning" class="custom-radio-input" required>
                    </div>
                    
                    <div class="d-flex align-items-center justify-content-between">
                        <label class="small fw-bold text-dark m-0 cursor-pointer text-start" for="reason2" style="font-size: 0.85rem; width: 85%; line-height: 1.3;">Dirty or Unclean Bus</label>
                        <input type="radio" id="reason2" name="report_reason" value="Dirty or Unclean Bus" class="custom-radio-input">
                    </div>
                    
                    <div class="d-flex align-items-center justify-content-between">
                        <label class="small fw-bold text-dark m-0 cursor-pointer text-start" for="reason3" style="font-size: 0.85rem; width: 85%; line-height: 1.3;">Broken Seats or Unsafe Interior</label>
                        <input type="radio" id="reason3" name="report_reason" value="Broken Seats or Unsafe Interior" class="custom-radio-input">
                    </div>
                    
                    <div class="d-flex align-items-center justify-content-between">
                        <label class="small fw-bold text-dark m-0 cursor-pointer text-start" for="reason4" style="font-size: 0.85rem; width: 85%; line-height: 1.3;">Reckless Driving</label>
                        <input type="radio" id="reason4" name="report_reason" value="Reckless Driving" class="custom-radio-input">
                    </div>
                    
                    <div class="d-flex align-items-center justify-content-between">
                        <label class="small fw-bold text-dark m-0 cursor-pointer text-start" for="reason5" style="font-size: 0.85rem; width: 85%; line-height: 1.3;">Over-speeding / Sudden Braking</label>
                        <input type="radio" id="reason5" name="report_reason" value="Over-speeding / Sudden Braking" class="custom-radio-input">
                    </div>
                    
                    <div class="d-flex align-items-center justify-content-between">
                        <label class="small fw-bold text-dark m-0 cursor-pointer text-start" for="reason6" style="font-size: 0.85rem; width: 85%; line-height: 1.3;">Unprofessional Behavior of Driver or Conductor</label>
                        <input type="radio" id="reason6" name="report_reason" value="Unprofessional Behavior" class="custom-radio-input">
                    </div>
                    
                    <div class="d-flex align-items-center justify-content-between">
                        <label class="small fw-bold text-dark m-0 cursor-pointer text-start" for="reason7" style="font-size: 0.85rem; width: 85%; line-height: 1.3;">Discount Not Applied (Senior / PWD / Student)</label>
                        <input type="radio" id="reason7" name="report_reason" value="Discount Not Applied" class="custom-radio-input">
                    </div>
                    
                    <div class="d-flex align-items-center justify-content-between">
                        <label class="small fw-bold text-dark m-0 cursor-pointer text-start" for="reason8" style="font-size: 0.85rem; width: 85%; line-height: 1.3;">No Receipt</label>
                        <input type="radio" id="reason8" name="report_reason" value="No Receipt" class="custom-radio-input">
                    </div>
                    
                    <div class="d-flex align-items-center justify-content-between">
                        <label class="small fw-bold text-dark m-0 cursor-pointer text-start" for="reason9" style="font-size: 0.85rem; width: 85%; line-height: 1.3;">Line Cutting</label>
                        <input type="radio" id="reason9" name="report_reason" value="Line Cutting" class="custom-radio-input">
                    </div>
                </div>

                <div class="mt-4 mb-3">
                    <label class="d-block small fw-bold text-dark text-start mb-2" for="contactNumber" style="font-size: 0.85rem;">Contact Number (Optional):</label>
                    <input type="text" class="form-control" id="contactNumber" name="contact_number" placeholder="e.g. 09123456789" style="border-radius: 12px; padding: 12px;">
                </div>

                <div class="mt-3">
                    <label class="d-block small fw-bold text-dark text-start mb-2" for="othersTextarea" style="font-size: 0.85rem;">Others (please specify):</label>
                    <textarea class="form-control border-0 p-3 custom-textarea" id="othersTextarea" name="others_details" style="border-radius: 20px; min-height: 160px; resize: none; font-size: 0.9rem; background-color: #ffffff;"></textarea>
                </div>

                <div class="text-center mt-4">
                    <button type="submit" class="btn btn-primary rounded-pill fw-bold py-2 btn-submit-hover" style="width: 130px; background-color: #1e3a8a; border-color: #1e3a8a; font-size: 0.9rem; transition: all 0.2s;">Submit</button>
                </div>
            </form>
        </div>

    </div>

    <!-- Bootstrap Bundle -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
