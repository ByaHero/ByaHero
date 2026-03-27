<?php
declare(strict_types=1);

ini_set('display_errors', '1');
error_reporting(E_ALL);

require __DIR__ . '/../../config/db.php';
session_start();

/**
 * Base URL that works for:
 * - Localhost: /Byahero-prototype-v3
 * - InfinityFree: ""  (htdocs is web root)
 */
$scriptName = $_SERVER['SCRIPT_NAME'] ?? '/public/ADMIN/operationSchedule.php';
$publicDir  = rtrim(str_replace('\\', '/', dirname($scriptName)), '/');
$baseUrl    = preg_replace('~/public/.*$~', '', $publicDir) ?: '';

// --- AUTH ---
if (empty($_SESSION['user_role']) || $_SESSION['user_role'] !== 'admin') {
    header('Location: ' . $baseUrl . '/public/login.php');
    exit;
}

$pdo = db();

function h($s): string {
    return htmlspecialchars((string)$s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function normalizeTerminal(string $name): string {
    $name = trim($name);
    $name = preg_replace('/\s+/', ' ', $name);
    return $name;
}

function parseTimeOrNull(string $t): ?string {
    $t = trim($t);
    if ($t === '') return null;
    // Accept HTML <input type="time"> format "HH:MM"
    if (!preg_match('/^\d{2}:\d{2}$/', $t)) return null;
    return $t . ':00';
}

function formatTimeShort(?string $t): string {
    if (!$t) return '';
    // from "HH:MM:SS" to "HH:MM"
    return substr($t, 0, 5);
}

$message = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = (string)($_POST['action'] ?? '');

    try {
        if ($action === 'upsert_schedule') {
            $terminal = normalizeTerminal((string)($_POST['terminal_name'] ?? ''));
            $isSuspended = isset($_POST['is_suspended']) ? 1 : 0;
            $suspendMessage = trim((string)($_POST['suspend_message'] ?? ''));
            $open = parseTimeOrNull((string)($_POST['time_open'] ?? ''));
            $close = parseTimeOrNull((string)($_POST['time_close'] ?? ''));

            if ($terminal === '') {
                $error = 'Terminal name is required.';
            } elseif (!$isSuspended && (!$open || !$close)) {
                $error = 'Open and Close time are required when not suspended.';
            } elseif ($isSuspended && $suspendMessage === '') {
                // make it “phenomenal”: require a reason when suspending
                $error = 'Please provide a suspend message (reason) when suspending operations.';
            } else {
                // If suspended, allow times to remain stored (or null). We'll store what admin provides.
                $sql = "
                    INSERT INTO bus_schedule (terminal_name, time_open, time_close, is_suspended, suspend_message)
                    VALUES (?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        time_open = VALUES(time_open),
                        time_close = VALUES(time_close),
                        is_suspended = VALUES(is_suspended),
                        suspend_message = VALUES(suspend_message),
                        updated_at = CURRENT_TIMESTAMP
                ";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    $terminal,
                    $open,
                    $close,
                    $isSuspended,
                    $suspendMessage !== '' ? $suspendMessage : null
                ]);

                $message = 'Schedule saved.';
            }
        } elseif ($action === 'delete_schedule') {
            $id = (int)($_POST['schedule_id'] ?? 0);
            if ($id <= 0) {
                $error = 'Invalid schedule id.';
            } else {
                $del = $pdo->prepare("DELETE FROM bus_schedule WHERE schedule_id = ? LIMIT 1");
                $del->execute([$id]);
                $message = 'Schedule deleted.';
            }
        }
    } catch (Throwable $e) {
        $error = 'Database error: ' . $e->getMessage();
    }
}

// Load schedules
$schedules = [];
try {
    $schedules = $pdo->query("SELECT * FROM bus_schedule ORDER BY terminal_name ASC")->fetchAll(PDO::FETCH_ASSOC);
} catch (Throwable $e) {
    $schedules = [];
}
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>ByaHero — Operation Schedule</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet">
    <style>
        :root { --brand: #2563eb; }
        body { background: #f8fafc; color: #1e293b; font-family: "Segoe UI", system-ui, sans-serif; }
        .navbar { background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .card-standard { border: none; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); background: #fff; }
        .card-header-std { background: #fff; border-bottom: 1px solid #e2e8f0; font-weight: 700; padding: 1rem 1.25rem; border-radius: 10px 10px 0 0 !important; }
        .mono { font-variant-numeric: tabular-nums; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
        .badge-susp { background: #dc2626; }
        .badge-live { background: #16a34a; }
    </style>
</head>
<body>

<nav class="navbar navbar-expand-lg navbar-dark mb-4">
    <div class="container">
        <a class="navbar-brand fw-bold d-flex align-items-center gap-2" href="admin.php">
            <span class="material-icons-round">schedule</span> Operation Schedule
        </a>
        <div class="ms-auto d-flex gap-2 align-items-center">
            <a class="btn btn-outline-light btn-sm" href="admin.php">Back</a>
            <a class="btn btn-outline-light btn-sm" href="logout.php">Logout</a>
        </div>
    </div>
</nav>

<div class="container">

    <?php if ($message): ?>
        <div class="alert alert-success alert-dismissible fade show shadow-sm" role="alert">
            <span class="material-icons-round fs-5 align-middle me-2">check_circle</span>
            <?= h($message) ?>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    <?php endif; ?>

    <?php if ($error): ?>
        <div class="alert alert-danger alert-dismissible fade show shadow-sm" role="alert">
            <span class="material-icons-round fs-5 align-middle me-2">error</span>
            <?= h($error) ?>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    <?php endif; ?>

    <div class="row g-4">
        <!-- Add/Update -->
        <div class="col-lg-4">
            <div class="card card-standard">
                <div class="card-header-std text-primary">
                    <span class="material-icons-round align-middle me-1">edit_calendar</span>
                    Add / Update Terminal Schedule
                </div>
                <div class="card-body">
                    <form method="POST">
                        <input type="hidden" name="action" value="upsert_schedule">

                        <div class="mb-2">
                            <label class="form-label small fw-bold text-uppercase">Terminal Name</label>
                            <input class="form-control" name="terminal_name" placeholder="e.g. Laurel" required>
                            <div class="small text-muted mt-1">
                                Tip: Use the same terminal name to update existing schedule.
                            </div>
                        </div>

                        <div class="row g-2 mb-2">
                            <div class="col-6">
                                <label class="form-label small fw-bold text-uppercase">Open</label>
                                <input class="form-control" type="time" name="time_open">
                            </div>
                            <div class="col-6">
                                <label class="form-label small fw-bold text-uppercase">Close</label>
                                <input class="form-control" type="time" name="time_close">
                            </div>
                        </div>

                        <div class="form-check form-switch mb-2">
                            <input class="form-check-input" type="checkbox" role="switch" id="suspSwitch" name="is_suspended">
                            <label class="form-check-label fw-bold" for="suspSwitch">Suspend operations</label>
                        </div>

                        <div class="mb-3">
                            <label class="form-label small fw-bold text-uppercase">Suspend message (required when suspended)</label>
                            <input class="form-control" name="suspend_message" placeholder="e.g. Suspended due to bad weather">
                        </div>

                        <div class="d-grid">
                            <button class="btn btn-primary">Save</button>
                        </div>
                    </form>
                </div>
            </div>

            <div class="small text-muted mt-3">
                “Phenomenal” behavior:
                <ul class="mb-0">
                    <li>Passengers will see <strong>SUSPENDED</strong> + message immediately.</li>
                    <li>If not suspended, open/close time must be filled.</li>
                </ul>
            </div>
        </div>

        <!-- List -->
        <div class="col-lg-8">
            <div class="card card-standard">
                <div class="card-header-std d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center gap-2">
                        <span class="material-icons-round text-primary">list_alt</span>
                        <span>Current Schedules</span>
                    </div>
                    <span class="small text-muted">Rows: <?= count($schedules) ?></span>
                </div>

                <div class="table-responsive">
                    <table class="table table-hover mb-0">
                        <thead class="table-light text-muted small text-uppercase">
                            <tr>
                                <th>ID</th>
                                <th>Terminal</th>
                                <th>Status</th>
                                <th>Open</th>
                                <th>Close</th>
                                <th>Message</th>
                                <th class="text-end">Delete</th>
                            </tr>
                        </thead>
                        <tbody>
                        <?php if (empty($schedules)): ?>
                            <tr>
                                <td colspan="7" class="text-center text-muted py-4">No schedules yet. Add one on the left.</td>
                            </tr>
                        <?php else: foreach ($schedules as $s): ?>
                            <tr>
                                <td class="mono"><?= (int)$s['schedule_id'] ?></td>
                                <td class="fw-bold"><?= h($s['terminal_name']) ?></td>
                                <td>
                                    <?php if ((int)$s['is_suspended'] === 1): ?>
                                        <span class="badge badge-susp">SUSPENDED</span>
                                    <?php else: ?>
                                        <span class="badge badge-live">ACTIVE</span>
                                    <?php endif; ?>
                                </td>
                                <td class="mono"><?= h(formatTimeShort($s['time_open'] ?? null)) ?></td>
                                <td class="mono"><?= h(formatTimeShort($s['time_close'] ?? null)) ?></td>
                                <td class="small text-muted"><?= h($s['suspend_message'] ?? '') ?></td>
                                <td class="text-end">
                                    <form method="POST" onsubmit="return confirm('Delete this schedule row?');" class="d-inline">
                                        <input type="hidden" name="action" value="delete_schedule">
                                        <input type="hidden" name="schedule_id" value="<?= (int)$s['schedule_id'] ?>">
                                        <button class="btn btn-sm btn-outline-danger">Delete</button>
                                    </form>
                                </td>
                            </tr>
                        <?php endforeach; endif; ?>
                        </tbody>
                    </table>
                </div>

                <div class="card-body border-top">
                    <div class="small text-muted">
                        Note: Passenger page reads from this table, so changes apply instantly.
                    </div>
                </div>
            </div>
        </div>
    </div>

</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>