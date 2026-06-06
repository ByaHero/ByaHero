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

// Self-healing: Check if bus_number column exists, add it if not
try {
    $resCol = $conn->query("SHOW COLUMNS FROM `reports` LIKE 'bus_number'");
    $checkCol = $resCol ? $resCol->fetch_assoc() : null;
    if (!$checkCol) {
        $conn->query("ALTER TABLE `reports` ADD COLUMN `bus_number` VARCHAR(50) NULL AFTER `user_id` ");
    }
} catch (Throwable $e) {
    // Silent fail if table doesn't exist yet or other issues
}

function h($s): string {
    return htmlspecialchars((string)$s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

$ALLOWED_STATUS = ['pending', 'resolved'];

// --- Handle Form Submissions ---
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    try {
        if ($action === 'update_status') {
            $id     = $_POST['id'] ?? null;
            $status = (string)($_POST['status'] ?? 'pending');

            if (!in_array($status, $ALLOWED_STATUS, true)) {
                $status = 'pending';
            }

            if (!$id) {
                $error = 'Invalid update request (empty ID).';
            } else {
                $stmt = $conn->prepare("UPDATE reports SET status = ? WHERE id = ?");
                $stmt->bind_param("si", $status, $id);
                $stmt->execute();
                $message = 'Report status updated successfully.';
            }
        } elseif ($action === 'delete_report') {
            $id = $_POST['id'] ?? null;

            if (!$id) {
                $error = 'Invalid delete request (empty ID).';
            } else {
                $stmt = $conn->prepare("DELETE FROM reports WHERE id = ?");
                $stmt->bind_param("i", $id);
                $stmt->execute();

                if ($stmt->affected_rows === 0) {
                    $error = 'No report deleted. Check that ID ' . h($id) . ' exists.';
                } else {
                    $message = 'Report deleted permanently.';
                }
            }
        }
    } catch (Throwable $e) {
        $error = 'Database error: ' . $e->getMessage();
    }
}

// --- Fetch All Entries ---
$reports = [];
try {
    $resReports = $conn->query("
        SELECT r.*, u.name as reporter_name, u.email as reporter_email 
        FROM reports r 
        LEFT JOIN users u ON r.user_id = u.id 
        ORDER BY r.created_at DESC
    ");
    $reports = $resReports ? $resReports->fetch_all(MYSQLI_ASSOC) : [];
} catch (Throwable $e) {
    $reports = [];
}

/* === navbarAdmin config === */
$pageDepth = '../../';
$pageType  = 'manageReports';
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
    <title>ByaHero — Passenger Reports</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0&display=swap" rel="stylesheet" media="print" onload="this.media='all'" />
    <style>
        <?php include __DIR__ . '/../../assets/css/admin/manageReports.css'; ?>
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
            <div class="card border-0 rounded-4 shadow-sm bg-white">
                <div class="card-header bg-white border-bottom fw-bold p-3 d-flex align-items-center gap-2 text-primary" style="border-radius: 16px 16px 0 0;">
                    <span class="fs-4">Passenger Reports</span>
                </div>

                <div class="card-body">
                    <?php if (empty($reports)): ?>
                        <p class="text-muted small">No reports submitted yet.</p>
                    <?php else: ?>
                        <?php foreach ($reports as $report):
                            $id     = $report['id'];
                            $status = in_array(($report['status'] ?? ''), $ALLOWED_STATUS, true) ? $report['status'] : 'pending';
                        ?>
                            <div class="border rounded-4 bg-white p-3 mb-3">
                                <div class="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
                                    <span class="fw-bold text-primary text-uppercase" style="font-size: 0.95rem;">
                                        <span class="material-symbols-rounded" style="vertical-align: text-bottom; font-size: 1.1rem;">
                                            report
                                        </span>
                                        REPORT #<?= h((string)$id) ?>
                                    </span>
                                    <span class="small text-secondary" style="font-size: 0.8rem;"><?= date('M d, Y h:i A', strtotime($report['created_at'])) ?></span>
                                </div>

                                <div class="row">
                                    <div class="col-sm-4 col-12 mb-2" style="font-size: 0.95rem;">
                                        <span class="text-primary fw-semibold d-block" style="font-size: 0.85rem;">Reporter</span>
                                        <div class="text-dark bg-light p-2 rounded-2 mt-1">
                                            <?php 
                                                $rawName = $report['reporter_name'] ?? 'Unknown User';
                                                $firstName = explode(' ', trim($rawName))[0];
                                            ?>
                                            #<?= h($report['user_id']) ?> - <?= h($firstName) ?>
                                            <div class="small text-muted"><?= h($report['reporter_email'] ?? '') ?></div>
                                        </div>
                                    </div>
                                    <div class="col-sm-4 col-12 mb-2" style="font-size: 0.95rem;">
                                        <span class="text-primary fw-semibold d-block" style="font-size: 0.85rem;">Bus Number</span>
                                        <div class="text-dark bg-light p-2 rounded-2 mt-1 fw-bold" style="color: #1e3a8a;">
                                            <span class="material-symbols-rounded" style="font-size: 16px; vertical-align: middle;">directions_bus</span>
                                            <?= h($report['bus_number'] ?: 'N/A') ?>
                                        </div>
                                    </div>
                                    <div class="col-sm-4 col-12 mb-2" style="font-size: 0.95rem;">
                                        <span class="text-primary fw-semibold d-block" style="font-size: 0.85rem;">Contact Number</span>
                                        <div class="text-dark bg-light p-2 rounded-2 mt-1">
                                            <?php $cp = $report['contact_number'] ?? ''; ?>
                                            <?php if (!empty($cp)): ?>
                                                <a href="tel:<?= h($cp) ?>" class="text-decoration-none fw-bold" style="color: #1d4ed8;">
                                                    <span class="material-symbols-rounded" style="font-size: 14px; vertical-align: middle;">call</span>
                                                    <?= h($cp) ?>
                                                </a>
                                            <?php else: ?>
                                                <i class="text-muted">None provided</i>
                                            <?php endif; ?>
                                        </div>
                                    </div>
                                </div>

                                <div class="mb-2 mt-2" style="font-size: 0.95rem;">
                                    <span class="text-primary fw-semibold d-block" style="font-size: 0.85rem;">Report Reason</span>
                                    <div class="text-danger bg-light p-2 rounded-2 mt-1 fw-bold"><?= h($report['report_reason']) ?></div>
                                </div>

                                <?php if (!empty($report['others_details'])): ?>
                                    <div class="mb-2" style="font-size: 0.95rem;">
                                        <span class="text-primary fw-semibold d-block" style="font-size: 0.85rem;">Additional Details</span>
                                        <div class="text-dark bg-light p-2 rounded-2 mt-1" style="white-space: pre-wrap;"><?= h($report['others_details']) ?></div>
                                    </div>
                                <?php endif; ?>

                                <hr class="mt-4 mb-3" style="border-color: #e2e8f0;">

                                <div class="d-flex justify-content-between align-items-center">
                                    <div class="d-flex align-items-center gap-2">
                                        <span class="text-primary fw-semibold d-block m-0" style="font-size: 0.85rem;">Status:</span>
                                        <form method="POST" id="update-form-<?= $id ?>" class="m-0 d-flex gap-2">
                                            <input type="hidden" name="action" value="update_status">
                                            <input type="hidden" name="id" value="<?= h((string)$id) ?>">
                                            <select name="status" class="form-select rounded-pill px-3 py-1 fw-semibold text-dark border-0 bg-light" style="font-size: 0.8rem; box-shadow: inset 0 0 0 1px #e5e7eb;" onchange="this.form.submit()">
                                                <option value="pending" <?= $status === 'pending' ? 'selected' : '' ?>>Pending</option>
                                                <option value="resolved" <?= $status === 'resolved' ? 'selected' : '' ?>>Resolved</option>
                                            </select>
                                        </form>
                                    </div>

                                    <form method="POST" class="m-0" onsubmit="return confirm('Permanently delete report #<?= $id ?>?');">
                                        <input type="hidden" name="action" value="delete_report">
                                        <input type="hidden" name="id" value="<?= h((string)$id) ?>">
                                        <button type="submit" class="btn btn-danger rounded-pill px-3 py-1 fw-bold shadow-sm" style="background-color: #ef4444; border-color: #ef4444; font-size: 0.8rem;">Delete</button>
                                    </form>
                                </div>

                            </div>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
