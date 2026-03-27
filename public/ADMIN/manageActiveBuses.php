<?php
declare(strict_types=1);

ini_set('display_errors', '1');
error_reporting(E_ALL);

require __DIR__ . '/../../config/db.php';

session_start();

// --- AUTH ---
if (empty($_SESSION['user_role']) || $_SESSION['user_role'] !== 'admin') {
    header('Location: ../login.php');
    exit;
}

$pdo = db();
$message = '';
$error = '';

function h($s): string {
    return htmlspecialchars((string)$s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/**
 * "Active" = buses currently in use.
 * Based on your map logic: available, on_stop, full.
 */
$activeStatuses = ['available', 'on_stop', 'full'];

// --- Handle Actions (active buses page) ---
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    try {
        // Update bus status
        if ($action === 'update_status') {
            $id = $_POST['id'] ?? null;
            $status = (string)($_POST['status'] ?? '');

            $allowed = ['available', 'on_stop', 'full', 'unavailable'];
            if (!$id || !in_array($status, $allowed, true)) {
                $error = "Invalid status update request.";
            } else {
                $pdo->prepare("UPDATE busses SET status = ? WHERE Bus_ID = ?")
                    ->execute([$status, $id]);
                $message = "Bus status updated.";
            }
        }
        // Delete bus (same as admin)
        elseif ($action === 'delete_bus') {
            $id = $_POST['id'] ?? null;
            if ($id) {
                $pdo->prepare("DELETE FROM busses WHERE Bus_ID = ?")->execute([$id]);
                $message = "Bus deleted.";
            } else {
                $error = "Invalid delete request.";
            }
        }
    } catch (Exception $e) {
        $error = "Database error: " . $e->getMessage();
    }
}

/* === Fetch ALL buses === */
$buses = [];
try {
    $buses = $pdo->query("SELECT * FROM busses ORDER BY code ASC")->fetchAll(PDO::FETCH_ASSOC);
} catch (Exception $e) {
    $buses = [];
}

/* === CHANGE: pin active buses up (stable ordering) === */
usort($buses, function ($a, $b) use ($activeStatuses) {
    $aStatus = (string)($a['status'] ?? '');
    $bStatus = (string)($b['status'] ?? '');

    $aActive = in_array($aStatus, $activeStatuses, true) ? 0 : 1; // 0 = active first
    $bActive = in_array($bStatus, $activeStatuses, true) ? 0 : 1;

    if ($aActive !== $bActive) {
        return $aActive <=> $bActive; // active group first
    }

    // within group: sort by code asc
    $aCode = (string)($a['code'] ?? '');
    $bCode = (string)($b['code'] ?? '');
    return strnatcasecmp($aCode, $bCode);
});
/* === END CHANGE === */

/* === navbarAdmin config (component) === */
$pageDepth = '../../';
$pageType = 'manageActiveBuses';
$backLink = 'admin.php';
/* === END === */
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>ByaHero — Active Buses</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        :root { --brand: #2563eb; }
        body { background: #f8fafc; color: #1e293b; font-family: "Segoe UI", system-ui, sans-serif; }

        /* Mobile-first list UI (reference-style) */
        .page-wrap { padding: 16px; }

        .alert { border-radius: 14px; }

        .pill-btn {
            border-radius: 999px;
            font-weight: 800;
            letter-spacing: .2px;
        }

        .bus-card {
            background: #fff;
            border-radius: 18px;
            box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
            border: 1px solid rgba(148, 163, 184, 0.35);
            padding: 14px 14px;
            display: flex;
            gap: 12px;
            align-items: center;
        }

        .bus-icon {
            width: 56px;
            height: 56px;
            border-radius: 16px;
            background: #f1f5f9;
            display: flex;
            align-items: center;
            justify-content: center;
            flex: 0 0 auto;
            overflow: hidden;
        }

        .bus-icon img {
            width: 40px;
            height: 40px;
            object-fit: contain;
            display: block;
        }

        .bus-title { font-weight: 900; font-size: 1.05rem; margin: 0; }
        .bus-sub { margin: 0; font-size: .85rem; color: #64748b; }

        .status-pill {
            border-radius: 999px;
            padding: 6px 12px;
            font-weight: 900;
            font-size: .75rem;
            letter-spacing: .3px;
            text-transform: uppercase;
            flex: 0 0 auto;
        }

        /* Active pill (green) */
        .pill-active { background: #dcfce7; color: #166534; }

        /* Inactive pill (red-ish like reference) */
        .pill-inactive { background: #fee2e2; color: #991b1b; }

        .bus-actions {
            margin-top: 10px;
            display: grid;
            grid-template-columns: 1fr auto auto;
            gap: 10px;
            align-items: center;
        }

        .select-status {
            border-radius: 12px;
            font-weight: 700;
        }

        .btn-soft {
            border-radius: 12px;
            font-weight: 800;
            padding: 8px 12px;
        }

        .btn-delete {
            border-radius: 12px;
            font-weight: 900;
            padding: 8px 12px;
        }

        /* Desktop: keep it nice (cards in grid) */
        @media (min-width: 992px) {
            .page-wrap { padding: 24px; max-width: 1100px; margin: 0 auto; }
            .bus-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
        }
    </style>
</head>
<body>

<?php include __DIR__ . '/../../components/navbarAdmin.php'; ?>

<div class="page-wrap">

    <?php if($message): ?>
        <div class="alert alert-success alert-dismissible fade show shadow-sm" role="alert">
            <?= $message ?>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    <?php endif; ?>

    <?php if($error): ?>
        <div class="alert alert-danger alert-dismissible fade show shadow-sm" role="alert">
            <?= $error ?>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    <?php endif; ?>

    <div class="d-flex justify-content-between align-items-center mb-3">
        <div>
            <div class="fw-bold" style="color:#0f172a;">Active Buses</div>
            <div class="small text-muted">Shows both Active and Inactive buses (Active pinned on top)</div>
        </div>
        <a class="btn btn-outline-primary btn-sm pill-btn" href="manageActiveBuses.php">Refresh</a>
    </div>

    <?php if (empty($buses)): ?>
        <div class="text-center text-muted py-4">
            No buses found.
        </div>
    <?php else: ?>

        <div class="bus-grid d-flex flex-column gap-3">
            <?php foreach ($buses as $bus):
                $s = (string)($bus['status'] ?? '');
                $busId = $bus['Bus_ID'] ?? $bus['id'] ?? null;

                $isActive = in_array($s, $activeStatuses, true);

                $pillClass = $isActive ? 'pill-active' : 'pill-inactive';
                $pillText = $isActive ? 'Active' : 'Inactive';
            ?>
                <div class="bus-card">
                    <div class="bus-icon" aria-hidden="true">
                        <img src="../../assets/images/icons/activeBus.png" alt="Bus">
                    </div>

                    <div class="flex-grow-1">
                        <div class="d-flex justify-content-between align-items-start gap-2">
                            <div>
                                <p class="bus-title"><?= h($bus['code'] ?? 'BUS') ?></p>
                                <p class="bus-sub">Route: <?= !empty($bus['route']) ? h($bus['route']) : '<em class="text-muted">None</em>' ?></p>
                                <p class="bus-sub">Available Seats: <?= h($bus['seat_availability']) ?>/<?= h($bus['total_seats']) ?></p>
                            </div>
                            <span class="status-pill <?= $pillClass ?>"><?= h($pillText) ?></span>
                        </div>

                        <div class="bus-actions">
                            <form method="POST" class="d-flex gap-2 align-items-center w-100">
                                <input type="hidden" name="action" value="update_status">
                                <input type="hidden" name="id" value="<?= h($busId) ?>">

                                <select name="status" class="form-select select-status">
                                    <option value="available" <?= $s==='available'?'selected':'' ?>>Available</option>
                                    <option value="on_stop" <?= $s==='on_stop'?'selected':'' ?>>On Stop</option>
                                    <option value="full" <?= $s==='full'?'selected':'' ?>>Full</option>
                                    <option value="unavailable" <?= $s==='unavailable'?'selected':'' ?>>Unavailable</option>
                                </select>

                                <button class="btn btn-outline-primary btn-soft" type="submit">Save</button>
                            </form>

                            <form method="POST" onsubmit="return confirm('Delete bus <?= h($bus['code']) ?>?');">
                                <input type="hidden" name="action" value="delete_bus">
                                <input type="hidden" name="id" value="<?= h($busId) ?>">
                                <button class="btn btn-outline-danger btn-delete" type="submit">Delete</button>
                            </form>
                        </div>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>

    <?php endif; ?>

</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>