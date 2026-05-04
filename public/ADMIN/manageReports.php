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
$error   = '';

// Self-healing: Check if bus_number column exists, add it if not
try {
    $checkCol = $pdo->query("SHOW COLUMNS FROM `reports` LIKE 'bus_number'")->fetch();
    if (!$checkCol) {
        $pdo->exec("ALTER TABLE `reports` ADD COLUMN `bus_number` VARCHAR(50) NULL AFTER `user_id` ");
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
                $stmt = $pdo->prepare("UPDATE reports SET status = ? WHERE id = ?");
                $stmt->execute([$status, $id]);
                $message = 'Report status updated successfully.';
            }
        } elseif ($action === 'delete_report') {
            $id = $_POST['id'] ?? null;

            if (!$id) {
                $error = 'Invalid delete request (empty ID).';
            } else {
                $stmt = $pdo->prepare("DELETE FROM reports WHERE id = ?");
                $stmt->execute([$id]);

                if ($stmt->rowCount() === 0) {
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
    $reports = $pdo->query("
        SELECT r.*, u.name as reporter_name, u.email as reporter_email 
        FROM reports r 
        LEFT JOIN users u ON r.user_id = u.id 
        ORDER BY r.created_at DESC
    ")->fetchAll(PDO::FETCH_ASSOC);
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
    <title>ByaHero — Passenger Reports</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0" rel="stylesheet" />
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
            color: #1d4ed8; /* darker blue */
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
        .action-select {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            font-size: 0.85rem;
            font-weight: 600;
            padding: 6px 30px 6px 12px;
            color: #1e293b;
            cursor: pointer;
        }
        .btn-pill {
            border-radius: 999px;
            font-weight: 700;
            font-size: 0.85rem;
            padding: 6px 20px;
            border: none;
        }
        .btn-danger-custom { background-color: #ef4444; color: #fff; }
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
            <div class="card card-standard">
                <div class="card-header-std d-flex align-items-center gap-2">
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
                            <div class="route-card">
                                <div class="ticket-header">
                                    <span class="ticket-type">
                                        <span class="material-symbols-rounded" style="vertical-align: text-bottom; font-size: 1.1rem;">
                                            report
                                        </span>
                                        REPORT #<?= h((string)$id) ?>
                                    </span>
                                    <span class="ticket-date"><?= date('M d, Y h:i A', strtotime($report['created_at'])) ?></span>
                                </div>

                                <div class="row">
                                    <div class="col-sm-4 col-12 ticket-row">
                                        <span class="ticket-label">Reporter</span>
                                        <div class="ticket-value">
                                            <?php 
                                                $rawName = $report['reporter_name'] ?? 'Unknown User';
                                                $firstName = explode(' ', trim($rawName))[0];
                                            ?>
                                            #<?= h($report['user_id']) ?> - <?= h($firstName) ?>
                                            <div class="small text-muted"><?= h($report['reporter_email'] ?? '') ?></div>
                                        </div>
                                    </div>
                                    <div class="col-sm-4 col-12 ticket-row">
                                        <span class="ticket-label">Bus Number</span>
                                        <div class="ticket-value fw-bold" style="color: #1e3a8a;">
                                            <span class="material-symbols-rounded" style="font-size: 16px; vertical-align: middle;">directions_bus</span>
                                            <?= h($report['bus_number'] ?: 'N/A') ?>
                                        </div>
                                    </div>
                                    <div class="col-sm-4 col-12 ticket-row">
                                        <span class="ticket-label">Contact Number</span>
                                        <div class="ticket-value">
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

                                <div class="ticket-row mt-2">
                                    <span class="ticket-label">Report Reason</span>
                                    <div class="ticket-value fw-bold text-danger"><?= h($report['report_reason']) ?></div>
                                </div>

                                <?php if (!empty($report['others_details'])): ?>
                                    <div class="ticket-row">
                                        <span class="ticket-label">Additional Details</span>
                                        <div class="ticket-value" style="white-space: pre-wrap;"><?= h($report['others_details']) ?></div>
                                    </div>
                                <?php endif; ?>

                                <hr class="mt-4 mb-3" style="border-color: #e2e8f0;">

                                <div class="d-flex justify-content-between align-items-center">
                                    <div class="d-flex align-items-center gap-2">
                                        <span class="ticket-label m-0">Status:</span>
                                        <form method="POST" id="update-form-<?= $id ?>" class="m-0 d-flex gap-2">
                                            <input type="hidden" name="action" value="update_status">
                                            <input type="hidden" name="id" value="<?= h((string)$id) ?>">
                                            <select name="status" class="form-select action-select" onchange="this.form.submit()">
                                                <option value="pending" <?= $status === 'pending' ? 'selected' : '' ?>>Pending</option>
                                                <option value="resolved" <?= $status === 'resolved' ? 'selected' : '' ?>>Resolved</option>
                                            </select>
                                        </form>
                                    </div>

                                    <form method="POST" class="m-0" onsubmit="return confirm('Permanently delete report #<?= $id ?>?');">
                                        <input type="hidden" name="action" value="delete_report">
                                        <input type="hidden" name="id" value="<?= h((string)$id) ?>">
                                        <button type="submit" class="btn btn-danger-custom btn-pill shadow-sm" style="padding: 4px 12px; font-size: 0.8rem;">Delete</button>
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
