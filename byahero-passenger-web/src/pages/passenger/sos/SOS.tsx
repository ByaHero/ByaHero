import React, { useState, useEffect, useRef } from 'react';
import PassengerHeader from '../../../components/PassengerNavbar';
import PassengerFooter from '../../../components/PassengerFooter';
import { useAuth } from '../../../context/AuthContext';
import { useTracking } from '../../../context/TrackingContext';
import { triggerSOS } from '../../../utils/sosUtils';
import { resolveLocationAddress } from '../../../utils/locationUtils';
import AlertModal from '../../../components/AlertModal';
import { MaterialIcons } from '../../../components/ui/MaterialIcons';

// Preseeded Static Emergency Contacts matching mobile app
const EMERGENCY_CONTACTS = [
  { name: "Laurel Police Station", phone: "0998-598-5678", type: "Police" },
  { name: "Laurel Fire Station", phone: "0917-534-2244", type: "Fire" },
  { name: "Laurel Municipal Health Office", phone: "0920-911-3829", type: "Medical" },
  { name: "Talisay Police Station", phone: "0998-598-5679", type: "Police" },
  { name: "Talisay Fire Station", phone: "0917-534-2245", type: "Fire" },
  { name: "Talisay Disaster Operations (MDRRMO)", phone: "0939-911-2384", type: "Disaster" },
  { name: "Tanauan Police Station", phone: "0998-598-5680", type: "Police" },
  { name: "Tanauan Fire Station", phone: "0917-534-2246", type: "Fire" },
  { name: "Tanauan Red Cross", phone: "0920-911-3831", type: "Medical" },
  { name: "National Emergency Hotline", phone: "911", type: "General" }
];

export const SOS: React.FC = () => {
  const { serverUrl } = useAuth();
  const { userLocation, circles, busStops } = useTracking();

  const [locationText, setLocationText] = useState('Locating...');
  const [showCountdown, setShowCountdown] = useState(false);
  const [timeLeft, setTimeLeft] = useState(5);
  const [countdownStatus, setCountdownStatus] = useState('After 5 seconds, your SOS alert and location will be sent.');
  const countdownIntervalRef = useRef<any>(null);

  // AlertModal state
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning' | 'confirm';
    onConfirm: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'error',
    onConfirm: () => {},
  });

  const showAlert = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'info' | 'warning' | 'confirm' = 'error',
    onConfirm?: () => void
  ) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      type,
      onConfirm: () => {
        setAlertConfig(p => ({ ...p, visible: false }));
        if (onConfirm) onConfirm();
      },
    });
  };

  useEffect(() => {
    let isMounted = true;

    if (userLocation) {
      resolveLocationAddress(userLocation.lat, userLocation.lng, busStops).then((addr) => {
        if (isMounted) {
          setLocationText(`${addr} • ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`);
        }
      });
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!isMounted) return;
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          resolveLocationAddress(lat, lng, busStops).then((addr) => {
            if (isMounted) {
              setLocationText(`${addr} • ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            }
          });
        },
        (err) => {
          console.warn('SOS geolocation error:', err);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }

    return () => {
      isMounted = false;
    };
  }, [userLocation, busStops]);

  const triggerSOSAlert = async () => {
    setShowCountdown(false);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    triggerSOS({
      baseUrl: serverUrl,
      locationText,
      lat: userLocation ? userLocation.lat : null,
      lng: userLocation ? userLocation.lng : null,
      skipPrompt: true,
      showAlertFn: showAlert,
    });
  };

  const startSOSCountdown = () => {
    setShowCountdown(true);
    setTimeLeft(5);
    setCountdownStatus('After 5 seconds, your SOS alert and location will be sent.');

    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    let counter = 5;
    countdownIntervalRef.current = setInterval(() => {
      counter--;
      setTimeLeft(counter);
      if (counter <= 0) {
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        triggerSOSAlert();
      }
    }, 1000);
  };

  const cancelSOSAlert = () => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setCountdownStatus('SOS Alert Cancelled.');
    setTimeLeft(5);
    setTimeout(() => {
      setShowCountdown(false);
    }, 600);
  };

  const renderContactIcon = (type: string) => {
    switch (type) {
      case 'Fire':
        return 'local_fire_department';
      case 'Medical':
        return 'local_hospital';
      case 'Disaster':
        return 'warning';
      case 'Police':
        return 'local_police';
      default:
        return 'phone';
    }
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex flex-col bg-white overflow-hidden">
      <PassengerHeader pageTitle="Emergency Center" showBackButton={true} onTriggerSOS={startSOSCountdown} />

      <div className="flex-1 overflow-y-auto w-full overscroll-contain">
        <div className="max-w-md mx-auto w-full p-5 space-y-6 pb-8">
          {/* Location status bar */}
          <div className="bg-[#f8fafc] rounded-2xl p-4 border border-[#e2e8f0] flex items-center gap-4 shadow-sm">
            <div className="bg-[#103d7c]/10 w-10 h-10 rounded-full flex items-center justify-center shrink-0">
              <MaterialIcons name="my_location" size={20} color="#103d7c" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                YOUR CURRENT LOCATION
              </span>
              <span className="text-[15px] font-black text-slate-800 mt-0.5 truncate block">
                {locationText}
              </span>
            </div>
          </div>

          {/* SOS Pulsing Main Button */}
          <div className="flex flex-col items-center justify-center py-6 relative">
            <div className="w-[220px] h-[220px] relative flex items-center justify-center">
              {/* Ripple animation rings */}
              <div className="absolute w-[200px] h-[200px] rounded-full border-2 border-red-500 animate-ping opacity-40" />
              <div className="absolute w-[180px] h-[180px] rounded-full border-2 border-red-400 animate-pulse opacity-60" />

              <button
                type="button"
                onClick={startSOSCountdown}
                className="w-[200px] h-[200px] rounded-full flex flex-col items-center justify-center border-4 border-white shadow-2xl bg-[#ef4444] hover:bg-red-600 active:scale-95 transition-all text-white focus:outline-none cursor-pointer z-10"
              >
                <span className="text-white text-5xl font-black tracking-widest">SOS</span>
                <span className="text-white text-[12px] font-black mt-1.5 tracking-widest uppercase">ALERT CIRCLE</span>
              </button>
            </div>
          </div>

          {/* Friend Circle Info Section */}
          <div className="flex flex-col items-center text-center">
            {circles.length > 0 ? (
              <>
                <div className="flex justify-center items-center mb-3.5">
                  {circles.slice(0, 5).map((friend, idx) => (
                    <div
                      key={friend.id || idx}
                      className={`w-10 h-10 rounded-full border-2 border-white flex items-center justify-center bg-[#dbeafe] overflow-hidden shadow-sm ${
                        idx > 0 ? '-ml-3' : ''
                      }`}
                    >
                      {friend.profile_picture ? (
                        <img
                          src={friend.profile_picture.startsWith('http') ? friend.profile_picture : `${serverUrl}/${friend.profile_picture}`}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[#1e3a8a] font-bold text-xs">
                          {(friend.name || friend.email || '?').substring(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                  ))}
                  {circles.length > 5 && (
                    <div className="w-10 h-10 rounded-full border-2 border-white flex items-center justify-center bg-slate-200 -ml-3 shadow-sm">
                      <span className="text-slate-600 font-extrabold text-xs">+{circles.length - 5}</span>
                    </div>
                  )}
                </div>

                <p className="text-sm font-black text-slate-700">
                  Your SOS will be sent to {circles.length} people in your circle.
                </p>
              </>
            ) : (
              <span className="text-xs text-slate-400 font-medium italic">No friends in your circle yet.</span>
            )}
            <p className="text-[11px] text-slate-400 font-semibold text-center mt-2 leading-relaxed px-6">
              Alerts will broadcast your live coordinates immediately to your circle members.
            </p>
          </div>

          {/* Emergency Municipal Hotlines */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3.5 px-1">
              MUNICIPAL EMERGENCY HOTLINES
            </h3>

            <div className="space-y-2.5">
              {EMERGENCY_CONTACTS.map((contact, idx) => (
                <a
                  key={idx}
                  href={`tel:${contact.phone}`}
                  className="border border-[#e2e8f0] rounded-2xl p-4 flex justify-between items-center bg-white shadow-sm hover:border-red-300 transition-colors"
                >
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      <MaterialIcons name={renderContactIcon(contact.type)} size={20} color="#103d7c" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[15px] font-black text-slate-800 block truncate">{contact.name}</span>
                      <span className="text-xs text-slate-400 font-semibold mt-0.5 block font-mono">{contact.phone}</span>
                    </div>
                  </div>
                  <div className="bg-[#103d7c]/10 w-9 h-9 rounded-full flex items-center justify-center text-[#103d7c]">
                    <MaterialIcons name="phone" size={16} color="#103d7c" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      <PassengerFooter activeTab="sos" />

      {/* Countdown Overlay */}
      {showCountdown && (
        <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-[5000] px-6 animate-fade-in text-center">
          <h2 className="text-red-500 font-black text-[26px] mb-1.5 tracking-wide">
            Slide to cancel
          </h2>
          <p className="text-sm text-slate-500 font-semibold text-center mb-10 leading-relaxed px-10">
            {countdownStatus}
          </p>

          {/* Circle Timer */}
          <div className="w-[170px] h-[170px] bg-red-500 rounded-full flex items-center justify-center shadow-2xl mb-12 animate-pulse">
            <span className="text-white text-6xl font-black">{timeLeft > 0 ? timeLeft : '✓'}</span>
          </div>

          {/* Cancel Trigger Box */}
          <button
            type="button"
            onClick={cancelSOSAlert}
            className="w-full max-w-xs bg-slate-100 border border-[#e2e8f0] rounded-full py-4 px-6 text-red-600 font-black text-sm tracking-wider uppercase shadow-md hover:bg-red-50 transition-colors"
          >
            Cancel SOS Broadcast
          </button>
        </div>
      )}

      <AlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={alertConfig.onConfirm}
      />
    </div>
  );
};
export default SOS;
