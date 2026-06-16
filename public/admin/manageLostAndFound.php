<?php
declare(strict_types=1);

ini_set('display_errors', '1');
error_reporting(E_ALL);

require __DIR__ . '/../../config/db.php';

@session_start();

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$isJson = (isset($_GET['json']) || isset($_POST['json']) || !empty($input) || (isset($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false));
if (!empty($input)) {
    $_POST = array_merge($_POST, $input);
}

// --- AUTH ---
if (empty($_SESSION['user_role']) || $_SESSION['user_role'] !== 'admin') {
    header("Location: ../login.php");
    exit;
}

$conn = db();
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
                $stmt = $conn->prepare("UPDATE lost_and_found SET status = ? WHERE id = ?");
                $stmt->bind_param("si", $status, $id);
                $stmt->execute();
                $message = 'Ticket updated successfully.';
            }
        } elseif ($action === 'delete_ticket') {
            $id = $_POST['id'] ?? null;

            if (!$id) {
                $error = 'Invalid delete request (empty ID).';
            } else {
                $stmt = $conn->prepare("DELETE FROM lost_and_found WHERE id = ?");
                $stmt->bind_param("i", $id);
                $stmt->execute();

                if ($stmt->affected_rows === 0) {
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
    $resTickets = $conn->query("
        SELECT lf.*, u.name as reporter_name, u.contacts as reporter_contact 
        FROM lost_and_found lf 
        LEFT JOIN users u ON lf.user_id = u.id 
        ORDER BY lf.created_at DESC
    ");
    $tickets = $resTickets ? $resTickets->fetch_all(MYSQLI_ASSOC) : [];
} catch (Throwable $e) {
    $tickets = [];
}

/* === navbarAdmin config === */
$pageDepth = '../../';
$pageType  = 'manageLostAndFound';
$backLink  = 'admin.php';

if ($isJson) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => empty($error),
        'message' => $message,
        'error' => $error,
        'tickets' => $tickets
    ]);
    exit;
}
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
    <title>ByaHero — Lost & Found</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0&display=swap" rel="stylesheet" media="print" onload="this.media='all'" />
    <style>
        <?php include __DIR__ . '/../../assets/css/admin/manageLostAndFound.css'; ?>
    </style>
</head>
<body>

<?php include __DIR__ . '/../../components/navbarAdmin.php'; ?>

<div class="container py-4" style="max-width: 600px;">

    <?php if ($message): ?>
        <div class="alert alert-success alert-dismissible fade show shadow-sm" role="alert" style="border-radius: 12px;">
            <?= $message ?>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    <?php endif; ?>

    <?php if ($error): ?>
        <div class="alert alert-danger alert-dismissible fade show shadow-sm" role="alert" style="border-radius: 12px;">
            <?= $error ?>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    <?php endif; ?>

    <h2 class="fw-bold text-dark mb-4" style="font-size: 1.25rem;">Lost and Found Board</h2>

    <?php if (empty($tickets)): ?>
        <p class="text-muted small">No items reported yet.</p>
    <?php else: ?>
        <?php foreach ($tickets as $ticket):
            $id     = $ticket['id'];
            $type   = $ticket['type'];
            $status = in_array(($ticket['status'] ?? ''), $ALLOWED_STATUS, true) ? $ticket['status'] : 'open';
            $textColorClass = $type === 'lost' ? 'text-danger' : 'text-success';
        ?>
            <div class="bg-white rounded-4 p-4 border mb-3 shadow-sm">
                <div class="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
                    <span class="fw-bold text-uppercase <?= $textColorClass ?>" style="font-size: 0.95rem;">
                        <span class="material-symbols-rounded" style="vertical-align: text-bottom; font-size: 1.1rem;">
                            <?= $type === 'lost' ? 'search' : 'inventory_2' ?>
                        </span>
                        <?= h(strtoupper($type)) ?> ITEM
                    </span>
                    <span class="small text-secondary" style="font-size: 0.8rem;"><?= date('M d, Y h:i A', strtotime($ticket['created_at'])) ?></span>
                </div>

                <div class="row">
                    <div class="col-sm-4 col-12 mb-2" style="font-size: 0.95rem;">
                        <span class="text-secondary fw-semibold d-block" style="font-size: 0.85rem;">Reporter</span>
                        <div class="text-dark bg-light p-2 rounded-2 mt-1">
                            <?php 
                                $rawName = $ticket['reporter_name'] ?? 'Unknown User';
                                $firstName = explode(' ', trim($rawName))[0];
                            ?>
                            #<?= h($ticket['user_id']) ?> - <?= h($firstName) ?>
                        </div>
                    </div>
                    <div class="col-sm-4 col-12 mb-2" style="font-size: 0.95rem;">
                        <span class="text-secondary fw-semibold d-block" style="font-size: 0.85rem;">Contact Number</span>
                        <div class="text-dark bg-light p-2 rounded-2 mt-1">
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
                    <div class="col-sm-4 col-12 mb-2" style="font-size: 0.95rem;">
                        <span class="text-secondary fw-semibold d-block" style="font-size: 0.85rem;">Bus Number</span>
                        <div class="text-dark bg-light p-2 rounded-2 mt-1"><?= !empty($ticket['bus_number']) ? h($ticket['bus_number']) : '<i class="text-muted">Not specified</i>' ?></div>
                    </div>
                </div>

                <div class="mb-2" style="font-size: 0.95rem;">
                    <span class="text-secondary fw-semibold d-block" style="font-size: 0.85rem;">Item Description</span>
                    <div class="text-dark bg-light p-2 rounded-2 mt-1" style="white-space: pre-wrap;"><?= h($ticket['item_description']) ?></div>
                </div>

                <?php if (!empty($ticket['image1_path']) || !empty($ticket['image2_path'])): ?>
                    <div class="mb-2 mt-3" style="font-size: 0.95rem;">
                        <span class="text-secondary fw-semibold d-block mb-2" style="font-size: 0.85rem;">Attached Photos</span>
                        <div class="d-flex gap-2">
                            <?php if (!empty($ticket['image1_path'])): ?>
                                <img src="../../<?= h($ticket['image1_path']) ?>" class="rounded-2 border" style="width: 60px; height: 60px; object-fit: cover; cursor: zoom-in;" alt="Attachment 1" onclick="openImageModal(this.src)">
                            <?php endif; ?>
                            <?php if (!empty($ticket['image2_path'])): ?>
                                <img src="../../<?= h($ticket['image2_path']) ?>" class="rounded-2 border" style="width: 60px; height: 60px; object-fit: cover; cursor: zoom-in;" alt="Attachment 2" onclick="openImageModal(this.src)">
                            <?php endif; ?>
                        </div>
                    </div>
                <?php endif; ?>

                <hr class="mt-4 mb-3" style="border-color: #eee;">

                <div class="d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center gap-2">
                        <span class="text-secondary fw-semibold d-block m-0" style="font-size: 0.85rem;">Status:</span>
                        <form method="POST" id="update-form-<?= $id ?>" class="m-0 d-flex gap-2">
                            <input type="hidden" name="action" value="update_status">
                            <input type="hidden" name="id" value="<?= h((string)$id) ?>">
                            <select name="status" class="form-select rounded-pill px-3 py-1 fw-semibold text-dark border-0 bg-light" style="font-size: 0.8rem; box-shadow: inset 0 0 0 1px #e5e7eb;" onchange="this.form.submit()">
                                <option value="open" <?= $status === 'open' ? 'selected' : '' ?>>Open</option>
                                <option value="resolved" <?= $status === 'resolved' ? 'selected' : '' ?>>Resolved</option>
                                <option value="closed" <?= $status === 'closed' ? 'selected' : '' ?>>Closed</option>
                            </select>
                        </form>
                    </div>

                    <form method="POST" class="m-0" onsubmit="return confirm('Permanently delete ticket #<?= $id ?>?');">
                        <input type="hidden" name="action" value="delete_ticket">
                        <input type="hidden" name="id" value="<?= h((string)$id) ?>">
                        <button type="submit" class="btn btn-danger rounded-pill px-3 py-1 fw-bold shadow-sm" style="background-color: #b91c1c; border-color: #b91c1c; font-size: 0.8rem;">Delete</button>
                    </form>
                </div>

            </div>
        <?php endforeach; ?>
    <?php endif; ?>
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
    <?php include __DIR__ . '/../../assets/js/admin/manageLostAndFound.js'; ?>
</script>
</body>
</html>
