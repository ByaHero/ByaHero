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

$ALLOWED_STATUS = ['open', 'resolved', 'closed'];

// --- Handle Form Submissions ---
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    try {
        if ($action === 'update_status') {
            $id     = $_POST['id'] ?? null;
            $status = (string)($_POST['status'] ?? 'open');

            if (!in_array($status, $ALLOWED_STATUS, true)) {
                $status = 'open';
            }

            if (!$id) {
                $error = 'Invalid update request (empty ID).';
            } else {
                $stmt = $pdo->prepare("UPDATE lost_and_found SET status = ? WHERE id = ?");
                $stmt->execute([$status, $id]);
                $message = 'Ticket updated successfully.';
            }
        } elseif ($action === 'delete_ticket') {
            $id = $_POST['id'] ?? null;

            if (!$id) {
                $error = 'Invalid delete request (empty ID).';
            } else {
                $stmt = $pdo->prepare("DELETE FROM lost_and_found WHERE id = ?");
                $stmt->execute([$id]);

                if ($stmt->rowCount() === 0) {
                    $error = 'No ticket deleted. Check that ID ' . h($id) . ' exists.';
                } else {
                    $message = 'Ticket deleted forever.';
                }
            }
        }
    } catch (Throwable $e) {
        $error = 'Database error: ' . $e->getMessage();
    }
}

// --- Fetch All Entries ---
$tickets = [];
try {
    $tickets = $pdo->query("
        SELECT lf.*, u.name as reporter_name, u.contacts as reporter_contact 
        FROM lost_and_found lf 
        LEFT JOIN users u ON lf.user_id = u.id 
        ORDER BY lf.created_at DESC
    ")->fetchAll(PDO::FETCH_ASSOC);
} catch (Throwable $e) {
    $tickets = [];
}

/* === navbarAdmin config === */
$pageDepth = '../../';
$pageType  = 'manageLostAndFound';
$backLink  = 'admin.php';
/* === END === */
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>ByaHero — Lost & Found</title>
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
        }
        .type-lost { color: #dc3545; }
        .type-found { color: #198754; }
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
        .badge-status {
            border-radius: 999px;
            padding: 4px 12px;
            font-size: 0.75rem;
            font-weight: 700;
            display: inline-block;
        }
        .status-open { background: #ffeeba; color: #856404; }
        .status-resolved { background: #d4edda; color: #155724; }
        .status-closed { background: #f8d7da; color: #721c24; }

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
        .btn-primary-custom { background-color: #1e5dd9; color: #fff; }
        .btn-danger-custom { background-color: #b91c1c; color: #fff; }
        .img-preview {
            width: 60px;
            height: 60px;
            object-fit: cover;
            border-radius: 8px;
            border: 1px solid #ccc;
        }
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

        <h2 class="section-title">Lost and Found Board</h2>

        <?php if (empty($tickets)): ?>
            <p class="text-muted small">No items reported yet.</p>
        <?php else: ?>
            <?php foreach ($tickets as $ticket):
                $id     = $ticket['id'];
                $type   = $ticket['type'];
                $status = in_array(($ticket['status'] ?? ''), $ALLOWED_STATUS, true) ? $ticket['status'] : 'open';
                $colorClass = $type === 'lost' ? 'type-lost' : 'type-found';
            ?>
                <div class="ticket-card">
                    <div class="ticket-header">
                        <span class="ticket-type <?= $colorClass ?>">
                            <span class="material-symbols-rounded" style="vertical-align: text-bottom; font-size: 1.1rem;">
                                <?= $type === 'lost' ? 'search' : 'inventory_2' ?>
                            </span>
                            <?= h(strtoupper($type)) ?> ITEM
                        </span>
                        <span class="ticket-date"><?= date('M d, Y h:i A', strtotime($ticket['created_at'])) ?></span>
                    </div>

                    <div class="row">
                        <div class="col-sm-4 col-12 ticket-row">
                            <span class="ticket-label">Reporter</span>
                            <div class="ticket-value">
                                <?php 
                                    $rawName = $ticket['reporter_name'] ?? 'Unknown User';
                                    $firstName = explode(' ', trim($rawName))[0];
                                ?>
                                #<?= h($ticket['user_id']) ?> - <?= h($firstName) ?>
                            </div>
                        </div>
                        <div class="col-sm-4 col-12 ticket-row">
                            <span class="ticket-label">Contact Number</span>
                            <div class="ticket-value">
                                <?php $cp = $ticket['reporter_contact'] ?? 'None provided'; ?>
                                <?php if ($cp !== 'None provided'): ?>
                                    <a href="tel:<?= h($cp) ?>" class="text-decoration-none fw-bold text-primary">
                                        <span class="material-symbols-rounded" style="font-size: 14px; vertical-align: middle;">call</span>
                                        <?= h($cp) ?>
                                    </a>
                                <?php else: ?>
                                    <i class="text-muted">None provided</i>
                                <?php endif; ?>
                            </div>
                        </div>
                        <div class="col-sm-4 col-12 ticket-row">
                            <span class="ticket-label">Bus Number</span>
                            <div class="ticket-value"><?= !empty($ticket['bus_number']) ? h($ticket['bus_number']) : '<i class="text-muted">Not specified</i>' ?></div>
                        </div>
                    </div>

                    <div class="ticket-row">
                        <span class="ticket-label">Item Description</span>
                        <div class="ticket-value" style="white-space: pre-wrap;"><?= h($ticket['item_description']) ?></div>
                    </div>

                    <?php if (!empty($ticket['image1_path']) || !empty($ticket['image2_path'])): ?>
                        <div class="ticket-row mt-3">
                            <span class="ticket-label mb-2">Attached Photos</span>
                            <div class="d-flex gap-2">
                                <?php if (!empty($ticket['image1_path'])): ?>
                                    <img src="../../<?= h($ticket['image1_path']) ?>" class="img-preview" alt="Attachment 1" onclick="openImageModal(this.src)" style="cursor: zoom-in;">
                                <?php endif; ?>
                                <?php if (!empty($ticket['image2_path'])): ?>
                                    <img src="../../<?= h($ticket['image2_path']) ?>" class="img-preview" alt="Attachment 2" onclick="openImageModal(this.src)" style="cursor: zoom-in;">
                                <?php endif; ?>
                            </div>
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
                                    <option value="open" <?= $status === 'open' ? 'selected' : '' ?>>Open</option>
                                    <option value="resolved" <?= $status === 'resolved' ? 'selected' : '' ?>>Resolved</option>
                                    <option value="closed" <?= $status === 'closed' ? 'selected' : '' ?>>Closed</option>
                                </select>
                            </form>
                        </div>

                        <form method="POST" class="m-0" onsubmit="return confirm('Permanently delete ticket #<?= $id ?>?');">
                            <input type="hidden" name="action" value="delete_ticket">
                            <input type="hidden" name="id" value="<?= h((string)$id) ?>">
                            <button type="submit" class="btn btn-danger-custom btn-pill border-0 shadow-sm" style="padding: 4px 12px; font-size: 0.8rem;">Delete</button>
                        </form>
                    </div>

                </div>
            <?php endforeach; ?>
        <?php endif; ?>
    </div>
</div>

<!-- Image Viewer Modal -->
<div class="modal fade" id="imageModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered modal-xl">
    <div class="modal-content bg-transparent border-0">
      <div class="modal-header border-0 pb-0 justify-content-end p-2 p-md-3">
        <button type="button" class="btn-close btn-close-white bg-dark rounded-circle p-2 shadow" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body text-center pt-2">
        <img id="modalImageDisplay" src="" alt="Full Screen Attachment" class="img-fluid rounded shadow-lg" style="max-height: 60vh; object-fit: contain;">
      </div>
    </div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
<script>
    function openImageModal(imgSrc) {
        document.getElementById('modalImageDisplay').src = imgSrc;
        var imageModal = new bootstrap.Modal(document.getElementById('imageModal'));
        imageModal.show();
    }
</script>
</body>
</html>
