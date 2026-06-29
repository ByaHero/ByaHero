import React from 'react';
import { useLocation } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

interface NavbarProps {
  adminEmail: string;
}

export default function Navbar({ adminEmail }: NavbarProps) {
  const location = useLocation();

  // Map path routes to readable names and descriptions
  const getPageMeta = (pathname: string) => {
    switch (pathname) {
      case '/':
        return {
          title: 'Control Center',
          subtitle: 'Monitor and manage real-time transport fleet, personnel, and passenger analytics.'
        };
      case '/buses':
        return {
          title: 'Total Buses',
          subtitle: 'Manage and register fleet vehicles, plate numbers, and passenger capacities.'
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
          title: 'Fleet Analytics',
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
          subtitle: 'ByaHero Live Fleet Management Portal'
        };
    }
  };

  const meta = getPageMeta(location.pathname);
  const initials = adminEmail ? adminEmail.split('@')[0].substring(0, 2).toUpperCase() : 'AD';

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <h1 className="navbar-title">{meta.title}</h1>
        <span className="navbar-subtitle">{meta.subtitle}</span>
      </div>

      <div className="navbar-right">
        <div className="system-status">
          <span className="status-dot pulse"></span>
          <span>Live System: <span style={{ color: 'var(--success)' }}>Operational</span></span>
        </div>

        <div className="profile-trigger" title={adminEmail}>
          <div className="avatar">
            {initials}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{adminEmail.split('@')[0]}</span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <ShieldCheck size={10} color="var(--primary-color)" /> Administrator
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
}
