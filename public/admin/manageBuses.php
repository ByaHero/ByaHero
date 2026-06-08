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
    <style>
        <?php include __DIR__ . '/../../assets/css/admin/manageBuses.css'; ?>
    </style>
</head>
<body>

<?php include __DIR__ . '/../../components/navbarAdmin.php'; ?>

<div class="container py-4" style="max-width: 420px;">

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

    <div class="bg-light rounded-4 p-4 border mb-4">
        <h2 class="fw-bold text-dark mb-3" style="font-size: 1.25rem;">Add Bus</h2>
        <form method="POST">
            <input type="hidden" name="action" value="add_bus">
            <div class="mb-3">
                <input type="text" name="code" class="form-control bg-white border" style="border-radius: 8px; padding: 10px 15px; font-size: 0.95rem;" placeholder="Bus 00001" required>
            </div>
            <div class="text-end">
                <button type="submit" class="btn btn-primary rounded-pill px-4 py-2 fw-bold" style="background-color: #1e5dd9; border-color: #1e5dd9; font-size: 0.85rem;">Save</button>
            </div>
        </form>
    </div>

    <div>
        <h2 class="fw-bold text-dark mb-3" style="font-size: 1.25rem;">All Buses</h2>

        <?php if (empty($buses)): ?>
            <p class="text-muted small">No buses yet. Add one above.</p>
        <?php else: ?>
            <?php foreach ($buses as $bus):
                $id     = $bus['Bus_ID'] ?? null;
                $status = in_array(($bus['status'] ?? ''), $ALLOWED_STATUS, true) ? $bus['status'] : 'unavailable';
            ?>
                <div class="bg-white rounded-4 p-4 border mb-3 shadow-sm d-flex gap-3">
                    <div class="d-flex justify-content-center mt-1" style="width: 60px; flex-shrink: 0;">
                        <img src="../../assets/images/busonallbuses.svg" alt="Bus Icon" style="max-width: 100%; height: auto;">
                    </div>

                    <div class="flex-grow-1">
                        <div class="d-flex justify-content-between align-items-center mb-2" style="font-size: 0.95rem;">
                            <span class="text-secondary" style="font-size: 0.9rem;">Code</span>
                            <span class="fw-bold text-dark"><?= h($bus['code'] ?? 'BUS') ?></span>
                        </div>

                        <div class="d-flex justify-content-between align-items-center mb-2" style="font-size: 0.95rem;">
                            <span class="text-secondary" style="font-size: 0.9rem;">Status</span>
                            <?php if ($status === 'available'): ?>
                                <span class="badge rounded-pill px-3 py-1 fw-bold text-uppercase" style="background: #a7f3d0; color: #065f46; font-size: 0.75rem;">Available</span>
                            <?php else: ?>
                                <span class="badge rounded-pill px-3 py-1 fw-bold text-uppercase" style="background: #fecaca; color: #991b1b; font-size: 0.75rem;">Unavailable</span>
                            <?php endif; ?>
                        </div>

                        <!-- Actions row: label + compact dropdown -->
                        <div class="d-flex justify-content-between align-items-center mb-2" style="font-size: 0.95rem; margin-top: 4px;">
                            <span class="text-secondary" style="font-size: 0.9rem;">Actions</span>
                            <div class="d-flex align-items-center justify-content-end">
                                <select form="update-form-<?= $id ?>" name="status" class="form-select rounded-pill px-3 py-1 fw-semibold text-dark border-0 bg-light" style="font-size: 0.8rem; min-width: 120px; box-shadow: inset 0 0 0 1px #e5e7eb;">
                                    <option value="available"   <?= $status === 'available'   ? 'selected' : '' ?>>Available</option>
                                    <option value="unavailable" <?= $status === 'unavailable' ? 'selected' : '' ?>>Unavailable</option>
                                </select>
                            </div>
                        </div>

                        <div class="d-flex justify-content-end gap-2 mt-3">
                            <form method="POST" id="update-form-<?= $id ?>" class="m-0">
                                <input type="hidden" name="action" value="update_bus">
                                <input type="hidden" name="id" value="<?= h((string)$id) ?>">
                                <button type="submit" class="btn btn-primary rounded-pill px-4 py-2 fw-bold" style="background-color: #1e5dd9; border-color: #1e5dd9; font-size: 0.85rem;">Save</button>
                            </form>

                            <form method="POST" class="m-0" onsubmit="return confirm('Delete bus <?= h($bus['code'] ?? '') ?>?');">
                                <input type="hidden" name="action" value="delete_bus">
                                <input type="hidden" name="id" value="<?= h((string)$id) ?>">
                                <button type="submit" class="btn btn-danger rounded-pill px-4 py-2 fw-bold" style="background-color: #b91c1c; border-color: #b91c1c; font-size: 0.85rem;">Delete</button>
                            </form>
                        </div>

                    </div>
                </div>
            <?php endforeach; ?>
        <?php endif; ?>
    </div>

</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>