<?php
declare(strict_types=1);

ini_set('display_errors', '1');
error_reporting(E_ALL);

require __DIR__ . '/../../config/db.php';

@session_start();

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

// --- Handle Form Submissions ---
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    try {
        if ($action === 'delete_feedback') {
            $id = $_POST['id'] ?? null;

            if (!$id) {
                $error = 'Invalid delete request (empty ID).';
            } else {
                $stmt = $conn->prepare("DELETE FROM feedbacks WHERE id = ?");
                $stmt->bind_param("i", $id);
                $stmt->execute();

                if ($stmt->affected_rows === 0) {
                    $error = 'No feedback deleted. Check that ID ' . h($id) . ' exists.';
                } else {
                    $message = 'Feedback deleted permanently.';
                }
            }
        }
    } catch (Throwable $e) {
        $error = 'Database error: ' . $e->getMessage();
    }
}

// --- Fetch All Entries ---
$feedbacks = [];
try {
    $resFeedbacks = $conn->query("
        SELECT f.*, u.name as passenger_name, u.email as passenger_email 
        FROM feedbacks f 
        LEFT JOIN users u ON f.user_id = u.id 
        ORDER BY f.created_at DESC
    ");
    $feedbacks = $resFeedbacks ? $resFeedbacks->fetch_all(MYSQLI_ASSOC) : [];
} catch (Throwable $e) {
    $feedbacks = [];
}

$totalFeedbacks = count($feedbacks);
$totalRating = 0;
$totalComments = 0;

foreach ($feedbacks as $fb) {
    $totalRating += (int)$fb['rating'];
    if (!empty(trim((string)$fb['feedback_text']))) {
        $totalComments++;
    }
}

$averageRating = $totalFeedbacks > 0 ? round($totalRating / $totalFeedbacks, 1) : 0;

/* === navbarAdmin config === */
$pageDepth = '../../';
$pageType  = 'manageFeedbacks';
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
    <title>ByaHero — Passenger Feedbacks</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0&display=swap" rel="stylesheet" media="print" onload="this.media='all'" />
    <style>
        <?php include __DIR__ . '/../../assets/css/admin/manageFeedbacks.css'; ?>
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
                    <span class="fs-4">Passenger Feedbacks</span>
                </div>

                <div class="card-body">
                    <?php if ($totalFeedbacks > 0): ?>
                        <div class="row g-3 mb-4">
                            <div class="col-md-6">
                                <div class="p-3 bg-light rounded-3 border d-flex align-items-center gap-3 h-100">
                                    <div class="display-5 fw-bold" style="color: #1e3a8a;"><?= number_format($averageRating, 1) ?></div>
                                    <div>
                                        <div class="text-muted small text-uppercase fw-bold mb-1">Average Rating</div>
                                        <div class="d-flex align-items-center">
                                            <?php 
                                            for ($i = 1; $i <= 5; $i++) {
                                                if ($i <= round($averageRating)) {
                                                    echo '<img src="../../assets/images/star_full.svg" style="width: 18px; height: 18px; margin-right: 2px;" alt="★">';
                                                } else {
                                                    echo '<img src="../../assets/images/star_blank.svg" style="width: 18px; height: 18px; margin-right: 2px;" alt="☆">';
                                                }
                                            }
                                            ?>
                                            <span class="ms-2 small text-muted">(<?= $totalFeedbacks ?> ratings)</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="p-3 bg-light rounded-3 border d-flex align-items-center gap-3 h-100">
                                    <div class="display-6 fw-bold" style="color: #1e3a8a;">
                                        <span class="material-symbols-rounded" style="font-size: 2.5rem; vertical-align: middle;">forum</span>
                                    </div>
                                    <div>
                                        <div class="text-muted small text-uppercase fw-bold mb-1">Total Comments</div>
                                        <div class="fs-4 fw-bold" style="color: #1e293b;"><?= $totalComments ?></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <hr class="mb-4" style="border-color: #e2e8f0;">
                    <?php endif; ?>

                    <?php if (empty($feedbacks)): ?>
                        <p class="text-muted small">No feedbacks submitted yet.</p>
                    <?php else: ?>
                        <?php foreach ($feedbacks as $fb):
                            $id = $fb['id'];
                            $rating = (int)$fb['rating'];
                            $starHtml = '';
                            for ($i = 1; $i <= 5; $i++) {
                                if ($i <= $rating) {
                                    $starHtml .= '<img src="../../assets/images/star_full.svg" style="width: 22px; height: 22px; margin-right: 2px;" alt="★">';
                                  } else {
                                    $starHtml .= '<img src="../../assets/images/star_blank.svg" style="width: 22px; height: 22px; margin-right: 2px;" alt="☆">';
                                }
                            }
                        ?>
                            <div class="border rounded-4 bg-white p-3 mb-3">
                                <div class="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
                                    <span class="fw-bold text-primary text-uppercase" style="font-size: 0.95rem;">
                                        <span class="material-symbols-rounded" style="vertical-align: text-bottom; font-size: 1.1rem;">
                                            reviews
                                        </span>
                                        FEEDBACK #<?= h((string)$id) ?>
                                    </span>
                                    <span class="small text-secondary" style="font-size: 0.8rem;"><?= date('M d, Y h:i A', strtotime($fb['created_at'])) ?></span>
                                </div>

                                <div class="row">
                                    <div class="col-sm-6 col-12 mb-2" style="font-size: 0.95rem;">
                                        <span class="text-primary fw-semibold d-block" style="font-size: 0.85rem;">Passenger</span>
                                        <div class="text-dark bg-light p-2 rounded-2 mt-1">
                                            <?php 
                                                $rawName = $fb['passenger_name'] ?? 'Unknown User';
                                                $firstName = explode(' ', trim($rawName))[0];
                                            ?>
                                            #<?= h($fb['user_id']) ?> - <?= h($firstName) ?>
                                            <div class="small text-muted"><?= h($fb['passenger_email'] ?? '') ?></div>
                                        </div>
                                    </div>
                                    <div class="col-sm-6 col-12 mb-2" style="font-size: 0.95rem;">
                                        <span class="text-primary fw-semibold d-block" style="font-size: 0.85rem;">Rating</span>
                                        <div class="text-dark bg-light p-2 rounded-2 mt-1 d-flex align-items-center" style="height: calc(100% - 1.25rem - 4px); min-height: 40px;">
                                            <?= $starHtml ?>
                                        </div>
                                    </div>
                                </div>

                                <?php if (!empty($fb['feedback_text'])): ?>
                                    <div class="mb-2 mt-2" style="font-size: 0.95rem;">
                                        <span class="text-primary fw-semibold d-block" style="font-size: 0.85rem;">Comments</span>
                                        <div class="text-dark bg-light p-2 rounded-2 mt-1" style="white-space: pre-wrap;"><?= h($fb['feedback_text']) ?></div>
                                    </div>
                                <?php else: ?>
                                    <div class="mb-2 mt-2" style="font-size: 0.95rem;">
                                        <span class="text-primary fw-semibold d-block" style="font-size: 0.85rem;">Comments</span>
                                        <div class="text-muted bg-light p-2 rounded-2 mt-1" style="font-style: italic;">No additional comments.</div>
                                    </div>
                                <?php endif; ?>

                                <hr class="mt-4 mb-3" style="border-color: #e2e8f0;">

                                <div class="d-flex justify-content-end align-items-center">
                                    <form method="POST" class="m-0" onsubmit="return confirm('Permanently delete feedback #<?= $id ?>?');">
                                        <input type="hidden" name="action" value="delete_feedback">
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
