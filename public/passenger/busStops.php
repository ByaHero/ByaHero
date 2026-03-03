<?php
declare(strict_types=1);

ini_set('display_errors', '1');
error_reporting(E_ALL);

require __DIR__ . '/../../config/db.php';

$pdo = db();

function h($s): string {
  return htmlspecialchars((string)$s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function typeLabel(string $type): string {
  $t = strtolower($type);
  if ($t === 'pickup_point') return 'Pick-up Point';
  if ($t === 'terminal') return 'Terminal';
  return 'Bus Stop';
}

function typeBadgeClass(string $type): string {
  $t = strtolower($type);
  if ($t === 'pickup_point') return 'bg-info text-dark';   // blue-ish
  if ($t === 'terminal') return 'bg-dark';                 // black
  return 'bg-primary';                                     // bus stop
}

// Fetch bus stops/terminals (admin-managed)
$stops = [];
$error = '';
try {
  $stmt = $pdo->query("
    SELECT id, name, type, location_name, location_landmark, lat, lng
    FROM busstopsterminal
    ORDER BY FIELD(type,'terminal','bus_stop','pickup_point'), name ASC
  ");
  $stops = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (Exception $e) {
  $error = $e->getMessage();
  $stops = [];
}
?>

<div id="view-busstops" class="mt-2 d-none">
  <div class="d-flex align-items-center justify-content-between mb-2">
    <div class="fw-bold">Bus Stops</div>
    <div class="small text-muted">Stops • Pick-up Points • Terminals</div>
  </div>

  <div id="busStopsListMobile" class="list-group list-group-flush">
    <?php if ($error): ?>
      <div class="text-center text-danger mt-4 small">
        Failed to load bus stops.
        <div class="small text-muted"><?= h($error) ?></div>
      </div>

    <?php elseif (empty($stops)): ?>
      <div class="text-center text-muted mt-4 small">No bus stops yet.</div>

    <?php else: ?>
      <?php foreach ($stops as $s): ?>
        <?php
          $subtitleParts = [];
          if (!empty($s['location_name'])) $subtitleParts[] = $s['location_name'];
          if (!empty($s['location_landmark'])) $subtitleParts[] = $s['location_landmark'];
          $subtitle = implode(' • ', $subtitleParts);

          $tLabel = typeLabel((string)$s['type']);
          $badgeClass = typeBadgeClass((string)$s['type']);
        ?>

        <button
          type="button"
          class="list-group-item list-group-item-action"
          onclick="if(window.focusStop){ window.focusStop('<?= h($s['id']) ?>'); }">

          <div class="d-flex justify-content-between align-items-start">
            <div class="me-2">
              <div class="fw-bold"><?= h($s['name']) ?></div>
              <div class="small text-muted"><?= h($tLabel) ?><?= $subtitle ? ' • ' . h($subtitle) : '' ?></div>
            </div>

            <span class="badge <?= h($badgeClass) ?> text-uppercase">
              <?= h($tLabel) ?>
            </span>
          </div>
        </button>
      <?php endforeach; ?>
    <?php endif; ?>
  </div>
</div>