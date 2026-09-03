import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { handleTourLayout } from './TourRegistry';

interface PassengerFooterProps {
  activeTab?: 'location' | 'sos' | 'info';
  setActiveTab?: (tab: 'location' | 'sos' | 'info') => void;
  onTriggerSOS?: () => void;
}

export const PassengerFooter: React.FC<PassengerFooterProps> = ({
  activeTab,
  setActiveTab,
  onTriggerSOS,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine current active tab if not explicitly supplied
  let currentActive = activeTab;
  if (!currentActive) {
    if (location.pathname === '/' || location.pathname === '') currentActive = 'location';
    else if (location.pathname.includes('/sos')) currentActive = 'sos';
    else if (location.pathname.includes('/bus-info')) currentActive = 'info';
    else currentActive = 'location';
  }

  const handleTabPress = (tab: 'location' | 'sos' | 'info') => {
    if (tab === 'location') {
      if (setActiveTab) {
        setActiveTab('location');
      }
      if (location.pathname !== '/') {
        navigate('/');
      }
    } else if (tab === 'sos') {
      navigate('/sos');
    } else if (tab === 'info') {
      navigate('/bus-info');
    }
  };

  return (
    <footer className="border-t border-[#e2e8f0] flex items-center bg-white sticky bottom-0 h-[75px] z-[1060] w-full shrink-0">
      {/* Location Tab */}
      <button
        type="button"
        onClick={() => handleTabPress('location')}
        className="flex-1 flex flex-col items-center justify-center h-full focus:outline-none cursor-pointer"
      >
        <div className="w-[30px] h-[30px] relative flex items-center justify-center">
          <img
            src="/images/icons/locationBlack.svg"
            alt="Location"
            className={`w-[30px] h-[30px] absolute transition-opacity ${
              currentActive === 'location' ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <img
            src="/images/icons/locationIdle.svg"
            alt="Location"
            className={`w-[30px] h-[30px] absolute transition-opacity ${
              currentActive === 'location' ? 'opacity-0' : 'opacity-100'
            }`}
          />
        </div>
        <span
          className={`text-[13px] font-extrabold tracking-widest mt-1 uppercase ${
            currentActive === 'location' ? 'text-[#1856b0]' : 'text-[#64748b]'
          }`}
        >
          LOCATION
        </span>
      </button>

      {/* Central Rising SOS Button */}
      <div className="w-[100px] flex items-center justify-center h-full relative">
        <button
          type="button"
          ref={(el) => handleTourLayout('sos-btn', { current: el })}
          onClick={() => handleTabPress('sos')}
          className="w-[110px] rounded-t-[55px] bg-[#2563eb] absolute -top-5 h-[95px] flex flex-col justify-start items-center pt-4 shadow-lg shadow-blue-600/30 focus:outline-none hover:bg-blue-700 transition-transform active:scale-95 cursor-pointer"
        >
          <img
            src="/images/icons/SOS.svg"
            alt="SOS"
            className="w-[38px] h-[38px] object-contain"
          />
          <span className="text-white text-[13px] font-black mt-1 tracking-wider uppercase">
            SOS
          </span>
        </button>
      </div>

      {/* Bus Info Tab */}
      <button
        type="button"
        onClick={() => handleTabPress('info')}
        className="flex-1 flex flex-col items-center justify-center h-full focus:outline-none cursor-pointer"
      >
        <div className="w-[30px] h-[30px] relative flex items-center justify-center">
          <img
            src="/images/icons/busActive.svg"
            alt="Bus Info"
            className={`w-[30px] h-[30px] absolute transition-opacity ${
              currentActive === 'info' ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <img
            src="/images/icons/busIdle.svg"
            alt="Bus Info"
            className={`w-[30px] h-[30px] absolute transition-opacity ${
              currentActive === 'info' ? 'opacity-0' : 'opacity-100'
            }`}
          />
        </div>
        <span
          className={`text-[13px] font-extrabold tracking-widest mt-1 uppercase ${
            currentActive === 'info' ? 'text-[#1856b0]' : 'text-[#64748b]'
          }`}
        >
          BUS INFO
        </span>
      </button>
    </footer>
  );
};
export default PassengerFooter;
