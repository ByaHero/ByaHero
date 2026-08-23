import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

interface OfflineBannerProps {
  topOffset?: number;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ topOffset = 0 }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div
      className="fixed left-0 right-0 z-[1500] bg-amber-500 text-white text-xs font-bold py-2 px-4 flex items-center justify-center gap-2 shadow-md animate-fade-in"
      style={{ top: `${topOffset}px` }}
    >
      <WifiOff className="w-4 h-4 animate-pulse" />
      <span>You are currently offline. Displaying cached bus schedules and routes.</span>
    </div>
  );
};
export default OfflineBanner;
