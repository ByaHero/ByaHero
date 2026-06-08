<?php
declare(strict_types=1);

ini_set('display_errors', '1');
error_reporting(E_ALL);

require __DIR__ . '/../../config/db.php';
@session_start();

/**
 * Base URL that works for:
 * - Localhost: /Byahero-prototype-v3
 * - InfinityFree: ""  (htdocs is web root)
 */
$scriptName = $_SERVER['SCRIPT_NAME'] ?? '/public/admin/operationSchedule.php';
$publicDir  = rtrim(str_replace('\\', '/', dirname($scriptName)), '/');
$baseUrl    = preg_replace('~/public/.*$~', '', $publicDir) ?: '';

// --- AUTH ---
if (empty($_SESSION['user_role']) || $_SESSION['user_role'] !== 'admin') {
    header('Location: ' . $baseUrl . '/public/login.php');
    exit;
}

$conn = db();

function h($s): string {
    return htmlspecialchars((string)$s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
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
$error   = '';

// Fixed routes (these terminal_name values must match your DB)
$routes = [
    'laurel_tanauan' => 'LAUREL - TANAUAN',
    'tanauan_laurel' => 'TANAUAN - LAUREL',
];

// Handle form submit
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = (string)($_POST['action'] ?? '');

    try {
        if ($action === 'save_routes') {

            // LAUREL - TANAUAN
            $open1  = parseTimeOrNull((string)($_POST['lt_open'] ?? ''));
            $close1 = parseTimeOrNull((string)($_POST['lt_close'] ?? ''));
            $susp1  = isset($_POST['lt_suspended']) ? 1 : 0;
            $msg1   = trim((string)($_POST['lt_message'] ?? ''));

            // TANAUAN - LAUREL
            $open2  = parseTimeOrNull((string)($_POST['tl_open'] ?? ''));
            $close2 = parseTimeOrNull((string)($_POST['tl_close'] ?? ''));
            $susp2  = isset($_POST['tl_suspended']) ? 1 : 0;
            $msg2   = trim((string)($_POST['tl_message'] ?? ''));

            // Validation
            if (!$susp1 && (!$open1 || !$close1)) {
                $error = 'Open and Close time are required for LAUREL - TANAUAN when not suspended.';
            } elseif (!$susp2 && (!$open2 || !$close2)) {
                $error = 'Open and Close time are required for TANAUAN - LAUREL when not suspended.';
            } else {
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
                $stmt = $conn->prepare($sql);

                // Route 1: LAUREL - TANAUAN
                $msgVal1 = ($msg1 !== '' ? $msg1 : null);
                $stmt->bind_param("sssis", 
                    $routes['laurel_tanauan'],
                    $open1,
                    $close1,
                    $susp1,
                    $msgVal1
                );
                $stmt->execute();

                // Route 2: TANAUAN - LAUREL
                $msgVal2 = ($msg2 !== '' ? $msg2 : null);
                $stmt->bind_param("sssis", 
                    $routes['tanauan_laurel'],
                    $open2,
                    $close2,
                    $susp2,
                    $msgVal2
                );
                $stmt->execute();

                $message = 'Schedules updated.';
            }
        }
    } catch (Throwable $e) {
        $error = 'Database error: ' . $e->getMessage();
    }
}

// Load schedules for both routes
$schedules = [];
try {
    $stmt = $conn->prepare("SELECT * FROM bus_schedule WHERE terminal_name = ? LIMIT 1");

    foreach ($routes as $key => $name) {
        $stmt->bind_param("s", $name);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        if (!$row) {
            // If not existing yet, show empty values
            $row = [
                'terminal_name'   => $name,
                'time_open'       => null,
                'time_close'      => null,
                'is_suspended'    => 0,
                'suspend_message' => '',
            ];
        }
        $schedules[$key] = $row;
    }
} catch (Throwable $e) {
    $schedules = [];
}

/* === navbarAdmin config (component) === */
$pageDepth = '../../';
$pageType  = 'operationSchedule';
$backLink  = 'admin.php';
/* === END navbar config === */
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <link rel="icon" href="../../assets/images/byaheroLogoBlue.svg" type="image/svg+xml">
    <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
    <title>ByaHero — Operation Schedule</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Material+Icons+Round&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
    <style>
        <?php include __DIR__ . '/../../assets/css/admin/operationSchedule.css'; ?>
    </style>
</head>
<body>

<?php include __DIR__ . '/../../components/navbarAdmin.php'; ?>

<div class="container">

    <?php if ($message): ?>
        <div class="alert alert-success alert-dismissible fade show shadow-sm mt-3" role="alert">
            <span class="material-icons-round fs-5 align-middle me-2">check_circle</span>
            <?= h($message) ?>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    <?php endif; ?>

    <?php if ($error): ?>
        <div class="alert alert-danger alert-dismissible fade show shadow-sm mt-3" role="alert">
            <span class="material-icons-round fs-5 align-middle me-2">error</span>
            <?= h($error) ?>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    <?php endif; ?>

    <div class="row g-4 mt-1">
        <div class="col-lg-8 mx-auto">
            <div class="card border-0 shadow-sm rounded-3">
                <div class="card-header bg-white border-bottom border-light-subtle py-3 px-4 d-flex align-items-center gap-2 text-primary">
                    <span class="fs-4 fw-bold">Operation Schedule</span>
                </div>

                <div class="card-body">
                    <form method="POST">
                        <input type="hidden" name="action" value="save_routes">

                        <!-- ROUTE 1: LAUREL - TANAUAN -->
                        <div class="card card-body border border-light-subtle rounded-3 p-3 mb-3">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <h6 class="fw-bold m-0 text-dark">LAUREL - TANAUAN</h6>
                                <div class="form-check form-switch m-0">
                                    <input class="form-check-input"
                                           type="checkbox"
                                           role="switch"
                                           id="lt_susp"
                                           name="lt_suspended"
                                        <?= !empty($schedules['laurel_tanauan']['is_suspended']) ? 'checked' : '' ?>>
                                    <label class="form-check-label fw-semibold small" for="lt_susp">
                                        Suspend
                                    </label>
                                </div>
                            </div>

                            <div class="row g-2 align-items-end">
                                <div class="col-6">
                                    <label class="form-label small text-uppercase fw-bold">Open</label>
                                    <input type="time"
                                           class="form-control"
                                           name="lt_open"
                                           value="<?= h(formatTimeShort($schedules['laurel_tanauan']['time_open'] ?? null)) ?>">
                                </div>
                                <div class="col-6">
                                    <label class="form-label small text-uppercase fw-bold">Close</label>
                                    <input type="time"
                                           class="form-control"
                                           name="lt_close"
                                           value="<?= h(formatTimeShort($schedules['laurel_tanauan']['time_close'] ?? null)) ?>">
                                </div>
                            </div>

                            <div class="mt-2">
                                <label class="form-label small text-uppercase fw-bold">
                                    Suspend message (optional)
                                </label>
                                <input type="text"
                                       class="form-control"
                                       name="lt_message"
                                       placeholder="e.g. Suspended due to bad weather"
                                       value="<?= h($schedules['laurel_tanauan']['suspend_message'] ?? '') ?>">
                            </div>
                        </div>

                        <!-- ROUTE 2: TANAUAN - LAUREL -->
                        <div class="card card-body border border-light-subtle rounded-3 p-3 mb-3">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <h6 class="fw-bold m-0 text-dark">TANAUAN - LAUREL</h6>
                                <div class="form-check form-switch m-0">
                                    <input class="form-check-input"
                                           type="checkbox"
                                           role="switch"
                                           id="tl_susp"
                                           name="tl_suspended"
                                        <?= !empty($schedules['tanauan_laurel']['is_suspended']) ? 'checked' : '' ?>>
                                    <label class="form-check-label fw-semibold small" for="tl_susp">
                                        Suspend
                                    </label>
                                </div>
                            </div>

                            <div class="row g-2 align-items-end">
                                <div class="col-6">
                                    <label class="form-label small text-uppercase fw-bold">Open</label>
                                    <input type="time"
                                           class="form-control"
                                           name="tl_open"
                                           value="<?= h(formatTimeShort($schedules['tanauan_laurel']['time_open'] ?? null)) ?>">
                                </div>
                                <div class="col-6">
                                    <label class="form-label small text-uppercase fw-bold">Close</label>
                                    <input type="time"
                                           class="form-control"
                                           name="tl_close"
                                           value="<?= h(formatTimeShort($schedules['tanauan_laurel']['time_close'] ?? null)) ?>">
                                </div>
                            </div>

                            <div class="mt-2">
                                <label class="form-label small text-uppercase fw-bold">
                                    Suspend message (optional)
                                </label>
                                <input type="text"
                                       class="form-control"
                                       name="tl_message"
                                       placeholder="e.g. Suspended due to bad weather"
                                       value="<?= h($schedules['tanauan_laurel']['suspend_message'] ?? '') ?>">
                            </div>
                        </div>

                        <div class="d-grid mt-3">
                            <button class="btn btn-primary rounded-pill fw-bold py-2">Save Schedules</button>
                        </div>


                    </form>
                </div>

            </div>
        </div>
    </div>

</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>