<?php
require_once __DIR__ . '/auth_passenger.php';
require_once __DIR__ . '/../../config/db.php';

$userId = (int)$_SESSION['user_id'];
$pdo = db();

// Fetch ride history
$stmt = $pdo->prepare("
    SELECT r.*, b.code as bus_code 
    FROM passenger_rides r
    LEFT JOIN busses b ON r.bus_id = b.Bus_ID
    WHERE r.user_id = ?
    ORDER BY r.boarded_at DESC
");
$stmt->execute([$userId]);
$rides = $stmt->fetchAll();

$pageTitle = "Ride History";
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
  <title>ByaHero - Ride History</title>
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded" rel="stylesheet" />
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
  <style>
    :root {
      --bs-primary: #1e3a8a;
      --bs-bg-light: #f3f4f6;
    }
    body {
      background-color: var(--bs-bg-light);
      font-family: 'Segoe UI', sans-serif;
      padding-top: 60px;
      padding-bottom: 80px;
    }
    .ride-card {
      background: #fff;
      border-radius: 16px;
      border: none;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
      margin-bottom: 16px;
      overflow: hidden;
      transition: transform 0.2s;
    }
    .ride-card:active {
      transform: scale(0.98);
    }
    .ride-status-ongoing {
      background: #dcfce7;
      color: #166534;
      font-weight: 700;
      font-size: 0.75rem;
      padding: 4px 12px;
      border-radius: 999px;
    }
    .ride-status-completed {
      background: #f3f4f6;
      color: #6b7280;
      font-weight: 700;
      font-size: 0.75rem;
      padding: 4px 12px;
      border-radius: 999px;
    }
    .bus-icon-circle {
      width: 48px;
      height: 48px;
      background: #eff6ff;
      color: var(--bs-primary);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .ride-details {
      border-left: 2px dashed #e5e7eb;
      margin-left: 23px;
      padding-left: 24px;
      position: relative;
    }
    .ride-dot {
      width: 10px;
      height: 10px;
      background: #d1d5db;
      border-radius: 50%;
      position: absolute;
      left: -6px;
    }
    .ride-dot-start { top: 0; background: var(--bs-primary); }
    .ride-dot-end { bottom: 0; background: #ef4444; }
    
    .empty-state {
      text-align: center;
      margin-top: 100px;
      color: #9ca3af;
    }
    .empty-state span {
      font-size: 64px;
      margin-bottom: 16px;
    }
  </style>
</head>
<body>

<?php include __DIR__ . '/../../components/navbarPassenger.php'; ?>

<div class="container py-3">
  <?php if (empty($rides)): ?>
    <div class="empty-state">
      <span class="material-symbols-rounded">directions_bus</span>
      <h4>No rides found</h4>
      <p>Your ride history will appear here once you board a bus.</p>
    </div>
  <?php else: ?>
    <?php foreach ($rides as $ride): ?>
      <div class="ride-card p-3">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <div class="d-flex align-items-center gap-3">
            <div class="bus-icon-circle">
              <span class="material-symbols-rounded">directions_bus</span>
            </div>
            <div>
              <div class="fw-bold text-dark"><?= htmlspecialchars($ride['bus_code'] ?: 'BUS') ?></div>
              <div class="small text-muted"><?= date('M d, Y • h:i A', strtotime($ride['boarded_at'])) ?></div>
            </div>
          </div>
          <span class="ride-status-<?= $ride['status'] ?>">
            <?= strtoupper($ride['status']) ?>
          </span>
        </div>

        <div class="ride-details py-1">
          <div class="ride-dot ride-dot-start"></div>
          <div class="small text-muted mb-1">Boarded at</div>
          <div class="fw-bold small mb-3"><?= htmlspecialchars($ride['start_location'] ?: 'Unknown') ?></div>
          
          <?php if ($ride['status'] === 'completed'): ?>
            <div class="ride-dot ride-dot-end"></div>
            <div class="small text-muted mb-1">Departed at</div>
            <div class="fw-bold small"><?= htmlspecialchars($ride['end_location'] ?: 'Unknown') ?></div>
            <div class="text-end mt-2">
              <small class="text-muted"><?= date('h:i A', strtotime($ride['departed_at'])) ?></small>
            </div>
          <?php else: ?>
             <div class="ride-dot" style="bottom: 0; background: #fbbf24;"></div>
             <div class="small text-warning fw-bold mt-2">Currently on board...</div>
          <?php endif; ?>
        </div>
      </div>
    <?php endforeach; ?>
  <?php endif; ?>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
