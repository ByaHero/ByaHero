<?php
declare(strict_types=1);

ini_set('display_errors', '1');
error_reporting(E_ALL);

require __DIR__ . '/../../config/db.php';

@session_start();

// --- AUTH ---
if (empty($_SESSION['user_role']) || $_SESSION['user_role'] !== 'admin') {
    header("Location: ../login");
    exit;
}

$conn = db();
$message = '';
$error   = '';

function h($s): string {
    return htmlspecialchars((string)$s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

// --- Handle Form Submissions ---
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    try {
        if ($action === 'cancel_waiting') {
            $id = $_POST['id'] ?? null;

            if (!$id) {
                $error = 'Invalid cancellation request.';
            } else {
                $stmt = $conn->prepare("UPDATE waiting_passengers SET status = 'cancelled', updated_at = NOW() WHERE id = ?");
                $stmt->bind_param("i", $id);
                $stmt->execute();

                if ($stmt->affected_rows === 0) {
                    $error = 'Failed to cancel. Check that waiting passenger ID ' . h($id) . ' is active.';
                } else {
                    $message = 'Passenger waiting status cancelled successfully.';
                }
                $stmt->close();
            }
        } elseif ($action === 'cancel_location') {
            $location = $_POST['location'] ?? null;

            if (!$location) {
                $error = 'Invalid cancellation request.';
            } else {
                $stmt = $conn->prepare("UPDATE waiting_passengers SET status = 'cancelled', updated_at = NOW() WHERE location_name = ? AND status = 'waiting'");
                $stmt->bind_param("s", $location);
                $stmt->execute();

                if ($stmt->affected_rows === 0) {
                    $error = 'Failed to cancel signals for ' . h($location) . '.';
                } else {
                    $message = 'All waiting signals for ' . h($location) . ' cancelled successfully.';
                }
                $stmt->close();
            }
        }
    } catch (Throwable $e) {
        $error = 'Database error: ' . $e->getMessage();
    }
}

// --- Fetch All Active Waiting Entries ---
$waitingList = [];
try {
    $res = $conn->query("
        SELECT wp.id, wp.user_id, wp.user_name, wp.location_name, wp.created_at, wp.status,
               u.name as registered_name, u.email as registered_email
        FROM waiting_passengers wp
        LEFT JOIN users u ON wp.user_id = u.id
        WHERE wp.status = 'waiting'
        ORDER BY wp.created_at DESC
    ");
    $waitingList = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];
} catch (Throwable $e) {
    $waitingList = [];
    $error = 'Database error: ' . $e->getMessage();
}

// Whitelist array for filters & verification
$location_whitelist = [
    "J. Leviste, Laurel", "Sampaloc, Talisay", "Caloocan, Talisay", "Buco, Talisay",
    "Balas, Talisay", "Ambulong, Tanauan", "Banadero, Tanauan", "Talaga, Tanauan",
    "Sambat, Tanauan", "Tanauan", "Sto. Tomas", "Bugaan West, Laurel", "Laurel",
    "Balakilong, Laurel", "Berinayan, Laurel", "Leynes, Talisay", "Santa Maria, Talisay",
    "Banga, Talisay", "Talisay", "Tumaway, Talisay", "Quiling, Talisay", "Aya, Talisay",
    "Santor, Tanauan", "Bugaan East, Laurel", "Looc, Calamba", "San Isidro"
];

// Calculate aggregates
$totalWaiting = count($waitingList);
$locationCounts = [];
foreach ($waitingList as $wp) {
    $loc = $wp['location_name'];
    $locationCounts[$loc] = ($locationCounts[$loc] ?? 0) + 1;
}
// Sort busy locations high-to-low
arsort($locationCounts);

/* === navbarAdmin config === */
$pageDepth = '../../';
$pageType  = 'manageWaitingPassengers';
$backLink  = 'admin.php';
/* === END === */
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <link rel="icon" href="../../assets/images/byaheroLogoBlue.svg" type="image/svg+xml">
    <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
    <title>ByaHero — Waiting Passengers</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0&display=swap" rel="stylesheet" media="print" onload="this.media='all'" />
    <link href="../../assets/css/admin/manageWaitingPassengers.css" rel="stylesheet">
</head>
<body>

<?php include __DIR__ . '/../../components/navbarAdmin.php'; ?>

<div class="container">

    <?php if ($message): ?>
        <div class="alert alert-success alert-dismissible fade show shadow-sm mt-3" role="alert">
            <span class="material-symbols-rounded fs-5 align-middle me-2">check_circle</span>
            <?= $message ?>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    <?php endif; ?>

    <?php if ($error): ?>
        <div class="alert alert-danger alert-dismissible fade show shadow-sm mt-3" role="alert">
            <span class="material-symbols-rounded fs-5 align-middle me-2">error</span>
            <?= $error ?>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    <?php endif; ?>

    <div class="row g-4 mt-1 mb-5">
        <div class="col-lg-8 mx-auto">
            
            <!-- Dynamic Count Stats Card -->
            <div class="card border-0 rounded-4 shadow-sm bg-white mb-4">
                <div class="card-body p-4">
                    <div class="row align-items-center">
                        <div class="col-sm-5 border-end text-center text-sm-start mb-3 mb-sm-0">
                            <div class="text-muted small text-uppercase fw-bold mb-1">Total Waiting</div>
                            <div class="d-flex align-items-center justify-content-center justify-content-sm-start gap-3">
                                <span class="display-4 fw-bold text-dark"><?= $totalWaiting ?></span>
                                <span class="badge rounded-pill px-3 py-2 border d-inline-flex align-items-center gap-1" style="background: #dcfce7; color: #15803d; border-color: #bbf7d0 !important;">
                                    <span class="pulse-dot"></span> Active
                                </span>
                            </div>
                        </div>
                        <div class="col-sm-7 ps-sm-4">
                            <div class="text-muted small text-uppercase fw-bold mb-2">Busiest Locations</div>
                            <?php if (empty($locationCounts)): ?>
                                <div class="text-muted small py-1">No passenger waiting signals registered right now.</div>
                            <?php else: ?>
                                <div class="d-flex flex-wrap gap-2">
                                    <?php 
                                    $counter = 0;
                                    foreach ($locationCounts as $loc => $cnt): 
                                        if ($counter++ >= 4) break; // top 4 busy stops
                                        // Resolve stop name display (strip out base city if desired, or keep exact)
                                        $shortLocName = explode(',', $loc)[0];
                                    ?>
                                        <span class="badge bg-light text-dark border rounded-pill px-3 py-2 d-flex align-items-center gap-1">
                                            <span class="material-symbols-rounded text-primary fs-6">directions_bus</span>
                                            <strong><?= h($shortLocName) ?>:</strong> <?= $cnt ?> waiting
                                        </span>
                                    <?php endforeach; ?>
                                </div>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Main Interactive Card -->
            <div class="card border-0 rounded-4 shadow-sm bg-white">
                <div class="card-header bg-white border-bottom fw-bold p-3 d-flex justify-content-between align-items-center flex-wrap gap-2" style="border-radius: 16px 16px 0 0;">
                    <div class="d-flex align-items-center gap-2">
                        <span class="material-symbols-rounded text-primary fs-3">hail</span>
                        <span class="fs-4 text-primary fw-bold">Waiting Passengers Directory</span>
                    </div>
                    
                    <!-- Premium Auto-Refresh Countdown UI -->
                    <div class="small text-secondary d-flex align-items-center gap-2">
                        <button type="button" id="btn-manual-refresh" class="btn btn-sm btn-light border rounded-pill d-flex align-items-center gap-1 py-1 px-3 fs-7" title="Force Refresh">
                            <span class="material-symbols-rounded fs-6 align-middle">refresh</span>
                            <span>Refresh Now</span>
                        </button>
                        <div class="d-flex align-items-center gap-1 border rounded-pill px-3 py-1 bg-light fs-8">
                            <span class="material-symbols-rounded fs-7 text-secondary">update</span>
                            <span>Auto-refresh: <strong id="countdown-sec">30</strong>s</span>
                        </div>
                    </div>
                </div>

                <div class="card-body">
                    <!-- Progress Bar for Countdown -->
                    <div class="progress mb-4" style="height: 3px;">
                        <div id="countdown-progress" class="progress-bar bg-primary" role="progressbar" style="width: 0%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
                    </div>

                    <!-- Client-Side Filter Inputs -->
                    <div class="p-2 bg-light border mb-4" style="border-radius: 12px;">
                        <div class="row g-2">
                            <div class="col-sm-12">
                                <select id="filterLocation" class="form-select" style="border-radius: 8px;">
                                    <option value="">All Stop Locations</option>
                                    <?php foreach ($location_whitelist as $whitelistLoc): ?>
                                        <option value="<?= h($whitelistLoc) ?>" <?= isset($locationCounts[$whitelistLoc]) ? 'class="fw-bold text-primary"' : '' ?>>
                                            <?= h($whitelistLoc) ?> <?= isset($locationCounts[$whitelistLoc]) ? "({$locationCounts[$whitelistLoc]} waiting)" : "" ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- No Passengers State -->
                    <?php if (empty($waitingList)): ?>
                        <div class="text-center py-5">
                            <span class="material-symbols-rounded display-1 text-muted opacity-50 mb-3">hail</span>
                            <h5 class="fw-bold text-muted">No Waiting Signals Registered</h5>
                            <p class="text-secondary small max-width-350 mx-auto">There are currently no passengers active at any of the ByaHero transit stops. Real-time updates will dynamically populate here when they signal.</p>
                        </div>
                    <?php else: ?>
                        
                        <!-- List Container -->
                        <div id="passengers-container">
                            <?php foreach ($locationCounts as $locName => $count): ?>
                                <div class="route-card border rounded-4 bg-white p-3 mb-3" data-location="<?= h($locName) ?>">
                                    <div class="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
                                        <span class="fw-bold text-primary text-uppercase" style="font-size: 0.95rem;">
                                            <span class="material-symbols-rounded" style="vertical-align: text-bottom; font-size: 1.1rem;">
                                                location_on
                                            </span>
                                            <?= h($locName) ?>
                                        </span>
                                        <span class="small text-secondary d-flex align-items-center gap-1">
                                            <span class="spinner-grow spinner-grow-sm text-success" role="status" style="width: 8px; height: 8px;"></span>
                                            Active
                                        </span>
                                    </div>

                                    <div class="row">
                                        <div class="col-sm-12 mb-2" style="font-size: 0.95rem;">
                                            <span class="text-primary fw-semibold d-block" style="font-size: 0.85rem;">Passengers Waiting</span>
                                            <div class="text-dark bg-light p-2 rounded-2 mt-1 fw-bold fs-5 text-primary">
                                                <?= $count ?> passenger<?= $count > 1 ? 's' : '' ?>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="row mt-2">
                                        <div class="col-sm-12 d-flex justify-content-end align-items-center">
                                            <form method="POST" class="m-0 mt-3 mt-sm-0" onsubmit="return confirm('Dismiss all waiting signals for <?= h($locName) ?>?');">
                                                <input type="hidden" name="action" value="cancel_location">
                                                <input type="hidden" name="location" value="<?= h($locName) ?>">
                                                <button type="submit" class="btn btn-danger rounded-pill px-3 py-2 fw-bold shadow-sm" style="background-color: #ef4444; border-color: #ef4444; font-size: 0.8rem; display: flex; align-items: center; gap: 4px;">
                                                    <span class="material-symbols-rounded fs-6">cancel</span>
                                                    <span>Dismiss All Signals Here</span>
                                                </button>
                                            </form>
                                        </div>
                                    </div>

                                </div>
                            <?php endforeach; ?>

                            <!-- Empty Search Results Message -->
                            <div id="noResultsMessage" class="text-center py-5 d-none">
                                <span class="material-symbols-rounded display-3 text-secondary opacity-50 mb-2">person_search</span>
                                <h6 class="fw-bold text-muted">No Matching Waiting Passengers</h6>
                                <p class="text-secondary small">Try adjusting your filters or spelling above.</p>
                            </div>
                        </div>

                    <?php endif; ?>
                </div>
            </div>

        </div>
    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
<script src="../../assets/js/admin/manageWaitingPassengers.js"></script>
</body>
</html>
