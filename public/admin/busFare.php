<?php
declare(strict_types=1);

ini_set('display_errors', '1');
error_reporting(E_ALL);

require __DIR__ . '/../../config/db.php';
session_start();

$scriptName = $_SERVER['SCRIPT_NAME'] ?? '/public/admin/busFare.php';
$publicDir  = rtrim(str_replace('\\', '/', dirname($scriptName)), '/');
$baseUrl    = preg_replace('~/public/.*$~', '', $publicDir) ?: '';

if (empty($_SESSION['user_role']) || $_SESSION['user_role'] !== 'admin') {
    header('Location: ' . $baseUrl . '/public/login.php');
    exit;
}

$conn = db();

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

function snapshotsAvailable(mysqli $conn): bool {
    try {
        $conn->query("SELECT 1 FROM bus_fare_snapshots LIMIT 1");
        $conn->query("SELECT 1 FROM bus_fare_snapshot_rows LIMIT 1");
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
                $upd = $conn->prepare("
                    UPDATE bus_fares
                    SET regular_fare = ?,
                        discounted_fare = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE fare_id = ?
                    LIMIT 1
                ");
                $upd->bind_param("ddi", $regular, $discounted, $fareId);
                $upd->execute();
                $message = ($upd->affected_rows > 0) ? "Fare updated successfully." : "No fare was updated.";
            }
        }

        /* Matrix Generator (LTFRB Exact Formula) */
        elseif ($action === 'update_multiple_fares') {
            $regFares = $_POST['regular_fare'] ?? [];
            $discFares = $_POST['discounted_fare'] ?? [];

            $upd = $conn->prepare("
                UPDATE bus_fares
                SET regular_fare = ?,
                    discounted_fare = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE fare_id = ?
            ");

            $affected = 0;
            foreach ($regFares as $id => $reg) {
                $id = (int)$id;
                $reg = parseMoney((string)$reg);
                $disc = parseMoney((string)($discFares[$id] ?? ''));

                if ($reg !== null && $disc !== null && $reg >= 0 && $disc >= 0 && $disc <= $reg) {
                    $upd->bind_param("ddi", $reg, $disc, $id);
                    $upd->execute();
                    if ($upd->affected_rows > 0) $affected++;
                }
            }
            $message = "Saved successfully. Fares updated: " . $affected;
        }

        /* Matrix Generator (LTFRB Exact Formula) */
        elseif ($action === 'generate_matrix') {
            $baseKm = parseFloat((string)($_POST['base_km'] ?? '4'));
            $regBase = parseFloat((string)($_POST['reg_base'] ?? '14.00'));
            $discBase = parseFloat((string)($_POST['disc_base'] ?? '11.25'));
            $regRate = parseFloat((string)($_POST['reg_rate'] ?? '2.20'));
            $discRate = parseFloat((string)($_POST['disc_rate'] ?? '1.76'));

            if ($baseKm === null || $regBase === null || $discBase === null || $regRate === null || $discRate === null) {
                $error = "Please enter valid numeric values for all fields.";
            } elseif ($baseKm < 0 || $regBase < 0 || $discBase < 0 || $regRate < 0 || $discRate < 0) {
                $error = "Values cannot be negative.";
            } else {
                // We use base_* columns just as a safety net (non-stacking is irrelevant since we overwrite absolutely based on distance_km)
                // But let's keep base_* populated if null
                $conn->query("
                    UPDATE bus_fares
                    SET base_regular_fare = regular_fare,
                        base_discounted_fare = discounted_fare
                    WHERE base_regular_fare IS NULL
                       OR base_discounted_fare IS NULL
                ");

                // Execute exact LTFRB matrix formula
                $stmt = $conn->prepare("
                    UPDATE bus_fares 
                    SET 
                        regular_fare = ROUND((? + GREATEST(0, distance_km - ?) * ?) * 4) / 4,
                        discounted_fare = ROUND((? + GREATEST(0, distance_km - ?) * ?) * 4) / 4,
                        updated_at = CURRENT_TIMESTAMP
                ");
                $stmt->bind_param("dddddd", 
                    $regBase, $baseKm, $regRate,
                    $discBase, $baseKm, $discRate
                );
                $stmt->execute();

                // Ensure discounted is never somehow magically higher than regular
                $conn->query("
                    UPDATE bus_fares
                    SET discounted_fare = LEAST(discounted_fare, regular_fare)
                    WHERE discounted_fare > regular_fare
                ");

                $message = "LTFRB Matrix applied to all routes based on distance. Rows updated: " . $stmt->affected_rows;
            }
        }

        /* Revoke computed rule: Reset fares to base (safe undo) */
        elseif ($action === 'reset_to_base') {
            $stmt = $conn->prepare("
                UPDATE bus_fares
                SET
                    regular_fare = base_regular_fare,
                    discounted_fare = LEAST(base_discounted_fare, base_regular_fare),
                    updated_at = CURRENT_TIMESTAMP
            ");
            $stmt->execute();
            $message = "Reverted to base fares. Rows updated: " . $stmt->affected_rows;
        }

        /* Snapshots: Create checkpoint */
        elseif ($action === 'snapshot_create') {
            $label = trim((string)($_POST['snapshot_label'] ?? ''));
            if ($label === '') $label = 'Snapshot ' . date('Y-m-d H:i:s');

            $conn->begin_transaction();

            $ins = $conn->prepare("INSERT INTO bus_fare_snapshots (label) VALUES (?)");
            $ins->bind_param("s", $label);
            $ins->execute();
            $snapshotId = (int)$conn->insert_id;

            $conn->query("
                INSERT INTO bus_fare_snapshot_rows
                  (snapshot_id, fare_id, regular_fare, discounted_fare, base_regular_fare, base_discounted_fare, distance_km, origin_stop_id, destination_stop_id)
                SELECT
                  {$snapshotId}, fare_id, regular_fare, discounted_fare, base_regular_fare, base_discounted_fare, distance_km, origin_stop_id, destination_stop_id
                FROM bus_fares
            ");

            $conn->commit();
            $message = "Snapshot created: " . h($label);
        }

        /* Snapshots: Restore checkpoint (true rollback) */
        elseif ($action === 'snapshot_restore') {
            $snapshotId = (int)($_POST['snapshot_id'] ?? 0);
            if ($snapshotId <= 0) {
                $error = "Invalid snapshot selected.";
            } else {
                $conn->begin_transaction();

                $stmt = $conn->prepare("
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
                $stmt->bind_param("i", $snapshotId);
                $stmt->execute();

                $conn->commit();
                $message = "Snapshot restored. Rows updated: " . $stmt->affected_rows;
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
$originsList = [];
try {
    $resOrig = $conn->query("
        SELECT DISTINCT o.stop_id, o.location_name 
        FROM bus_fares bf 
        JOIN bus_stops o ON o.stop_id = bf.origin_stop_id 
        ORDER BY o.location_name
    ");
    $originsList = $resOrig ? $resOrig->fetch_all(MYSQLI_ASSOC) : [];
} catch (Throwable $e) {}

$filterOrigin = (int)($_GET['origin'] ?? ($originsList[0]['stop_id'] ?? 0));
$q = trim((string)($_GET['q'] ?? ''));

$searchWhere = ["bf.origin_stop_id = ?"];
$searchParams = [$filterOrigin];

if ($q !== '') { 
    $searchWhere[] = "d.location_name LIKE ?"; 
    $searchParams[] = "%$q%"; 
}

$searchWhereSql = "WHERE " . implode(" AND ", $searchWhere);

$fares = [];
try {
    $stmt = $conn->prepare("
        SELECT bf.*, o.location_name AS origin_name, d.location_name AS dest_name
        FROM bus_fares bf
        JOIN bus_stops o ON o.stop_id = bf.origin_stop_id
        JOIN bus_stops d ON d.stop_id = bf.destination_stop_id
        $searchWhereSql
        ORDER BY bf.distance_km ASC, bf.destination_stop_id ASC
    ");
    if ($searchParams) {
        $types = str_repeat("s", count($searchParams));
        $stmt->bind_param($types, ...$searchParams);
    }
    $stmt->execute();
    $fares = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
} catch (Throwable $e) {
    $fares = [];
}

$originName = 'UNKNOWN ORIGIN';
$farthestDestName = 'DESTINATION';
if (!empty($fares)) {
    $originName = $fares[0]['origin_name'];
    $farthestDestName = end($fares)['dest_name'];
    reset($fares);
} else {
    foreach($originsList as $o) {
        if ($o['stop_id'] == $filterOrigin) {
            $originName = $o['location_name'];
            break;
        }
    }
}

/* Snapshots list */
$snapshots = [];
    try {
        $resSnaps = $conn->query("
            SELECT snapshot_id, label, created_at
            FROM bus_fare_snapshots
            ORDER BY snapshot_id DESC
            LIMIT 30
        ");
        $snapshots = $resSnaps ? $resSnaps->fetch_all(MYSQLI_ASSOC) : [];
    } catch (Throwable $e) {
        $snapshots = [];
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
    <link rel="icon" href="../../assets/images/byaheroLogoBlue.svg" type="image/svg+xml">
    <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
    <title>ByaHero — Manage Bus Fares</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Material+Icons+Round&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
    <style>
        :root { --brand: #1c5ab5; }
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

        .form-label { color: #1c5ab5 !important; }

        .btn-primary {
            background-color: #1c5ab5 !important;
            border-color: #1c5ab5 !important;
            color: #fff !important;
        }

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

            <!-- LTFRB Matrix Generator -->
            <div>

                <div class="mb-4" style="border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; background: #fff;">

                    <form method="POST" onsubmit="return confirm('WARNING: This will instantly overwrite all 900+ rows with mathematical matrix calculations. Proceed?');">
                        <input type="hidden" name="action" value="generate_matrix">

                        <div class="mb-3">
                            <label class="form-label small fw-bold text-uppercase">Base Distance (km)</label>
                            <input class="form-control mono" name="base_km" value="4">
                        </div>

                        <div class="row g-2 mb-3">
                            <div class="col-6">
                                <label class="form-label small fw-bold text-uppercase">Reg. Base (₱)</label>
                                <input class="form-control mono" name="reg_base" value="14.00">
                            </div>
                            <div class="col-6">
                                <label class="form-label small fw-bold text-uppercase">Disc. Base (₱)</label>
                                <input class="form-control mono" name="disc_base" value="11.25">
                            </div>
                        </div>

                        <div class="row g-2 mb-3">
                            <div class="col-6">
                                <label class="form-label small fw-bold text-uppercase">Reg. Rate / km</label>
                                <input class="form-control mono" name="reg_rate" value="2.20">
                            </div>
                            <div class="col-6">
                                <label class="form-label small fw-bold text-uppercase">Disc. Rate / km</label>
                                <input class="form-control mono" name="disc_rate" value="1.76">
                            </div>
                        </div>

                        <div class="d-grid mt-2">
                            <button class="btn btn-primary pill-btn fw-bold">Generate Matrix</button>
                        </div>
                    </form>
                    
                    <hr>

                    <form method="POST" onsubmit="return confirm('Revoke changes by resetting ALL fares back to their original base values?');">
                        <input type="hidden" name="action" value="reset_to_base">
                        <div class="d-grid">
                            <button class="btn btn-outline-secondary pill-btn">Undo (Reset to Base)</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Snapshots -->
            <div>
                <h6 class="fw-bold mb-3 mt-2" style="color: #1c5ab5;">
                    Snapshots (Rollback)
                </h6>
                <div class="mb-4" style="border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; background: #fff;">

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
            <div>
                <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                    <h6 class="fw-bold m-0" style="color: #1c5ab5;">
                        Route Fare Matrix
                    </h6>
                    <form class="d-flex flex-wrap gap-2 w-100" method="GET">
                        <div class="flex-grow-1" style="min-width: 160px;">
                            <select class="form-select form-select-sm w-100 fw-bold" name="origin" onchange="this.form.submit()">
                                <?php foreach ($originsList as $o): ?>
                                    <option value="<?= $o['stop_id'] ?>" <?= $o['stop_id'] == $filterOrigin ? 'selected' : '' ?>>
                                        From: <?= h($o['location_name']) ?>
                                    </option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        <div class="d-flex gap-2 flex-grow-1" style="min-width: 200px;">
                            <input class="form-control form-control-sm flex-grow-1" name="q" value="<?= h($q) ?>" placeholder="Search destination...">
                            <button class="btn btn-sm btn-primary pill-btn px-3">Filter</button>
                        </div>
                    </form>
                </div>

                    <div class="table-responsive" style="border: 2px solid #000; border-radius: 4px; background: #fff; overflow-x: auto; -webkit-overflow-scrolling: touch;">
                        <table class="table table-sm table-bordered mb-0 align-middle">
                            <thead>
                                <tr>
                                    <th colspan="4" class="text-center bg-white fs-5 py-2 fw-bold" style="border-bottom: 2px solid #000;">
                                        <?= h(strtoupper($originName)) ?> - <?= h(strtoupper($farthestDestName)) ?>
                                    </th>
                                </tr>
                                <tr class="text-center bg-white">
                                    <th rowspan="2" class="align-middle border-dark" style="width: 60px;">KM</th>
                                    <th rowspan="2" class="align-middle border-dark text-start px-3">PARTICULARS</th>
                                    <th colspan="2" class="border-dark">FARE</th>
                                </tr>
                                <tr class="text-center bg-white">
                                    <th class="border-dark" style="width: 110px;">REGULAR</th>
                                    <th class="border-dark" style="width: 110px;">S / E / D</th>
                                </tr>
                            </thead>
                            <tbody>
                                <!-- Origin Row (0 KM) -->
                                <tr>
                                    <td class="text-center border-dark fw-bold">0</td>
                                    <td class="fw-bold border-dark px-3"><?= h(strtoupper($originName)) ?></td>
                                    <td class="border-dark text-center"></td>
                                    <td class="border-dark text-center"></td>
                                </tr>

                                <?php if (empty($fares)): ?>
                                    <tr><td colspan="4" class="text-center text-muted py-4 border-dark">No fares found for this origin.</td></tr>
                                <?php else: foreach ($fares as $f): ?>
                                <tr>
                                    <td class="text-center border-dark"><?= round((float)$f['distance_km']) ?></td>
                                    <td class="border-dark px-3"><?= h($f['dest_name']) ?></td>
                                    <td class="text-end border-dark px-3 py-2 mono">
                                        <?= number_format((float)$f['regular_fare'], 2, '.', '') ?>
                                    </td>
                                    <td class="text-end border-dark px-3 py-2 mono">
                                        <?= number_format((float)$f['discounted_fare'], 2, '.', '') ?>
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
<script>
document.addEventListener('DOMContentLoaded', function() {
    // 1. Matrix Generator Auto-Calculation
    const regBase = document.querySelector('input[name="reg_base"]');
    const discBase = document.querySelector('input[name="disc_base"]');
    const regRate = document.querySelector('input[name="reg_rate"]');
    const discRate = document.querySelector('input[name="disc_rate"]');

    function extractNumber(val) {
        // Remove anything that isn't a digit or a period
        let clean = val.replace(/[^0-9.]/g, '');
        return parseFloat(clean);
    }

    if (regBase && discBase) {
        regBase.addEventListener('input', function() {
            let val = extractNumber(this.value);
            if (!isNaN(val)) {
                discBase.value = (val * 0.8).toFixed(2);
            } else {
                discBase.value = '';
            }
        });
    }

    if (regRate && discRate) {
        regRate.addEventListener('input', function() {
            let val = extractNumber(this.value);
            if (!isNaN(val)) {
                discRate.value = (val * 0.8).toFixed(2);
            } else {
                discRate.value = '';
            }
        });
    }

});
    // Automatically calculate discounted fare when regular fare is changed in the table
    const tableRegInputs = document.querySelectorAll('input[name^="regular_fare["]');
    tableRegInputs.forEach(function(input) {
        input.addEventListener('input', function() {
            let val = extractNumber(this.value);
            // Find the corresponding discounted_fare input in the same row
            const row = this.closest('tr');
            const discInput = row.querySelector('input[name^="discounted_fare["]');
            
            if (discInput) {
                if (!isNaN(val)) {
                    discInput.value = (val * 0.8).toFixed(2);
                } else {
                    discInput.value = '';
                }
            }
        });
    });
});
</script>
</body>
</html>