<?php
declare(strict_types=1);
ini_set('display_errors', '1');
error_reporting(E_ALL);

require __DIR__ . '/../../config/db.php';
@session_start();

if (empty($_SESSION['user_role']) || $_SESSION['user_role'] !== 'admin') {
    header('Location: ../login.php');
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
    <link href="../../assets/css/admin/analytics.css" rel="stylesheet">
</head>
<body>

<?php include __DIR__ . '/../../components/navbarAdmin.php'; ?>

<div class="container mb-5">
    <div class="mb-4 mt-4">
        <h2 class="fw-bold mb-0">Analytics Dashboard</h2>
    </div>

    <!-- Period filter -->
    <div class="period-bar">
        <button class="period-pill active" data-period="today">Today</button>
        <button class="period-pill" data-period="week">This Week</button>
        <button class="period-pill" data-period="month">This Month</button>
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
        <div class="stat-grid" id="statGrid"></div>

        <!-- Hotspot Activity Summary -->
        <div id="hotspotSummary"></div>

        <!-- Hourly Passenger Flow Chart -->
        <div class="section-card">
            <div class="section-title">
                <span class="material-icons-round">show_chart</span>
                Passenger Flow
            </div>
            <div class="chart-wrap">
                <canvas id="hourlyChart"></canvas>
            </div>
        </div>

        <!-- Route Breakdown -->
        <div class="section-card">
            <div class="section-title">
                <span class="material-icons-round">route</span>
                Route Breakdown
            </div>
            <div id="routeTable"></div>
        </div>

        <!-- Bus Performance -->
        <div class="section-card">
            <div class="section-title">
                <span class="material-icons-round">directions_bus</span>
                Bus Performance
            </div>
            <p style="font-size: .75rem; color: var(--muted); margin-bottom: 12px; font-weight: 600;">Click on a bus to view its specific departure hotspots.</p>
            <div id="busTable" style="overflow-x:auto;"></div>
        </div>

        <!-- Conductor Activity -->
        <div class="section-card">
            <div class="section-title">
                <span class="material-icons-round">badge</span>
                Conductor Activity
            </div>
            <div id="conductorTable"></div>
        </div>

        <!-- Location Activity Log -->
        <div class="section-card">
            <div class="section-title">
                <span class="material-icons-round">list_alt</span>
                Location Activity Log
            </div>
            <div id="locationLogs" style="overflow-x:auto;"></div>
        </div>

        <!-- Recent Operations -->
        <div class="section-card">
            <div class="section-title">
                <span class="material-icons-round">history</span>
                Recent Operations
            </div>
            <div id="recentOps" style="overflow-x:auto;"></div>
        </div>

    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
<script src="../../assets/js/admin/analytics.js"></script>
</body>
</html>
