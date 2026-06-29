import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, User, ArrowLeft } from 'lucide-react';
import topBarLogo from '../../assets/images/topBarLogo.svg';
import byaHeroText from '../../assets/images/ByaHero.svg';
import hamburger from '../../assets/images/HAMBURGER.svg';
import eks from '../../assets/images/EKS.svg';

interface NavbarProps {
  adminEmail: string;
  onLogout: () => void;
}

export default function Navbar({ adminEmail, onLogout }: NavbarProps) {
  const [menuVisible, setMenuVisible] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isDashboard = location.pathname === '/';
  const isAdminProfile = location.pathname === '/profile';
  
  const getPageTitle = () => {
    switch(location.pathname) {
      case '/': return 'Dashboard';
      case '/profile': return 'Profile';
      case '/buses': return 'Total Buses';
      case '/active-buses': return 'Active Buses';
      case '/schedules': return 'Schedules';
      case '/waiting-passengers': return 'Waiting Passengers';
      case '/conductors': return 'Personnel';
      case '/stops': return 'Bus Stops';
      case '/lost-and-found': return 'Lost & Found';
      case '/reports': return 'Reports';
      case '/feedbacks': return 'Feedbacks';
      case '/fares': return 'Fares';
      case '/analytics': return 'Analytics';
      default: return 'Admin';
    }
  };

  const title = getPageTitle();
  const userName = 'Admin';
  const userInitial = 'A';

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      onLogout();
    }
  };

  return (
    <>
      <div className="bg-[#0f3878] flex items-center px-4 shadow-md h-16 rounded-b-[18px] sticky top-0 z-40 w-full">
        {isAdminProfile || !isDashboard ? (
          <div className="flex items-center flex-1 gap-3">
            <button onClick={() => navigate(-1)} className="w-11 h-11 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors">
              <ArrowLeft size={26} color="white" />
            </button>
            <span className="text-white font-extrabold text-[1.05rem] tracking-wide">{title}</span>
          </div>
        ) : (
          <>
            <div className="flex-1 flex items-center z-10">
              <img src={topBarLogo} alt="Logo" className="w-[70px] h-[70px] object-contain" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <img src={byaHeroText} alt="ByaHero" className="w-[110px] h-[35px] object-contain" />
            </div>
            <div className="flex-1 flex justify-end">
              <button onClick={() => setMenuVisible(true)} className="w-[50px] h-[50px] flex items-center justify-center hover:opacity-80 transition-opacity">
                <img src={hamburger} alt="Menu" className="w-[25px] h-[25px] object-contain" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Offcanvas Menu */}
      <div 
        className={`fixed inset-0 z-50 flex justify-end transition-opacity duration-300 ${menuVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      >
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/50 cursor-pointer"
          onClick={() => setMenuVisible(false)}
        />

        {/* Sidebar content */}
        <div 
          className={`bg-[#f3f4f6] h-full shadow-lg relative flex flex-col w-[85%] max-w-sm transition-transform duration-300 ${menuVisible ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <div className="bg-[#0f3878] px-4 pt-10 pb-4 rounded-b-[18px] relative">
            <button 
              onClick={() => setMenuVisible(false)} 
              className="absolute right-3 top-4 p-2 z-10 hover:opacity-80"
            >
              <img src={eks} alt="Close" className="w-6 h-6 invert brightness-0" />
            </button>

            <div className="flex items-center gap-3 pt-2">
              <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shrink-0">
                <span className="text-[#0f3878] text-4xl font-bold">{userInitial}</span>
              </div>
              <div className="flex-1 pr-10 min-w-0">
                <div className="text-white font-black text-2xl mb-1 truncate">{userName}</div>
                <div className="text-white/80 text-sm truncate">{adminEmail}</div>
              </div>
            </div>
            <div className="h-[3px] bg-white mt-4" />
          </div>

          <div className="p-4 gap-3 flex flex-col">
            <button
              className="bg-white rounded-2xl flex items-center p-3.5 shadow-sm hover:bg-gray-50 transition-colors"
              onClick={() => { setMenuVisible(false); navigate('/profile'); }}
            >
              <div className="w-9 h-9 flex items-center justify-center mr-2 ml-2">
                 <User className="text-[#0f3878]" size={28} />
              </div>
              <span className="text-[#111827] font-extrabold text-base">Profile</span>
            </button>

            <button
              className="bg-white rounded-2xl flex items-center p-3.5 shadow-sm mt-1 hover:bg-gray-50 transition-colors"
              onClick={handleLogout}
            >
              <div className="w-9 h-9 flex items-center justify-center mr-2 ml-2">
                <LogOut className="text-red-500" size={28} />
              </div>
              <span className="text-[#111827] font-extrabold text-base">Log out</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
