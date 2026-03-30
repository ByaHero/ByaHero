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

// --- Handle Form Submissions (BUSES ONLY) ---
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    try {
        // Add New Bus
        if ($action === 'add_bus') {
            $code  = trim((string)($_POST['code'] ?? ''));
            $route = trim((string)($_POST['route'] ?? ''));
            $route = ($route === '') ? null : $route;

            // Always default to 25 seats
            $seats  = 25;
            $status = (string)($_POST['status'] ?? 'unavailable');

            if ($code === '') {
                $error = "Bus Code is required.";
            } else {
                $stmt = $pdo->prepare(
                    "INSERT INTO busses (code, route, total_seats, seat_availability, status)
                     VALUES (?, ?, ?, ?, ?)"
                );
                $stmt->execute([$code, $route, $seats, $seats, $status]);
                $message = "Bus <strong>" . h($code) . "</strong> added successfully!";
            }
        }
        // Delete Bus
        elseif ($action === 'delete_bus') {
            $id = $_POST['id'] ?? null;
            if ($id) {
                $pdo->prepare("DELETE FROM busses WHERE Bus_ID = ?")->execute([$id]);
                $message = "Bus deleted.";
            } else {
                $error = "Invalid delete request.";
            }
        }
        // Update Bus Route/Seats/Status (optional quick edit)
        elseif ($action === 'update_bus') {
            $id = $_POST['id'] ?? null;
            $route = trim((string)($_POST['route'] ?? ''));
            $route = ($route === '') ? null : $route;

            $totalSeats = (int)($_POST['total_seats'] ?? 25);
            $status     = (string)($_POST['status'] ?? 'unavailable');

            $allowedStatuses = ['available', 'on_stop', 'full', 'unavailable'];

            if (!$id) {
                $error = "Invalid update request.";
            } elseif ($totalSeats < 1) {
                $error = "Total seats must be valid.";
            } elseif (!in_array($status, $allowedStatuses, true)) {
                $error = "Invalid status.";
            } else {
                $stmt = $pdo->prepare("
                    UPDATE busses
                    SET route = ?,
                        total_seats = ?,
                        seat_availability = LEAST(seat_availability, ?),
                        status = ?
                    WHERE Bus_ID = ?
                ");
                $stmt->execute([$route, $totalSeats, $totalSeats, $status, $id]);
                $message = "Bus updated.";
            }
        }
    } catch (Exception $e) {
        $error = "Database error: " . $e->getMessage();
    }
}

// --- Fetch Buses ---
$buses = [];
try {
    $buses = $pdo->query("SELECT * FROM busses ORDER BY code ASC")->fetchAll(PDO::FETCH_ASSOC);
} catch (Exception $e) {
    $buses = [];
}

/* === navbarAdmin config (component) === */
$pageDepth = '../../';
$pageType = 'manageBuses';
$backLink = 'admin.php';
/* === END === */

// Group into 4 backend statuses (same text as backend)
$groups = ['available'=>[], 'on_stop'=>[], 'full'=>[], 'unavailable'=>[]];
foreach ($buses as $bus) {
    $st = (string)($bus['status'] ?? 'unavailable');
    if (!isset($groups[$st])) $st = 'unavailable';
    $groups[$st][] = $bus;
}

$labels = [
    'available' => 'Available',
    'on_stop' => 'On Stop',
    'full' => 'Full',
    'unavailable' => 'Unavailable',
];

$colors = [
    'available' => '#A7CCF5',
    'on_stop' => '#74B3E7',
    'full' => '#2B7AC1',
    'unavailable' => '#1E5FA5',
];
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>ByaHero — Manage Buses</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body { background: #f8fafc; color: #1e293b; font-family: "Segoe UI", system-ui, sans-serif; }

        .page-wrap { padding: 16px; }
        .alert { border-radius: 14px; }

        .status-section {
            border-radius: 18px;
            padding: 14px;
            box-shadow: 0 12px 30px rgba(15, 23, 42, 0.10);
            margin-bottom: 14px;
        }

        .section-head { display:flex; align-items:center; justify-content:space-between; gap:10px; }
        .section-title { font-weight: 900; margin: 0; font-size: 1rem; color:#0f172a; }
        .section-meta { font-size:.85rem; color: rgba(15,23,42,0.75); }

        .btn-add {
            border: 0;
            background: rgba(255,255,255,0.85);
            border-radius: 999px;
            font-weight: 900;
            padding: 8px 12px;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 6px 14px rgba(0,0,0,0.15);
        }
        .btn-add .plus {
            width: 28px; height: 28px;
            border-radius: 999px;
            background: #fff;
            display:inline-flex;
            align-items:center;
            justify-content:center;
            font-weight:900;
        }

        /* key: phone-friendly even with many buses */
        .bus-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-top: 10px;
            max-height: 300px;
            overflow: auto;
            padding-right: 4px;
        }

        .bus-card {
            background: rgba(255,255,255,0.92);
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
        .bus-icon img { width: 40px; height: 40px; object-fit: contain; display: block; }

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
            background: rgba(255,255,255,0.8);
            color: #0f172a;
        }

        .bus-actions {
            margin-top: 10px;
            display: grid;
            grid-template-columns: 1fr auto auto;
            gap: 10px;
            align-items: center;
        }

        .form-control, .form-select { border-radius: 12px; }
        .btn-soft { border-radius: 12px; font-weight: 800; padding: 8px 12px; }
        .btn-delete { border-radius: 12px; font-weight: 900; padding: 8px 12px; }
        .pill-btn { border-radius: 999px; font-weight: 800; letter-spacing: .2px; }

        .modal-content { border-radius: 18px; }
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

    <?php foreach (['available','on_stop','full','unavailable'] as $st): ?>
        <div class="status-section" style="background: <?= h($colors[$st]) ?>;">
            <div class="section-head">
                <div>
                    <p class="section-title"><?= h($labels[$st]) ?></p>
                    <div class="section-meta"><?= count($groups[$st]) ?> bus<?= count($groups[$st])===1?'':'es' ?></div>
                </div>

                <button
                    type="button"
                    class="btn-add"
                    data-bs-toggle="modal"
                    data-bs-target="#addBusModal"
                    data-status="<?= h($st) ?>"
                >
                    Add Bus <span class="plus">+</span>
                </button>
            </div>

            <div class="bus-list">
                <?php if (empty($groups[$st])): ?>
                    <div class="text-muted small" style="background: rgba(255,255,255,0.7); border-radius: 12px; padding: 10px;">
                        No buses in this status.
                    </div>
                <?php else: foreach ($groups[$st] as $bus):
                    $busId = $bus['Bus_ID'] ?? $bus['id'] ?? null;
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
                                <span class="status-pill"><?= h($labels[$st]) ?></span>
                            </div>

                            <div class="bus-actions">
                                <form method="POST" class="d-flex gap-2 align-items-center w-100">
                                    <input type="hidden" name="action" value="update_bus">
                                    <input type="hidden" name="id" value="<?= h($busId) ?>">

                                    <select name="route" class="form-select">
                                        <option value="" <?= empty($bus['route']) ? 'selected' : '' ?>>None</option>
                                        <option value="LAUREL - TANAUAN" <?= ($bus['route'] ?? '') === 'LAUREL - TANAUAN' ? 'selected' : '' ?>>LAUREL - TANAUAN</option>
                                        <option value="TANAUAN - LAUREL" <?= ($bus['route'] ?? '') === 'TANAUAN - LAUREL' ? 'selected' : '' ?>>TANAUAN - LAUREL</option>
                                    </select>

                                    <select name="status" class="form-select select-status" style="width:auto">
                                        <option value="available" <?= $st==='available'?'selected':'' ?>>Available</option>
                                        <option value="on_stop" <?= $st==='on_stop'?'selected':'' ?>>On Stop</option>
                                        <option value="full" <?= $st==='full'?'selected':'' ?>>Full</option>
                                        <option value="unavailable" <?= $st==='unavailable'?'selected':'' ?>>Unavailable</option>
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
                <?php endforeach; endif; ?>
            </div>
        </div>
    <?php endforeach; ?>

</div>

<!-- Add Bus Modal (minimal) -->
<div class="modal fade" id="addBusModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Add New Bus</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <form method="POST">
        <div class="modal-body">
            <input type="hidden" name="action" value="add_bus">
            <input type="hidden" name="status" id="addBusStatus" value="unavailable">

            <div class="mb-3">
                <label class="form-label small fw-bold text-uppercase">Bus Code / Plate</label>
                <input type="text" name="code" class="form-control" placeholder="e.g. BUS-001" required>
            </div>

            <div class="mb-3">
                <label class="form-label small fw-bold text-uppercase">Default Route</label>
                <select name="route" class="form-select">
                    <option value="" selected>-- Select Route --</option>
                    <option value="LAUREL - TANAUAN">LAUREL - TANAUAN</option>
                    <option value="TANAUAN - LAUREL">TANAUAN - LAUREL</option>
                </select>
            </div>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary btn-soft" data-bs-dismiss="modal">Cancel</button>
            <button type="submit" class="btn btn-primary btn-soft">Create</button>
        </div>
      </form>
    </div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
<script>
    const addBusModal = document.getElementById('addBusModal');
    const addBusStatus = document.getElementById('addBusStatus');

    addBusModal?.addEventListener('show.bs.modal', (event) => {
        const btn = event.relatedTarget;
        const st = btn?.getAttribute('data-status') || 'unavailable';
        addBusStatus.value = st;
    });
</script>
</body>
</html>