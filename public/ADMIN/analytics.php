<?php
declare(strict_types=1);

ini_set('display_errors', '1');
error_reporting(E_ALL);

require __DIR__ . '/../../config/db.php';

session_start();

/**
 * Base URL configuration
 */
$scriptName = $_SERVER['SCRIPT_NAME'] ?? '/public/ADMIN/analytics.php';
$publicDir  = rtrim(str_replace('\\', '/', dirname($scriptName)), '/');
$baseUrl    = preg_replace('~/public/.*$~', '', $publicDir) ?: '';

// --- AUTH ---
if (empty($_SESSION['user_role']) || $_SESSION['user_role'] !== 'admin') {
    header('Location: ' . $baseUrl . '/public/login.php');
    exit;
}

function h($s): string {
    return htmlspecialchars((string)$s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Analytics — ByaHero Admin</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <style>
        :root { --brand: #2563eb; }
        body { background: #f8fafc; color: #1e293b; font-family: "Segoe UI", system-ui, sans-serif; }
        .navbar { background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .nav-link { color: rgba(255,255,255,0.85) !important; font-weight: 500; }
        .nav-link.active { color: #fff !important; background: rgba(255,255,255,0.15); border-radius: 6px; }

        .stat-card-mini {
            background: white;
            border-radius: 12px;
            padding: 1.25rem;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            border-left: 4px solid var(--brand);
            transition: transform 0.2s;
        }
        .stat-card-mini:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.15); }
        .stat-card-mini .stat-label { font-size: 0.85rem; color: #64748b; font-weight: 500; text-transform: uppercase; }
        .stat-card-mini .stat-value { font-size: 2rem; font-weight: 700; color: var(--brand); margin-top: 0.25rem; }

        .card-standard { border: none; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 1.5rem; background: #fff; }
        .card-header-std { background: #fff; border-bottom: 1px solid #e2e8f0; font-weight: 600; padding: 1rem 1.25rem; border-radius: 12px 12px 0 0 !important; display: flex; align-items: center; gap: 0.5rem; }
        .card-header-std .material-icons-round { color: var(--brand); font-size: 1.5rem; }

        .chart-container { position: relative; height: 300px; padding: 1rem; }
        
        .activity-item {
            padding: 0.75rem 1rem;
            border-bottom: 1px solid #f1f5f9;
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }
        .activity-item:last-child { border-bottom: none; }
        .activity-icon {
            width: 36px;
            height: 36px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #dbeafe;
            color: var(--brand);
            font-size: 1.2rem;
        }
        .activity-content { flex: 1; }
        .activity-type { font-weight: 600; color: #1e293b; font-size: 0.9rem; }
        .activity-time { font-size: 0.75rem; color: #94a3b8; }

        .badge-custom {
            padding: 0.35rem 0.75rem;
            border-radius: 6px;
            font-weight: 600;
            font-size: 0.8rem;
        }

        .loading-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 255, 255, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        }
        .loading-overlay.hidden { display: none; }

        @media (max-width: 767px) {
            .stat-card-mini .stat-value { font-size: 1.5rem; }
            .chart-container { height: 250px; }
        }
    </style>
</head>
<body>

<div class="loading-overlay" id="loadingOverlay">
    <div class="text-center">
        <div class="spinner-border text-primary" style="width: 3rem; height: 3rem;" role="status"></div>
        <div class="mt-3 fw-bold text-primary">Loading Analytics...</div>
    </div>
</div>

<nav class="navbar navbar-expand-lg navbar-dark mb-4">
    <div class="container">
        <a class="navbar-brand fw-bold d-flex align-items-center gap-2" href="admin.php">
            <span class="material-icons-round">directions_bus</span> ByaHero
        </a>

        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navContent">
            <span class="navbar-toggler-icon"></span>
        </button>

        <div class="collapse navbar-collapse" id="navContent">
            <ul class="nav nav-pills ms-auto gap-2">
                <li class="nav-item">
                    <a class="nav-link" href="admin.php">Dashboard & Map</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link active" href="analytics.php">Analytics</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="manageBuses.php">Manage Buses</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="manageActiveBuses.php">Active Buses</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="manageConductors.php">Conductors & Drivers</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="manageStops.php">Bus Stops & Terminals</a>
                </li>
            </ul>
            <div class="ms-3">
                <a href="logout.php" class="btn btn-outline-light btn-sm">Logout</a>
            </div>
        </div>
    </div>
</nav>

<div class="container">
    <div class="d-flex align-items-center justify-content-between mb-4">
        <div>
            <h2 class="mb-1 fw-bold">Analytics Dashboard</h2>
            <p class="text-muted mb-0">Real-time insights and user activity tracking</p>
        </div>
        <button class="btn btn-primary" onclick="refreshData()">
            <span class="material-icons-round" style="font-size: 1.2rem; vertical-align: middle;">refresh</span>
            Refresh
        </button>
    </div>

    <!-- Overview Stats -->
    <div class="row g-3 mb-4">
        <div class="col-6 col-md-3">
            <div class="stat-card-mini">
                <div class="stat-label">Total Events</div>
                <div class="stat-value" id="totalEvents">0</div>
            </div>
        </div>
        <div class="col-6 col-md-3">
            <div class="stat-card-mini">
                <div class="stat-label">Active Users</div>
                <div class="stat-value" id="activeUsers">0</div>
            </div>
        </div>
        <div class="col-6 col-md-3">
            <div class="stat-card-mini">
                <div class="stat-label">Page Views</div>
                <div class="stat-value" id="pageViews">0</div>
            </div>
        </div>
        <div class="col-6 col-md-3">
            <div class="stat-card-mini">
                <div class="stat-label">Total Feedback</div>
                <div class="stat-value" id="totalFeedback">0</div>
            </div>
        </div>
    </div>

    <!-- Charts Row 1 -->
    <div class="row g-4 mb-4">
        <div class="col-lg-6">
            <div class="card-standard">
                <div class="card-header-std">
                    <span class="material-icons-round">bar_chart</span>
                    Event Types Distribution
                </div>
                <div class="card-body">
                    <div class="chart-container">
                        <canvas id="eventTypesChart"></canvas>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-lg-6">
            <div class="card-standard">
                <div class="card-header-std">
                    <span class="material-icons-round">star</span>
                    Feedback Ratings
                </div>
                <div class="card-body">
                    <div class="chart-container">
                        <canvas id="feedbackChart"></canvas>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Charts Row 2 -->
    <div class="row g-4 mb-4">
        <div class="col-lg-6">
            <div class="card-standard">
                <div class="card-header-std">
                    <span class="material-icons-round">settings</span>
                    Most Changed Settings
                </div>
                <div class="card-body">
                    <div class="chart-container">
                        <canvas id="settingsChart"></canvas>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-lg-6">
            <div class="card-standard">
                <div class="card-header-std">
                    <span class="material-icons-round">directions_bus</span>
                    Most Tracked Buses
                </div>
                <div class="card-body">
                    <div class="chart-container">
                        <canvas id="busesChart"></canvas>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Recent Activity -->
    <div class="card-standard">
        <div class="card-header-std">
            <span class="material-icons-round">history</span>
            Recent Activity
        </div>
        <div class="card-body p-0" id="recentActivityContainer">
            <div class="text-center py-4 text-muted">Loading activity...</div>
        </div>
    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
<script>
let charts = {};

async function loadAnalytics() {
    try {
        document.getElementById('loadingOverlay').classList.remove('hidden');
        
        const response = await fetch('analytics_api.php');
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || 'Failed to load analytics');
        }

        // Update overview stats
        document.getElementById('totalEvents').textContent = data.overview.total_events.toLocaleString();
        document.getElementById('activeUsers').textContent = data.overview.active_users.toLocaleString();
        document.getElementById('pageViews').textContent = data.overview.page_views.toLocaleString();
        document.getElementById('totalFeedback').textContent = data.overview.total_feedback.toLocaleString();

        // Render charts
        renderEventTypesChart(data.event_types);
        renderFeedbackChart(data.feedback_ratings);
        renderSettingsChart(data.top_settings);
        renderBusesChart(data.top_buses);
        renderRecentActivity(data.recent_activity);

        document.getElementById('loadingOverlay').classList.add('hidden');
    } catch (error) {
        console.error('Error loading analytics:', error);
        alert('Error loading analytics: ' + error.message);
        document.getElementById('loadingOverlay').classList.add('hidden');
    }
}

function renderEventTypesChart(eventTypes) {
    const ctx = document.getElementById('eventTypesChart');
    
    if (charts.eventTypes) charts.eventTypes.destroy();

    charts.eventTypes = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: eventTypes.map(e => formatEventType(e.event_type)),
            datasets: [{
                label: 'Events',
                data: eventTypes.map(e => e.count),
                backgroundColor: '#2563eb',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

function renderFeedbackChart(ratings) {
    const ctx = document.getElementById('feedbackChart');
    
    if (charts.feedback) charts.feedback.destroy();

    const colors = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];
    
    charts.feedback = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ratings.map(r => `${r.rating} Star${r.rating > 1 ? 's' : ''}`),
            datasets: [{
                data: ratings.map(r => r.count),
                backgroundColor: colors.slice(0, ratings.length),
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

function renderSettingsChart(settings) {
    const ctx = document.getElementById('settingsChart');
    
    if (charts.settings) charts.settings.destroy();

    // Clean up setting names (remove quotes)
    const cleanSettings = settings.map(s => ({
        ...s,
        setting: s.setting ? s.setting.replace(/['"]/g, '') : 'Unknown'
    }));

    charts.settings = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: cleanSettings.map(s => s.setting),
            datasets: [{
                label: 'Changes',
                data: cleanSettings.map(s => s.change_count),
                backgroundColor: '#10b981',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { beginAtZero: true }
            }
        }
    });
}

function renderBusesChart(buses) {
    const ctx = document.getElementById('busesChart');
    
    if (charts.buses) charts.buses.destroy();

    // Clean up bus IDs (remove quotes)
    const cleanBuses = buses.map(b => ({
        ...b,
        bus_id: b.bus_id ? b.bus_id.replace(/['"]/g, '') : 'Unknown'
    }));

    charts.buses = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: cleanBuses.map(b => `Bus ${b.bus_id}`),
            datasets: [{
                label: 'Tracks',
                data: cleanBuses.map(b => b.track_count),
                backgroundColor: '#f59e0b',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { beginAtZero: true }
            }
        }
    });
}

function renderRecentActivity(activities) {
    const container = document.getElementById('recentActivityContainer');
    
    if (!activities || activities.length === 0) {
        container.innerHTML = '<div class="text-center py-4 text-muted">No recent activity</div>';
        return;
    }

    container.innerHTML = activities.map(activity => {
        const icon = getActivityIcon(activity.event_type);
        const timeAgo = formatTimeAgo(activity.created_at);
        const eventLabel = formatEventType(activity.event_type);
        
        return `
            <div class="activity-item">
                <div class="activity-icon">
                    <span class="material-icons-round">${icon}</span>
                </div>
                <div class="activity-content">
                    <div class="activity-type">${eventLabel}</div>
                    <div class="activity-time">${timeAgo} • ${activity.page || 'Unknown page'}</div>
                </div>
                <span class="badge-custom bg-light text-dark">${activity.event_type}</span>
            </div>
        `;
    }).join('');
}

function getActivityIcon(eventType) {
    const icons = {
        'page_view': 'visibility',
        'setting_changed': 'settings',
        'bus_tracked': 'location_on',
        'feedback_submitted': 'feedback',
        'search': 'search',
        'filter_applied': 'filter_list',
        'default': 'event'
    };
    return icons[eventType] || icons.default;
}

function formatEventType(type) {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function formatTimeAgo(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + ' min ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + ' hr ago';
    return Math.floor(seconds / 86400) + ' days ago';
}

function refreshData() {
    loadAnalytics();
}

// Load on page load
document.addEventListener('DOMContentLoaded', loadAnalytics);

// Auto-refresh every 30 seconds
setInterval(loadAnalytics, 30000);
</script>
</body>
</html>