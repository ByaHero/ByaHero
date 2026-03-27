<?php
declare(strict_types=1);

ini_set('display_errors', '1');
error_reporting(E_ALL);

require __DIR__ . '/../../config/db.php';
session_start();

/**
 * Base URL (works on localhost subfolder + InfinityFree)
 */
$scriptName = $_SERVER['SCRIPT_NAME'] ?? '/public/ADMIN/busFare.php';
$publicDir  = rtrim(str_replace('\\', '/', dirname($scriptName)), '/');
$baseUrl    = preg_replace('~/public/.*$~', '', $publicDir) ?: '';

if (empty($_SESSION['user_role']) || $_SESSION['user_role'] !== 'admin') {
    header('Location: ' . $baseUrl . '/public/login.php');
    exit;
}

$pdo = db();

function h($s): string {
    return htmlspecialchars((string)$s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function parseMoney(string $s): ?float {
    $s = trim($s);
    if ($s === '') return null;
    if (!preg_match('/^\d+(\.\d{1,2})?$/', $s)) return null;
    return round((float)$s, 2);
}

$message = '';
$error = '';

/**
 * Actions supported:
 * - update_fare (update an existing fare row by fare_id)
 * - bulk_adjust
 *
 * Note: No adding, no deleting.
 */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = (string)($_POST['action'] ?? '');

    try {
        if ($action === 'update_fare') {
            $fareId = (int)($_POST['fare_id'] ?? 0);
            $regular = parseMoney((string)($_POST['regular_fare'] ?? ''));
            $discounted = parseMoney((string)($_POST['discounted_fare'] ?? ''));

            if ($fareId <= 0) {
                $error = "Invalid fare selected.";
            } elseif ($regular === null || $discounted === null) {
                $error = "Please enter valid fares (numbers with up to 2 decimals).";
            } elseif ($regular < 0 || $discounted < 0) {
                $error = "Fare cannot be negative.";
            } elseif ($discounted > $regular) {
                $error = "Discounted fare cannot be higher than regular fare.";
            } else {
                $upd = $pdo->prepare("
                    UPDATE bus_fares
                    SET regular_fare = ?,
                        discounted_fare = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE fare_id = ?
                    LIMIT 1
                ");
                $upd->execute([$regular, $discounted, $fareId]);

                if ($upd->rowCount() > 0) {
                    $message = "Fare updated successfully.";
                } else {
                    $error = "No fare was updated (fare_id not found).";
                }
            }
        }

        elseif ($action === 'bulk_adjust') {
            $mode = (string)($_POST['mode'] ?? 'amount');              // amount | percent
            $direction = (string)($_POST['direction'] ?? 'increase');  // increase | decrease
            $applyTo = (string)($_POST['apply_to'] ?? 'both');         // regular | discounted | both
            $valueRaw = trim((string)($_POST['value'] ?? ''));

            $minDistRaw = trim((string)($_POST['min_distance_km'] ?? ''));
            $maxDistRaw = trim((string)($_POST['max_distance_km'] ?? ''));

            if ($valueRaw === '' || !is_numeric($valueRaw)) {
                $error = "Enter a valid bulk adjust value.";
            } else {
                $value = (float)$valueRaw;
                if ($value < 0) {
                    $error = "Bulk adjust value cannot be negative.";
                } else {
                    $sign = ($direction === 'decrease') ? -1.0 : 1.0;

                    $where = [];
                    $whereParams = [];

                    if ($minDistRaw !== '' && is_numeric($minDistRaw)) {
                        $where[] = "distance_km >= ?";
                        $whereParams[] = (float)$minDistRaw;
                    }
                    if ($maxDistRaw !== '' && is_numeric($maxDistRaw)) {
                        $where[] = "distance_km <= ?";
                        $whereParams[] = (float)$maxDistRaw;
                    }

                    $whereSql = $where ? (" WHERE " . implode(" AND ", $where)) : "";

                    $setParts = [];
                    $setParams = [];

                    if ($mode === 'percent') {
                        $mult = 1.0 + ($sign * ($value / 100.0));
                        if ($applyTo === 'regular' || $applyTo === 'both') {
                            $setParts[] = "regular_fare = GREATEST(0, ROUND(regular_fare * ?, 2))";
                            $setParams[] = $mult;
                        }
                        if ($applyTo === 'discounted' || $applyTo === 'both') {
                            $setParts[] = "discounted_fare = GREATEST(0, ROUND(discounted_fare * ?, 2))";
                            $setParams[] = $mult;
                        }
                    } else {
                        $delta = $sign * $value;
                        if ($applyTo === 'regular' || $applyTo === 'both') {
                            $setParts[] = "regular_fare = GREATEST(0, ROUND(regular_fare + ?, 2))";
                            $setParams[] = $delta;
                        }
                        if ($applyTo === 'discounted' || $applyTo === 'both') {
                            $setParts[] = "discounted_fare = GREATEST(0, ROUND(discounted_fare + ?, 2))";
                            $setParams[] = $delta;
                        }
                    }

                    if (empty($setParts)) {
                        $error = "Choose what to apply (regular/discounted/both).";
                    } else {
                        $sql = "UPDATE bus_fares
                                SET " . implode(", ", $setParts) . ",
                                    updated_at = CURRENT_TIMESTAMP
                                $whereSql";

                        $stmt = $pdo->prepare($sql);
                        $stmt->execute(array_merge($setParams, $whereParams));
                        $affected = $stmt->rowCount();

                        // Force discounted <= regular after bulk update
                        $fix = $pdo->prepare("UPDATE bus_fares
                                              SET discounted_fare = LEAST(discounted_fare, regular_fare),
                                                  updated_at = CURRENT_TIMESTAMP
                                              $whereSql");
                        $fix->execute($whereParams);

                        $message = "Bulk adjustment applied to {$affected} row(s).";
                    }
                }
            }
        }

    } catch (Throwable $e) {
        $error = "Database error: " . $e->getMessage();
    }
}

// Load stops for filter dropdowns
$stops = [];
try {
    $stops = $pdo->query("SELECT stop_id, km_marker, location_name FROM bus_stops ORDER BY km_marker ASC")
        ->fetchAll(PDO::FETCH_ASSOC);
} catch (Throwable $e) {
    $stops = [];
}

/**
 * Search / filter current fares
 */
$filterOrigin = (int)($_GET['origin'] ?? 0);
$filterDestination = (int)($_GET['destination'] ?? 0);
$q = trim((string)($_GET['q'] ?? ''));

$where = [];
$params = [];

if ($filterOrigin > 0) {
    $where[] = "bf.origin_stop_id = ?";
    $params[] = $filterOrigin;
}
if ($filterDestination > 0) {
    $where[] = "bf.destination_stop_id = ?";
    $params[] = $filterDestination;
}
if ($q !== '') {
    $where[] = "(o.location_name LIKE ? OR d.location_name LIKE ?)";
    $params[] = '%' . $q . '%';
    $params[] = '%' . $q . '%';
}

$whereSql = $where ? ("WHERE " . implode(" AND ", $where)) : "";

// Load fares list (filtered)
$fares = [];
try {
    $sql = "
        SELECT
            bf.fare_id,
            bf.origin_stop_id,
            o.location_name AS origin_name,
            bf.destination_stop_id,
            d.location_name AS dest_name,
            bf.distance_km,
            bf.regular_fare,
            bf.discounted_fare,
            bf.updated_at
        FROM bus_fares bf
        JOIN bus_stops o ON o.stop_id = bf.origin_stop_id
        JOIN bus_stops d ON d.stop_id = bf.destination_stop_id
        $whereSql
        ORDER BY bf.origin_stop_id ASC, bf.destination_stop_id ASC
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $fares = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (Throwable $e) {
    $fares = [];
}

/* === ADDED: navbarAdmin config (component) === */
$pageDepth = '../../';
$pageType = 'busFare';
$backLink = 'admin.php';
/* === END ADDED === */
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>ByaHero — Manage Bus Fares</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet">
    <style>
        :root { --brand: #2563eb; }
        body { background: #f8fafc; color: #1e293b; font-family: "Segoe UI", system-ui, sans-serif; }

        .card-standard { border: none; border-radius: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); background: #fff; }
        .card-header-std { background: #fff; border-bottom: 1px solid #e2e8f0; font-weight: 800; padding: 1rem 1.25rem; border-radius: 14px 14px 0 0 !important; }
        .table > :not(caption) > * > * { padding: 0.75rem 1rem; vertical-align: middle; }
        .mono { font-variant-numeric: tabular-nums; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
        .compact-input { min-width: 110px; }
        .pill-btn { border-radius: 999px; font-weight: 800; letter-spacing: .2px; }
    </style>
</head>
<body>

<!-- REMOVED old navbar; use component -->
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
        <!-- Bulk adjust -->
        <div class="col-lg-4">
            <div class="card card-standard">
                <div class="card-header-std text-primary">
                    <span class="material-icons-round align-middle me-1">tune</span>
                    Bulk Increase / Decrease
                </div>
                <div class="card-body">
                    <form method="POST" onsubmit="return confirm('Apply bulk adjustment? This updates many rows.');">
                        <input type="hidden" name="action" value="bulk_adjust">

                        <div class="row g-2 mb-2">
                            <div class="col-6">
                                <label class="form-label small fw-bold text-uppercase">Mode</label>
                                <select class="form-select" name="mode">
                                    <option value="amount">Amount (₱)</option>
                                    <option value="percent">Percent (%)</option>
                                </select>
                            </div>
                            <div class="col-6">
                                <label class="form-label small fw-bold text-uppercase">Direction</label>
                                <select class="form-select" name="direction">
                                    <option value="increase">Increase</option>
                                    <option value="decrease">Decrease</option>
                                </select>
                            </div>
                        </div>

                        <div class="mb-2">
                            <label class="form-label small fw-bold text-uppercase">Value</label>
                            <input class="form-control" name="value" placeholder="e.g. 1.00 or 10" required>
                        </div>

                        <div class="row g-2 mb-2">
                            <div class="col-6">
                                <label class="form-label small fw-bold text-uppercase">Min Distance (km)</label>
                                <input class="form-control" name="min_distance_km" placeholder="optional">
                            </div>
                            <div class="col-6">
                                <label class="form-label small fw-bold text-uppercase">Max Distance (km)</label>
                                <input class="form-control" name="max_distance_km" placeholder="optional">
                            </div>
                        </div>

                        <div class="mb-3">
                            <label class="form-label small fw-bold text-uppercase">Apply To</label>
                            <select class="form-select" name="apply_to">
                                <option value="both">Regular + Discounted</option>
                                <option value="regular">Regular only</option>
                                <option value="discounted">Discounted only</option>
                            </select>
                        </div>

                        <div class="d-grid">
                            <button class="btn btn-outline-primary pill-btn">Apply Bulk Change</button>
                        </div>

                        <div class="small text-muted mt-2">
                            Safety: fares never go below 0, and discounted is forced to never exceed regular.
                        </div>
                    </form>
                </div>
            </div>
        </div>

        <!-- Current Fares + Search + Update-only (inline) -->
        <div class="col-lg-8">
            <div class="card card-standard">
                <div class="card-header-std d-flex flex-wrap gap-2 justify-content-between align-items-center">
                    <div class="d-flex align-items-center gap-2">
                        <span class="material-icons-round text-primary">list</span>
                        <span>Current Fares (Update Only)</span>
                    </div>

                    <!-- Search/filter form -->
                    <form class="row g-2 align-items-end" method="GET">
                        <div class="col-12 col-md-4">
                            <label class="form-label small fw-bold text-uppercase mb-1">Origin</label>
                            <select class="form-select form-select-sm" name="origin">
                                <option value="0">All</option>
                                <?php foreach ($stops as $s): ?>
                                    <option value="<?= (int)$s['stop_id'] ?>" <?= $filterOrigin === (int)$s['stop_id'] ? 'selected' : '' ?>>
                                        <?= h($s['location_name']) ?>
                                    </option>
                                <?php endforeach; ?>
                            </select>
                        </div>

                        <div class="col-12 col-md-4">
                            <label class="form-label small fw-bold text-uppercase mb-1">Destination</label>
                            <select class="form-select form-select-sm" name="destination">
                                <option value="0">All</option>
                                <?php foreach ($stops as $s): ?>
                                    <option value="<?= (int)$s['stop_id'] ?>" <?= $filterDestination === (int)$s['stop_id'] ? 'selected' : '' ?>>
                                        <?= h($s['location_name']) ?>
                                    </option>
                                <?php endforeach; ?>
                            </select>
                        </div>

                        <div class="col-12 col-md-3">
                            <label class="form-label small fw-bold text-uppercase mb-1">Search Name</label>
                            <input class="form-control form-control-sm" name="q" value="<?= h($q) ?>" placeholder="e.g. Laurel">
                        </div>

                        <div class="col-12 col-md-1 d-grid">
                            <button class="btn btn-sm btn-outline-primary pill-btn">Go</button>
                        </div>

                        <div class="col-12 d-flex justify-content-end">
                            <a class="small text-muted text-decoration-none" href="busFare.php">Reset</a>
                        </div>
                    </form>
                </div>

                <div class="table-responsive">
                    <table class="table table-hover mb-0">
                        <thead class="table-light text-muted small text-uppercase">
                            <tr>
                                <th>ID</th>
                                <th>Route</th>
                                <th class="text-end">Distance</th>
                                <th class="text-end">Regular</th>
                                <th class="text-end">Discounted</th>
                                <th class="text-end">Updated</th>
                                <th class="text-end">Save</th>
                            </tr>
                        </thead>
                        <tbody>
                        <?php if (empty($fares)): ?>
                            <tr><td colspan="7" class="text-center text-muted py-4">No fares found for that search.</td></tr>
                        <?php else: foreach ($fares as $f): ?>
                            <tr>
                                <td class="mono"><?= (int)$f['fare_id'] ?></td>
                                <td>
                                    <div class="fw-bold"><?= h($f['origin_name']) ?> → <?= h($f['dest_name']) ?></div>
                                    <div class="small text-muted">
                                        origin_stop_id=<?= (int)$f['origin_stop_id'] ?>, destination_stop_id=<?= (int)$f['destination_stop_id'] ?>
                                    </div>
                                </td>
                                <td class="text-end mono"><?= number_format((float)$f['distance_km'], 2) ?> km</td>

                                <!-- Inline update form (per row) -->
                                <td class="text-end">
                                    <form method="POST" class="d-inline-flex gap-2 justify-content-end">
                                        <input type="hidden" name="action" value="update_fare">
                                        <input type="hidden" name="fare_id" value="<?= (int)$f['fare_id'] ?>">

                                        <input
                                            class="form-control form-control-sm text-end mono compact-input"
                                            name="regular_fare"
                                            value="<?= h(number_format((float)$f['regular_fare'], 2, '.', '')) ?>"
                                            required
                                        >
                                </td>

                                <td class="text-end">
                                        <input
                                            class="form-control form-control-sm text-end mono compact-input"
                                            name="discounted_fare"
                                            value="<?= h(number_format((float)$f['discounted_fare'], 2, '.', '')) ?>"
                                            required
                                        >
                                </td>

                                <td class="text-end small text-muted"><?= h($f['updated_at'] ?? '') ?></td>
                                <td class="text-end">
                                        <button class="btn btn-sm btn-primary pill-btn">Save</button>
                                    </form>
                                </td>
                            </tr>
                        <?php endforeach; endif; ?>
                        </tbody>
                    </table>
                </div>

                <div class="card-body border-top">
                    <div class="small text-muted">
                        Update-only mode: you can’t add/delete fares here. Use inline “Save” per row or use Bulk Increase/Decrease.
                    </div>
                </div>
            </div>
        </div>
    </div>

</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>