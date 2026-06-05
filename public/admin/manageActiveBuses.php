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
$error  = '';

function h($s): string {
    return htmlspecialchars((string)$s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/**
 * "Active" = buses currently in use by a conductor.
 * - status: available | on_stop | full
 * - current_conductor_id is NOT NULL
 */
$activeStatuses = ['available', 'on_stop', 'full'];

// --- Fetch ONLY active buses (used in conductorLive) ---
$activeBuses = [];
try {
    $stmt = $conn->prepare("
        SELECT b.*, c.email AS conductor_email
        FROM busses b
        LEFT JOIN conductors c ON b.current_conductor_id = c.id
        WHERE b.current_conductor_id IS NOT NULL
          AND b.status IN ('available', 'on_stop', 'full')
        ORDER BY b.code ASC
    ");
    $stmt->execute();
    $activeBuses = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
} catch (Throwable $e) {
    $error = 'Database error: ' . $e->getMessage();
}

/* === navbarAdmin config (component) === */
$pageDepth = '../../';
$pageType  = 'manageActiveBuses';
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
    <title>ByaHero — Active Buses</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="../../assets/css/admin/manageActiveBuses.css" rel="stylesheet">
</head>
<body>

<?php include __DIR__ . '/../../components/navbarAdmin.php'; ?>

<div class="container py-3 py-lg-4" style="max-width: 1100px;">

    <?php if ($message): ?>
        <div class="alert alert-success alert-dismissible fade show shadow-sm" role="alert" style="border-radius: 14px;">
            <?= $message ?>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    <?php endif; ?>

    <?php if ($error): ?>
        <div class="alert alert-danger alert-dismissible fade show shadow-sm" role="alert" style="border-radius: 14px;">
            <?= $error ?>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    <?php endif; ?>

    <div class="d-flex justify-content-between align-items-center mb-3">
        <div>
            <h2 class="fw-bold fs-5 mb-0 text-dark">Active Buses</h2>
            <div class="small text-primary d-flex align-items-center gap-1 mt-1" style="font-weight: 600;">
                <span class="spinner-grow spinner-grow-sm" role="status" style="width:0.6rem;height:0.6rem"></span> Live Updates
            </div>
        </div>
    </div>

    <div id="bus-list-container">
        <?php if (empty($activeBuses)): ?>
            <div class="text-center text-muted py-4">
                No active buses right now.
            </div>
        <?php else: ?>
            <div class="row row-cols-1 row-cols-lg-2 g-3">
                <?php foreach ($activeBuses as $bus):
                    $s = (string)($bus['status'] ?? '');
                    $pillStyle = 'background: #dcfce7; color: #166534;';
                    $pillText  = 'Available';

                    if ($s === 'on_stop') {
                        $pillStyle = 'background: #fef3c7; color: #92400e;';
                        $pillText  = 'On Stop';
                    } elseif ($s === 'full') {
                        $pillStyle = 'background: #fee2e2; color: #b91c1c;';
                        $pillText  = 'Full';
                    }

                    $busId = $bus['Bus_ID'] ?? $bus['id'] ?? null;
                ?>
                    <div class="col">
                        <div class="bg-white rounded-4 shadow-sm border p-3 d-flex align-items-center gap-3" style="border-color: rgba(148, 163, 184, 0.35) !important;">
                            <div class="d-flex align-items-center justify-content-center flex-shrink-0 bg-light rounded-3" style="width: 56px; height: 56px;">
                                <img src="../../assets/images/icons/activeBus.png" alt="Bus" style="width: 40px; height: 40px; object-fit: contain;">
                            </div>

                            <div class="flex-grow-1">
                                <div class="d-flex justify-content-between align-items-start gap-2">
                                    <div>
                                        <p class="fw-bold mb-0 text-dark" style="font-size: 1.05rem;"><?= h($bus['code'] ?? 'BUS') ?></p>
                                        <p class="mb-0 text-secondary" style="font-size: 0.85rem;">
                                            Route:
                                            <?= !empty($bus['route']) ? h($bus['route']) : '<em class="text-muted">None</em>' ?>
                                        </p>
                                        <p class="mb-0 text-secondary" style="font-size: 0.85rem;">
                                            Available Seats:
                                            <?= h($bus['seat_availability']) ?>/<?= h($bus['total_seats']) ?>
                                        </p>
                                        <p class="mb-0 mt-1 text-primary" style="font-size: 0.85rem;">
                                            Conductor: <span class="fw-bold"><?= !empty($bus['conductor_email']) ? h($bus['conductor_email']) : 'Unknown' ?></span>
                                        </p>
                                    </div>
                                    <span class="badge rounded-pill px-3 py-2 fw-bold text-uppercase" style="font-size: 0.75rem; letter-spacing: 0.3px; <?= $pillStyle ?>"><?= h($pillText) ?></span>
                                </div>
                            </div>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>
    </div>

</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
<script src="../../assets/js/admin/manageActiveBuses.js"></script>
</body>
</html>