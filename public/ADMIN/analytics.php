<?php
declare(strict_types=1);
ini_set('display_errors', '1');
error_reporting(E_ALL);

require __DIR__ . '/../../config/db.php';
session_start();

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
    <title>ByaHero — Analytics Dashboard</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
    <style>
        :root {
            --brand: #0f3878;
            --brand-light: #1d4ed8;
            --surface: #ffffff;
            --bg: #f1f5f9;
            --text: #0f172a;
            --muted: #64748b;
            --radius: 18px;
        }
        body {
            background: var(--bg);
            color: var(--text);
            font-family: "Segoe UI", system-ui, sans-serif;
        }
        .page-wrap { padding: 14px 14px 30px; max-width: 900px; margin: 0 auto; }

        /* Period filter pills */
        .period-bar { display: flex; gap: 8px; margin-bottom: 18px; flex-wrap: wrap; }
        .period-pill {
            padding: 8px 20px; border-radius: 999px; font-weight: 800; font-size: .82rem;
            border: 2px solid #cbd5e1; background: var(--surface); color: var(--muted);
            cursor: pointer; transition: all .2s;
        }
        .period-pill.active, .period-pill:hover {
            background: var(--brand); color: #fff; border-color: var(--brand);
        }

        /* Summary stat cards */
        .stat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 18px; }
        @media (min-width: 768px) { .stat-grid { grid-template-columns: repeat(4, 1fr); } }
        .stat-card {
            background: var(--surface); border-radius: var(--radius); padding: 16px;
            box-shadow: 0 4px 16px rgba(15,23,42,.06); text-align: center;
            border: 1px solid rgba(148,163,184,.2);
        }
        .stat-card .stat-value {
            font-size: 2.2rem; font-weight: 900; color: var(--brand); line-height: 1.1;
        }
        .stat-card .stat-label {
            font-size: .78rem; font-weight: 700; color: var(--muted); margin-top: 4px;
            text-transform: uppercase; letter-spacing: .4px;
        }

        /* Section cards */
        .section-card {
            background: var(--surface); border-radius: var(--radius); padding: 18px;
            box-shadow: 0 4px 16px rgba(15,23,42,.06); margin-bottom: 16px;
            border: 1px solid rgba(148,163,184,.2);
        }
        .section-title {
            font-weight: 900; font-size: 1rem; margin-bottom: 14px;
            display: flex; align-items: center; gap: 8px; color: var(--text);
        }
        .section-title .material-icons-round { font-size: 22px; color: var(--brand-light); }

        /* Tables */
        .analytics-table { width: 100%; border-collapse: collapse; font-size: .85rem; }
        .analytics-table th {
            font-weight: 800; color: var(--muted); text-transform: uppercase; font-size: .72rem;
            padding: 8px 6px; border-bottom: 2px solid #e2e8f0; text-align: left; letter-spacing: .3px;
        }
        .analytics-table td {
            padding: 10px 6px; border-bottom: 1px solid #f1f5f9; font-weight: 600;
        }
        .analytics-table tr:last-child td { border-bottom: none; }

        /* Status pills */
        .op-status {
            display: inline-block; padding: 3px 10px; border-radius: 999px;
            font-size: .72rem; font-weight: 800; text-transform: uppercase;
        }
        .op-active { background: #dcfce7; color: #166534; }
        .op-completed { background: #e0e7ff; color: #3730a3; }

        /* Chart container */
        .chart-wrap { position: relative; height: 220px; }
        @media (min-width: 768px) { .chart-wrap { height: 280px; } }

        /* Loading state */
        .loading-spinner {
            display: flex; justify-content: center; align-items: center; padding: 40px;
        }
        .spinner-ring {
            width: 40px; height: 40px; border: 4px solid #e2e8f0;
            border-top-color: var(--brand); border-radius: 50%;
            animation: spin .8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Empty state */
        .empty-state {
            text-align: center; padding: 30px 16px; color: var(--muted);
        }
        .empty-state .material-icons-round { font-size: 48px; margin-bottom: 8px; opacity: .4; }
        .empty-state p { font-weight: 700; font-size: .9rem; }

        /* Location bar */
        .loc-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
        .loc-bar-fill {
            height: 8px; border-radius: 999px; background: var(--brand-light); transition: width .4s;
        }
        .loc-bar-bg {
            flex: 1; height: 8px; border-radius: 999px; background: #e2e8f0;
        }
        .loc-label { font-weight: 700; font-size: .8rem; min-width: 80px; }
        .loc-count { font-weight: 800; font-size: .8rem; color: var(--brand); min-width: 30px; text-align: right; }

        /* Expandable Table CSS */
        .bus-row { cursor: pointer; transition: background .2s; }
        .bus-row:hover { background: #f8fafc; }
        .bus-row.expanded { background: #f1f5f9; }
        .expand-icon {
            font-size: 18px; color: var(--muted); transition: transform .3s;
            vertical-align: middle; margin-right: 4px;
        }
        .expanded .expand-icon { transform: rotate(180deg); color: var(--brand); }
        .details-row { display: none; background: #fafafa; }
        .details-row td { padding: 0 !important; }
        .details-content { padding: 16px 20px; border-left: 4px solid var(--brand); }
        .details-title { font-size: .75rem; font-weight: 800; color: var(--muted); text-transform: uppercase; margin-bottom: 10px; }

        /* See More Button */
        .btn-see-more {
            display: block; width: 100%; padding: 10px; margin-top: 10px;
            background: #f1f5f9; color: var(--brand); border: none;
            border-radius: 12px; font-weight: 800; font-size: .78rem;
            text-transform: uppercase; letter-spacing: .5px; transition: all .2s;
            cursor: pointer; text-align: center;
        }
        .btn-see-more:hover { background: var(--brand); color: #fff; }
        .hidden-item { display: none !important; }
    </style>
</head>
<body>

<?php include __DIR__ . '/../../components/navbarAdmin.php'; ?>

<div class="page-wrap">

    <!-- Period filter -->
    <div class="period-bar">
        <button class="period-pill active" data-period="today">Today</button>
        <button class="period-pill" data-period="week">This Week</button>
        <button class="period-pill" data-period="month">This Month</button>
    </div>

    <!-- Loading state -->
    <div id="loadingState" class="loading-spinner">
        <div class="spinner-ring"></div>
    </div>

    <!-- Content (hidden until loaded) -->
    <div id="analyticsContent" style="display:none;">

        <!-- Summary Stats -->
        <div class="stat-grid" id="statGrid"></div>

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
<script>
    let currentPeriod = 'today';
    let hourlyChart = null;

    // Period filter buttons
    document.querySelectorAll('.period-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.period-pill').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPeriod = btn.dataset.period;
            loadAnalytics();
        });
    });

    function h(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

    function emptyState(icon, msg) {
        return `<div class="empty-state"><span class="material-icons-round">${icon}</span><p>${msg}</p></div>`;
    }

    async function loadAnalytics() {
        document.getElementById('loadingState').style.display = 'flex';
        document.getElementById('analyticsContent').style.display = 'none';

        try {
            const res = await fetch(`../api.php?action=get_analytics&period=${currentPeriod}`);
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Failed');
            renderAnalytics(data);
        } catch(e) {
            console.error(e);
            document.getElementById('analyticsContent').innerHTML =
                emptyState('error', 'Failed to load analytics. Please try again.');
        }

        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('analyticsContent').style.display = 'block';
    }

    function renderAnalytics(data) {
        const s = data.summary || {};

        // Summary cards
        document.getElementById('statGrid').innerHTML = `
            <div class="stat-card">
                <div class="stat-value">${Number(s.total_trips || 0).toLocaleString()}</div>
                <div class="stat-label">Total Trips</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${Number(s.total_passengers || 0).toLocaleString()}</div>
                <div class="stat-label">Passengers Boarded</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${Number(s.total_departed || 0).toLocaleString()}</div>
                <div class="stat-label">Passengers Departed</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${Math.round(Number(s.avg_trip_minutes || 0))}<span style="font-size:.9rem;color:var(--muted)">min</span></div>
                <div class="stat-label">Avg Trip Duration</div>
            </div>
        `;

        // Hourly chart
        renderHourlyChart(data.hourly_flow || []);

        // Routes table
        renderRouteTable(data.routes || []);

        // Bus table
        renderBusTable(data.buses || []);

        // Conductors
        renderConductorTable(data.conductors || []);

        // Recent ops
        renderRecentOps(data.recent_operations || []);

        // Location logs
        renderLocationLogs(data.location_logs || []);
    }

    function renderHourlyChart(hourlyData) {
        const ctx = document.getElementById('hourlyChart').getContext('2d');

        // Build full 24-hour array
        const hours = Array.from({length: 24}, (_, i) => i);
        const counts = new Array(24).fill(0);
        hourlyData.forEach(h => { counts[Number(h.hr)] = Number(h.total); });

        const labels = hours.map(h => {
            const ampm = h >= 12 ? 'PM' : 'AM';
            const hr = h % 12 || 12;
            return `${hr}${ampm}`;
        });

        if (hourlyChart) hourlyChart.destroy();

        const gradient = ctx.createLinearGradient(0, 0, 0, 220);
        gradient.addColorStop(0, 'rgba(29, 78, 216, 0.3)');
        gradient.addColorStop(1, 'rgba(29, 78, 216, 0.02)');

        hourlyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Passengers',
                    data: counts,
                    borderColor: '#1d4ed8',
                    backgroundColor: gradient,
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    pointHoverBackgroundColor: '#1d4ed8'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#0f172a',
                        titleFont: { weight: '800' },
                        bodyFont: { weight: '600' },
                        cornerRadius: 10,
                        padding: 10
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 10, weight: '600' }, color: '#94a3b8', maxTicksLimit: 12 }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(148,163,184,0.15)' },
                        ticks: { font: { size: 11, weight: '700' }, color: '#64748b', stepSize: 1 }
                    }
                }
            }
        });
    }

    function renderRouteTable(routes) {
        const el = document.getElementById('routeTable');
        if (!routes.length) { el.innerHTML = emptyState('route', 'No route data yet'); return; }
        el.innerHTML = `<table class="analytics-table">
            <thead><tr><th>Route</th><th>Trips</th><th>Passengers</th></tr></thead>
            <tbody>${routes.map(r => `<tr>
                <td>${h(r.route)}</td>
                <td>${r.trips}</td>
                <td style="color:var(--brand);font-weight:900">${Number(r.passengers).toLocaleString()}</td>
            </tr>`).join('')}</tbody>
        </table>`;
    }

    function renderBusTable(buses) {
        const el = document.getElementById('busTable');
        if (!buses.length) { el.innerHTML = emptyState('directions_bus', 'No bus data yet'); return; }
        
        let html = `<table class="analytics-table">
            <thead><tr><th>Bus Code</th><th>Trips</th><th>Passengers</th></tr></thead>
            <tbody>`;
        
        buses.forEach((b, idx) => {
            const rowId = `bus-details-${idx}`;
            // Clean up conductor emails to show only names
            const conductorNames = (b.conductors || '').split(', ').map(email => email.split('@')[0]).join(', ');
            
            html += `
                <tr class="bus-row" onclick="toggleBusDetails('${rowId}', this)">
                    <td style="font-weight:900">
                        <span class="material-icons-round expand-icon">expand_more</span>
                        ${h(b.code)}
                    </td>
                    <td>${b.trips}</td>
                    <td style="color:var(--brand);font-weight:900">${Number(b.passengers).toLocaleString()}</td>
                </tr>
                <tr id="${rowId}" class="details-row">
                    <td colspan="3">
                        <div class="details-content">
                            <div class="row mb-3">
                                <div class="col-6">
                                    <div class="details-title" style="margin-bottom:4px;">Routes Taken</div>
                                    <div style="font-size:.8rem; font-weight:700; color:var(--text);">${h(b.routes || 'N/A')}</div>
                                </div>
                                <div class="col-6">
                                    <div class="details-title" style="margin-bottom:4px;">Conductors</div>
                                    <div style="font-size:.8rem; font-weight:700; color:var(--text);">${h(conductorNames || 'N/A')}</div>
                                </div>
                            </div>
                            <div class="details-title">Departure Hotspots</div>
                            ${renderHotspotBars(b.hotspots || [])}
                        </div>
                    </td>
                </tr>
            `;
        });
        
        html += `</tbody></table>`;
        el.innerHTML = html;
    }

    function renderHotspotBars(hotspots) {
        if (!hotspots.length) return `<p style="font-size:.8rem; color:var(--muted); font-weight:600; margin:0;">No departure data recorded for this bus.</p>`;
        
        const maxVal = Math.max(...hotspots.map(l => Number(l.total)));
        const limit = 3;
        const id = 'hotspots-' + Math.random().toString(36).substr(2, 9);
        
        let html = hotspots.map((l, i) => {
            const pct = maxVal > 0 ? (Number(l.total) / maxVal * 100) : 0;
            const hiddenClass = i >= limit ? `hidden-item ${id}` : '';
            return `<div class="loc-bar ${hiddenClass}">
                <span class="loc-label" style="font-size:.75rem;">${h(l.location_name)}</span>
                <div class="loc-bar-bg" style="height:6px;"><div class="loc-bar-fill" style="width:${pct}%; height:6px;"></div></div>
                <span class="loc-count" style="font-size:.75rem;">${Number(l.total).toLocaleString()}</span>
            </div>`;
        }).join('');

        if (hotspots.length > limit) {
            html += `<button class="btn-see-more" onclick="toggleSeeMore('${id}', this)">See More (${hotspots.length - limit})</button>`;
        }
        return html;
    }

    function toggleSeeMore(className, btn) {
        const items = document.querySelectorAll('.' + className);
        const isHidden = items[0].classList.contains('hidden-item');
        
        if (isHidden) {
            items.forEach(el => el.classList.remove('hidden-item'));
            btn.textContent = 'See Less';
        } else {
            items.forEach(el => el.classList.add('hidden-item'));
            const count = items.length;
            btn.textContent = `See More (${count})`;
        }
    }

    function toggleBusDetails(id, rowEl) {
        const detailsRow = document.getElementById(id);
        const isVisible = detailsRow.style.display === 'table-row';
        
        // Close others in the same table if desired (optional)
        // document.querySelectorAll('.details-row').forEach(r => r.style.display = 'none');
        // document.querySelectorAll('.bus-row').forEach(r => r.classList.remove('expanded'));

        if (isVisible) {
            detailsRow.style.display = 'none';
            rowEl.classList.remove('expanded');
        } else {
            detailsRow.style.display = 'table-row';
            rowEl.classList.add('expanded');
        }
    }


    function renderConductorTable(conductors) {
        const el = document.getElementById('conductorTable');
        if (!conductors.length) { el.innerHTML = emptyState('badge', 'No conductor data yet'); return; }
        el.innerHTML = `<table class="analytics-table">
            <thead><tr><th>Conductor</th><th>Trips</th><th>Passengers</th></tr></thead>
            <tbody>${conductors.map(c => `<tr>
                <td>${h(c.email)}</td>
                <td>${c.trips}</td>
                <td style="color:var(--brand);font-weight:900">${Number(c.passengers).toLocaleString()}</td>
            </tr>`).join('')}</tbody>
        </table>`;
    }

    function renderLocationLogs(logs) {
        const el = document.getElementById('locationLogs');
        if (!logs.length) { el.innerHTML = emptyState('list_alt', 'No location activity recorded yet'); return; }
        
        const limit = 10;
        const id = 'loclogs-hidden';
        
        let html = `<table class="analytics-table">
            <thead><tr><th>Time</th><th>Location</th><th>Bus</th><th>Conductor</th><th>Route</th><th>Board</th><th>Depart</th></tr></thead>
            <tbody>${logs.map((l, i) => {
                const timeStr = new Date(l.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const hiddenClass = i >= limit ? `hidden-item ${id}` : '';
                return `<tr class="${hiddenClass}">
                    <td style="white-space:nowrap;">${timeStr}</td>
                    <td style="font-weight:800; color:var(--brand-light);">${h(l.location_name || 'Terminal')}</td>
                    <td style="font-weight:900">${h(l.bus_code || '')}</td>
                    <td>${h((l.conductor_email || '').split('@')[0])}</td>
                    <td style="font-size:.75rem;">${h(l.route || '')}</td>
                    <td style="color:#166534;">+${l.boarded}</td>
                    <td style="color:#991b1b;">-${l.departed}</td>
                </tr>`;
            }).join('')}</tbody>
        </table>`;

        if (logs.length > limit) {
            html += `<button class="btn-see-more" onclick="toggleSeeMore('${id}', this)">See More (${logs.length - limit})</button>`;
        }
        el.innerHTML = html;
    }

    function renderRecentOps(ops) {
        const el = document.getElementById('recentOps');
        if (!ops.length) { el.innerHTML = emptyState('history', 'No operations recorded yet'); return; }
        
        const limit = 10;
        const id = 'recentops-hidden';

        let html = `<table class="analytics-table">
            <thead><tr><th>Bus</th><th>Route</th><th>Conductor</th><th>Boarded</th><th>Duration</th><th>Status</th></tr></thead>
            <tbody>${ops.map((o, i) => {
                const statusClass = o.status === 'active' ? 'op-active' : 'op-completed';
                const dur = o.duration_min != null ? `${o.duration_min}min` : '-';
                const hiddenClass = i >= limit ? `hidden-item ${id}` : '';
                return `<tr class="${hiddenClass}">
                    <td style="font-weight:900">${h(o.bus_code || '')}</td>
                    <td>${h(o.route || '')}</td>
                    <td>${h((o.conductor_email || '').split('@')[0])}</td>
                    <td style="color:var(--brand);font-weight:900">${Number(o.total_boarded || 0)}</td>
                    <td>${dur}</td>
                    <td><span class="op-status ${statusClass}">${h(o.status || '')}</span></td>
                </tr>`;
            }).join('')}</tbody>
        </table>`;

        if (ops.length > limit) {
            html += `<button class="btn-see-more" onclick="toggleSeeMore('${id}', this)">See More (${ops.length - limit})</button>`;
        }
        el.innerHTML = html;
    }

    // Load on page ready
    document.addEventListener('DOMContentLoaded', loadAnalytics);
</script>
</body>
</html>
