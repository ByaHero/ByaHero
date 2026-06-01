<?php
declare(strict_types=1);

ini_set('display_errors', '1');
error_reporting(E_ALL);

require __DIR__ . '/../../config/db.php';

@session_start();

// --- AUTH ---
if (empty($_SESSION['user_role']) || $_SESSION['user_role'] !== 'admin') {
    header('Location: ../login.php');
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
    <style>
        body {
            background: #f8fafc;
            color: #1e293b;
            font-family: "Segoe UI", system-ui, sans-serif;
        }

        .card-standard {
            border: none;
            border-radius: 14px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.06);
            background: #fff;
            color: #1d4ed8; 
        }
        .card-header-std {
            background: #fff;
            border-bottom: 1px solid #e2e8f0;
            font-weight: 800;
            padding: 1rem 1.25rem;
            border-radius: 14px 14px 0 0 !important;
        }
        .route-card {
            border: 1px solid #e2e8f0;
            border-radius: 14px;
            background: #ffffff;
            padding: 14px;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .route-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
        .route-card + .route-card {
            margin-top: 14px;
        }
        .ticket-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 10px;
            margin-bottom: 15px;
        }
        .ticket-type {
            font-weight: 800;
            text-transform: uppercase;
            font-size: 0.95rem;
            color: #1d4ed8;
        }
        .ticket-date {
            font-size: 0.8rem;
            color: #64748b;
        }
        .ticket-row {
            margin-bottom: 8px;
            font-size: 0.95rem;
        }
        .ticket-label {
            color: #1d4ed8;
            font-weight: 600;
            font-size: 0.85rem;
            display: block;
        }
        .ticket-value {
            color: #1e293b;
            background: #f8fafc;
            padding: 8px 12px;
            border-radius: 8px;
            margin-top: 4px;
        }
        .btn-pill {
            border-radius: 999px;
            font-weight: 700;
            font-size: 0.85rem;
            padding: 6px 20px;
            border: none;
            transition: all 0.2s;
        }
        .btn-danger-custom { background-color: #ef4444; color: #fff; }
        .btn-danger-custom:hover { background-color: #dc2626; box-shadow: 0 2px 5px rgba(239, 68, 68, 0.3); }

        .search-filter-bar {
            background: #f1f5f9;
            border-radius: 12px;
            padding: 12px;
            border: 1px solid #e2e8f0;
        }

        .countdown-wrap {
            font-size: 0.85rem;
            color: #64748b;
        }

        .pulse-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: #dcfce7;
            color: #15803d;
            font-weight: 700;
            border-radius: 999px;
            padding: 4px 12px;
            font-size: 0.8rem;
            border: 1px solid #bbf7d0;
        }

        .pulse-badge span.pulse-dot {
            width: 8px;
            height: 8px;
            background: #22c55e;
            border-radius: 50%;
            display: inline-block;
            animation: pulse-animation 1.5s infinite;
        }

        @keyframes pulse-animation {
            0% {
                transform: scale(0.95);
                box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
            }
            70% {
                transform: scale(1);
                box-shadow: 0 0 0 6px rgba(34, 197, 94, 0);
            }
            100% {
                transform: scale(0.95);
                box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
            }
        }
    </style>
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
            <div class="card card-standard mb-4">
                <div class="card-body p-4">
                    <div class="row align-items-center">
                        <div class="col-sm-5 border-end-sm text-center text-sm-start mb-3 mb-sm-0">
                            <div class="text-muted small text-uppercase fw-bold mb-1">Total Waiting</div>
                            <div class="d-flex align-items-center justify-content-center justify-content-sm-start gap-3">
                                <span class="display-4 fw-bold text-dark"><?= $totalWaiting ?></span>
                                <span class="pulse-badge">
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
            <div class="card card-standard">
                <div class="card-header-std d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div class="d-flex align-items-center gap-2">
                        <span class="material-symbols-rounded text-primary fs-3">hail</span>
                        <span class="fs-4">Waiting Passengers Directory</span>
                    </div>
                    
                    <!-- Premium Auto-Refresh Countdown UI -->
                    <div class="countdown-wrap d-flex align-items-center gap-2">
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
                    <div class="search-filter-bar mb-4">
                        <div class="row g-2">
                            <div class="col-sm-6">
                                <div class="input-group">
                                    <span class="input-group-text bg-white border-end-0 text-muted">
                                        <span class="material-symbols-rounded fs-5">search</span>
                                    </span>
                                    <input type="text" id="searchPassenger" class="form-control border-start-0 ps-0" placeholder="Search by name...">
                                </div>
                            </div>
                            <div class="col-sm-6">
                                <select id="filterLocation" class="form-select">
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
                            <?php foreach ($waitingList as $wp):
                                $id = $wp['id'];
                                $rawName = !empty($wp['registered_name']) ? $wp['registered_name'] : (!empty($wp['user_name']) ? $wp['user_name'] : 'Unknown User');
                                $email = !empty($wp['registered_email']) ? $wp['registered_email'] : 'No Email';
                                
                                // Time-ago calculation
                                $wait_time = strtotime($wp['created_at']);
                                $diff_sec = time() - $wait_time;
                                $time_ago_str = 'Just now';
                                if ($diff_sec > 0) {
                                    if ($diff_sec < 60) {
                                        $time_ago_str = $diff_sec . 's ago';
                                    } elseif ($diff_sec < 3600) {
                                        $time_ago_str = floor($diff_sec / 60) . 'm ago';
                                    } else {
                                        $time_ago_str = floor($diff_sec / 3600) . 'h ' . floor(($diff_sec % 3600) / 60) . 'm ago';
                                    }
                                }
                            ?>
                                <div class="route-card passenger-card" data-name="<?= h($rawName) ?>" data-location="<?= h($wp['location_name']) ?>">
                                    <div class="ticket-header">
                                        <span class="ticket-type">
                                            <span class="material-symbols-rounded" style="vertical-align: text-bottom; font-size: 1.1rem;">
                                                person
                                            </span>
                                            PASSENGER ID #<?= h((string)$wp['user_id']) ?>
                                        </span>
                                        <span class="ticket-date d-flex align-items-center gap-1">
                                            <span class="spinner-grow spinner-grow-sm text-success" role="status" style="width: 8px; height: 8px;"></span>
                                            Waiting (<?= h($time_ago_str) ?>)
                                        </span>
                                    </div>

                                    <div class="row">
                                        <div class="col-sm-6 col-12 ticket-row">
                                            <span class="ticket-label">Full Name</span>
                                            <div class="ticket-value fw-bold">
                                                <?= h($rawName) ?>
                                                <div class="small text-muted fw-normal mt-1"><?= h($email) ?></div>
                                            </div>
                                        </div>
                                        <div class="col-sm-6 col-12 ticket-row">
                                            <span class="ticket-label">Stop Location</span>
                                            <div class="ticket-value text-primary d-flex align-items-center gap-1 fw-bold">
                                                <span class="material-symbols-rounded text-danger fs-5">location_on</span>
                                                <?= h($wp['location_name']) ?>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="row mt-2">
                                        <div class="col-sm-6 col-12 ticket-row">
                                            <span class="ticket-label">Signalled At</span>
                                            <div class="ticket-value text-muted small">
                                                <?= date('M d, Y h:i A', $wait_time) ?>
                                            </div>
                                        </div>
                                        <div class="col-sm-6 col-12 d-flex justify-content-end align-items-center">
                                            <form method="POST" class="m-0 mt-3 mt-sm-0" onsubmit="return confirm('Dismiss waiting signal for <?= h($rawName) ?>?');">
                                                <input type="hidden" name="action" value="cancel_waiting">
                                                <input type="hidden" name="id" value="<?= h((string)$id) ?>">
                                                <button type="submit" class="btn btn-danger-custom btn-pill shadow-sm" style="padding: 6px 14px; font-size: 0.8rem; display: flex; align-items: center; gap: 4px;">
                                                    <span class="material-symbols-rounded fs-6">cancel</span>
                                                    <span>Dismiss Signal</span>
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
<script>
document.addEventListener('DOMContentLoaded', () => {
    // 1. Search & filter logic
    const searchInput = document.getElementById('searchPassenger');
    const locationSelect = document.getElementById('filterLocation');
    const passengerCards = document.querySelectorAll('.passenger-card');
    const noResultsDiv = document.getElementById('noResultsMessage');

    function filterPassengers() {
        if (!searchInput || !locationSelect) return;
        const searchText = searchInput.value.toLowerCase().trim();
        const selectedLocation = locationSelect.value;

        let visibleCount = 0;

        passengerCards.forEach(card => {
            const name = card.getAttribute('data-name').toLowerCase();
            const location = card.getAttribute('data-location');

            const matchesSearch = name.includes(searchText);
            const matchesLocation = !selectedLocation || location === selectedLocation;

            if (matchesSearch && matchesLocation) {
                card.classList.remove('d-none');
                visibleCount++;
            } else {
                card.classList.add('d-none');
            }
        });

        if (noResultsDiv) {
            if (visibleCount === 0 && passengerCards.length > 0) {
                noResultsDiv.classList.remove('d-none');
            } else {
                noResultsDiv.classList.add('d-none');
            }
        }
    }

    if (searchInput) searchInput.addEventListener('input', filterPassengers);
    if (locationSelect) locationSelect.addEventListener('change', filterPassengers);

    // 2. Real-time auto-refresh countdown
    let countdown = 30;
    const maxCountdown = 30;
    const countdownText = document.getElementById('countdown-sec');
    const progressBar = document.getElementById('countdown-progress');
    const refreshBtn = document.getElementById('btn-manual-refresh');

    const refreshInterval = setInterval(() => {
        countdown--;
        if (countdownText) countdownText.textContent = String(countdown);
        if (progressBar) {
            const percent = ((maxCountdown - countdown) / maxCountdown) * 100;
            progressBar.style.width = percent + '%';
        }

        if (countdown <= 0) {
            clearInterval(refreshInterval);
            window.location.reload();
        }
    }, 1000);

    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            clearInterval(refreshInterval);
            window.location.reload();
        });
    }
});
</script>
</body>
</html>
