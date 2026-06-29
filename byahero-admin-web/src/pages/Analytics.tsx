import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chart, registerables } from 'chart.js';
import { 
  Loader2, 
  Download, 
  TrendingUp, 
  Route as RouteIcon, 
  Bus, 
  BadgeCheck, 
  History, 
  ListOrdered,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { apiRequest } from '../services/api';
import Modal from '../components/Modal';

Chart.register(...registerables);

interface AnalyticsData {
  summary: {
    total_trips: number;
    total_passengers: number;
    total_departed: number;
    avg_trip_minutes: number;
  };
  boarding_locations: any[];
  hourly_flow: any[];
  routes: any[];
  buses: any[];
  conductors: any[];
  recent_operations: any[];
  location_logs: any[];
}

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [period, setPeriod] = useState('today');
  
  // Export Modal State
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportPeriod, setExportPeriod] = useState('today');
  const [exportStart, setExportStart] = useState('');
  const [exportEnd, setExportEnd] = useState('');
  const [exporting, setExporting] = useState(false);

  // Sub-component states
  const [expandedBuses, setExpandedBuses] = useState<Record<string, boolean>>({});
  const [seeMoreLogs, setSeeMoreLogs] = useState(false);
  const [seeMoreOps, setSeeMoreOps] = useState(false);

  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const resData = await apiRequest(`/api/admin/analytics?period=${period}`);
      if (resData.success !== false) {
        setData(resData as AnalyticsData);
      } else {
        console.error('Failed to load analytics');
      }
    } catch (error) {
      console.error('Network error loading analytics', error);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchData();
  }, [fetchData]);

  // Render Chart
  useEffect(() => {
    if (!data?.hourly_flow || !chartRef.current) return;

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const hours = Array.from({length: 24}, (_, i) => i);
    const counts = new Array(24).fill(0);
    data.hourly_flow.forEach(h => { counts[Number(h.hr)] = Number(h.total); });

    const labels = hours.map(h => {
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hr = h % 12 || 12;
        return `${hr}${ampm}`;
    });

    const gradient = ctx.createLinearGradient(0, 0, 0, 220);
    gradient.addColorStop(0, 'rgba(29, 78, 216, 0.3)');
    gradient.addColorStop(1, 'rgba(29, 78, 216, 0.02)');

    chartInstance.current = new Chart(ctx, {
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
                    titleFont: { weight: 'bold' },
                    bodyFont: { weight: 'bold' },
                    cornerRadius: 10,
                    padding: 10
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { font: { size: 10, weight: 'bold' }, color: '#94a3b8', maxTicksLimit: 12 }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(148,163,184,0.15)' },
                    ticks: { font: { size: 11, weight: 'bold' }, color: '#64748b', stepSize: 1 }
                }
            }
        }
    });

    return () => {
      if (chartInstance.current) chartInstance.current.destroy();
    };
  }, [data]);

  const handleExport = async () => {
    let query = 'period=today';
    let titleDate = 'Today';
    
    if (exportPeriod === 'custom') {
        if (!exportStart || !exportEnd) {
            alert('Please select both start and end dates.');
            return;
        }
        query = `period=custom&start=${exportStart}&end=${exportEnd}`;
        titleDate = `${exportStart} to ${exportEnd}`;
    }

    setExporting(true);

    try {
        const resData = await apiRequest(`/api/admin/analytics?${query}`);
        if (resData.success === false) throw new Error('Failed to fetch data for export');
        
        generatePdfReport(resData, titleDate);
    } catch (e: any) {
        alert('Error generating PDF: ' + e.message);
    } finally {
        setExporting(false);
        setExportModalOpen(false);
    }
  };

  const generatePdfReport = (exportData: any, titleDate: string) => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 800;
    tempCanvas.height = 300;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;
    
    const hours = Array.from({length: 24}, (_, i) => i);
    const counts = new Array(24).fill(0);
    (exportData.hourly_flow || []).forEach((h: any) => { counts[Number(h.hr)] = Number(h.total); });
    const labels = hours.map(h => {
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hr = h % 12 || 12;
        return `${hr}${ampm}`;
    });

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Passengers',
                data: counts,
                borderColor: '#1d4ed8',
                backgroundColor: 'rgba(29, 78, 216, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0
            }]
        },
        options: {
            responsive: false,
            maintainAspectRatio: false,
            animation: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                y: { beginAtZero: true, ticks: { font: { size: 10 }, stepSize: 1 } }
            }
        }
    });

    setTimeout(() => {
        const chartImgData = tempCanvas.toDataURL('image/png');
        const s = exportData.summary || {};

        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>ByaHero Analytics Report</title>
            <style>
                body { font-family: Arial, sans-serif; color: #333; padding: 20px; margin: 0; }
                .header { display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 5px; }
                .header img { height: 40px; width: auto; }
                .title { margin: 0; color: #1d4ed8; font-size: 24px; font-weight: 800; letter-spacing: 1px; }
                .subtitle { color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
                .period { text-align: center; color: #64748b; font-size: 14px; margin-bottom: 20px; }
                .summary-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                .summary-table td { padding: 15px; border: 1px solid #e2e8f0; text-align: center; }
                .summary-val { font-size: 24px; font-weight: bold; color: #1d4ed8; }
                .summary-label { font-size: 12px; color: #64748b; text-transform: uppercase; }
                .section-title { color: #334155; margin-bottom: 10px; font-size: 16px; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; }
                .chart-container { text-align: center; margin-bottom: 30px; }
                .chart-container img { max-width: 100%; height: auto; }
                .data-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 12px; }
                .data-table th, .data-table td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
                .data-table th { background-color: #f8fafc; border-bottom: 2px solid #cbd5e1; text-align: left; }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .fw-bold { font-weight: bold; }
                .text-primary { color: #1d4ed8; }
                @media print {
                    body { padding: 0; }
                    .page-break { page-break-inside: avoid; }
                    table { page-break-inside: auto; }
                    tr { page-break-inside: avoid; page-break-after: auto; }
                    thead { display: table-header-group; }
                    tfoot { display: table-footer-group; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div>
                    <h2 class="title">BYAHERO</h2>
                    <div class="subtitle">Analytics Report</div>
                </div>
            </div>
            <p class="period">Period: ${titleDate}</p>
            
            <table class="summary-table">
                <tr>
                    <td>
                        <div class="summary-val">${Number(s.total_trips || 0).toLocaleString()}</div>
                        <div class="summary-label">Total Trips</div>
                    </td>
                    <td>
                        <div class="summary-val">${Number(s.total_passengers || 0).toLocaleString()}</div>
                        <div class="summary-label">Passengers Boarded</div>
                    </td>
                    <td>
                        <div class="summary-val">${Number(s.total_departed || 0).toLocaleString()}</div>
                        <div class="summary-label">Passengers Departed</div>
                    </td>
                    <td>
                        <div class="summary-val">${Math.round(Number(s.avg_trip_minutes || 0))} min</div>
                        <div class="summary-label">Avg Trip Duration</div>
                    </td>
                </tr>
            </table>

            <div class="page-break">
                <h3 class="section-title">Passenger Flow</h3>
                <div class="chart-container">
                    <img src="${chartImgData}" alt="Chart" />
                </div>
            </div>
            
            <div class="page-break">
                <h3 class="section-title">Route Breakdown</h3>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Route</th>
                            <th class="text-center">Trips</th>
                            <th class="text-right">Passengers</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(exportData.routes || []).map((r: any) => `
                        <tr>
                            <td>${r.route}</td>
                            <td class="text-center">${r.trips}</td>
                            <td class="text-right fw-bold text-primary">${Number(r.passengers).toLocaleString()}</td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>

            <script>
                setTimeout(() => { window.print(); }, 500);
            </script>
        </body>
        </html>
        `;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.document.title = `ByaHero_Analytics_${titleDate.replace(/[^a-z0-9]/gi, '_')}`;
        } else {
            alert('Popup blocked! Please allow popups to generate the PDF report.');
        }

    }, 500);
  };

  const toggleBusDetails = (code: string) => {
    setExpandedBuses(prev => ({ ...prev, [code]: !prev[code] }));
  };

  return (
    <div className="p-4 pt-6 max-w-6xl mx-auto w-full pb-16 font-sans bg-slate-50 min-h-screen">
      
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-extrabold text-[#0f3878] tracking-tight">Analytics Dashboard</h1>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-200/60 p-1 rounded-xl">
            {['today', 'week', 'month'].map(p => (
              <button 
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg font-bold text-[13px] capitalize transition-colors ${period === p ? 'bg-white text-[#1d4ed8] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {p === 'today' ? 'Today' : `This ${p}`}
              </button>
            ))}
          </div>
          <button 
            onClick={() => setExportModalOpen(true)}
            className="flex items-center gap-2 bg-white border border-[#1d4ed8] text-[#1d4ed8] font-bold px-4 py-2 rounded-xl hover:bg-blue-50 transition-colors"
          >
            <Download size={18} />
            Export PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={40} className="text-[#1d4ed8] animate-spin" />
        </div>
      ) : data ? (
        <div className="space-y-6">
          
          {/* Summary Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Trips', val: Number(data.summary?.total_trips || 0).toLocaleString() },
              { label: 'Passengers Boarded', val: Number(data.summary?.total_passengers || 0).toLocaleString() },
              { label: 'Passengers Departed', val: Number(data.summary?.total_departed || 0).toLocaleString() },
              { label: 'Avg Trip Duration', val: `${Math.round(Number(data.summary?.avg_trip_minutes || 0))} min` }
            ].map((stat, i) => (
              <div key={i} className="bg-white rounded-3xl p-5 text-center shadow-sm border border-slate-200 h-full flex flex-col justify-center">
                <div className="text-3xl font-extrabold text-[#1d4ed8] mb-1">{stat.val}</div>
                <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Boarding Hotspots */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <div className="text-center mb-6">
              <div className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-2">Total Boarded Passengers</div>
              <div className="text-5xl font-black text-emerald-500 mb-2">{Number(data.summary?.total_passengers || 0).toLocaleString()}</div>
              <div className="text-slate-500 text-[13px] font-medium">Activity across all tracked terminals & stops</div>
            </div>
            
            <div className="border-t border-slate-100 pt-5">
              <div className="text-center mb-4 text-slate-400 text-[11px] font-bold uppercase tracking-wider">Boarding Locations</div>
              <div className="flex flex-wrap justify-center gap-3">
                {data.boarding_locations?.length ? data.boarding_locations.map((loc, i) => (
                  <div key={i} className="bg-slate-50 border border-slate-200 rounded-full px-4 py-2 flex items-center gap-2">
                    <span className="font-bold text-slate-700 text-[13px]">{loc.location_name}</span>
                    <span className="text-emerald-500 font-black">— {Number(loc.total).toLocaleString()}</span>
                    <span className="text-slate-400 text-[11px] uppercase tracking-wider">Boarded</span>
                  </div>
                )) : <span className="text-slate-400 text-[13px] italic">No boarding data yet</span>}
              </div>
            </div>
          </div>

          {/* Hourly Passenger Flow */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <h5 className="font-bold mb-6 text-slate-800 flex items-center gap-2 uppercase tracking-wider text-[13px]">
              <TrendingUp className="text-[#1d4ed8]" size={20} />
              Passenger Flow
            </h5>
            <div className="h-[250px] w-full">
              <canvas ref={chartRef}></canvas>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Route Breakdown */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
              <h5 className="font-bold mb-4 text-slate-800 flex items-center gap-2 uppercase tracking-wider text-[13px]">
                <RouteIcon className="text-[#1d4ed8]" size={20} />
                Route Breakdown
              </h5>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 text-[10px] uppercase tracking-wider">
                      <th className="py-3 px-2">Route</th>
                      <th className="py-3 px-2">Trips</th>
                      <th className="py-3 px-2">Passengers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.routes?.map((r, i) => (
                      <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                        <td className="py-3 px-2 font-bold text-slate-700 text-[14px]">{r.route}</td>
                        <td className="py-3 px-2 text-slate-600 font-medium">{r.trips}</td>
                        <td className="py-3 px-2 text-[#1d4ed8] font-bold">{Number(r.passengers).toLocaleString()}</td>
                      </tr>
                    ))}
                    {!data.routes?.length && <tr><td colSpan={3} className="text-center py-6 text-slate-400 italic">No route data yet</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bus Performance */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
              <h5 className="font-bold mb-2 text-slate-800 flex items-center gap-2 uppercase tracking-wider text-[13px]">
                <Bus className="text-[#1d4ed8]" size={20} />
                Bus Performance
              </h5>
              <p className="text-slate-400 text-[12px] font-medium mb-4">Click on a bus to view its specific departure hotspots.</p>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 text-[10px] uppercase tracking-wider">
                      <th className="py-3 px-2">Bus Code</th>
                      <th className="py-3 px-2">Trips</th>
                      <th className="py-3 px-2">Passengers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.buses?.map((b, i) => {
                      const expanded = expandedBuses[b.code];
                      return (
                        <React.Fragment key={i}>
                          <tr 
                            className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                            onClick={() => toggleBusDetails(b.code)}
                          >
                            <td className="py-3 px-2 font-bold text-slate-700 text-[14px] flex items-center">
                              {expanded ? <ChevronUp size={16} className="mr-2 text-slate-400" /> : <ChevronDown size={16} className="mr-2 text-slate-400" />}
                              {b.code}
                            </td>
                            <td className="py-3 px-2 text-slate-600 font-medium">{b.trips}</td>
                            <td className="py-3 px-2 text-[#1d4ed8] font-bold">{Number(b.passengers).toLocaleString()}</td>
                          </tr>
                          {expanded && (
                            <tr>
                              <td colSpan={3} className="p-0 border-b border-slate-200">
                                <div className="bg-slate-50 border-l-4 border-[#1d4ed8] p-4 m-2 rounded-r-xl">
                                  <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                      <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Routes Taken</div>
                                      <div className="text-slate-700 font-bold text-[13px]">{b.routes || 'N/A'}</div>
                                    </div>
                                    <div>
                                      <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Conductors</div>
                                      <div className="text-slate-700 font-bold text-[13px]">
                                        {(b.conductors || '').split(', ').map((email: string) => email.split('@')[0]).join(', ') || 'N/A'}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">Departure Hotspots</div>
                                  {!b.hotspots?.length ? (
                                    <div className="text-slate-500 italic text-[12px]">No departure data recorded.</div>
                                  ) : (
                                    b.hotspots.slice(0, 3).map((h: any, hi: number) => {
                                      const maxVal = Math.max(...b.hotspots.map((hl: any) => Number(hl.total)));
                                      const pct = maxVal > 0 ? (Number(h.total) / maxVal * 100) : 0;
                                      return (
                                        <div key={hi} className="flex items-center gap-3 mb-2">
                                          <span className="text-slate-600 font-bold text-[11px] w-[100px] truncate">{h.location_name}</span>
                                          <div className="flex-grow h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                            <div className="h-full bg-[#1d4ed8]" style={{ width: `${pct}%` }}></div>
                                          </div>
                                          <span className="text-[#1d4ed8] font-black text-[12px] w-[40px] text-right">{Number(h.total).toLocaleString()}</span>
                                        </div>
                                      );
                                    })
                                  )}
                                  {b.hotspots?.length > 3 && (
                                    <div className="text-[#1d4ed8] text-[11px] font-bold uppercase mt-2 cursor-pointer hover:underline">
                                      + {b.hotspots.length - 3} more locations
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                    {!data.buses?.length && <tr><td colSpan={3} className="text-center py-6 text-slate-400 italic">No bus data yet</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Conductor Activity */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 lg:col-span-2">
              <h5 className="font-bold mb-4 text-slate-800 flex items-center gap-2 uppercase tracking-wider text-[13px]">
                <BadgeCheck className="text-[#1d4ed8]" size={20} />
                Conductor Activity
              </h5>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 text-[10px] uppercase tracking-wider">
                      <th className="py-3 px-2">Conductor</th>
                      <th className="py-3 px-2">Trips</th>
                      <th className="py-3 px-2">Passengers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.conductors?.map((c, i) => (
                      <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                        <td className="py-3 px-2 font-bold text-slate-700 text-[14px]">{c.email}</td>
                        <td className="py-3 px-2 text-slate-600 font-medium">{c.trips}</td>
                        <td className="py-3 px-2 text-[#1d4ed8] font-bold">{Number(c.passengers).toLocaleString()}</td>
                      </tr>
                    ))}
                    {!data.conductors?.length && <tr><td colSpan={3} className="text-center py-6 text-slate-400 italic">No conductor data yet</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Operations */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 lg:col-span-2">
              <h5 className="font-bold mb-4 text-slate-800 flex items-center gap-2 uppercase tracking-wider text-[13px]">
                <History className="text-[#1d4ed8]" size={20} />
                Recent Operations
              </h5>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 text-[10px] uppercase tracking-wider">
                      <th className="py-3 px-2">Bus</th>
                      <th className="py-3 px-2">Route</th>
                      <th className="py-3 px-2">Conductor</th>
                      <th className="py-3 px-2">Boarded</th>
                      <th className="py-3 px-2">Duration</th>
                      <th className="py-3 px-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(seeMoreOps ? data.recent_operations : data.recent_operations?.slice(0, 10))?.map((o, i) => (
                      <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                        <td className="py-3 px-2 font-bold text-slate-700 text-[14px]">{o.bus_code}</td>
                        <td className="py-3 px-2 text-slate-600 font-medium text-[13px]">{o.route}</td>
                        <td className="py-3 px-2 text-slate-600 font-medium text-[13px]">{(o.conductor_email || '').split('@')[0]}</td>
                        <td className="py-3 px-2 text-[#1d4ed8] font-bold">{Number(o.total_boarded || 0)}</td>
                        <td className="py-3 px-2 text-slate-600 font-medium text-[13px]">{o.duration_min != null ? `${o.duration_min} min` : '-'}</td>
                        <td className="py-3 px-2">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${o.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {!data.recent_operations?.length && <tr><td colSpan={6} className="text-center py-6 text-slate-400 italic">No operations recorded yet</td></tr>}
                  </tbody>
                </table>
              </div>
              {data.recent_operations?.length > 10 && (
                <button 
                  onClick={() => setSeeMoreOps(!seeMoreOps)}
                  className="w-full mt-4 py-3 bg-slate-50 hover:bg-slate-100 text-[#1d4ed8] font-bold text-[12px] uppercase tracking-wider rounded-xl transition-colors"
                >
                  {seeMoreOps ? 'Show Less' : `See More (${data.recent_operations.length - 10})`}
                </button>
              )}
            </div>

            {/* Location Logs */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 lg:col-span-2">
              <h5 className="font-bold mb-4 text-slate-800 flex items-center gap-2 uppercase tracking-wider text-[13px]">
                <ListOrdered className="text-[#1d4ed8]" size={20} />
                Location Activity Log
              </h5>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 text-[10px] uppercase tracking-wider">
                      <th className="py-3 px-2">Time</th>
                      <th className="py-3 px-2">Location</th>
                      <th className="py-3 px-2">Bus</th>
                      <th className="py-3 px-2">Conductor</th>
                      <th className="py-3 px-2">Route</th>
                      <th className="py-3 px-2">Board</th>
                      <th className="py-3 px-2">Depart</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(seeMoreLogs ? data.location_logs : data.location_logs?.slice(0, 10))?.map((l, i) => (
                      <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                        <td className="py-3 px-2 text-slate-500 font-medium text-[12px] whitespace-nowrap">
                          {new Date(l.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-2 font-bold text-[#1d4ed8] text-[13px]">{l.location_name || 'Terminal'}</td>
                        <td className="py-3 px-2 font-bold text-slate-700 text-[13px]">{l.bus_code}</td>
                        <td className="py-3 px-2 text-slate-600 font-medium text-[12px]">{(l.conductor_email || '').split('@')[0]}</td>
                        <td className="py-3 px-2 text-slate-500 font-medium text-[11px]">{l.route}</td>
                        <td className="py-3 px-2 text-emerald-500 font-black text-[13px]">{l.boarded > 0 ? `+${l.boarded}` : '-'}</td>
                        <td className="py-3 px-2 text-rose-500 font-black text-[13px]">{l.departed > 0 ? `-${l.departed}` : '-'}</td>
                      </tr>
                    ))}
                    {!data.location_logs?.length && <tr><td colSpan={7} className="text-center py-6 text-slate-400 italic">No location activity recorded yet</td></tr>}
                  </tbody>
                </table>
              </div>
              {data.location_logs?.length > 10 && (
                <button 
                  onClick={() => setSeeMoreLogs(!seeMoreLogs)}
                  className="w-full mt-4 py-3 bg-slate-50 hover:bg-slate-100 text-[#1d4ed8] font-bold text-[12px] uppercase tracking-wider rounded-xl transition-colors"
                >
                  {seeMoreLogs ? 'Show Less' : `See More (${data.location_logs.length - 10})`}
                </button>
              )}
            </div>

          </div>
        </div>
      ) : (
        <div className="text-center py-20 text-slate-500">Failed to load analytics data.</div>
      )}

      {/* Export Modal */}
      <Modal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        title="Export Analytics to PDF"
        primaryAction={{
          label: exporting ? 'Generating...' : 'Generate PDF',
          onClick: handleExport
        }}
        secondaryAction={{
          label: 'Cancel',
          onClick: () => setExportModalOpen(false)
        }}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-2">Time Period</label>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
                <input 
                  type="radio" 
                  name="exportPeriod" 
                  value="today" 
                  checked={exportPeriod === 'today'} 
                  onChange={() => setExportPeriod('today')}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="font-bold text-slate-700 text-[14px]">Just Today</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
                <input 
                  type="radio" 
                  name="exportPeriod" 
                  value="custom" 
                  checked={exportPeriod === 'custom'} 
                  onChange={() => setExportPeriod('custom')}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="font-bold text-slate-700 text-[14px]">Custom Date Range</span>
              </label>
            </div>
          </div>

          {exportPeriod === 'custom' && (
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div>
                <label className="block text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1">Start Date</label>
                <input 
                  type="date" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/30"
                  value={exportStart}
                  onChange={e => setExportStart(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1">End Date</label>
                <input 
                  type="date" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/30"
                  value={exportEnd}
                  onChange={e => setExportEnd(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      </Modal>

    </div>
  );
}
