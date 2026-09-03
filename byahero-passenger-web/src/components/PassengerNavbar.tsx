import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MaterialIcons } from './ui/MaterialIcons';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { triggerSOS } from '../utils/sosUtils';
import { handleTourLayout } from './TourRegistry';

interface PassengerNavbarProps {
  pageTitle?: string;
  showBackButton?: boolean;
  showCloseButton?: boolean;
  onStartTour?: () => void;
  onTriggerSOS?: () => void;
  tourStep?: number | null;
}

export const PassengerNavbar: React.FC<PassengerNavbarProps> = ({
  pageTitle,
  showBackButton = false,
  showCloseButton = false,
  onStartTour,
  onTriggerSOS,
  tourStep
}) => {
  const navigate = useNavigate();
  const { user, logout, serverUrl } = useAuth();
  const { unreadCount, hasUnread } = useNotifications();

  const [menuVisibleState, setMenuVisibleState] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [logoutSuccessVisible, setLogoutSuccessVisible] = useState(false);

  const isTourMenuStep = tourStep === 10 || tourStep === 12 || tourStep === 14;
  const menuVisible = menuVisibleState || isTourMenuStep;

  const setMenuVisible = (visible: boolean) => {
    setMenuVisibleState(visible);
  };

  const userName = user?.name ? (user.name.includes('@') ? user.name.split('@')[0] : user.name) : 'Guest';
  const userInitial = userName.charAt(0).toUpperCase() || '?';
  const userProfilePic = user?.profile_picture || '';

  useEffect(() => {
    if (tourStep === 10 || tourStep === 12 || tourStep === 14) {
      setMenuVisible(true);
      setTimeout(() => {
        let layoutKey = '';
        if (tourStep === 10) layoutKey = 'menu-history';
        if (tourStep === 12) layoutKey = 'menu-feedback';
        if (tourStep === 14) layoutKey = 'menu-report';
        
        if (layoutKey) {
          const el = document.getElementById(`menu-btn-${layoutKey}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }, 350);
    } else if (tourStep === 9 || tourStep === 8 || tourStep === 15) {
      setMenuVisible(false);
    }
  }, [tourStep]);

  const confirmLogout = async () => {
    setLogoutModalVisible(false);
    setMenuVisible(false);
    try {
      const email = user?.email || '';
      if (email) {
        await fetch(`${serverUrl}/api/waiting/cancel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email }),
          credentials: 'include'
        }).catch(() => {});

        await fetch(`${serverUrl}/api/logout`, {
          method: 'POST',
          credentials: 'include'
        }).catch(() => {});
      }
    } catch (e) {}

    logout();
    setLogoutSuccessVisible(true);
    setTimeout(() => {
      setLogoutSuccessVisible(false);
      navigate('/login');
    }, 1200);
  };

  const menuItems = [
    { title: 'Profile', icon: '/images/person.svg', route: '/profile' },
    { title: 'User Guide', icon: '/images/icons/USER GUIDE.svg', route: '#guide', isGuide: true },
    { title: 'Settings', icon: '/images/settings.svg', route: '/settings' },
    { title: 'Lost and Found', icon: '/images/lostandfound.svg', route: '/lost-and-found' },
    { title: 'About ByaHero', icon: '/images/about.svg', route: '/settings/about' },
    { title: 'Feedback', icon: '/images/feedback.svg', route: '/settings/feedback' },
    { title: 'Report a Problem', icon: '/images/report.svg', route: '/report' },
    { title: 'Ride History', icon: '/images/HISTORY.svg', route: '/ride-history' },
  ];

  const renderAvatar = () => {
    if (userProfilePic && userProfilePic !== 'null' && userProfilePic !== 'undefined') {
      const isAbsolute = userProfilePic.startsWith('data:') || userProfilePic.startsWith('http');
      const imgSrc = isAbsolute ? userProfilePic : (serverUrl.replace(/\/$/, '') + '/' + userProfilePic.replace(/^\//, ''));
      return (
        <img
          src={imgSrc}
          alt={userName}
          className="w-20 h-20 rounded-full object-cover"
        />
      );
    }
    return (
      <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center">
        <span className="text-[#103d7c] text-3xl font-bold">{userInitial}</span>
      </div>
    );
  };

  return (
    <>
      {/* Top Navbar Header */}
      <header className="bg-[#103d7c] rounded-b-2xl shadow-sm h-14 z-[2002] w-full sticky top-0 shrink-0 flex items-center justify-between px-4">
        {pageTitle || showBackButton || showCloseButton ? (
          <div className="flex items-center flex-1">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-1 mr-2 text-white focus:outline-none flex items-center justify-center"
            >
              <MaterialIcons name={showCloseButton ? "close" : "arrow_back"} size={24} color="white" />
            </button>
            {pageTitle && (
              <span className="text-white font-bold text-[15px]">{pageTitle}</span>
            )}
          </div>
        ) : (
          <>
            {/* Left TopBar Logo */}
            <div className="w-15 flex items-center justify-center">
              <img
                src="/images/topBarLogo.svg"
                alt="ByaHero Logo"
                className="w-15 h-15 object-contain"
                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
              />
            </div>

            {/* Center ByaHero Brand */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none -z-0">
              <img
                src="/images/ByaHero.svg"
                alt="ByaHero"
                className="w-[100px] h-[30px] object-contain"
                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
              />
            </div>

            {/* Right Icons: Bell & Hamburger */}
            <div className="flex items-center gap-3">
              <Link
                to="/notifications"
                ref={(el) => handleTourLayout('notifications', { current: el })}
                className="relative p-1 rounded-xl flex items-center justify-center focus:outline-none"
              >
                <img
                  src="/images/notification bell.svg"
                  alt="Notifications"
                  className="w-[22px] h-[22px] object-contain"
                />
                {hasUnread && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white ring-2 ring-[#103d7c] animate-pulse">
                    {unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : ''}
                  </span>
                )}
              </Link>

              <button
                type="button"
                ref={(el) => handleTourLayout('hamburger', { current: el })}
                onClick={() => setMenuVisible(true)}
                className="p-1 rounded-xl flex items-center justify-center focus:outline-none"
              >
                <img
                  src="/images/HAMBURGER.svg"
                  alt="Menu"
                  className="w-[18px] h-[18px] object-contain"
                />
              </button>
            </div>
          </>
        )}
      </header>

      {/* Offcanvas Drawer Menu */}
      {menuVisible && (
        <div className="fixed inset-0 z-[3000] flex justify-end">
          {/* Dimmed Backdrop */}
          <div
            onClick={() => setMenuVisible(false)}
            className="fixed inset-0 bg-black/50 transition-opacity animate-fade-in"
          />

          {/* Sliding Menu Panel (80% width) */}
          <div className="relative w-[80%] max-w-sm h-full bg-white shadow-2xl flex flex-col z-10 animate-slide-left">
            {/* Header Block */}
            <div className="bg-[#103d7c] p-4 rounded-b-2xl relative pt-9">
              <button
                type="button"
                onClick={() => setMenuVisible(false)}
                className="absolute right-3 top-5 p-1 text-white text-2xl font-bold focus:outline-none"
              >
                ✕
              </button>

              <div className="flex items-center gap-3 mt-4 mb-4">
                {renderAvatar()}
                <span className="text-white font-bold text-xl flex-1 truncate">
                  {userName}
                </span>
              </div>

              <div className="h-[3px] bg-white w-full" />
            </div>

            {/* Menu Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
              {menuItems.map((item, idx) => {
                let layoutKey: string | null = null;
                if (item.title === 'Ride History') layoutKey = 'menu-history';
                if (item.title === 'Feedback') layoutKey = 'menu-feedback';
                if (item.title === 'Report a Problem') layoutKey = 'menu-report';

                return (
                  <button
                    key={idx}
                    id={layoutKey ? `menu-btn-${layoutKey}` : undefined}
                    type="button"
                    ref={(el) => { if (layoutKey) handleTourLayout(layoutKey, { current: el }); }}
                    onClick={() => {
                      setMenuVisible(false);
                      if (item.isGuide) {
                        localStorage.setItem('byahero_active_tour_step', '0');
                        if (onStartTour) {
                          onStartTour();
                        } else {
                          navigate('/');
                        }
                      } else {
                        localStorage.removeItem('byahero_active_tour_step');
                        navigate(item.route);
                      }
                    }}
                    className="w-full bg-[#ececec] shadow-md rounded-2xl py-4 px-4 flex items-center gap-4 hover:bg-[#e2e2e2] transition-colors text-left"
                  >
                    <img src={item.icon} alt="" className="w-7 h-7 object-contain" />
                    <span className="text-slate-800 font-bold text-sm">{item.title}</span>
                  </button>
                );
              })}

              {/* Logout Button */}
              <button
                type="button"
                onClick={() => {
                  setLogoutModalVisible(true);
                }}
                className="w-full bg-[#ececec] shadow-md rounded-2xl py-4 px-4 flex items-center gap-4 hover:bg-rose-50 transition-colors text-left mt-2.5"
              >
                <img src="/images/logout.svg" alt="" className="w-7 h-7 object-contain" />
                <span className="text-red-600 font-bold text-sm">Log out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {logoutModalVisible && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center p-5 bg-black/50 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-xl text-left">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Log Out</h3>
            <p className="text-sm text-slate-500 font-semibold mb-6">
              Are you sure you want to log out of your account?
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setLogoutModalVisible(false)}
                className="px-5 py-2.5 rounded-full bg-slate-100 text-sm font-semibold text-slate-500 hover:bg-slate-200"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmLogout}
                className="px-5 py-2.5 rounded-full bg-red-600 text-sm font-semibold text-white hover:bg-red-700"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Success Modal */}
      {logoutSuccessVisible && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center p-5 bg-black/50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 shadow-xl flex flex-col items-center w-[80%] max-w-xs text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4 text-emerald-500">
              <MaterialIcons name="check_circle" size={40} color="#10b981" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Logged Out</h3>
            <p className="text-sm text-slate-500 font-semibold mb-2">
              You have been successfully logged out.
            </p>
          </div>
        </div>
      )}
    </>
  );
};
export default PassengerNavbar;
export { PassengerNavbar as PassengerHeader };
