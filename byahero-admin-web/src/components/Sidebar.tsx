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
  const [showLogoutModal, setShowLogoutModal] = React.useState(false);

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false);
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

      {showLogoutModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes scaleUp {
              from { transform: scale(0.95); opacity: 0; }
              to { transform: scale(1); opacity: 1; }
            }
          `}</style>
          <div style={{
            backgroundColor: 'var(--surface)',
            borderRadius: 'var(--radius-lg)',
            padding: '30px 24px',
            width: '90%',
            maxWidth: '380px',
            boxShadow: 'var(--shadow-lg)',
            textAlign: 'center',
            border: '1px solid rgba(239, 68, 68, 0.15)',
            animation: 'scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            <div style={{
              display: 'inline-flex',
              padding: '16px',
              borderRadius: '50%',
              backgroundColor: 'var(--error-light)',
              color: 'var(--error)',
              marginBottom: '20px'
            }}>
              <LogOut size={36} />
            </div>

            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: 'var(--text-main)',
              marginBottom: '10px'
            }}>
              Sign Out?
            </h3>

            <p style={{
              fontSize: '0.9rem',
              color: 'var(--text-muted)',
              marginBottom: '24px',
              lineHeight: 1.5
            }}>
              Are you sure you want to end your session and sign out of the ByaHero Admin Panel?
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowLogoutModal(false)}
                style={{
                  flex: 1,
                  backgroundColor: 'var(--primary-light)',
                  color: 'var(--primary-color)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 0',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                style={{
                  flex: 1,
                  backgroundColor: 'var(--error)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 0',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
