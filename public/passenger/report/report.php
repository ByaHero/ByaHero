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
        .report-card {
            background-color: #f1f5f9;
            border-radius: 20px;
            padding: 24px;
            border: none;
        }
        .report-header {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            margin-bottom: 24px;
        }
        .report-icon {
            width: 45px;
            height: 45px;
            background-color: #0c2b5e;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            margin-top: 2px;
        }
        .report-icon img {
            width: 24px;
            height: 24px;
        }
        .report-title-container h4 {
            font-size: 1.15rem;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 4px;
            text-align: left;
        }
        .report-title-container p {
            font-size: 0.85rem;
            color: #475569;
            margin-bottom: 0;
            line-height: 1.3;
            text-align: left;
        }
        
        /* Custom Radio Buttons */
        .custom-radio-group {
            display: flex;
            flex-direction: column;
            gap: 16px;
            margin-bottom: 24px;
        }
        .custom-radio-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .custom-radio-label {
            font-size: 0.85rem;
            font-weight: 700;
            color: #0f172a;
            margin: 0;
            cursor: pointer;
            width: 85%;
            line-height: 1.3;
        }
        
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
        
        /* Textarea */
        .others-label {
            font-size: 0.85rem;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 12px;
            display: block;
            text-align: left;
        }
        .custom-textarea {
            width: 100%;
            border-radius: 20px;
            border: none;
            padding: 16px;
            min-height: 160px;
            resize: none;
            background-color: #ffffff;
            font-size: 0.9rem;
        }
        .custom-textarea:focus {
            outline: none;
            box-shadow: 0 0 0 2px rgba(30, 58, 138, 0.2);
        }
        
        /* Submit Button */
        .btn-submit {
            background-color: #1e3a8a;
            color: white;
            border-radius: 30px;
            padding: 10px 0;
            font-weight: 700;
            width: 130px;
            border: none;
            margin-top: 10px;
            transition: all 0.2s;
            font-size: 0.9rem;
        }
        .btn-submit:hover {
            background-color: #152c6b;
        }
        .submit-container {
            text-align: center;
        }
    </style>
</head>
<body class="bg-light">
    <?php include '../../../components/navbarPassenger.php'; ?>

    <div class="container mt-4 pt-5 pb-5 mb-5 px-3">
        
        <!-- Main Header Card -->
        <div class="report-header mt-3 px-2">
            <div class="report-icon">
                <img src="../../../assets/images/report.svg" alt="Report Icon" style="filter: brightness(0) invert(1);">
            </div>
            <div class="report-title-container">
                <h4>Report a Problem</h4>
                <p>Submit a report if you encountered any issues during your trip so we can take appropriate action.</p>
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
        <div class="report-card">
            <form id="reportProblemForm" action="submitReport.php" method="POST">
                
                <div class="mb-4">
                    <label class="others-label" for="busNumberInput">Bus Number:</label>
                    <?php if (!empty($bus_number)): ?>
                        <input type="text" class="form-control" id="busNumberInput" name="bus_number" value="<?= htmlspecialchars($bus_number) ?>" readonly style="border-radius: 12px; padding: 12px; background-color: #e2e8f0; cursor: not-allowed;">
                        <div class="form-text small" style="margin-top: 4px; color: #64748b;">Selected from your <strong>Ride History</strong>.</div>
                    <?php else: ?>
                        <select class="form-select" id="busNumberInput" name="bus_number" style="border-radius: 12px; padding: 12px;" required>
                            <option value="" disabled selected>Select a bus</option>
                            <?php foreach ($busOptions as $busCode): ?>
                                <option value="<?= htmlspecialchars($busCode) ?>"><?= htmlspecialchars($busCode) ?></option>
                            <?php endforeach; ?>
                        </select>
                        <div class="form-text small" style="margin-top: 4px; color: #64748b;">Please select the bus number you want to report.</div>
                    <?php endif; ?>
                </div>
                
                <div class="custom-radio-group">
                    <div class="custom-radio-item">
                        <label class="custom-radio-label" for="reason1">No Air Conditioning / Poor Ventilation in Bus</label>
                        <input type="radio" id="reason1" name="report_reason" value="No Air Conditioning" class="custom-radio-input" required>
                    </div>
                    
                    <div class="custom-radio-item">
                        <label class="custom-radio-label" for="reason2">Dirty or Unclean Bus</label>
                        <input type="radio" id="reason2" name="report_reason" value="Dirty or Unclean Bus" class="custom-radio-input">
                    </div>
                    
                    <div class="custom-radio-item">
                        <label class="custom-radio-label" for="reason3">Broken Seats or Unsafe Interior</label>
                        <input type="radio" id="reason3" name="report_reason" value="Broken Seats or Unsafe Interior" class="custom-radio-input">
                    </div>
                    
                    <div class="custom-radio-item">
                        <label class="custom-radio-label" for="reason4">Reckless Driving</label>
                        <input type="radio" id="reason4" name="report_reason" value="Reckless Driving" class="custom-radio-input">
                    </div>
                    
                    <div class="custom-radio-item">
                        <label class="custom-radio-label" for="reason5">Over-speeding / Sudden Braking</label>
                        <input type="radio" id="reason5" name="report_reason" value="Over-speeding / Sudden Braking" class="custom-radio-input">
                    </div>
                    
                    <div class="custom-radio-item">
                        <label class="custom-radio-label" for="reason6">Unprofessional Behavior of Driver or Conductor</label>
                        <input type="radio" id="reason6" name="report_reason" value="Unprofessional Behavior" class="custom-radio-input">
                    </div>
                    
                    <div class="custom-radio-item">
                        <label class="custom-radio-label" for="reason7">Discount Not Applied (Senior / PWD / Student)</label>
                        <input type="radio" id="reason7" name="report_reason" value="Discount Not Applied" class="custom-radio-input">
                    </div>
                    
                    <div class="custom-radio-item">
                        <label class="custom-radio-label" for="reason8">No Receipt</label>
                        <input type="radio" id="reason8" name="report_reason" value="No Receipt" class="custom-radio-input">
                    </div>
                    
                    <div class="custom-radio-item">
                        <label class="custom-radio-label" for="reason9">Line Cutting</label>
                        <input type="radio" id="reason9" name="report_reason" value="Line Cutting" class="custom-radio-input">
                    </div>
                </div>

                <div class="mt-4 mb-3">
                    <label class="others-label" for="contactNumber">Contact Number (Optional):</label>
                    <input type="text" class="form-control" id="contactNumber" name="contact_number" placeholder="e.g. 09123456789" style="border-radius: 12px; padding: 12px;">
                </div>

                <div class="mt-3">
                    <label class="others-label" for="othersTextarea">Others (please specify):</label>
                    <textarea class="custom-textarea" id="othersTextarea" name="others_details"></textarea>
                </div>

                <div class="submit-container">
                    <button type="submit" class="btn-submit">Submit</button>
                </div>
            </form>
        </div>

    </div>

    <!-- Bootstrap Bundle -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
