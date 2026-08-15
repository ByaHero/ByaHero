import React from 'react';
import { useLocation } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

interface NavbarProps {
  adminEmail: string;
}

export default function Navbar({ adminEmail }: NavbarProps) {
  const location = useLocation();

  const getPageMeta = (pathname: string) => {
    switch (pathname) {
      case '/':
        return {
          title: 'Control Center',
          subtitle: 'Monitor and manage real-time transport buses, personnel, and passenger analytics.'
        };
      case '/buses':
        return {
          title: 'Total Buses',
          subtitle: 'Manage and register bus vehicles, plate numbers, and passenger capacities.'
        };
      case '/active-buses':
        return {
          title: 'Active Buses',
          subtitle: 'Monitor real-time status, coordinates, and conductor assignments of active buses.'
        };
      case '/schedules':
        return {
          title: 'Trip Schedules',
          subtitle: 'Create, modify, and review operational schedules and dispatch status.'
        };
      case '/waiting-passengers':
        return {
          title: 'Waiting Passengers',
          subtitle: 'Observe live passenger crowd density estimates at terminal pick-up points.'
        };
      case '/conductors':
        return {
          title: 'Personnel Management',
          subtitle: 'Create, inspect, and remove conductor and driver user accounts.'
        };
      case '/stops':
        return {
          title: 'Bus Stops',
          subtitle: 'Maintain geographic coordinates, stop names, and terminal types.'
        };
      case '/lost-and-found':
        return {
          title: 'Lost & Found Claims',
          subtitle: 'Review passenger lost items, contact channels, and status tracking.'
        };
      case '/reports':
        return {
          title: 'Incident Reports',
          subtitle: 'Access safety hazards, maintenance delays, or passenger incident records.'
        };
      case '/feedbacks':
        return {
          title: 'Passenger Feedbacks',
          subtitle: 'Read suggestions, reviews, and average satisfaction ratings from passengers.'
        };
      case '/fares':
        return {
          title: 'Bus Fares Matrix',
          subtitle: 'Update base fare values, distance-based increments, and discounted matrices.'
        };
      case '/analytics':
        return {
          title: 'Bus Analytics',
          subtitle: 'Inspect aggregate charts, boarded counts, and revenue trends.'
        };
      case '/profile':
        return {
          title: 'Profile Settings',
          subtitle: 'Modify email configurations, credentials, and password access.'
        };
      default:
        return {
          title: 'Admin Dashboard',
          subtitle: 'ByaHero Live Bus Management Portal'
        };
    }
  };

  const meta = getPageMeta(location.pathname);
  const initials = adminEmail ? adminEmail.split('@')[0].substring(0, 2).toUpperCase() : 'AD';

  return (
    <nav className="h-[72px] bg-white border border-slate-200 flex items-center justify-between px-6 mb-6 rounded-2xl shadow-sm">
      <div className="flex flex-col">
        <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">{meta.title}</h1>
        <span className="text-xs text-slate-500 font-medium">{meta.subtitle}</span>
      </div>

      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2 bg-slate-50 py-1.5 px-3 rounded-full border border-slate-200 text-xs font-semibold text-slate-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Live System: <span className="text-emerald-600 font-bold">Operational</span></span>
        </div>

        <div className="flex items-center gap-2.5 cursor-pointer" title={adminEmail}>
          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center font-extrabold text-[#0f3878] text-xs border-2 border-[#0f3878]">
            {initials}
          </div>
          <div className="flex flex-col items-start">
            <span className="text-xs font-bold text-slate-800">{adminEmail.split('@')[0]}</span>
            <span className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
              <ShieldCheck size={11} className="text-[#0f3878]" /> Administrator
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
}
