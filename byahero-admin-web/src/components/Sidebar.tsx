import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Bus, 
  Activity, 
  Calendar, 
  Users, 
  UserCheck, 
  MapPin, 
  HelpCircle, 
  MessageSquare, 
  AlertTriangle, 
  DollarSign, 
  BarChart3, 
  User, 
  LogOut 
} from 'lucide-react';
import { adminService } from '../services/admin';

interface SidebarProps {
  onLogout: () => void;
}

export default function Sidebar({ onLogout }: SidebarProps) {
  const navigate = useNavigate();

  const handleLogoutClick = async () => {
    try {
      await adminService.logout();
    } catch (e) {
      console.warn("Logout request failed, clearing local session anyway", e);
    }
    onLogout();
    navigate('/login');
  };

  const sections = [
    {
      title: 'Main',
      links: [
        { to: '/', label: 'Dashboard', icon: LayoutDashboard }
      ]
    },
    {
      title: 'Buses & Operations',
      links: [
        { to: '/buses', label: 'Total Buses', icon: Bus },
        { to: '/active-buses', label: 'Active Buses', icon: Activity },
        { to: '/schedules', label: 'Schedules', icon: Calendar },
        { to: '/waiting-passengers', label: 'Waiting Pax', icon: Users }
      ]
    },
    {
      title: 'Personnel & Infrastructure',
      links: [
        { to: '/conductors', label: 'Drivers & Conductors', icon: UserCheck },
        { to: '/stops', label: 'Bus Stops', icon: MapPin }
      ]
    },
    {
      title: 'Passenger Experience',
      links: [
        { to: '/lost-and-found', label: 'Lost & Found', icon: HelpCircle },
        { to: '/reports', label: 'Reports', icon: AlertTriangle },
        { to: '/feedbacks', label: 'Feedbacks', icon: MessageSquare }
      ]
    },
    {
      title: 'Revenue & Insights',
      links: [
        { to: '/fares', label: 'Bus Fares', icon: DollarSign },
        { to: '/analytics', label: 'Analytics', icon: BarChart3 }
      ]
    },
    {
      title: 'Account',
      links: [
        { to: '/profile', label: 'Profile Settings', icon: User }
      ]
    }
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        {/* Placeholder Logo representation */}
        <div style={{
          width: '32px', 
          height: '32px', 
          backgroundColor: 'white', 
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          color: 'var(--primary-color)',
          fontSize: '1rem'
        }}>
          B
        </div>
        <span className="sidebar-brand">BYAHERO ADMIN</span>
      </div>

      <div className="sidebar-menu">
        {sections.map((section, idx) => (
          <div key={idx} className="sidebar-section">
            <h3 className="menu-section-title">{section.title}</h3>
            <div className="sidebar-links">
              {section.links.map((link) => {
                const Icon = link.icon;
                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={({ isActive }) => 
                      `sidebar-link ${isActive ? 'active' : ''}`
                    }
                  >
                    <Icon size={18} />
                    <span>{link.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <button className="logout-btn" onClick={handleLogoutClick}>
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
