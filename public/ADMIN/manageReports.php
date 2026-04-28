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
            background: #f8f9fa;
            color: #212529;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
        }
        .app-shell {
            max-width: 600px;
            margin: 0 auto;
            min-height: 100vh;
            background: #f5f6f8;
            display: flex;
            flex-direction: column;
            box-shadow: 0 0 20px rgba(0,0,0,0.05);
        }
        .app-content {
            flex: 1;
            padding: 20px;
        }
        .section-title {
            font-size: 1.25rem;
            font-weight: 800;
            color: #000;
            margin-bottom: 16px;
        }
        .ticket-card {
            background: #ffffff;
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 16px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.03);
            border: none;
        }
        .ticket-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
            margin-bottom: 15px;
        }
        .ticket-type {
            font-weight: 800;
            text-transform: uppercase;
            font-size: 0.95rem;
            color: #e11d48;
        }
        .ticket-date {
            font-size: 0.8rem;
            color: #6c757d;
        }
        .ticket-row {
            margin-bottom: 8px;
            font-size: 0.95rem;
        }
        .ticket-label {
            color: #4b5563;
            font-weight: 600;
            font-size: 0.85rem;
            display: block;
        }
        .ticket-value {
            color: #000;
            background: #f8f9fa;
            padding: 8px 12px;
            border-radius: 8px;
            margin-top: 4px;
        }
        .action-select {
            background-color: #f3f4f6;
            border: none;
            border-radius: 999px;
            font-size: 0.8rem;
            font-weight: 600;
            padding: 4px 26px 4px 12px;
            color: #000;
            cursor: pointer;
            box-shadow: inset 0 0 0 1px #e5e7eb;
        }
        .btn-pill {
            border-radius: 999px;
            font-weight: 700;
            font-size: 0.85rem;
            padding: 6px 20px;
            border: none;
        }
        .btn-danger-custom { background-color: #b91c1c; color: #fff; }
    </style>
</head>
<body>

<div class="app-shell">
    <?php include __DIR__ . '/../../components/navbarAdmin.php'; ?>

    <div class="app-content">

        <?php if ($message): ?>
            <div class="alert alert-success alert-dismissible fade show" role="alert">
                <?= $message ?>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        <?php endif; ?>

        <?php if ($error): ?>
            <div class="alert alert-danger alert-dismissible fade show" role="alert">
                <?= $error ?>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        <?php endif; ?>

        <h2 class="section-title">Passenger Reports</h2>

        <?php if (empty($reports)): ?>
            <p class="text-muted small">No reports submitted yet.</p>
        <?php else: ?>
            <?php foreach ($reports as $report):
                $id     = $report['id'];
                $status = in_array(($report['status'] ?? ''), $ALLOWED_STATUS, true) ? $report['status'] : 'pending';
            ?>
                <div class="ticket-card">
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
                        <div class="col-sm-6 col-12 ticket-row">
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
                        <div class="col-sm-6 col-12 ticket-row">
                            <span class="ticket-label">Contact Number</span>
                            <div class="ticket-value">
                                <?php $cp = $report['contact_number'] ?? ''; ?>
                                <?php if (!empty($cp)): ?>
                                    <a href="tel:<?= h($cp) ?>" class="text-decoration-none fw-bold text-primary">
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

                    <hr class="mt-4 mb-3" style="border-color: #eee;">

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
                            <button type="submit" class="btn btn-danger-custom btn-pill border-0 shadow-sm" style="padding: 4px 12px; font-size: 0.8rem;">Delete</button>
                        </form>
                    </div>

                </div>
            <?php endforeach; ?>
        <?php endif; ?>
    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
