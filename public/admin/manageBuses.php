<?php
declare(strict_types=1);

ini_set('display_errors', '1');
error_reporting(E_ALL);

require __DIR__ . '/../../config/db.php';

@session_start();

// --- AUTH ---
if (empty($_SESSION['user_role']) || $_SESSION['user_role'] !== 'admin') {
    header('Location: ../login.php');
    exit;
}

$conn = db();
$message = '';
$error   = '';

function h($s): string {
    return htmlspecialchars((string)$s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/**
 * Only two statuses:
 * - available
 * - unavailable
 */
$ALLOWED_STATUS = ['available', 'unavailable'];

// --- Handle Form Submissions ---
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    try {
        // ADD BUS (code only, auto-available)
        if ($action === 'add_bus') {
            $code = trim((string)($_POST['code'] ?? ''));

            // new buses are always available
            $status     = 'available';
            $totalSeats = 25;

            if ($code === '') {
                $error = 'Bus Code is required.';
            } else {
                $stmt = $conn->prepare(
                    "INSERT INTO busses (code, route, total_seats, seat_availability, status)
                     VALUES (?, NULL, ?, ?, ?)"
                );
                $stmt->bind_param("siis", $code, $totalSeats, $totalSeats, $status);
                $stmt->execute();
                $message = "Bus <strong>" . h($code) . "</strong> added as available.";
            }
        }

        // UPDATE BUS STATUS
        elseif ($action === 'update_bus') {
            $id     = $_POST['id'] ?? null;       // this will be Bus_ID
            $status = (string)($_POST['status'] ?? 'unavailable');

            if (!in_array($status, $ALLOWED_STATUS, true)) {
                $status = 'unavailable';
            }

            if (!$id) {
                $error = 'Invalid update request (empty ID).';
            } else {
                $stmt = $conn->prepare("
                    UPDATE busses
                    SET status = ?
                    WHERE Bus_ID = ?
                ");
                $stmt->bind_param("si", $status, $id);
                $stmt->execute();
                $message = 'Bus updated.';
            }
        }

        // DELETE BUS
        elseif ($action === 'delete_bus') {
            $id = $_POST['id'] ?? null;            // this will be Bus_ID

            if (!$id) {
                $error = 'Invalid delete request (empty ID).';
            } else {
                $stmt = $conn->prepare("DELETE FROM busses WHERE Bus_ID = ?");
                $stmt->bind_param("i", $id);
                $stmt->execute();

                if ($stmt->affected_rows === 0) {
                    $error = 'No bus deleted. Check that Bus_ID ' . h($id) . ' exists.';
                } else {
                    $message = 'Bus deleted.';
                }
            }
        }
    } catch (Throwable $e) {
        $error = 'Database error: ' . $e->getMessage();
    }
}

// --- Fetch All Buses (simple list) ---
$buses = [];
try {
    $resBuses = $conn->query("SELECT * FROM busses ORDER BY code ASC");
    $buses = $resBuses ? $resBuses->fetch_all(MYSQLI_ASSOC) : [];
} catch (Throwable $e) {
    $buses = [];
}

/* === navbarAdmin config (component) === */
$pageDepth = '../../';
$pageType  = 'manageBuses';
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
    <title>ByaHero — Total Buses</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="../../assets/css/admin/manageBuses.css" rel="stylesheet">
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

        <div class="add-bus-card">
            <h2 class="section-title">Add Bus</h2>
            <form method="POST">
                <input type="hidden" name="action" value="add_bus">
                <div class="mb-3">
                    <input type="text" name="code" class="form-control add-bus-input w-100" placeholder="Bus 00001" required>
                </div>
                <div class="text-end">
                    <button type="submit" class="btn btn-primary-custom btn-pill">Save</button>
                </div>
            </form>
        </div>

        <div>
            <h2 class="section-title">All Buses</h2>

            <?php if (empty($buses)): ?>
                <p class="text-muted small">No buses yet. Add one above.</p>
            <?php else: ?>
                <?php foreach ($buses as $bus):
                    $id     = $bus['Bus_ID'] ?? null;
                    $status = in_array(($bus['status'] ?? ''), $ALLOWED_STATUS, true) ? $bus['status'] : 'unavailable';
                ?>
                    <div class="bus-card d-flex gap-3">
                        <div class="bus-icon-container">
                            <img src="../../assets/images/busonallbuses.svg" alt="Bus Icon">
                        </div>

                        <div class="flex-grow-1">
                            <div class="bus-card-row">
                                <span class="bus-card-label">Code</span>
                                <span class="bus-card-value"><?= h($bus['code'] ?? 'BUS') ?></span>
                            </div>

                            <div class="bus-card-row">
                                <span class="bus-card-label">Status</span>
                                <?php if ($status === 'available'): ?>
                                    <span class="badge-status badge-available">Available</span>
                                <?php else: ?>
                                    <span class="badge-status badge-unavailable">Unavailable</span>
                                <?php endif; ?>
                            </div>

                            <!-- Actions row: label + compact dropdown -->
                            <div class="bus-card-row actions-row">
                                <span class="bus-card-label">Actions</span>
                                <div class="actions-right">
                                    <select form="update-form-<?= $id ?>" name="status" class="form-select action-select">
                                        <option value="available"   <?= $status === 'available'   ? 'selected' : '' ?>>Available</option>
                                        <option value="unavailable" <?= $status === 'unavailable' ? 'selected' : '' ?>>Unavailable</option>
                                    </select>
                                </div>
                            </div>

                            <div class="d-flex justify-content-end gap-2 mt-3">
                                <form method="POST" id="update-form-<?= $id ?>" class="m-0">
                                    <input type="hidden" name="action" value="update_bus">
                                    <input type="hidden" name="id" value="<?= h((string)$id) ?>">
                                    <button type="submit" class="btn btn-primary-custom btn-pill">Save</button>
                                </form>

                                <form method="POST" class="m-0" onsubmit="return confirm('Delete bus <?= h($bus['code'] ?? '') ?>?');">
                                    <input type="hidden" name="action" value="delete_bus">
                                    <input type="hidden" name="id" value="<?= h((string)$id) ?>">
                                    <button type="submit" class="btn btn-danger-custom btn-pill">Delete</button>
                                </form>
                            </div>

                        </div>
                    </div>
                <?php endforeach; ?>
            <?php endif; ?>
        </div>

    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>