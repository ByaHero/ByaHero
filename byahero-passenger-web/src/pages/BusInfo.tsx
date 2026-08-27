import React, { useState, useEffect } from 'react';
import PassengerHeader from '../components/PassengerNavbar';
import PassengerFooter from '../components/PassengerFooter';
import { useAuth } from '../context/AuthContext';
import { loadBusData, saveBusData } from '../services/offlineCache';

export const BusInfo: React.FC = () => {
  const { serverUrl } = useAuth();

  const [schedules, setSchedules] = useState<any[]>([]);
  const [fareStops, setFareStops] = useState<any[]>([]);
  const [fareRules, setFareRules] = useState<any[]>([]);
  const [isOffline, setIsOffline] = useState(false);
  const [cacheTime, setCacheTime] = useState<string | null>(null);

  // Dropdown states
  const [pickupStop, setPickupStop] = useState<any>(null);
  const [dropoffStop, setDropoffStop] = useState<any>(null);
  const [discountType, setDiscountType] = useState<'regular' | 'discounted'>('regular');
  const [calculatedFare, setCalculatedFare] = useState('0.00');
  const [fareError, setFareError] = useState('');

  const [showPickupDropdown, setShowPickupDropdown] = useState(false);
  const [showDropoffDropdown, setShowDropoffDropdown] = useState(false);
  const [showDiscountDropdown, setShowDiscountDropdown] = useState(false);

  useEffect(() => {
    let active = true;

    const fetchSyncData = async () => {
      try {
        let responseData: any = null;
        let isNetworkSuccess = false;

        // Try primary configured URL
        try {
          const res = await fetch(`${serverUrl}/api/buses/sync`);
          if (res.ok) {
            const data = await res.json();
            if (data && data.success) {
              responseData = data;
              isNetworkSuccess = true;
            }
          }
        } catch (err) {
          console.warn(`Failed to fetch sync data from configured server URL: ${serverUrl}`, err);
        }

        // Failover fallback to alwaysdata production URL if primary failed
        if (!isNetworkSuccess && serverUrl !== 'https://byahero.alwaysdata.net') {
          try {
            const fallbackRes = await fetch('https://byahero.alwaysdata.net/api/buses/sync');
            if (fallbackRes.ok) {
              const data = await fallbackRes.json();
              if (data && data.success) {
                responseData = data;
                isNetworkSuccess = true;
              }
            }
          } catch (fallbackErr) {
            console.error('Fallback to alwaysdata failed:', fallbackErr);
          }
        }

        if (isNetworkSuccess && responseData && active) {
          setIsOffline(false);
          setSchedules(responseData.bus_schedule || []);
          setFareStops(responseData.bus_stops || []);
          setFareRules(responseData.bus_fares || []);
          await saveBusData(
            responseData.bus_schedule || [],
            responseData.bus_stops || [],
            responseData.bus_fares || [],
            responseData.stops_terminal || []
          );
        } else if (!isNetworkSuccess && active) {
          const cachedData = await loadBusData();
          if (cachedData) {
            setIsOffline(true);
            setCacheTime(cachedData.cached_at);
            setSchedules(cachedData.schedules || []);
            setFareStops(cachedData.fare_stops || []);
            setFareRules(cachedData.fare_rules || []);
          } else {
            setIsOffline(true);
            setCacheTime(null);
          }
        }
      } catch (err: any) {
        if (active) {
          const cachedData = await loadBusData();
          if (cachedData) {
            setIsOffline(true);
            setCacheTime(cachedData.cached_at);
            setSchedules(cachedData.schedules || []);
            setFareStops(cachedData.fare_stops || []);
            setFareRules(cachedData.fare_rules || []);
          } else {
            setIsOffline(true);
            setCacheTime(null);
          }
        }
      }
    };

    fetchSyncData();
    const interval = setInterval(fetchSyncData, 15000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [serverUrl]);

  const calculateFare = (pickup: any, dropoff: any, discount: 'regular' | 'discounted') => {
    setFareError('');
    if (!pickup || !dropoff) {
      setCalculatedFare('0.00');
      return;
    }
    if (pickup.stop_id === dropoff.stop_id) {
      setFareError('Pick-up and drop-off cannot be the same');
      setCalculatedFare('0.00');
      return;
    }

    let regularFare: number | null = null;
    let discountedFare: number | null = null;

    const pKm = Math.round(parseFloat(pickup.km_marker || 0));
    const dKm = Math.round(parseFloat(dropoff.km_marker || 0));
    const distance = Math.abs(dKm - pKm);
    const direction = dKm >= pKm ? 'LT' : 'TL';

    const match = fareRules.find(f => f.direction === direction && parseInt(f.distance_km) === distance);

    if (match) {
      regularFare = parseFloat(match.regular_fare);
      discountedFare = parseFloat(match.discounted_fare);
    } else {
      if (distance <= 4) {
        regularFare = 14.00;
        discountedFare = 11.25;
      } else {
        regularFare = Math.round((14.00 + (distance - 4) * 2.20) * 4) / 4;
        discountedFare = Math.round((11.25 + (distance - 4) * 1.76) * 4) / 4;
      }
    }

    const fare = (discount === 'discounted') ? discountedFare : regularFare;
    setCalculatedFare((fare || 15).toFixed(2));
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':');
    const hr = parseInt(h, 10);
    const ampm = hr >= 12 ? 'PM' : 'AM';
    const displayHr = hr % 12 || 12;
    return `${displayHr}:${m} ${ampm}`;
  };

  return (
    <div className="h-screen max-h-screen w-full flex flex-col bg-white overflow-hidden">
      <PassengerHeader pageTitle="Bus Information" showBackButton={true} />

      {isOffline && (
        <div className="shrink-0 px-4 py-2 bg-yellow-100 border-b border-yellow-200 flex justify-center items-center">
          <span className="text-xs text-center text-yellow-800 font-semibold">
            {cacheTime ? `Offline mode • Showing cached data` : 'No internet connection. Cannot load bus data.'}
          </span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto w-full overscroll-contain">
        <div className="max-w-md mx-auto w-full p-5 space-y-6 pb-8">
          {/* Schedules Section */}
          <div>
            <h2 className="text-[15px] font-bold text-[#103d7c] mt-4 mb-4 text-center">
              Bus Operation Schedule
            </h2>

            {schedules.length === 0 ? (
              <div className="bg-white rounded-xl p-4 mb-5 border border-[#e2e8f0] text-center">
                <span className="text-xs text-[#64748b] italic">No schedules available.</span>
              </div>
            ) : (
              schedules.map((row, idx) => {
                const open = formatTime(row.time_open);
                const close = formatTime(row.time_close);
                const timeText = (open && close) ? `${open} - ${close}` : 'Schedule not set';
                const isSusp = parseInt(row.is_suspended) === 1;

                return (
                  <div
                    key={idx}
                    className="bg-white p-4 rounded-xl mb-3 border border-[#e2e8f0] flex justify-between items-center shadow-sm"
                  >
                    <div className="flex-1 mr-2">
                      <span className="text-sm font-extrabold text-[#103d7c] block">{row.terminal_name}</span>
                      {isSusp && (
                        <span className="text-xs text-red-500 font-bold mt-1 block">
                          SUSPENDED{row.suspend_message ? `: ${row.suspend_message}` : ''}
                        </span>
                      )}
                    </div>
                    <span className={`text-xs font-black ${isSusp ? 'text-red-500' : 'text-[#475569]'}`}>
                      {isSusp ? 'No Operations' : timeText}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Fare Check Section */}
          <div className="relative pt-2">
            <h2 className="text-[15px] font-bold text-[#103d7c] mb-3 text-center">
              Bus Fare Check
            </h2>

            <div className="relative pb-4">
              <div className="flex justify-between gap-3 mb-4">
                {/* Pick Up Stop Picker */}
                <div className="flex-1 relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPickupDropdown(!showPickupDropdown);
                      setShowDropoffDropdown(false);
                      setShowDiscountDropdown(false);
                    }}
                    className={`w-full bg-white border rounded-xl p-3 flex justify-between items-center text-left ${
                      showPickupDropdown ? 'border-blue-300 bg-blue-50' : 'border-[#cbd5e1]'
                    }`}
                  >
                    <span className={`text-sm truncate ${pickupStop ? 'text-[#1e293b] font-semibold' : 'text-[#64748b]'}`}>
                      {pickupStop ? pickupStop.location_name : 'Pick up'}
                    </span>
                    <span className="text-[#64748b] text-xs font-bold ml-1">▼</span>
                  </button>

                  {/* Pick Up Dropdown */}
                  {showPickupDropdown && (
                    <div className="absolute top-[52px] left-0 w-full bg-white border border-[#cbd5e1] rounded-xl shadow-lg max-h-48 overflow-y-auto z-50 p-1">
                      {fareStops.map((stop, idx) => (
                        <button
                          key={stop.stop_id || idx}
                          type="button"
                          onClick={() => {
                            setPickupStop(stop);
                            setShowPickupDropdown(false);
                            calculateFare(stop, dropoffStop, discountType);
                          }}
                          className="w-full py-2.5 px-3 border-b border-[#f1f5f9] text-left text-xs text-[#334155] font-semibold hover:bg-slate-50"
                        >
                          {stop.location_name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Drop Off Stop Picker */}
                <div className="flex-1 relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDropoffDropdown(!showDropoffDropdown);
                      setShowPickupDropdown(false);
                      setShowDiscountDropdown(false);
                    }}
                    className={`w-full bg-white border rounded-xl p-3 flex justify-between items-center text-left ${
                      showDropoffDropdown ? 'border-blue-300 bg-blue-50' : 'border-[#cbd5e1]'
                    }`}
                  >
                    <span className={`text-sm truncate ${dropoffStop ? 'text-[#1e293b] font-semibold' : 'text-[#64748b]'}`}>
                      {dropoffStop ? dropoffStop.location_name : 'Drop off'}
                    </span>
                    <span className="text-[#64748b] text-xs font-bold ml-1">▼</span>
                  </button>

                  {/* Drop Off Dropdown */}
                  {showDropoffDropdown && (
                    <div className="absolute top-[52px] right-0 w-full bg-white border border-[#cbd5e1] rounded-xl shadow-lg max-h-48 overflow-y-auto z-50 p-1">
                      {fareStops.map((stop, idx) => (
                        <button
                          key={stop.stop_id || idx}
                          type="button"
                          onClick={() => {
                            setDropoffStop(stop);
                            setShowDropoffDropdown(false);
                            calculateFare(pickupStop, stop, discountType);
                          }}
                          className="w-full py-2.5 px-3 border-b border-[#f1f5f9] text-left text-xs text-[#334155] font-semibold hover:bg-slate-50"
                        >
                          {stop.location_name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Passenger Class Row */}
              <div className="mt-3 flex justify-center relative">
                <div className="w-1/2 relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDiscountDropdown(!showDiscountDropdown);
                      setShowPickupDropdown(false);
                      setShowDropoffDropdown(false);
                    }}
                    className="w-full bg-white border border-[#cbd5e1] rounded-xl p-3 flex justify-between items-center text-left"
                  >
                    <span className="text-sm text-[#1e293b] font-semibold">
                      {discountType === 'regular' ? 'Regular' : 'S/E/D'}
                    </span>
                    <span className="text-[#64748b] text-xs font-bold ml-2">▼</span>
                  </button>

                  {showDiscountDropdown && (
                    <div className="absolute top-[52px] left-0 w-full bg-white border border-[#cbd5e1] rounded-xl shadow-lg max-h-32 overflow-y-auto z-50 p-1">
                      <button
                        type="button"
                        onClick={() => {
                          setDiscountType('regular');
                          setShowDiscountDropdown(false);
                          calculateFare(pickupStop, dropoffStop, 'regular');
                        }}
                        className="w-full py-2.5 px-3 border-b border-[#f1f5f9] text-left text-sm text-[#334155] font-semibold hover:bg-slate-50"
                      >
                        Regular
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDiscountType('discounted');
                          setShowDiscountDropdown(false);
                          calculateFare(pickupStop, dropoffStop, 'discounted');
                        }}
                        className="w-full py-2.5 px-3 text-left text-sm text-[#334155] font-semibold hover:bg-slate-50"
                      >
                        S/E/D (20% Off)
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Calculated Fare Display */}
              <div className="flex flex-col items-center justify-center mt-8 mb-4">
                <span className="text-xs font-bold text-[#64748b] mb-1 uppercase tracking-widest">
                  CALCULATED FARE
                </span>
                <div className="flex items-baseline">
                  <span className="text-xl font-bold text-[#103d7c] mr-1">Php</span>
                  <span className="text-6xl font-black text-[#103d7c]">{calculatedFare}</span>
                </div>
              </div>

              {fareError && (
                <div className="text-xs font-bold text-red-500 text-center my-4">
                  {fareError}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <PassengerFooter activeTab="info" />
    </div>
  );
};
export default BusInfo;
