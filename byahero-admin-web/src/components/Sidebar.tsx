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
    <aside className="w-[260px] bg-[#0f3878] text-white h-screen fixed left-0 top-0 flex flex-col shadow-2xl z-20">
      <div className="p-5 flex items-center gap-3 border-b border-white/10">
        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center font-black text-[#0f3878] text-sm shadow-sm">
          B
        </div>
        <span className="text-base font-extrabold tracking-wider text-white">BYAHERO ADMIN</span>
      </div>

      <div className="flex-1 py-4 px-3 overflow-y-auto flex flex-col gap-5">
        {sections.map((section, idx) => (
          <div key={idx}>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#93c5fd] px-3 mb-1.5 opacity-80">
              {section.title}
            </h3>
            <div className="flex flex-col gap-1">
              {section.links.map((link) => {
                const Icon = link.icon;
                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={({ isActive }) => 
                      `flex items-center gap-3 py-2 px-3 text-xs font-semibold rounded-xl transition duration-150 ${
                        isActive 
                          ? 'bg-[#4C85C5] text-white shadow-md' 
                          : 'text-white/70 hover:bg-white/10 hover:text-white'
                      }`
                    }
                  >
                    <Icon size={16} />
                    <span>{link.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="p-3.5 border-t border-white/10">
        <button 
          className="flex items-center gap-2 text-xs font-bold text-white/70 hover:text-red-300 hover:bg-red-500/20 p-2.5 rounded-xl w-full transition duration-150 cursor-pointer" 
          onClick={handleLogoutClick}
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
