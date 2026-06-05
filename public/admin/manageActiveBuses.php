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

<div class="page-wrap">

    <?php if ($message): ?>
        <div class="alert alert-success alert-dismissible fade show shadow-sm" role="alert">
            <?= $message ?>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    <?php endif; ?>

    <?php if ($error): ?>
        <div class="alert alert-danger alert-dismissible fade show shadow-sm" role="alert">
            <?= $error ?>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    <?php endif; ?>

    <div class="d-flex justify-content-between align-items-center mb-3">
        <div>
            <div class="fw-bold" style="color:#0f172a;">Active Buses</div>
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
            <div class="bus-grid d-flex flex-column gap-3">
                <?php foreach ($activeBuses as $bus):
                    $s = (string)($bus['status'] ?? '');
                    $pillClass = 'pill-available';
                    $pillText  = 'Available';

                    if ($s === 'on_stop') {
                        $pillClass = 'pill-on_stop';
                        $pillText  = 'On Stop';
                    } elseif ($s === 'full') {
                        $pillClass = 'pill-full';
                        $pillText  = 'Full';
                    }

                    $busId = $bus['Bus_ID'] ?? $bus['id'] ?? null;
                ?>
                    <div class="bus-card">
                        <div class="bus-icon" aria-hidden="true">
                            <!-- you can swap this icon based on status if you want -->
                            <img src="../../assets/images/icons/activeBus.png" alt="Bus">
                        </div>

                        <div class="flex-grow-1">
                            <div class="d-flex justify-content-between align-items-start gap-2">
                                <div>
                                    <p class="bus-title"><?= h($bus['code'] ?? 'BUS') ?></p>
                                    <p class="bus-sub">
                                        Route:
                                        <?= !empty($bus['route']) ? h($bus['route']) : '<em class="text-muted">None</em>' ?>
                                    </p>
                                    <p class="bus-sub">
                                        Available Seats:
                                        <?= h($bus['seat_availability']) ?>/<?= h($bus['total_seats']) ?>
                                    </p>
                                    <p class="bus-sub mt-1 text-primary">
                                        <span class="material-icons-round align-middle" style="font-size: 14px;">person</span>
                                        Conductor: <span class="fw-bold"><?= !empty($bus['conductor_email']) ? h($bus['conductor_email']) : 'Unknown' ?></span>
                                    </p>
                                </div>
                                <span class="status-pill <?= $pillClass ?>"><?= h($pillText) ?></span>
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