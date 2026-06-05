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
    el.innerHTML = `<table class="analytics-table">
        <thead><tr><th>Route</th><th>Trips</th><th>Passengers</th></tr></thead>
        <tbody>${routes.map(r => `<tr>
            <td>${h(r.route)}</td>
            <td>${r.trips}</td>
            <td style="color:var(--brand);font-weight:900">${Number(r.passengers).toLocaleString()}</td>
        </tr>`).join('')}</tbody>
    </table>`;
}

function renderHotspotSummary(s, locations) {
    const el = document.getElementById('hotspotSummary');
    
    let locListHtml = '<div class="text-center mt-3 pt-3 border-top"><div class="details-title">Boarding Locations</div><div class="d-flex flex-wrap justify-content-center gap-2 mt-2">';
    if (locations && locations.length) {
        locListHtml += locations.map(l => `
            <span class="badge bg-light text-dark border py-2 px-3" style="border-radius:10px; font-weight:700;">
                ${h(l.location_name)} — <span style="color:#166534">${l.total}</span> <span style="font-size:0.65rem; color:var(--muted)">Boarded</span>
            </span>
        `).join('');
    } else {
        locListHtml += '<span class="text-muted small">No boarding data yet</span>';
    }
    locListHtml += '</div></div>';

    el.innerHTML = `
        <div class="section-card" style="padding: 24px;">
            <div class="text-center">
                <div class="details-title" style="margin-bottom:8px;">Total Boarded Passengers</div>
                <div style="font-size: 2.8rem; font-weight: 900; color: #166534; line-height: 1.1;">
                    ${Number(s.total_passengers || 0).toLocaleString()}
                </div>
                <div style="font-size: 0.8rem; color: var(--muted); font-weight: 700; margin-top: 6px;">Activity across all tracked terminals & stops</div>
            </div>
            ${locListHtml}
        </div>
    `;
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
