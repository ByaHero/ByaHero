/**
 * analytics.js
 * ──────────────────────────────────────────────────────────────────────────
 * Client-side behaviors for the Admin Analytics Dashboard.
 * Extracted from public/admin/analytics.php
 * ──────────────────────────────────────────────────────────────────────────
 */

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

function h(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
}

function emptyState(icon, msg) {
    return `<div class="text-center py-5 text-muted">
        <span class="material-icons-round fs-1 mb-2 opacity-50">${icon}</span>
        <p class="fw-bold small mb-0">${msg}</p>
    </div>`;
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
        <div class="col-6 col-md-3">
            <div class="card border border-light-subtle shadow-sm rounded-3 p-3 text-center bg-white h-100">
                <div class="fs-2 fw-bold text-primary lh-sm">${Number(s.total_trips || 0).toLocaleString()}</div>
                <div class="text-uppercase text-muted fw-bold small tracking-wider mt-1" style="font-size:0.7rem;">Total Trips</div>
            </div>
        </div>
        <div class="col-6 col-md-3">
            <div class="card border border-light-subtle shadow-sm rounded-3 p-3 text-center bg-white h-100">
                <div class="fs-2 fw-bold text-primary lh-sm">${Number(s.total_passengers || 0).toLocaleString()}</div>
                <div class="text-uppercase text-muted fw-bold small tracking-wider mt-1" style="font-size:0.7rem;">Passengers Boarded</div>
            </div>
        </div>
        <div class="col-6 col-md-3">
            <div class="card border border-light-subtle shadow-sm rounded-3 p-3 text-center bg-white h-100">
                <div class="fs-2 fw-bold text-primary lh-sm">${Number(s.total_departed || 0).toLocaleString()}</div>
                <div class="text-uppercase text-muted fw-bold small tracking-wider mt-1" style="font-size:0.7rem;">Passengers Departed</div>
            </div>
        </div>
        <div class="col-6 col-md-3">
            <div class="card border border-light-subtle shadow-sm rounded-3 p-3 text-center bg-white h-100">
                <div class="fs-2 fw-bold text-primary lh-sm">${Math.round(Number(s.avg_trip_minutes || 0))}<span class="fs-6 text-muted fw-normal"> min</span></div>
                <div class="text-uppercase text-muted fw-bold small tracking-wider mt-1" style="font-size:0.7rem;">Avg Trip Duration</div>
            </div>
        </div>
    `;

    // Boarding Activity Summary
    renderHotspotSummary(s, data.boarding_locations || []);

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
    el.innerHTML = `<div class="table-responsive">
        <table class="table table-hover align-middle mb-0 text-secondary fw-semibold small">
            <thead>
                <tr class="text-uppercase text-muted small border-bottom border-light-subtle" style="font-size:0.7rem;">
                    <th class="py-2">Route</th>
                    <th class="py-2">Trips</th>
                    <th class="py-2">Passengers</th>
                </tr>
            </thead>
            <tbody>${routes.map(r => `<tr>
                <td class="text-dark fw-bold py-2">${h(r.route)}</td>
                <td class="py-2">${r.trips}</td>
                <td class="text-primary fw-bold py-2">${Number(r.passengers).toLocaleString()}</td>
            </tr>`).join('')}</tbody>
        </table>
    </div>`;
}

function renderHotspotSummary(s, locations) {
    const el = document.getElementById('hotspotSummary');
    
    let locListHtml = '<div class="text-center mt-3 pt-3 border-top"><div class="text-uppercase text-muted fw-bold small tracking-wider" style="font-size:0.7rem; margin-bottom:8px;">Boarding Locations</div><div class="d-flex flex-wrap justify-content-center gap-2 mt-2">';
    if (locations && locations.length) {
        locListHtml += locations.map(l => `
            <span class="badge bg-light text-dark border py-2 px-3 rounded-pill fw-bold">
                ${h(l.location_name)} — <span class="text-success">${l.total}</span> <span class="text-muted" style="font-size:0.65rem">Boarded</span>
            </span>
        `).join('');
    } else {
        locListHtml += '<span class="text-muted small">No boarding data yet</span>';
    }
    locListHtml += '</div></div>';

    el.innerHTML = `
        <div class="card border border-light-subtle shadow-sm rounded-3 p-4 mb-4 bg-white">
            <div class="text-center py-2">
                <div class="text-uppercase text-muted fw-bold small tracking-wider" style="font-size:0.7rem; margin-bottom:8px;">Total Boarded Passengers</div>
                <div class="display-5 fw-bold text-success lh-sm">
                    ${Number(s.total_passengers || 0).toLocaleString()}
                </div>
                <div class="text-muted fw-semibold small mt-2">Activity across all tracked terminals & stops</div>
            </div>
            ${locListHtml}
        </div>
    `;
}

function renderBusTable(buses) {
    const el = document.getElementById('busTable');
    if (!buses.length) { el.innerHTML = emptyState('directions_bus', 'No bus data yet'); return; }
    
    let html = `<table class="table table-hover align-middle mb-0 text-secondary fw-semibold small">
        <thead>
            <tr class="text-uppercase text-muted small border-bottom border-light-subtle" style="font-size:0.7rem;">
                <th class="py-2">Bus Code</th>
                <th class="py-2">Trips</th>
                <th class="py-2">Passengers</th>
            </tr>
        </thead>
        <tbody>`;
    
    buses.forEach((b, idx) => {
        const rowId = `bus-details-${idx}`;
        const conductorNames = (b.conductors || '').split(', ').map(email => email.split('@')[0]).join(', ');
        
        html += `
            <tr style="cursor:pointer;" onclick="toggleBusDetails('${rowId}', this)">
                <td class="text-dark fw-bold py-2">
                    <span class="material-icons-round expand-icon align-middle" style="font-size: 1.1rem; margin-right: 4px;">expand_more</span>
                    ${h(b.code)}
                </td>
                <td class="py-2">${b.trips}</td>
                <td class="text-primary fw-bold py-2">${Number(b.passengers).toLocaleString()}</td>
            </tr>
            <tr id="${rowId}" style="display:none; background-color: #fafafa;">
                <td colspan="3" class="p-0 border-0">
                    <div class="border-start border-4 border-primary p-3 bg-light-subtle rounded-end shadow-inner">
                        <div class="row mb-3">
                            <div class="col-6">
                                <div class="text-uppercase text-muted fw-bold small tracking-wider mb-1" style="font-size:0.7rem;">Routes Taken</div>
                                <div class="text-dark fw-bold" style="font-size:.8rem;">${h(b.routes || 'N/A')}</div>
                            </div>
                            <div class="col-6">
                                <div class="text-uppercase text-muted fw-bold small tracking-wider mb-1" style="font-size:0.7rem;">Conductors</div>
                                <div class="text-dark fw-bold" style="font-size:.8rem;">${h(conductorNames || 'N/A')}</div>
                            </div>
                        </div>
                        <div class="text-uppercase text-muted fw-bold small tracking-wider mb-2" style="font-size:0.7rem;">Departure Hotspots</div>
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
    if (!hotspots.length) return `<p class="small text-muted fw-bold mb-0">No departure data recorded for this bus.</p>`;
    
    const maxVal = Math.max(...hotspots.map(l => Number(l.total)));
    const limit = 3;
    const id = 'hotspots-' + Math.random().toString(36).substr(2, 9);
    
    let html = hotspots.map((l, i) => {
        const pct = maxVal > 0 ? (Number(l.total) / maxVal * 100) : 0;
        const hiddenClass = i >= limit ? 'd-none ' + id : '';
        return `<div class="d-flex align-items-center gap-2 mb-2 ${hiddenClass}">
            <span class="text-muted fw-bold small" style="min-width: 90px; font-size:.75rem;">${h(l.location_name)}</span>
            <div class="progress flex-grow-1" style="height: 6px; background-color: #e2e8f0;">
                <div class="progress-bar bg-primary" role="progressbar" style="width: ${pct}%;"></div>
            </div>
            <span class="text-primary fw-bold small text-end" style="min-width: 35px; font-size:.75rem;">${Number(l.total).toLocaleString()}</span>
        </div>`;
    }).join('');

    if (hotspots.length > limit) {
        html += `<button class="btn btn-light btn-sm w-100 py-1 mt-2 fw-bold text-primary rounded-3 text-uppercase tracking-wider" style="font-size:.72rem;" onclick="toggleSeeMore('${id}', this)">See More (${hotspots.length - limit})</button>`;
    }
    return html;
}

function toggleSeeMore(className, btn) {
    const items = document.querySelectorAll('.' + className);
    const isHidden = items[0].classList.contains('d-none');
    
    if (isHidden) {
        items.forEach(el => el.classList.remove('d-none'));
        btn.textContent = 'See Less';
    } else {
        items.forEach(el => el.classList.add('d-none'));
        const count = items.length;
        btn.textContent = `See More (${count})`;
    }
}

function toggleBusDetails(id, rowEl) {
    const detailsRow = document.getElementById(id);
    const isVisible = detailsRow.style.display === 'table-row';
    
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
    el.innerHTML = `<div class="table-responsive">
        <table class="table table-hover align-middle mb-0 text-secondary fw-semibold small">
            <thead>
                <tr class="text-uppercase text-muted small border-bottom border-light-subtle" style="font-size:0.7rem;">
                    <th class="py-2">Conductor</th>
                    <th class="py-2">Trips</th>
                    <th class="py-2">Passengers</th>
                </tr>
            </thead>
            <tbody>${conductors.map(c => `<tr>
                <td class="text-dark fw-bold py-2">${h(c.email)}</td>
                <td class="py-2">${c.trips}</td>
                <td class="text-primary fw-bold py-2">${Number(c.passengers).toLocaleString()}</td>
            </tr>`).join('')}</tbody>
        </table>
    </div>`;
}

function renderLocationLogs(logs) {
    const el = document.getElementById('locationLogs');
    if (!logs.length) { el.innerHTML = emptyState('list_alt', 'No location activity recorded yet'); return; }
    
    const limit = 10;
    const id = 'loclogs-hidden';
    
    let html = `<table class="table table-hover align-middle mb-0 text-secondary fw-semibold small">
        <thead>
            <tr class="text-uppercase text-muted small border-bottom border-light-subtle" style="font-size:0.7rem;">
                <th class="py-2">Time</th>
                <th class="py-2">Location</th>
                <th class="py-2">Bus</th>
                <th class="py-2">Conductor</th>
                <th class="py-2">Route</th>
                <th class="py-2">Board</th>
                <th class="py-2">Depart</th>
            </tr>
        </thead>
        <tbody>${logs.map((l, i) => {
            const timeStr = new Date(l.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const hiddenClass = i >= limit ? `d-none ${id}` : '';
            return `<tr class="${hiddenClass}">
                <td class="py-2" style="white-space:nowrap;">${timeStr}</td>
                <td class="text-primary fw-bold py-2">${h(l.location_name || 'Terminal')}</td>
                <td class="text-dark fw-bold py-2">${h(l.bus_code || '')}</td>
                <td class="py-2">${h((l.conductor_email || '').split('@')[0])}</td>
                <td class="py-2" style="font-size:.75rem;">${h(l.route || '')}</td>
                <td class="text-success fw-bold py-2">+${l.boarded}</td>
                <td class="text-danger fw-bold py-2">-${l.departed}</td>
            </tr>`;
        }).join('')}</tbody>
    </table>`;

    if (logs.length > limit) {
        html += `<button class="btn btn-light btn-sm w-100 py-2 mt-2 fw-bold text-primary rounded-3 text-uppercase tracking-wider" style="font-size:.72rem;" onclick="toggleSeeMore('${id}', this)">See More (${logs.length - limit})</button>`;
    }
    el.innerHTML = html;
}

function renderRecentOps(ops) {
    const el = document.getElementById('recentOps');
    if (!ops.length) { el.innerHTML = emptyState('history', 'No operations recorded yet'); return; }
    
    const limit = 10;
    const id = 'recentops-hidden';

    let html = `<table class="table table-hover align-middle mb-0 text-secondary fw-semibold small">
        <thead>
            <tr class="text-uppercase text-muted small border-bottom border-light-subtle" style="font-size:0.7rem;">
                <th class="py-2">Bus</th>
                <th class="py-2">Route</th>
                <th class="py-2">Conductor</th>
                <th class="py-2">Boarded</th>
                <th class="py-2">Duration</th>
                <th class="py-2">Status</th>
            </tr>
        </thead>
        <tbody>${ops.map((o, i) => {
            const statusBadge = o.status === 'active' ? 'bg-success-subtle text-success' : 'bg-primary-subtle text-primary';
            const dur = o.duration_min != null ? `${o.duration_min} min` : '-';
            const hiddenClass = i >= limit ? `d-none ${id}` : '';
            return `<tr class="${hiddenClass}">
                <td class="text-dark fw-bold py-2">${h(o.bus_code || '')}</td>
                <td class="py-2">${h(o.route || '')}</td>
                <td class="py-2">${h((o.conductor_email || '').split('@')[0])}</td>
                <td class="text-primary fw-bold py-2">${Number(o.total_boarded || 0)}</td>
                <td class="py-2">${dur}</td>
                <td class="py-2"><span class="badge rounded-pill fw-bold text-uppercase px-2 py-1 ${statusBadge}" style="font-size: 0.65rem;">${h(o.status || '')}</span></td>
            </tr>`;
        }).join('')}</tbody>
    </table>`;

    if (ops.length > limit) {
        html += `<button class="btn btn-light btn-sm w-100 py-2 mt-2 fw-bold text-primary rounded-3 text-uppercase tracking-wider" style="font-size:.72rem;" onclick="toggleSeeMore('${id}', this)">See More (${ops.length - limit})</button>`;
    }
    el.innerHTML = html;
}

// Load on page ready
document.addEventListener('DOMContentLoaded', loadAnalytics);
