<?php
declare(strict_types=1);

@session_start();

if (empty($_SESSION['user_id']) || empty($_SESSION['user_role'])) {
    header("Location: ../login.php?redirect=conductor/waitingPax.php");
    exit;
}

if ($_SESSION['user_role'] !== 'conductor') {
    $role = (string)$_SESSION['user_role'];
    if ($role === 'admin') { header("Location: ../admin/admin.php"); exit; }
    if ($role === 'driver') { header("Location: ../driver/dashboard.php"); exit; }
    header("Location: ../passenger/index.php");
    exit;
}

// prevent back-button cache after logout
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Cache-Control: post-check=0, pre-check=0', false);
header('Pragma: no-cache');
header('Expires: 0');
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <link rel="icon" href="../../assets/images/byaheroLogoBlue.svg" type="image/svg+xml">
    <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <title>ByaHero - Waiting Passengers</title>

    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0&display=swap" rel="stylesheet" />

    <style>
        :root{
            --header-blue: #0f3878;
        }
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        @keyframes bounce {
            0%, 100% { transform: translateY(-5%); }
            50% { transform: translateY(0); }
        }
        .animate-bounce {
            display: inline-block;
            animation: bounce 2s infinite;
        }
    </style>
</head>

<body class="d-flex flex-column min-vh-100 m-0 bg-white" style="font-family: 'Segoe UI', sans-serif;">

    <?php include __DIR__ . '/../../components/navbarConductor.php'; ?>

    <div class="flex-grow-1 p-0 pb-5 bg-light" style="background-color: #f8fafc !important;">
        <div class="text-center py-4 border-bottom bg-white shadow-sm mb-2 mt-2">
            <span class="text-muted small fw-bold d-block mb-1" style="letter-spacing: 0.5px;">TOTAL PASSENGERS WAITING</span>
            <span class="badge rounded-pill fs-5 px-4 py-2 animate-bounce" style="background: #0f3878;">
            <span id="waitCountTotal">0</span> passengers
            </span>
        </div>
        
        <div id="waitCountList" class="list-group list-group-flush px-3 py-2">
            <!-- Dynamically populated wait list per stop -->
        </div>
        
        <div class="text-center py-3 mt-2 bg-transparent">
            <small class="text-muted d-flex align-items-center justify-content-center gap-1">
            <span class="material-symbols-rounded" style="font-size: 14px; animation: spin 4s linear infinite;">sync</span>
            Auto-refreshes every 15 seconds
            </small>
        </div>
    </div>

    <script>
      async function loadWaitCount() {
          try {
              const base = window.APP_BASE_URL || '';
              const res = await fetch(base + '/backend/waiting_api.php?action=get_wait_count', { credentials: 'include' });
              const data = await res.json();
              if (!data || !data.success) return;
              
              document.getElementById('waitCountTotal').textContent = data.total;
              const list = document.getElementById('waitCountList');
              
              if (!data.locations || data.locations.length === 0) {
                  list.innerHTML = `
                      <div class="text-center text-muted py-5 px-3 bg-white rounded-3 shadow-sm border border-light">
                          <span class="material-symbols-rounded text-muted mb-2" style="font-size: 48px;">no_accounts</span>
                          <p class="mb-0 fw-semibold">No passengers waiting right now.</p>
                          <small class="text-muted">Waiting lists update in real-time.</small>
                      </div>
                  `;
                  return;
              }
              
              list.innerHTML = data.locations.map(loc => `
                  <div class="list-group-item d-flex justify-content-between align-items-center rounded-3 bg-white border border-light shadow-sm mb-2 px-3 py-2.5">
                      <div class="d-flex align-items-center gap-2">
                          <span class="material-symbols-rounded text-primary" style="font-size: 20px;">place</span>
                          <span class="fw-bold text-dark">${loc.location_name}</span>
                      </div>
                      <span class="badge rounded-pill px-3 py-1.5 fs-7 fw-bold" style="background:#0f3878; color:white;">
                          ${loc.count} waiting
                      </span>
                  </div>
              `).join('');
          } catch(e) { console.error('Wait count error', e); }
      }

      document.addEventListener('DOMContentLoaded', () => {
          loadWaitCount();
          setInterval(loadWaitCount, 15000); 
      });
    </script>
</body>
</html>
