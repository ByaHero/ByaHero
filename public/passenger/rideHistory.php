<?php
require_once __DIR__ . '/auth_passenger.php';
$pageTitle = 'Ride History';
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <title>ByaHero - Ride History</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded" rel="stylesheet" />
    <style>
        :root {
            --bs-primary: #1e3a8a;
            --bg-light: #f8fafc;
        }
        body {
            background-color: var(--bg-light);
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            padding-top: 60px;
            padding-bottom: 80px;
        }
        .history-container {
            padding: 16px;
            max-width: 600px;
            margin: 0 auto;
        }
        .ride-card {
            background: white;
            border-radius: 20px;
            padding: 20px;
            margin-bottom: 16px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.05);
            border: 1px solid rgba(0,0,0,0.05);
            transition: transform 0.2s;
        }
        .ride-card:active {
            transform: scale(0.98);
        }
        .status-badge {
            font-size: 0.7rem;
            font-weight: 800;
            text-transform: uppercase;
            padding: 4px 12px;
            border-radius: 999px;
            letter-spacing: 0.5px;
        }
        .status-active {
            background: #dcfce7;
            color: #166534;
        }
        .status-completed {
            background: #f1f5f9;
            color: #475569;
        }
        .bus-icon-wrap {
            width: 48px;
            height: 48px;
            background: #e0e7ff;
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--bs-primary);
        }
        .route-name {
            font-weight: 800;
            color: #1e293b;
            font-size: 1.05rem;
            margin-bottom: 2px;
        }
        .bus-code {
            font-weight: 600;
            color: #64748b;
            font-size: 0.85rem;
        }
        .time-label {
            font-size: 0.75rem;
            color: #94a3b8;
            font-weight: 600;
            margin-bottom: 2px;
        }
        .time-value {
            font-size: 0.85rem;
            color: #334155;
            font-weight: 700;
        }
        .empty-state {
            text-align: center;
            padding: 60px 20px;
        }
        .empty-icon {
            font-size: 64px;
            color: #cbd5e1;
            margin-bottom: 16px;
        }
        .shimmer {
            background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
        }
        @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
        }
    </style>
</head>
<body>

    <?php include __DIR__ . '/../../components/navbarPassenger.php'; ?>

    <div class="history-container" id="historyContainer">
        <div class="text-center py-5" id="loadingState">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    </div>

    <script>
        async function fetchHistory() {
            try {
                const res = await fetch('../api.php?action=get_ride_history');
                const data = await res.json();
                
                const container = document.getElementById('historyContainer');
                
                if (!data.success || !data.history || data.history.length === 0) {
                    container.innerHTML = `
                        <div class="empty-state">
                            <span class="material-symbols-rounded empty-icon">history</span>
                            <h5 class="fw-bold text-dark">No Rides Yet</h5>
                            <p class="text-muted small">Your bus ride history will appear here once you've taken a trip.</p>
                            <a href="index.php" class="btn btn-primary rounded-pill px-4 fw-bold mt-3">Find a Bus</a>
                        </div>
                    `;
                    return;
                }

                container.innerHTML = data.history.map(ride => {
                    const boarded = new Date(ride.boarded_at);
                    const departed = ride.departed_at ? new Date(ride.departed_at) : null;
                    
                    const dateStr = boarded.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                    const boardedStr = boarded.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const departedStr = departed ? departed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Ongoing';
                    
                    const statusClass = ride.status === 'active' ? 'status-active' : 'status-completed';
                    const statusLabel = ride.status === 'active' ? 'On Ride' : 'Completed';

                    return `
                        <div class="ride-card">
                            <div class="d-flex justify-content-between align-items-start mb-3">
                                <div class="d-flex align-items-center gap-3">
                                    <div class="bus-icon-wrap">
                                        <span class="material-symbols-rounded">directions_bus</span>
                                    </div>
                                    <div>
                                        <div class="route-name">${ride.route || 'Unknown Route'}</div>
                                        <div class="bus-code">Bus ${ride.bus_code} • ${dateStr}</div>
                                    </div>
                                </div>
                                <span class="status-badge ${statusClass}">${statusLabel}</span>
                            </div>
                            
                            <div class="row g-0 mt-3 pt-3 border-top">
                                <div class="col-6">
                                    <div class="time-label">BOARDED</div>
                                    <div class="time-value">${boardedStr}</div>
                                </div>
                                <div class="col-6 text-end">
                                    <div class="time-label">DEPARTED</div>
                                    <div class="time-value">${departedStr}</div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');

            } catch (e) {
                console.error(e);
                document.getElementById('historyContainer').innerHTML = '<div class="alert alert-danger">Failed to load ride history.</div>';
            }
        }

        document.addEventListener('DOMContentLoaded', fetchHistory);
    </script>
</body>
</html>
