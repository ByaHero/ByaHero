<?php
declare(strict_types=1);
ini_set('display_errors', '1');
error_reporting(E_ALL);

include __DIR__ . '/../../config/db.php';
@session_start();

if (empty($_SESSION['user_role']) || $_SESSION['user_role'] !== 'admin') {
    header("Location: ../login.php");
    exit;
}

/* === navbarAdmin config === */
$pageDepth = '../../';
$pageType  = 'analytics';
$backLink  = 'admin.php';
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <link rel="icon" href="../../assets/images/byaheroLogoBlue.svg" type="image/svg+xml">
    <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
    <title>ByaHero — Analytics Dashboard</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Material+Icons+Round&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
    <style>
        <?php include __DIR__ . '/../../assets/css/admin/analytics.css'; ?>
    </style>
</head>
<body>

<?php include __DIR__ . '/../../components/navbarAdmin.php'; ?>

<div class="container mb-5">
    <div class="mb-4 mt-4">
        <h2 class="fw-bold mb-0">Analytics Dashboard</h2>
    </div>

    <!-- Period filter & Export -->
    <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div class="d-flex gap-2 flex-wrap">
            <button class="period-pill active" data-period="today">Today</button>
            <button class="period-pill" data-period="week">This Week</button>
            <button class="period-pill" data-period="month">This Month</button>
        </div>
        <button class="btn btn-outline-primary d-flex align-items-center gap-2 fw-bold" data-bs-toggle="modal" data-bs-target="#exportModal">
            <span class="material-icons-round">picture_as_pdf</span> Export PDF
        </button>
    </div>

    <!-- Loading state -->
    <div id="loadingState" class="loading-spinner">
        <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
        </div>
    </div>

    <!-- Content (hidden until loaded) -->
    <div id="analyticsContent" style="display:none;">

        <!-- Summary Stats -->
        <div class="row g-3 mb-4" id="statGrid"></div>

        <!-- Hotspot Activity Summary -->
        <div id="hotspotSummary"></div>

        <!-- Hourly Passenger Flow Chart -->
        <div class="card border border-light-subtle shadow-sm rounded-3 p-4 mb-4 bg-white">
            <h5 class="fw-bold mb-3 d-flex align-items-center gap-2 text-dark fs-6 text-uppercase tracking-wider">
                <span class="material-icons-round text-primary fs-5">show_chart</span>
                Passenger Flow
            </h5>
            <div class="chart-wrap">
                <canvas id="hourlyChart"></canvas>
            </div>
        </div>

        <!-- Route Breakdown -->
        <div class="card border border-light-subtle shadow-sm rounded-3 p-4 mb-4 bg-white">
            <h5 class="fw-bold mb-3 d-flex align-items-center gap-2 text-dark fs-6 text-uppercase tracking-wider">
                <span class="material-icons-round text-primary fs-5">route</span>
                Route Breakdown
            </h5>
            <div id="routeTable"></div>
        </div>

        <!-- Bus Performance -->
        <div class="card border border-light-subtle shadow-sm rounded-3 p-4 mb-4 bg-white">
            <h5 class="fw-bold mb-3 d-flex align-items-center gap-2 text-dark fs-6 text-uppercase tracking-wider">
                <span class="material-icons-round text-primary fs-5">directions_bus</span>
                Bus Performance
            </h5>
            <p style="font-size: .75rem; color: #64748b; margin-bottom: 12px; font-weight: 600;">Click on a bus to view its specific departure hotspots.</p>
            <div id="busTable" style="overflow-x:auto;"></div>
        </div>

        <!-- Conductor Activity -->
        <div class="card border border-light-subtle shadow-sm rounded-3 p-4 mb-4 bg-white">
            <h5 class="fw-bold mb-3 d-flex align-items-center gap-2 text-dark fs-6 text-uppercase tracking-wider">
                <span class="material-icons-round text-primary fs-5">badge</span>
                Conductor Activity
            </h5>
            <div id="conductorTable"></div>
        </div>

        <!-- Location Activity Log -->
        <div class="card border border-light-subtle shadow-sm rounded-3 p-4 mb-4 bg-white">
            <h5 class="fw-bold mb-3 d-flex align-items-center gap-2 text-dark fs-6 text-uppercase tracking-wider">
                <span class="material-icons-round text-primary fs-5">list_alt</span>
                Location Activity Log
            </h5>
            <div id="locationLogs" style="overflow-x:auto;"></div>
        </div>

        <!-- Recent Operations -->
        <div class="card border border-light-subtle shadow-sm rounded-3 p-4 mb-4 bg-white">
            <h5 class="fw-bold mb-3 d-flex align-items-center gap-2 text-dark fs-6 text-uppercase tracking-wider">
                <span class="material-icons-round text-primary fs-5">history</span>
                Recent Operations
            </h5>
            <div id="recentOps" style="overflow-x:auto;"></div>
        </div>

    </div>
</div>

<!-- Export Modal -->
<div class="modal fade" id="exportModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content border-0 rounded-4 shadow">
      <div class="modal-header border-bottom-0 pb-0">
        <h5 class="modal-title fw-bold">Export Analytics to PDF</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <div class="mb-3">
          <label class="form-label fw-bold small text-uppercase text-muted">Time Period</label>
          <div class="form-check mb-2">
            <input class="form-check-input" type="radio" name="exportPeriod" id="exportToday" value="today" checked>
            <label class="form-check-label fw-semibold" for="exportToday">Just Today</label>
          </div>
          <div class="form-check">
            <input class="form-check-input" type="radio" name="exportPeriod" id="exportCustom" value="custom">
            <label class="form-check-label fw-semibold" for="exportCustom">Custom Date Range</label>
          </div>
        </div>

        <div id="customDateFields" class="d-none">
            <div class="row g-2">
                <div class="col-6">
                    <label class="form-label fw-bold small text-muted">Start Date</label>
                    <input type="date" id="exportStart" class="form-control rounded-3">
                </div>
                <div class="col-6">
                    <label class="form-label fw-bold small text-muted">End Date</label>
                    <input type="date" id="exportEnd" class="form-control rounded-3">
                </div>
            </div>
        </div>
      </div>
      <div class="modal-footer border-top-0 pt-0">
        <button type="button" class="btn btn-light rounded-pill fw-bold" data-bs-dismiss="modal">Cancel</button>
        <button type="button" id="btnConfirmExport" class="btn btn-primary rounded-pill fw-bold px-4">Generate PDF</button>
      </div>
    </div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
<script>
    <?php include __DIR__ . '/../../assets/js/admin/analytics.js'; ?>
</script>
</body>
</html>
