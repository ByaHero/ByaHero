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
        SELECT *
        FROM busses
        WHERE current_conductor_id IS NOT NULL
          AND status IN ('available', 'on_stop', 'full')
        ORDER BY code ASC
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
    <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
    <title>ByaHero — Active Buses</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body {
            background: #f8fafc;
            color: #1e293b;
            font-family: "Segoe UI", system-ui, sans-serif;
        }

        .page-wrap {
            padding: 16px;
        }

        .alert {
            border-radius: 14px;
        }

        .bus-card {
            background: #ffffff;
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

        .bus-title {
            font-weight: 900;
            font-size: 1.05rem;
            margin: 0;
        }

        .bus-sub {
            margin: 0;
            font-size: .85rem;
            color: #64748b;
        }

        .status-pill {
            border-radius: 999px;
            padding: 6px 12px;
            font-weight: 900;
            font-size: .75rem;
            letter-spacing: .3px;
            text-transform: uppercase;
            flex: 0 0 auto;
        }

        /* Status colors (match your map/conductor logic) */
        .pill-available {
            background: #dcfce7;
            color: #166534;
        }
        .pill-on_stop {
            background: #fef3c7;
            color: #92400e;
        }
        .pill-full {
            background: #fee2e2;
            color: #b91c1c;
        }

        /* Desktop grid */
        @media (min-width: 992px) {
            .page-wrap {
                padding: 24px;
                max-width: 1100px;
                margin: 0 auto;
            }
            .bus-grid {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 16px;
            }
        }
    </style>
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
<script>
    // Auto-refresh the bus list every 5 seconds without full page reload
    function _autoRefreshTick() {
        (async () => {
        try {
            const res = await fetch(window.location.href);
            const html = await res.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const newList = doc.getElementById('bus-list-container');
            const currentList = document.getElementById('bus-list-container');
            if (newList && currentList) {
                currentList.innerHTML = newList.innerHTML;
            }
        } catch (e) {
            console.error('Failed to auto-refresh active buses', e);
        }
    }).finally(() => {
            setTimeout(_autoRefreshTick, 5000);
        });
    }

    _autoRefreshTick();
</script>
</body>
</html>