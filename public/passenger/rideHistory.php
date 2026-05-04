<?php
require_once __DIR__ . '/auth_passenger.php';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Ride History - ByaHero</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded" rel="stylesheet" />
    <style>
        :root { --primary: #0d47a1; --bg: #f8fafc; }
        body { background: var(--bg); font-family: 'Segoe UI', sans-serif; padding-top: 70px; padding-bottom: 80px; }
        
        .history-card { 
            border: none; 
            border-radius: 20px; 
            background: #fff; 
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); 
            margin-bottom: 16px; 
            transition: all 0.2s ease;
            border-left: 5px solid transparent;
        }
        .history-card:active { transform: scale(0.98); }
        .history-card.active-ride { border-left-color: #3b82f6; background: #f0f7ff; }

        .bus-icon-circle { 
            width: 50px; 
            height: 50px; 
            background: #f1f5f9; 
            color: #475569; 
            border-radius: 16px; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            flex-shrink: 0;
        }
        .active-ride .bus-icon-circle { background: #dbeafe; color: #1e40af; }

        .status-badge { 
            font-size: 0.65rem; 
            padding: 4px 10px; 
            border-radius: 99px; 
            font-weight: 800; 
            text-transform: uppercase; 
            letter-spacing: 0.05em;
        }
        .status-completed { background: #f1f5f9; color: #475569; }
        .status-active { background: #3b82f6; color: #fff; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3); }

        .empty-state { text-align: center; padding: 80px 20px; }
        .empty-icon { font-size: 100px; color: #e2e8f0; margin-bottom: 24px; display: block; }
        
        .route-info { color: #1e293b; font-weight: 600; font-size: 0.95rem; }
        .bus-code { color: #64748b; font-size: 0.8rem; font-weight: 500; }
        
        .time-info { 
            display: flex; 
            align-items: center; 
            gap: 4px; 
            color: #94a3b8; 
            font-size: 0.75rem; 
            margin-top: 4px; 
        }

        .navbar-history {
            background: #fff;
            box-shadow: 0 1px 0 rgba(0,0,0,0.05);
        }
    </style>
</head>
<body>
    <?php 
    $pageTitle = 'Ride History';
    $backLink = 'index.php';
    include __DIR__ . '/../../components/navbarPassenger.php'; 
    ?>

    <div class="container py-3">
        <div id="history-list">
            <!-- Skeleton Loading -->
            <?php for($i=0; $i<3; $i++): ?>
            <div class="history-card p-3 d-flex align-items-center gap-3 opacity-50">
                <div class="bus-icon-circle"></div>
                <div class="flex-grow-1">
                    <div class="bg-light rounded-pill mb-2" style="height: 16px; width: 60%;"></div>
                    <div class="bg-light rounded-pill" style="height: 12px; width: 40%;"></div>
                </div>
            </div>
            <?php endfor; ?>
        </div>
    </div>

    <script>
        function escapeHtml(str) {
            return String(str || '').replace(/[&<>"']/g, s => ({
                '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
            }[s]));
        }

        async function loadHistory() {
            try {
                const res = await fetch('../api.php?action=getRideHistory');
                const data = await res.json();
                const container = document.getElementById('history-list');
                
                if (!data.success || !data.rides || data.rides.length === 0) {
                    container.innerHTML = `
                        <div class="empty-state">
                            <span class="material-symbols-rounded empty-icon">history_toggle_off</span>
                            <h5 class="fw-bold text-dark">No Trips Recorded</h5>
                            <p class="text-muted small px-4">Your bus rides will automatically appear here when detected. Make sure your location is always enabled.</p>
                            <a href="index.php" class="btn btn-primary rounded-pill px-5 py-2 mt-3 shadow-sm">Explore Map</a>
                        </div>
                    `;
                    return;
                }

                container.innerHTML = data.rides.map(ride => {
                    const date = new Date(ride.boardedAt);
                    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                    
                    const isActive = ride.status === 'active';
                    const cardClass = isActive ? 'active-ride' : '';
                    const statusClass = isActive ? 'status-active' : 'status-completed';
                    
                    return `
                        <div class="history-card p-3 d-flex align-items-center gap-3 ${cardClass}">
                            <div class="bus-icon-circle">
                                <span class="material-symbols-rounded">${isActive ? 'sensors' : 'directions_bus'}</span>
                            </div>
                            <div class="flex-grow-1 min-width-0">
                                <div class="d-flex justify-content-between align-items-start mb-1">
                                    <div class="route-info text-truncate">${escapeHtml(ride.route || 'Unknown Route')}</div>
                                    <span class="status-badge ${statusClass}">${ride.status}</span>
                                </div>
                                <div class="bus-code">${escapeHtml(ride.busCode)}</div>
                                <div class="time-info">
                                    <span class="material-symbols-rounded" style="font-size: 14px;">event</span>
                                    <span>${dateStr}</span>
                                    <span class="mx-1">•</span>
                                    <span class="material-symbols-rounded" style="font-size: 14px;">schedule</span>
                                    <span>${timeStr}</span>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');

            } catch (e) {
                console.error(e);
                document.getElementById('history-list').innerHTML = `
                    <div class="alert alert-danger rounded-4 border-0 shadow-sm m-3">
                        <div class="d-flex align-items-center gap-2">
                            <span class="material-symbols-rounded">error</span>
                            <b>Unable to load history</b>
                        </div>
                        <small class="d-block mt-1">Please check your internet connection and try again.</small>
                    </div>
                `;
            }
        }

        document.addEventListener('DOMContentLoaded', loadHistory);
    </script>
</body>
</html>
