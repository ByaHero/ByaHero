<?php
require_once __DIR__ . '/auth_passenger.php';
$pageTitle = 'Ride History';
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
    <title>ByaHero - Ride History</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0&display=swap" rel="stylesheet" media="print" onload="this.media='all'" />
    <style>
        :root {
            --primary: #1e3a8a;
            --accent: #2563eb;
            --bg-light: #f8fafc;
            --text-main: #1e293b;
            --text-muted: #64748b;
            --card-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
        }

        body {
            background-color: var(--bg-light);
            font-family: 'Outfit', 'Segoe UI', system-ui, -apple-system, sans-serif;
            padding-top: 60px;
            padding-bottom: 90px;
            color: var(--text-main);
        }

        .history-container {
            max-width: 600px;
            margin: 0 auto;
        }

        .btn-primary {
            background-color: var(--primary) !important;
            border-color: var(--primary) !important;
        }
        .btn-primary:hover, .btn-primary:focus, .btn-primary:active {
            background-color: #152962 !important;
            border-color: #152962 !important;
        }

        /* Stats Header Background Design */
        .stats-header-card::before {
            content: "";
            position: absolute;
            top: -50%;
            right: -20%;
            width: 200px;
            height: 200px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 50%;
        }

        /* Ride Card Animations & Shadows */
        .ride-card {
            border-radius: 20px;
            box-shadow: var(--card-shadow);
            border: 1px solid rgba(255, 255, 255, 0.8);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            animation: slideUp 0.5s ease-out forwards;
            opacity: 0;
        }

        @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .ride-card:active {
            transform: scale(0.97);
        }

        .ride-card.active-ride {
            border: 2px solid var(--accent);
            background: linear-gradient(to bottom, #ffffff, #f0f7ff) !important;
        }

        .pulse-active {
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(22, 101, 52, 0.4); }
            70% { box-shadow: 0 0 0 10px rgba(22, 101, 52, 0); }
            100% { box-shadow: 0 0 0 0 rgba(22, 101, 52, 0); }
        }

        /* Route Timeline Path */
        .route-path {
            position: relative;
            margin-top: 16px;
            padding-left: 24px;
        }

        .route-path::before {
            content: "";
            position: absolute;
            left: 7px;
            top: 8px;
            bottom: 8px;
            width: 2px;
            background: repeating-linear-gradient(to bottom, #cbd5e1, #cbd5e1 4px, transparent 4px, transparent 8px);
        }

        .path-dot {
            position: absolute;
            left: 0;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: white;
            border: 3px solid #cbd5e1;
            z-index: 1;
        }

        .path-dot.start { top: 0; border-color: var(--accent); }
        .path-dot.end { bottom: 0; border-color: var(--text-muted); }

        /* Shimmer Loading */
        .shimmer-card {
            height: 150px;
            background: #f1f5f9;
            border-radius: 20px;
            margin-bottom: 16px;
            position: relative;
            overflow: hidden;
        }

        .shimmer-card::after {
            content: "";
            position: absolute;
            top: 0; right: 0; bottom: 0; left: 0;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent);
            animation: shimmer 1.5s infinite;
        }

        @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
        }
    </style>
</head>
<body>

    <?php include __DIR__ . '/../../components/navbarPassenger.php'; ?>

    <div class="history-container p-3">
        <!-- Summary Section -->
        <div id="statsPlaceholder">
            <div class="stats-header-card p-4 text-white mb-4 position-relative overflow-hidden" style="background-color: #1e3a8a; border-radius: 24px; box-shadow: 0 15px 30px rgba(30, 58, 138, 0.2);">
                <div class="text-uppercase fw-semibold mb-1 opacity-75 small" style="letter-spacing: 1px; font-size: 0.9rem;">This Month</div>
                <div class="fs-2 fw-bold mb-3" id="totalRides">...</div>
                <div class="row pt-3 border-top border-white-20 g-2">
                    <div class="col-6">
                        <span class="d-block small opacity-75" style="font-size: 0.75rem;">Total Duration</span>
                        <span class="fs-5 fw-bold" id="totalDuration">...</span>
                    </div>
                    <div class="col-6">
                        <span class="d-block small opacity-75" style="font-size: 0.75rem;">Fav Route</span>
                        <span class="fs-5 fw-bold text-truncate d-block" id="favRoute">...</span>
                    </div>
                </div>
            </div>
        </div>

        <div id="loadingState">
            <div class="shimmer-card"></div>
            <div class="shimmer-card"></div>
            <div class="shimmer-card"></div>
        </div>

        <div id="filters" class="d-flex gap-2 mb-4" style="display: none !important;">
            <button class="btn btn-filter btn-primary rounded-pill px-4 fw-bold shadow-sm" data-filter="all" onclick="setFilter('all')">All</button>
            <button class="btn btn-filter btn-light border rounded-pill px-4 fw-bold text-muted" data-filter="active" onclick="setFilter('active')">Active</button>
            <button class="btn btn-filter btn-light border rounded-pill px-4 fw-bold text-muted" data-filter="completed" onclick="setFilter('completed')">Past</button>
        </div>

        <div id="historyList"></div>
    </div>

    <script>
        function formatDuration(start, end) {
            if (!end) return 'Ongoing';
            const diff = new Date(end) - new Date(start);
            const mins = Math.floor(diff / 60000);
            if (mins < 60) return mins + ' mins';
            const hrs = Math.floor(mins / 60);
            const remainingMins = mins % 60;
            return hrs + 'h ' + remainingMins + 'm';
        }

        function getGroupLabel(date) {
            const now = new Date();
            const rideDate = new Date(date);
            
            const diffDays = Math.floor((now - rideDate.setHours(0,0,0,0)) / (1000 * 60 * 60 * 24));
            
            if (diffDays === 0) return 'Today';
            if (diffDays === 1) return 'Yesterday';
            if (diffDays < 7) return 'This Week';
            
            return rideDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
        }

        let allHistory = [];
        let currentFilter = 'all';

        function setFilter(filter) {
            currentFilter = filter;
            document.querySelectorAll('.btn-filter').forEach(btn => {
                const btnFilter = btn.getAttribute('data-filter');
                if (btnFilter === filter) {
                    btn.className = 'btn btn-filter btn-primary rounded-pill px-4 fw-bold shadow-sm';
                } else {
                    btn.className = 'btn btn-filter btn-light border rounded-pill px-4 fw-bold text-muted';
                }
            });
            renderHistory();
        }

        async function fetchHistory() {
            try {
                const res = await fetch('../api.php?action=get_ride_history');
                const data = await res.json();
                
                const loading = document.getElementById('loadingState');
                loading.style.display = 'none';
                
                if (!data.success || !data.history || data.history.length === 0) {
                    document.getElementById('historyList').innerHTML = `
                        <div class="text-center py-5 px-4">
                            <div class="bg-white rounded-5 d-flex align-items-center justify-content-center mx-auto mb-4 shadow-sm" style="width: 120px; height: 120px;">
                                <img src="../../assets/images/WAITING.svg" alt="Waiting" style="width: 90px; height: 90px;" />
                            </div>
                            <h4 class="fw-bold">No Rides Yet</h4>
                            <p class="text-muted">Your journey starts here! Take your first ride and see your history grow.</p>
                            <a href="index.php" class="btn btn-primary rounded-pill px-5 py-3 fw-bold mt-3 shadow">Start a Trip</a>
                        </div>
                    `;
                    document.getElementById('statsPlaceholder').style.display = 'none';
                    return;
                }

                allHistory = data.history;
                document.getElementById('filters').style.setProperty('display', 'flex', 'important');
                
                // Process Stats
                const totalRides = data.history.length;
                let totalMins = 0;
                const routes = {};
                
                data.history.forEach(r => {
                    if (r.departed_at) {
                        totalMins += Math.floor((new Date(r.departed_at) - new Date(r.boarded_at)) / 60000);
                    }
                    routes[r.route] = (routes[r.route] || 0) + 1;
                });

                const favRoute = Object.entries(routes).sort((a,b) => b[1] - a[1])[0]?.[0] || 'N/A';
                
                document.getElementById('totalRides').textContent = totalRides + ' Rides';
                document.getElementById('totalDuration').textContent = totalMins > 60 ? (Math.floor(totalMins/60) + 'h ' + (totalMins%60) + 'm') : (totalMins + 'm');
                document.getElementById('favRoute').textContent = favRoute;

                renderHistory();

            } catch (e) {
                console.error(e);
                document.getElementById('historyList').innerHTML = '<div class="alert alert-danger rounded-4">Something went wrong. Please try again.</div>';
            }
        }

        function renderHistory() {
            const list = document.getElementById('historyList');
            const filtered = allHistory.filter(r => currentFilter === 'all' || r.status === currentFilter);
            
            if (filtered.length === 0) {
                list.innerHTML = `<div class="text-center py-5 text-muted fw-bold">No ${currentFilter} rides found.</div>`;
                return;
            }

            // Grouping
            let currentGroup = '';
            let html = '';

            filtered.forEach((ride, index) => {
                const group = getGroupLabel(ride.boarded_at);
                if (group !== currentGroup) {
                    currentGroup = group;
                    html += `
                        <div class="d-flex align-items-center text-uppercase fw-bold text-secondary my-4 ms-1 small" style="letter-spacing: 1px; font-size: 0.85rem; gap: 8px;">
                            ${group}
                            <div class="flex-grow-1" style="height: 1px; background: rgba(0, 0, 0, 0.05);"></div>
                        </div>
                    `;
                }

                const duration = formatDuration(ride.boarded_at, ride.departed_at);
                const boardedTime = new Date(ride.boarded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const departedTime = ride.departed_at ? new Date(ride.departed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Ongoing';
                
                const statusClass = ride.status === 'active' ? 'bg-success-subtle text-success pulse-active' : 'bg-light text-secondary';
                const cardClass = ride.status === 'active' ? 'ride-card active-ride bg-white p-4 mb-3 position-relative' : 'ride-card bg-white p-4 mb-3 position-relative';

                html += `
                    <div class="${cardClass}" style="animation-delay: ${index * 0.05}s">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <span class="badge bg-primary-subtle text-primary fw-bold px-2 py-1" style="font-size: 0.75rem;">Bus ${ride.bus_code}</span>
                            <span class="badge rounded-pill text-uppercase px-2.5 py-1 ${statusClass}" style="font-size: 0.65rem; font-weight: 800;">${ride.status === 'active' ? 'On Ride' : 'Completed'}</span>
                        </div>
                        
                        <h5 class="fw-bold mb-1">${ride.route || 'Express Route'}</h5>
                        
                        <div class="route-path">
                            <div class="path-dot start"></div>
                            <div class="d-flex justify-content-between align-items-center">
                                <span class="fw-bold" style="font-size: 0.95rem;">Boarded</span>
                                <span class="small text-muted fw-semibold">${boardedTime}</span>
                            </div>
                            
                            <div class="bg-white border rounded-3 px-2.5 py-1 my-2 text-muted fw-bold d-inline-flex align-items-center gap-1 small" style="font-size: 0.75rem;">
                                <span class="material-symbols-rounded" style="font-size: 16px;">schedule</span>
                                ${duration}
                            </div>
                            
                            <div class="path-dot end"></div>
                            <div class="d-flex justify-content-between align-items-center">
                                <span class="fw-bold" style="font-size: 0.95rem;">Departed</span>
                                <span class="small text-muted fw-semibold">${departedTime}</span>
                            </div>
                        </div>

                        <div class="mt-3 pt-3 border-top d-flex justify-content-end">
                            <button class="btn btn-link text-danger fw-bold d-flex align-items-center gap-1 text-decoration-none p-1 small" onclick="location.href = 'report/report.php?bus_number=${ride.bus_code}'">
                                <span class="material-symbols-rounded" style="font-size: 18px;">report</span>
                                Report Issue
                            </button>
                        </div>
                    </div>
                `;
            });

            list.innerHTML = html;
        }

        document.addEventListener('DOMContentLoaded', fetchHistory);
    </script>
</body>
</html>
