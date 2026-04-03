<?php
declare(strict_types=1);

ini_set('display_errors', '1');
error_reporting(E_ALL);

require __DIR__ . '/../../config/db.php';
session_start();

$scriptName = $_SERVER['SCRIPT_NAME'] ?? '/public/ADMIN/busFare.php';
$publicDir  = rtrim(str_replace('\\', '/', dirname($scriptName)), '/');
$baseUrl    = preg_replace('~/public/.*$~', '', $publicDir) ?: '';

if (empty($_SESSION['user_role']) || $_SESSION['user_role'] !== 'admin') {
    header('Location: ' . $baseUrl . '/public/login.php');
    exit;
}

$pdo = db();

/* ---------------- Helpers ---------------- */
function h($s): string {
    return htmlspecialchars((string)$s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function parseMoney(string $s): ?float {
    $s = trim($s);
    if ($s === '') return null;
    if (!preg_match('/^\d+(\.\d{1,2})?$/', $s)) return null;
    return round((float)$s, 2);
}

function parseFloat(string $s): ?float {
    $s = trim($s);
    if ($s === '') return null;
    if (!preg_match('/^\d+(\.\d+)?$/', $s)) return null;
    return (float)$s;
}

function snapshotsAvailable(PDO $pdo): bool {
    try {
        $pdo->query("SELECT 1 FROM bus_fare_snapshots LIMIT 1");
        $pdo->query("SELECT 1 FROM bus_fare_snapshot_rows LIMIT 1");
        return true;
    } catch (Throwable $e) {
        return false;
    }
}

/* ---------------- State ---------------- */
$message = '';
$error = '';

/**
 * BEST PRACTICE DEFAULTS
 * - Non-stacking distance rule (uses base_* columns)
 * - Undo via "Reset to Base"
 * - True rollback via Snapshots (create + restore)
 */
$defaultThresholdKm = '4';
$defaultRatePerKm   = '1.20';

/* ---------------- Actions ---------------- */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = (string)($_POST['action'] ?? '');

    try {
        /* Update single fare (manual edit) */
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
                $message = ($upd->rowCount() > 0) ? "Fare updated successfully." : "No fare was updated.";
            }
        }

        /* Bulk amount adjustment (amount-only, with optional distance range filter) */
        elseif ($action === 'bulk_adjust') {
            $direction = (string)($_POST['direction'] ?? 'increase');
            $applyTo   = (string)($_POST['apply_to'] ?? 'both');

            $valueRaw  = trim((string)($_POST['value'] ?? ''));
            $minRaw    = trim((string)($_POST['min_distance_km'] ?? ''));
            $maxRaw    = trim((string)($_POST['max_distance_km'] ?? ''));

            if ($valueRaw === '' || !is_numeric($valueRaw)) {
                $error = "Enter a valid amount (₱) for adjustment.";
            } else {
                $value = (float)$valueRaw;
                if ($value < 0) {
                    $error = "Value cannot be negative.";
                } else {
                    $delta = ($direction === 'decrease') ? -$value : $value;

                    $where = [];
                    $whereParams = [];

                    // Range filter:
                    // Min => distance_km >= Min
                    // Max => distance_km <= Max
                    if ($minRaw !== '' && is_numeric($minRaw)) {
                        $where[] = "distance_km >= ?";
                        $whereParams[] = (float)$minRaw;
                    }
                    if ($maxRaw !== '' && is_numeric($maxRaw)) {
                        $where[] = "distance_km <= ?";
                        $whereParams[] = (float)$maxRaw;
                    }

                    if ($minRaw !== '' && $maxRaw !== '' && is_numeric($minRaw) && is_numeric($maxRaw) && (float)$minRaw > (float)$maxRaw) {
                        $error = "Min (km) cannot be greater than Max (km).";
                    } else {
                        $whereSql = $where ? (" WHERE " . implode(" AND ", $where)) : "";

                        $setParts = [];
                        $setParams = [];

                        if ($applyTo === 'regular' || $applyTo === 'both') {
                            $setParts[] = "regular_fare = GREATEST(0, ROUND(regular_fare + ?, 2))";
                            $setParams[] = $delta;
                        }
                        if ($applyTo === 'discounted' || $applyTo === 'both') {
                            $setParts[] = "discounted_fare = GREATEST(0, ROUND(discounted_fare + ?, 2))";
                            $setParams[] = $delta;
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

                            // Keep discounted <= regular
                            $fix = $pdo->prepare("
                                UPDATE bus_fares
                                SET discounted_fare = LEAST(discounted_fare, regular_fare),
                                    updated_at = CURRENT_TIMESTAMP
                                $whereSql
                            ");
                            $fix->execute($whereParams);

                            $rangeText = "all distances";
                            if ($where) {
                                $parts = [];
                                if ($minRaw !== '' && is_numeric($minRaw)) $parts[] = ">= " . (float)$minRaw . "km";
                                if ($maxRaw !== '' && is_numeric($maxRaw)) $parts[] = "<= " . (float)$maxRaw . "km";
                                $rangeText = implode(" and ", $parts);
                            }

                            $message = "Bulk adjustment of ₱" . number_format($value, 2) . " applied to {$affected} row(s) ({$rangeText}).";
                        }
                    }
                }
            }
        }

        /* Distance Rule (custom, safe & non-stacking; computed from base_* columns) */
        elseif ($action === 'apply_distance_rule') {
            $thresholdRaw = (string)($_POST['threshold_km'] ?? $defaultThresholdKm);
            $rateRaw = (string)($_POST['rate_per_km'] ?? $defaultRatePerKm);

            $thresholdKm = parseFloat($thresholdRaw);
            $ratePerKm = parseFloat($rateRaw);

            if ($thresholdKm === null || $ratePerKm === null) {
                $error = "Enter valid numbers for threshold km and rate per km.";
            } elseif ($thresholdKm < 0) {
                $error = "Threshold cannot be negative.";
            } elseif ($ratePerKm < 0) {
                $error = "Rate per km cannot be negative.";
            } else {
                // Ensure base exists (only if NULL)
                $pdo->exec("
                    UPDATE bus_fares
                    SET base_regular_fare = regular_fare,
                        base_discounted_fare = discounted_fare
                    WHERE base_regular_fare IS NULL
                       OR base_discounted_fare IS NULL
                ");

                $stmt = $pdo->prepare("
                    UPDATE bus_fares
                    SET
                        regular_fare = ROUND(
                            base_regular_fare + GREATEST(0, distance_km - ?) * ?
                        , 2),
                        discounted_fare = ROUND(
                            LEAST(
                                base_discounted_fare + GREATEST(0, distance_km - ?) * ?,
                                base_regular_fare + GREATEST(0, distance_km - ?) * ?
                            )
                        , 2),
                        updated_at = CURRENT_TIMESTAMP
                ");
                $stmt->execute([
                    $thresholdKm, $ratePerKm,
                    $thresholdKm, $ratePerKm,
                    $thresholdKm, $ratePerKm
                ]);

                $message = "Distance rule applied: 0–{$thresholdKm}km unchanged; above {$thresholdKm}km adds ₱" . number_format($ratePerKm, 2) . "/km. Rows updated: " . $stmt->rowCount();
            }
        }

        /* Revoke computed rule: Reset fares to base (safe undo) */
        elseif ($action === 'reset_to_base') {
            $stmt = $pdo->prepare("
                UPDATE bus_fares
                SET
                    regular_fare = base_regular_fare,
                    discounted_fare = LEAST(base_discounted_fare, base_regular_fare),
                    updated_at = CURRENT_TIMESTAMP
            ");
            $stmt->execute();
            $message = "Reverted to base fares. Rows updated: " . $stmt->rowCount();
        }

        /* Snapshots: Create checkpoint */
        elseif ($action === 'snapshot_create') {
            $label = trim((string)($_POST['snapshot_label'] ?? ''));
            if ($label === '') $label = 'Snapshot ' . date('Y-m-d H:i:s');

            $pdo->beginTransaction();

            $ins = $pdo->prepare("INSERT INTO bus_fare_snapshots (label) VALUES (?)");
            $ins->execute([$label]);
            $snapshotId = (int)$pdo->lastInsertId();

            $pdo->exec("
                INSERT INTO bus_fare_snapshot_rows
                  (snapshot_id, fare_id, regular_fare, discounted_fare, base_regular_fare, base_discounted_fare, distance_km, origin_stop_id, destination_stop_id)
                SELECT
                  {$snapshotId}, fare_id, regular_fare, discounted_fare, base_regular_fare, base_discounted_fare, distance_km, origin_stop_id, destination_stop_id
                FROM bus_fares
            ");

            $pdo->commit();
            $message = "Snapshot created: " . h($label);
        }

        /* Snapshots: Restore checkpoint (true rollback) */
        elseif ($action === 'snapshot_restore') {
            $snapshotId = (int)($_POST['snapshot_id'] ?? 0);
            if ($snapshotId <= 0) {
                $error = "Invalid snapshot selected.";
            } else {
                $pdo->beginTransaction();

                $stmt = $pdo->prepare("
                    UPDATE bus_fares bf
                    JOIN bus_fare_snapshot_rows r
                      ON r.fare_id = bf.fare_id
                     AND r.snapshot_id = ?
                    SET
                      bf.regular_fare = r.regular_fare,
                      bf.discounted_fare = r.discounted_fare,
                      bf.base_regular_fare = r.base_regular_fare,
                      bf.base_discounted_fare = r.base_discounted_fare,
                      bf.updated_at = CURRENT_TIMESTAMP
                ");
                $stmt->execute([$snapshotId]);

                $pdo->commit();
                $message = "Snapshot restored. Rows updated: " . $stmt->rowCount();
            }
        }

    } catch (Throwable $e) {
        $msg = $e->getMessage();
        if (stripos($msg, 'bus_fare_snapshots') !== false || stripos($msg, 'bus_fare_snapshot_rows') !== false) {
            $error = "Snapshot feature is not enabled (tables missing).";
        } else {
            $error = "Database error: " . $msg;
        }
    }
}

/* ---------------- Search / Listing ---------------- */
$filterOrigin = (int)($_GET['origin'] ?? 0);
$filterDestination = (int)($_GET['destination'] ?? 0);
$q = trim((string)($_GET['q'] ?? ''));

$searchWhere = [];
$searchParams = [];

if ($filterOrigin > 0) { $searchWhere[] = "bf.origin_stop_id = ?"; $searchParams[] = $filterOrigin; }
if ($filterDestination > 0) { $searchWhere[] = "bf.destination_stop_id = ?"; $searchParams[] = $filterDestination; }
if ($q !== '') { $searchWhere[] = "(o.location_name LIKE ? OR d.location_name LIKE ?)"; $searchParams[] = "%$q%"; $searchParams[] = "%$q%"; }

$searchWhereSql = $searchWhere ? ("WHERE " . implode(" AND ", $searchWhere)) : "";

$fares = [];
try {
    $stmt = $pdo->prepare("
        SELECT bf.*, o.location_name AS origin_name, d.location_name AS dest_name
        FROM bus_fares bf
        JOIN bus_stops o ON o.stop_id = bf.origin_stop_id
        JOIN bus_stops d ON d.stop_id = bf.destination_stop_id
        $searchWhereSql
        ORDER BY bf.origin_stop_id ASC, bf.destination_stop_id ASC
    ");
    $stmt->execute($searchParams);
    $fares = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (Throwable $e) {
    $fares = [];
}

/* Snapshots list */
$snapshots = [];
if (snapshotsAvailable($pdo)) {
    try {
        $snapshots = $pdo->query("
            SELECT snapshot_id, label, created_at
            FROM bus_fare_snapshots
            ORDER BY snapshot_id DESC
            LIMIT 30
        ")->fetchAll(PDO::FETCH_ASSOC);
    } catch (Throwable $e) {
        $snapshots = [];
    }
}

/* navbar component */
$pageDepth = '../../';
$pageType = 'busFare';
$backLink = 'admin.php';
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
        .card-header-std { background: #fff; border-bottom: 1px solid #e2e8f0; font-weight: 900; padding: 1rem 1.25rem; border-radius: 14px 14px 0 0 !important; }

        .mono { font-variant-numeric: tabular-nums; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
        .pill-btn { border-radius: 999px; font-weight: 900; }

        .help-box {
            border: 1px dashed rgba(148,163,184,0.6);
            background: rgba(248,250,252,0.75);
            border-radius: 12px;
            padding: 10px 12px;
        }

        /* ONLY CHANGE 1: labels should be black */
        .form-label { color: #000 !important; }

        /* ONLY CHANGE 1b: section headers that were text-primary should be black */
        .card-header-std.text-primary { color: #000 !important; }

        /* ONLY CHANGE 2: all outline buttons become solid like Save */
        .btn-outline-primary {
            background-color: var(--brand) !important;
            border-color: var(--brand) !important;
            color: #fff !important;
        }
        .btn-outline-secondary {
            background-color: #64748b !important;   /* solid gray */
            border-color: #64748b !important;
            color: #fff !important;
        }
        .btn-outline-primary:hover,
        .btn-outline-primary:focus {
            filter: brightness(0.95);
        }
        .btn-outline-secondary:hover,
        .btn-outline-secondary:focus {
            filter: brightness(0.95);
        }

        @media (max-width: 991.98px) {
            .table-responsive { border-radius: 14px; }
            .table td, .table th { white-space: nowrap; }
        }
    </style>
</head>
<body>

<?php include __DIR__ . '/../../components/navbarAdmin.php'; ?>

<div class="container py-4">
    <?php if ($message): ?>
        <div class="alert alert-success alert-dismissible fade show shadow-sm" role="alert">
            <span class="material-icons-round fs-5 align-middle me-2">check_circle</span><?= h($message) ?>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    <?php endif; ?>

    <?php if ($error): ?>
        <div class="alert alert-danger alert-dismissible fade show shadow-sm" role="alert">
            <span class="material-icons-round fs-5 align-middle me-2">error</span><?= h($error) ?>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    <?php endif; ?>

    <div class="row g-4">
        <div class="col-lg-4">

            <!-- Bulk adjustment -->
            <div class="card card-standard mb-4">
                <div class="card-header-std text-primary">
                    <span class="material-icons-round align-middle me-1">payments</span>
                    Bulk Amount Adjustment (₱ only)
                </div>
                <div class="card-body">
                    <div class="help-box small text-muted mb-3">
                        <div class="fw-bold text-dark mb-1">What Min/Max km means</div>
                        <div><strong>Min (km)</strong>: applies only to fares where <code>distance_km ≥ Min</code></div>
                        <div><strong>Max (km)</strong>: applies only to fares where <code>distance_km ≤ Max</code></div>
                        <div class="mt-2">
                            Example: Min=5 and Max=10 updates only fares with distance 5–10km.
                            Leave both blank to apply to all fares.
                        </div>
                    </div>

                    <form method="POST" onsubmit="return confirm('Apply bulk amount adjustment?');">
                        <input type="hidden" name="action" value="bulk_adjust">

                        <div class="mb-3">
                            <label class="form-label small fw-bold text-uppercase">Adjustment Type</label>
                            <select class="form-select" name="direction">
                                <option value="increase">Increase (+)</option>
                                <option value="decrease">Decrease (-)</option>
                            </select>
                        </div>

                        <div class="mb-3">
                            <label class="form-label small fw-bold text-uppercase">Amount (₱)</label>
                            <input class="form-control" name="value" placeholder="e.g. 5.50" required>
                        </div>

                        <div class="row g-2 mb-3">
                            <div class="col-6">
                                <label class="form-label small fw-bold text-uppercase">Min (km)</label>
                                <input class="form-control" name="min_distance_km" placeholder="(optional)">
                            </div>
                            <div class="col-6">
                                <label class="form-label small fw-bold text-uppercase">Max (km)</label>
                                <input class="form-control" name="max_distance_km" placeholder="(optional)">
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
                            <button class="btn btn-primary pill-btn">Apply Adjustment</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Distance rule (custom + safe) -->
            <div class="card card-standard mb-4">
                <div class="card-header-std text-primary">
                    <span class="material-icons-round align-middle me-1">rule</span>
                    Distance Rule (Custom, Safe)
                </div>
                <div class="card-body">
                    <div class="help-box small text-muted mb-3">
                        <div class="fw-bold text-dark mb-1">How it works</div>
                        <div>Uses <code>base_regular_fare</code> / <code>base_discounted_fare</code> so it is <strong>non-stacking</strong>.</div>
                        <div>Distances up to the threshold stay the same. Above it, adds <strong>Rate per km</strong>.</div>
                        <div class="mt-2">To revoke: use <strong>Reset fares to Base</strong> below.</div>
                    </div>

                    <form method="POST" onsubmit="return confirm('Apply distance rule to ALL fares with these settings?');">
                        <input type="hidden" name="action" value="apply_distance_rule">

                        <div class="row g-2 mb-3">
                            <div class="col-6">
                                <label class="form-label small fw-bold text-uppercase">Threshold (km)</label>
                                <input class="form-control" name="threshold_km" value="<?= h($defaultThresholdKm) ?>">
                            </div>
                            <div class="col-6">
                                <label class="form-label small fw-bold text-uppercase">Rate / km (₱)</label>
                                <input class="form-control" name="rate_per_km" value="<?= h($defaultRatePerKm) ?>">
                            </div>
                        </div>

                        <div class="d-grid">
                            <button class="btn btn-outline-primary pill-btn">Apply Distance Rule</button>
                        </div>
                    </form>

                    <hr>

                    <form method="POST" onsubmit="return confirm('Revoke changes by resetting ALL fares back to base?');">
                        <input type="hidden" name="action" value="reset_to_base">
                        <div class="d-grid">
                            <button class="btn btn-outline-secondary pill-btn">Reset fares to Base (Revoke)</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Snapshots -->
            <div class="card card-standard">
                <div class="card-header-std text-primary">
                    <span class="material-icons-round align-middle me-1">history</span>
                    Snapshots (Rollback)
                </div>
                <div class="card-body">
                    <div class="help-box small text-muted mb-3">
                        <div class="fw-bold text-dark mb-1">Best practice</div>
                        <div>Create a snapshot before doing big updates. If anything goes wrong, restore it.</div>
                    </div>

                    <form method="POST" class="mb-3" onsubmit="return confirm('Create snapshot of ALL fares now?');">
                        <input type="hidden" name="action" value="snapshot_create">
                        <label class="form-label small fw-bold text-uppercase">Snapshot label</label>
                        <input class="form-control mb-2" name="snapshot_label" placeholder="e.g. Before April rate change">
                        <div class="d-grid">
                            <button class="btn btn-outline-primary pill-btn">Create Snapshot</button>
                        </div>
                    </form>

                    <form method="POST" onsubmit="return confirm('Restore selected snapshot? This overwrites fares + base fares.');">
                        <input type="hidden" name="action" value="snapshot_restore">

                        <label class="form-label small fw-bold text-uppercase">Restore snapshot</label>
                        <select class="form-select mb-2" name="snapshot_id" <?= empty($snapshots) ? 'disabled' : '' ?>>
                            <?php if (empty($snapshots)): ?>
                                <option value="">No snapshots found</option>
                            <?php else: foreach ($snapshots as $s): ?>
                                <option value="<?= (int)$s['snapshot_id'] ?>">
                                    #<?= (int)$s['snapshot_id'] ?> — <?= h($s['label']) ?> (<?= h($s['created_at']) ?>)
                                </option>
                            <?php endforeach; endif; ?>
                        </select>

                        <div class="d-grid">
                            <button class="btn btn-outline-secondary pill-btn" <?= empty($snapshots) ? 'disabled' : '' ?>>Restore Snapshot</button>
                        </div>
                    </form>

                </div>
            </div>

        </div>

        <!-- Fare list -->
        <div class="col-lg-8">
            <div class="card card-standard">
                <div class="card-header-std d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <span>
                        <span class="material-icons-round text-primary align-middle me-1">list</span>
                        Current Fares
                    </span>
                    <form class="d-flex gap-2" method="GET">
                        <input class="form-control form-control-sm" name="q" value="<?= h($q) ?>" placeholder="Search origin/destination...">
                        <button class="btn btn-sm btn-outline-primary pill-btn px-3">Filter</button>
                    </form>
                </div>

                <div class="table-responsive">
                    <table class="table table-hover mb-0">
                        <thead class="table-light text-muted small">
                            <tr>
                                <th>Route</th>
                                <th class="text-end">Regular</th>
                                <th class="text-end">Discounted</th>
                                <th class="text-end">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if (empty($fares)): ?>
                                <tr><td colspan="4" class="text-center text-muted py-4">No fares found.</td></tr>
                            <?php else: foreach ($fares as $f): ?>
                            <tr>
                                <td style="min-width:260px">
                                    <div class="fw-bold"><?= h($f['origin_name']) ?> → <?= h($f['dest_name']) ?></div>
                                    <div class="small text-muted"><?= number_format((float)$f['distance_km'], 2) ?> km</div>
                                </td>

                                <td class="text-end">
                                    <form method="POST" class="d-inline-flex gap-1 align-items-center">
                                        <input type="hidden" name="action" value="update_fare">
                                        <input type="hidden" name="fare_id" value="<?= (int)$f['fare_id'] ?>">
                                        <input class="form-control form-control-sm text-end mono" style="width:92px" name="regular_fare" value="<?= number_format((float)$f['regular_fare'], 2, '.', '') ?>" required>
                                </td>

                                <td class="text-end">
                                        <input class="form-control form-control-sm text-end mono" style="width:92px" name="discounted_fare" value="<?= number_format((float)$f['discounted_fare'], 2, '.', '') ?>" required>
                                </td>

                                <td class="text-end">
                                        <button class="btn btn-sm btn-primary pill-btn">Save</button>
                                    </form>
                                </td>
                            </tr>
                            <?php endforeach; endif; ?>
                        </tbody>
                    </table>
                </div>

            </div>
        </div>

    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>