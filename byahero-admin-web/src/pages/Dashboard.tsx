import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import byaheroLogo from '../../assets/images/byaheroLogo.png';

export default function Dashboard() {
  const navigate = useNavigate();
  const [pulse, setPulse] = useState(true);
  
  const [stats, setStats] = useState({
    total_buses: 0,
    active_buses: 0,
    schedules: 0,
    waiting_pax: 0,
    drivers: 0,
    conductors: 0,
    bus_stops: 0,
    lost_and_found: 0,
    reports: 0,
    feedbacks: 0,
    bus_fares: 0,
  });

  useEffect(() => {
    // Pulse animation simulation
    const interval = setInterval(() => {
      setPulse(p => !p);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    // Placeholder for actual API call
    // Example:
    // const response = await fetch('/api/admin/dashboard-stats');
    // const data = await response.json();
    // setStats(data.stats);
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const sections = [
    {
      title: 'Fleet & Operations',
      items: [
        { label: 'Total Buses', count: stats.total_buses, route: '/buses', action: 'Manage' },
        { label: 'Active Buses', count: stats.active_buses, route: '/active-buses', action: 'Manage' },
        { label: 'Schedules', count: stats.schedules, route: '/schedules', action: 'Manage' },
        { label: 'Waiting Pax', count: stats.waiting_pax, route: '/waiting-passengers', action: 'Manage' },
      ],
    },
    {
      title: 'Personnel & Infrastructure',
      items: [
        { label: 'Drivers', count: stats.drivers, route: '/conductors', action: 'Manage' },
        { label: 'Conductors', count: stats.conductors, route: '/conductors', action: 'Manage' },
        { label: 'Bus Stops', count: stats.bus_stops, route: '/stops', action: 'Manage' },
      ],
    },
    {
      title: 'Passenger Experience',
      items: [
        { label: 'Lost & Found', count: stats.lost_and_found, route: '/lost-and-found', action: 'Manage' },
        { label: 'Reports', count: stats.reports, route: '/reports', action: 'Manage' },
        { label: 'Feedbacks', count: stats.feedbacks, route: '/feedbacks', action: 'Manage' },
      ],
    },
    {
      title: 'Revenue & Insights',
      items: [
        { label: 'Bus Fares', count: stats.bus_fares, route: '/fares', action: 'Manage' },
        { label: 'Analytics (Boarded)', count: 0, route: '/analytics', action: 'View' },
      ],
    }
  ];

  return (
    <div className="p-4 pt-6 max-w-7xl mx-auto w-full pb-10">
      {/* Control Center Header */}
      <div className="flex flex-col mb-4 border-b border-gray-200 pb-4 mt-2">
        <div className="mb-3">
          <h1 className="text-2xl font-extrabold text-gray-900 mb-1 tracking-tight">Control Center</h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            Monitor and manage real-time transport fleet, personnel, and passenger analytics.
          </p>
        </div>
        <div className="self-start flex items-center bg-white px-3 py-2 rounded-full border border-gray-200 shadow-sm">
          <div className={`w-2 h-2 rounded-full bg-green-500 mr-2 transition-opacity duration-500 ${pulse ? 'opacity-100' : 'opacity-30'}`}></div>
          <span className="text-xs text-gray-600 font-semibold">
            Live System: <span className="text-green-600">Operational</span>
          </span>
        </div>
      </div>

      {/* Sections */}
      {sections.map((sec, sIdx) => (
        <div key={sIdx} className="mb-6">
          <h2 className="text-sm font-bold text-[#0f3878] mb-4 border-l-[3px] border-[#4C85C5] pl-3 uppercase tracking-wider">
            {sec.title}
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {sec.items.map((item, iIdx) => (
              <div 
                key={iIdx} 
                className="bg-[#4C85C5] p-4 rounded-2xl flex flex-col justify-between min-h-[130px] hover:-translate-y-1 transition-transform duration-200 shadow-sm hover:shadow-md cursor-pointer"
                onClick={() => navigate(item.route)}
              >
                <h3 className="text-white text-[15px] font-bold leading-tight">
                  {item.label}
                </h3>
                <div className="flex justify-between items-end mt-2">
                  <span className="text-[40px] font-bold text-white leading-none">
                    {item.count}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(item.route);
                    }}
                    className="bg-white/20 px-3.5 py-1.5 rounded-full border border-white/20 hover:bg-white/30 transition-colors"
                  >
                    <span className="text-white text-[12px] font-medium">{item.action}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Map Tracker UI Placeholder */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
        <div className="flex justify-between items-center bg-white border-b border-gray-100 p-4">
          <div className="flex items-center">
            <img
              src={byaheroLogo}
              alt="Logo"
              className="w-5 h-5 mr-2 object-contain"
            />
            <span className="text-[#0f3878] font-bold text-sm tracking-wide">BUS TRACKER</span>
          </div>
          <div className="flex items-center">
            <div className={`w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 transition-opacity duration-500 ${pulse ? 'opacity-100' : 'opacity-30'}`}></div>
            <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Live Updates</span>
          </div>
        </div>
        <div className="h-64 bg-slate-100 flex flex-col items-center justify-center">
          <MapPin size={48} className="text-slate-400" />
          <span className="text-slate-400 mt-2 font-medium text-sm">Interactive Map Loading...</span>
        </div>
      </div>
    </div>
  );
}
