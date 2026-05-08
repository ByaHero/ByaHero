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
    <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
    <title>ByaHero — Total Buses</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body {
            background: #f8f9fa;
            color: #212529;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }
        .app-shell {
            max-width: 420px;
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

        .add-bus-card {
            background: #f4f5f7;
            border-radius: 16px;
            padding: 20px;
            border: 1px solid #e5e7eb;
            margin-bottom: 30px;
        }
        .add-bus-input {
            border: none;
            border-radius: 8px;
            padding: 10px 15px;
            background: #ffffff;
            font-size: 0.95rem;
        }
        .add-bus-input::placeholder {
            color: #9ca3af;
        }

        .bus-card {
            background: #ffffff;
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 16px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.03);
            border: none;
        }
        .bus-card-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            font-size: 0.95rem;
        }
        .bus-card-label {
            color: #4b5563;
            font-size: 0.9rem;
        }
        .bus-card-value {
            font-weight: 700;
            color: #000;
        }
        .bus-icon-container {
            width: 60px;
            flex-shrink: 0;
            display: flex;
            justify-content: center;
            margin-top: 5px;
        }
        .bus-icon-container img {
            max-width: 100%;
            height: auto;
        }

        .badge-status {
            border-radius: 999px;
            padding: 4px 12px;
            font-size: 0.75rem;
            font-weight: 700;
        }
        .badge-available {
            background: #a7f3d0;
            color: #065f46;
        }
        .badge-unavailable {
            background: #fecaca;
            color: #991b1b;
        }

        /* Actions row: label on left, compact pill-style select on right */
        .bus-card-row.actions-row {
            align-items: center;
            margin-top: 4px;
        }
        .actions-right {
            display: flex;
            align-items: center;
            justify-content: flex-end;
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
            min-width: 120px;
        }
        .action-select:focus {
            outline: none;
            box-shadow: inset 0 0 0 1px #1e5dd9;
        }

        .btn-pill {
            border-radius: 999px;
            font-weight: 700;
            font-size: 0.85rem;
            padding: 6px 20px;
            border: none;
        }
        .btn-primary-custom {
            background-color: #1e5dd9;
            color: #fff;
        }
        .btn-primary-custom:hover {
            background-color: #164bb8;
            color: #fff;
        }
        .btn-danger-custom {
            background-color: #b91c1c;
            color: #fff;
        }
        .btn-danger-custom:hover {
            background-color: #991b1b;
            color: #fff;
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