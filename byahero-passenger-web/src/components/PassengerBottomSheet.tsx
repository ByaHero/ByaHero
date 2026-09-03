import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { MaterialIcons } from './ui/MaterialIcons';
import { useTracking } from '../context/TrackingContext';
import { useAuth } from '../context/AuthContext';
import AlertModal from './AlertModal';
import { getFriendOnlineStatus } from '../utils/userUtils';

export type SheetTab = 'location' | 'routes' | 'groups' | 'busstops';

interface PassengerBottomSheetProps {
  currentTab: SheetTab;
  onTabChange: (tab: SheetTab) => void;
  onSelectBus?: (bus: any) => void;
  onSelectStop?: (stop: any) => void;
  tourStep?: number | null;
}

export const PassengerBottomSheet: React.FC<PassengerBottomSheetProps> = ({
  currentTab,
  onTabChange,
  onSelectBus,
  onSelectStop,
  tourStep,
}) => {
  const { serverUrl, isAuthenticated, user } = useAuth();
  const {
    buses,
    busStops,
    filteredBuses,
    filteredStops,
    circles,
    userLocation,
    selectedRoute,
    setSelectedRoute,
    stopsRoute,
    setStopsRoute,
    inviteCode,
    generateInviteCode,
    joinCircle,
    removeCircleMember,
    isBoarded,
    boardedBus,
    centerOnUser,
    isLocating,
    focusOnFriend,
    focusOnBus,
    focusOnStop,
  } = useTracking();

  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isSyncingCode, setIsSyncingCode] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  type SheetState = 'expanded' | 'mid' | 'minimized';
  const [sheetState, setSheetState] = useState<SheetState>('mid');
  const [isDragging, setIsDragging] = useState(false);
  
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const dragStartTranslateY = useRef(0);
  const currentTranslateY = useRef(0);
  const isDragAction = useRef(false);

  const getBounds = () => {
    const maxH = Math.max(360, window.innerHeight * 0.75);
    const midH = 360;
    const minH = 110;
    const maxTranslate = maxH - minH;
    return { maxH, midH, minH, maxTranslate };
  };

  const getTargetY = (state: SheetState) => {
    const { maxH, midH, minH } = getBounds();
    if (state === 'expanded') return 0;
    if (state === 'mid') return maxH - midH;
    return maxH - minH;
  };

  useLayoutEffect(() => {
    if (sheetRef.current && !isDragging) {
      const targetY = getTargetY(sheetState);
      currentTranslateY.current = targetY;
      sheetRef.current.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
      sheetRef.current.style.transform = `translateY(${targetY}px)`;
    }
  }, [sheetState, isDragging]);

  useEffect(() => {
    const handleResize = () => {
      if (sheetRef.current && !isDragging) {
        const { maxH } = getBounds();
        sheetRef.current.style.height = `${maxH}px`;
        const targetY = getTargetY(sheetState);
        currentTranslateY.current = targetY;
        sheetRef.current.style.transform = `translateY(${targetY}px)`;
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sheetState, isDragging]);

  useEffect(() => {
    if (tourStep === 6) {
      setSheetState('minimized');
    } else if (tourStep === 7 || tourStep === 5) {
      setSheetState('mid');
    }
  }, [tourStep]);

  useEffect(() => {
    if (currentTab === 'groups' && (!inviteCode || inviteCode === '------')) {
      generateInviteCode(false);
    }
  }, [currentTab, inviteCode]);

  const handleDragStart = (e: React.TouchEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
    isDragAction.current = false;
    if (sheetRef.current) {
      sheetRef.current.style.transition = 'none';
    }
    setIsDragging(true);
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartY.current = clientY;
    dragStartTranslateY.current = currentTranslateY.current;
  };

  const handleDragMove = (e: React.TouchEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
    if (!dragStartY.current) return;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const deltaY = clientY - dragStartY.current;
    
    if (Math.abs(deltaY) > 5) {
      isDragAction.current = true;
    }
    
    const { maxTranslate } = getBounds();
    let newTranslateY = dragStartTranslateY.current + deltaY;
    
    if (newTranslateY < 0) {
      newTranslateY = newTranslateY * 0.2;
    } else if (newTranslateY > maxTranslate) {
      newTranslateY = maxTranslate + (newTranslateY - maxTranslate) * 0.2;
    }
    
    currentTranslateY.current = newTranslateY;
    
    if (sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${newTranslateY}px)`;
    }
  };

  const handleDragEnd = () => {
    if (!dragStartY.current) return;
    dragStartY.current = 0;
    setIsDragging(false);
    
    if (sheetRef.current) {
      sheetRef.current.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
    }

    const { maxH, midH, minH } = getBounds();
    const currentH = maxH - currentTranslateY.current;
    
    const distToExpanded = Math.abs(currentH - maxH);
    const distToMid = Math.abs(currentH - midH);
    const distToMinimized = Math.abs(currentH - minH);

    const minDist = Math.min(distToExpanded, distToMid, distToMinimized);

    if (minDist === distToExpanded) setSheetState('expanded');
    else if (minDist === distToMid) setSheetState('mid');
    else setSheetState('minimized');
  };

  const toggleExpand = (e?: React.MouseEvent) => {
    if (isDragAction.current) {
      if (e) e.preventDefault();
      return;
    }
    setSheetState(prev => {
      if (prev === 'expanded') return 'mid';
      if (prev === 'mid') return 'expanded';
      return 'mid';
    });
  };

  // AlertModal
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
        setAlertConfig(prev => ({ ...prev, visible: false }));
        if (onConfirm) onConfirm();
      },
    });
  };

  const handleJoinCircle = async () => {
    if (!isAuthenticated && !user?.email) {
      showAlert('Login Required', 'Please log in to your account to join a circle.', 'info', () => {
        window.location.href = '/login';
      });
      return;
    }

    if (!joinCodeInput.trim() || joinCodeInput.trim().length !== 6) {
      showAlert('Invalid Code', 'Please enter a valid 6-digit circle invite code.', 'warning');
      return;
    }

    setIsJoining(true);
    const res = await joinCircle(joinCodeInput.trim().toUpperCase());
    setIsJoining(false);

    if (res.success) {
      setJoinCodeInput('');
      showAlert('Circle Joined', 'You have successfully joined the circle.', 'success');
    } else {
      showAlert('Error', res.message || 'Invalid or expired invite code.', 'error');
    }
  };

  const handleRemoveMemberAction = (memberId: string | number, name: string) => {
    showAlert(
      'Remove Member',
      `Are you sure you want to remove ${name} from your circle?`,
      'confirm',
      async () => {
        const res = await removeCircleMember(Number(memberId));
        if (res.success) {
          showAlert('Member Removed', `${name} has been removed from your circle.`, 'info');
        }
      }
    );
  };

  return (
    <div
      ref={sheetRef}
      style={{ height: `${Math.max(360, window.innerHeight * 0.75)}px` }}
      className="absolute bottom-0 left-0 right-0 w-full bg-white rounded-t-[32px] shadow-[0_-8px_30px_rgba(0,0,0,0.12)] border-t border-slate-100 z-[1000] flex flex-col will-change-transform"
    >
      {/* Recenter Button (attached to top right of bottom sheet) */}
      <button
        type="button"
        onClick={() => centerOnUser()}
        disabled={isLocating}
        className="absolute -top-[60px] right-4 w-12 h-12 rounded-full bg-white hover:bg-slate-50 flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.15)] border border-slate-100 transition-all transform active:scale-95 z-[1010] disabled:opacity-80"
        title="Center on My Location"
      >
        <MaterialIcons
          name="my_location"
          size={24}
          color={isLocating ? '#3b82f6' : '#103d7c'}
          className={isLocating ? 'animate-spin' : ''}
        />
      </button>

      {/* Handle / Drag Bar */}
      <div
        onTouchStart={handleDragStart}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
        onMouseDown={handleDragStart}
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onClick={toggleExpand}
        className="w-full flex items-center justify-center pt-4 pb-4 cursor-pointer touch-none select-none"
      >
        <div className="w-20 h-1.5 bg-[#e2e8f0] rounded-full" />
      </div>

      {/* Tab Navigation Icons - 4 Pills */}
      <div className="px-5 py-2 flex items-center justify-between gap-2.5">
        {/* Tab 1: Buses / Location */}
        <button
          type="button"
          onClick={() => onTabChange('location')}
          className={`flex-1 flex items-center justify-center py-2.5 rounded-2xl transition-all cursor-pointer ${
            currentTab === 'location'
              ? 'bg-[#1e3a8a] shadow-sm'
              : 'bg-[#dbeafe] hover:bg-blue-100'
          }`}
        >
          <img
            src={currentTab === 'location' ? "/images/icons/busStopWhiteIcon.png" : "/images/icons/busStopBlueIcon.png"}
            alt="Buses"
            className="w-5 h-5 object-contain"
          />
        </button>

        {/* Tab 2: Routes */}
        <button
          type="button"
          onClick={() => onTabChange('routes')}
          className={`flex-1 flex items-center justify-center py-2.5 rounded-2xl transition-all cursor-pointer ${
            currentTab === 'routes'
              ? 'bg-[#1e3a8a] shadow-sm'
              : 'bg-[#dbeafe] hover:bg-blue-100'
          }`}
        >
          <img
            src={currentTab === 'routes' ? "/images/icons/routes active.svg" : "/images/icons/routes idle.svg"}
            alt="Routes"
            className="w-5 h-5 object-contain"
          />
        </button>

        {/* Tab 3: Circles / Friends */}
        <button
          type="button"
          onClick={() => onTabChange('groups')}
          className={`flex-1 flex items-center justify-center py-2.5 rounded-2xl transition-all cursor-pointer ${
            currentTab === 'groups'
              ? 'bg-[#1e3a8a] shadow-sm'
              : 'bg-[#dbeafe] hover:bg-blue-100'
          }`}
        >
          <img
            src={currentTab === 'groups' ? "/images/icons/groupsActive.svg" : "/images/icons/groupsIdle.svg"}
            alt="Circles"
            className="w-5 h-5 object-contain"
          />
        </button>

        {/* Tab 4: Bus Stops */}
        <button
          type="button"
          onClick={() => onTabChange('busstops')}
          className={`flex-1 flex items-center justify-center py-2.5 rounded-2xl transition-all cursor-pointer ${
            currentTab === 'busstops'
              ? 'bg-[#1e3a8a] shadow-sm'
              : 'bg-[#dbeafe] hover:bg-blue-100'
          }`}
        >
          <img
            src={currentTab === 'busstops' ? "/images/icons/busStopMarkerFinalWhite.svg" : "/images/icons/busStopMarkerFinalBlue.svg"}
            alt="Stops"
            className="w-5 h-5 object-contain"
          />
        </button>
      </div>

      {/* Tab Content Panels */}
      <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y px-5 pb-28 pt-1 text-left">
        {/* Tab 1: BUS LOCATION */}
        {currentTab === 'location' && (
          <div className="pb-48">
            <h3 className="text-[13px] font-bold text-black uppercase tracking-widest my-3 px-1">
              BUS LOCATION
            </h3>

            {filteredBuses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <img
                  src="/images/icons/noBusBig.svg"
                  alt="No Bus"
                  className="w-[72px] h-[72px] object-contain"
                />
                <span className="text-sm text-slate-500 font-bold mt-3">No Available Bus</span>
              </div>
            ) : (
              (() => {
                const busesWithDist = filteredBuses.map((bus) => {
                  const busLat = parseFloat(String(bus.lat || bus.latitude || 0));
                  const busLng = parseFloat(String(bus.lng || bus.longitude || 0));
                  let distKm: number | null = null;
                  if (busLat && busLng && userLocation) {
                    const dLat = (userLocation.lat - busLat) * Math.PI / 180;
                    const dLon = (userLocation.lng - busLng) * Math.PI / 180;
                    const a =
                      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                      Math.cos(busLat * Math.PI / 180) *
                      Math.cos(userLocation.lat * Math.PI / 180) *
                      Math.sin(dLon / 2) *
                      Math.sin(dLon / 2);
                    distKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                  }
                  return { ...bus, _distKm: distKm };
                });

                const sorted = [...busesWithDist].sort((a, b) => {
                  if (a._distKm === null && b._distKm === null) return 0;
                  if (a._distKm === null) return 1;
                  if (b._distKm === null) return -1;
                  return a._distKm - b._distKm;
                });

                return sorted.map((bus, idx) => {
                  const status = bus.status || 'available';
                  let statusLabel = 'AVAILABLE';
                  let statusBg = 'bg-[#dcfce7]';
                  let statusText = 'text-[#15803d]';
                  let statusDot = 'bg-[#22c55e]';
                  if (status === 'on_stop') {
                    statusLabel = 'ON STOP';
                    statusBg = 'bg-[#fef9c3]'; statusText = 'text-[#a16207]'; statusDot = 'bg-[#eab308]';
                  } else if (status === 'full') {
                    statusLabel = 'FULL';
                    statusBg = 'bg-[#fee2e2]'; statusText = 'text-[#b91c1c]'; statusDot = 'bg-[#ef4444]';
                  } else if (status === 'unavailable') {
                    statusLabel = 'UNAVAILABLE';
                    statusBg = 'bg-[#f1f5f9]'; statusText = 'text-[#64748b]'; statusDot = 'bg-[#94a3b8]';
                  }

                  const seatAvail = bus.seats_available !== undefined ? Number(bus.seats_available) : (bus.seat_availability !== undefined ? Number(bus.seat_availability) : null);
                  const totalSeats = bus.seats_total !== undefined ? Number(bus.seats_total) : (bus.total_seats !== undefined ? Number(bus.total_seats) : 25);
                  const seatFraction = seatAvail !== null ? Math.max(0, Math.min(1, seatAvail / totalSeats)) : null;
                  const seatBarColor = seatFraction === null ? '#94a3b8' : seatFraction > 0.5 ? '#22c55e' : seatFraction > 0.2 ? '#f59e0b' : '#ef4444';

                  const distKm = bus._distKm;
                  let etaText = 'Arriving soon';
                  let distText: string | null = null;
                  const isUserBoarding = isBoarded && !!boardedBus && (bus.code === boardedBus || bus.plate_number === boardedBus);

                  if (isUserBoarding) {
                    etaText = 'On Board';
                    distText = 'Boarded';
                  } else if (distKm !== null) {
                    if (distKm < 0.15) {
                      etaText = 'Arriving now';
                      distText = `${Math.round(distKm * 1000)} m away`;
                    } else {
                      const travelMin = Math.round((distKm / 30) * 60) + 2;
                      etaText = `~${travelMin} min away`;
                      distText = distKm < 1 ? `${Math.round(distKm * 1000)} m` : `${distKm.toFixed(1)} km`;
                    }
                  }

                  const progress = bus.progress || 85;
                  const isNearest = idx === 0 && distKm !== null;

                  return (
                    <div
                      key={bus.Bus_ID || idx}
                      onClick={() => {
                        focusOnBus(bus);
                        if (onSelectBus) onSelectBus(bus);
                      }}
                      className={`mb-3 rounded-2xl overflow-hidden bg-white border-[1.5px] ${
                        isNearest ? 'border-[#103d7c]' : 'border-[#e2e8f0]'
                      } shadow-sm cursor-pointer hover:shadow-md transition-all`}
                    >
                      {/* Top Bar inside Bus Card */}
                      <div className="flex justify-between items-center px-4 pt-3 pb-2 border-b border-[#e2e8f0]/60 bg-[#f8fafc]">
                        <div className="flex items-center gap-2">
                          <span className="bg-[#103d7c] text-white font-black text-xs px-2.5 py-0.5 rounded-full tracking-wider">
                            {bus.code || 'BUS'}
                          </span>
                          {isNearest && (
                            <span className="bg-[#dbeafe] text-[#1e3a8a] text-[10px] font-black px-2 py-0.5 rounded-full tracking-wider">
                              NEAREST
                            </span>
                          )}
                        </div>

                        <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full ${statusBg}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
                          <span className={`text-[10px] font-black tracking-wider ${statusText}`}>
                            {statusLabel}
                          </span>
                        </div>
                      </div>

                      {/* Main Info */}
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1 pr-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              ROUTE
                            </span>
                            <span className="text-sm font-black text-slate-800 leading-snug block">
                              {bus.route || 'Tanauan - Laurel'}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="text-sm font-black text-[#103d7c] block">{etaText}</span>
                            {distText && (
                              <span className="text-[11px] font-semibold text-slate-400 block">{distText}</span>
                            )}
                          </div>
                        </div>

                        {/* Location */}
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 font-semibold mb-3">
                          <MaterialIcons name="place" size={14} color="#103d7c" />
                          <span className="truncate">{bus.current_location_name || 'Active on Route'}</span>
                        </div>

                        {/* Seat Availability Bar */}
                        <div className="mt-2 pt-2.5 border-t border-[#e2e8f0]/60">
                          <div className="flex justify-between items-center mb-1 text-[11px] font-bold">
                            <span className="text-slate-500">Seats Available</span>
                            <span style={{ color: seatBarColor }}>
                              {seatAvail !== null ? `${seatAvail} / ${totalSeats}` : 'N/A'}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-[#e2e8f0] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: seatFraction !== null ? `${seatFraction * 100}%` : '50%',
                                backgroundColor: seatBarColor,
                              }}
                            />
                          </div>
                        </div>

                        {/* Route Timeline Track */}
                        <div className="mt-3 pt-2.5 border-t border-[#e2e8f0]/60 flex items-center justify-between text-[10px] font-bold text-slate-400">
                          <span>Origin</span>
                          <div className="flex-1 mx-3 h-1 bg-[#e2e8f0] rounded-full relative flex items-center">
                            <div
                              className="absolute w-3.5 h-3.5 rounded-full bg-[#103d7c] border-2 border-white shadow-sm flex items-center justify-center -top-1"
                              style={{ left: `${Math.min(95, Math.max(5, progress))}%` }}
                            >
                              <img src="/images/marker.svg" alt="" className="w-2 h-2 object-contain" />
                            </div>
                          </div>
                          <span>Destination</span>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()
            )}
          </div>
        )}

        {/* Tab 2: FILTER ROUTES */}
        {currentTab === 'routes' && (
          <div>
            <h3 className="text-[13px] font-bold text-black uppercase tracking-widest my-3 px-1">
              FILTER ROUTES
            </h3>

            <div className="space-y-2.5">
              {/* All Routes */}
              <button
                type="button"
                onClick={() => setSelectedRoute('')}
                className={`w-full flex justify-between items-center p-4 rounded-2xl border transition-all cursor-pointer ${
                  !selectedRoute
                    ? 'bg-[#103d7c] border-[#103d7c] text-white shadow-md'
                    : 'bg-white border-[#e2e8f0] text-slate-800 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center ${
                      !selectedRoute ? 'bg-white/20' : 'bg-[#103d7c]/10'
                    }`}
                  >
                    <MaterialIcons
                      name="alt_route"
                      size={20}
                      color={!selectedRoute ? '#ffffff' : '#103d7c'}
                    />
                  </div>
                  <div>
                    <div className="font-black text-sm">All Routes</div>
                    <div
                      className={`text-xs ${
                        !selectedRoute ? 'text-blue-100' : 'text-slate-400'
                      }`}
                    >
                      Show all active buses
                    </div>
                  </div>
                </div>
                {!selectedRoute && <MaterialIcons name="check_circle" size={20} color="#ffffff" />}
              </button>

              {/* Route 1: Laurel - Tanauan */}
              <button
                type="button"
                onClick={() => setSelectedRoute('LAUREL - TANAUAN')}
                className={`w-full flex justify-between items-center p-4 rounded-2xl border transition-all cursor-pointer ${
                  selectedRoute === 'LAUREL - TANAUAN'
                    ? 'bg-[#103d7c] border-[#103d7c] text-white shadow-md'
                    : 'bg-white border-[#e2e8f0] text-slate-800 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center ${
                      selectedRoute === 'LAUREL - TANAUAN' ? 'bg-white/20' : 'bg-[#103d7c]/10'
                    }`}
                  >
                    <MaterialIcons
                      name="directions_bus"
                      size={20}
                      color={selectedRoute === 'LAUREL - TANAUAN' ? '#ffffff' : '#103d7c'}
                    />
                  </div>
                  <div>
                    <div className="font-black text-sm">Laurel - Tanauan</div>
                    <div
                      className={`text-xs ${
                        selectedRoute === 'LAUREL - TANAUAN' ? 'text-blue-100' : 'text-slate-400'
                      }`}
                    >
                      Via Talisay • Batangas Transit
                    </div>
                  </div>
                </div>
                {selectedRoute === 'LAUREL - TANAUAN' && (
                  <MaterialIcons name="check_circle" size={20} color="#ffffff" />
                )}
              </button>

              {/* Route 2: Tanauan - Laurel */}
              <button
                type="button"
                onClick={() => setSelectedRoute('TANAUAN - LAUREL')}
                className={`w-full flex justify-between items-center p-4 rounded-2xl border transition-all cursor-pointer ${
                  selectedRoute === 'TANAUAN - LAUREL'
                    ? 'bg-[#103d7c] border-[#103d7c] text-white shadow-md'
                    : 'bg-white border-[#e2e8f0] text-slate-800 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center ${
                      selectedRoute === 'TANAUAN - LAUREL' ? 'bg-white/20' : 'bg-[#103d7c]/10'
                    }`}
                  >
                    <MaterialIcons
                      name="directions_bus"
                      size={20}
                      color={selectedRoute === 'TANAUAN - LAUREL' ? '#ffffff' : '#103d7c'}
                    />
                  </div>
                  <div>
                    <div className="font-black text-sm">Tanauan - Laurel</div>
                    <div
                      className={`text-xs ${
                        selectedRoute === 'TANAUAN - LAUREL' ? 'text-blue-100' : 'text-slate-400'
                      }`}
                    >
                      Via Talisay • Batangas Transit
                    </div>
                  </div>
                </div>
                {selectedRoute === 'TANAUAN - LAUREL' && (
                  <MaterialIcons name="check_circle" size={20} color="#ffffff" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: CIRCLES */}
        {currentTab === 'groups' && (
          <div className="pb-48">
            <h3 className="text-[13px] font-bold text-black uppercase tracking-widest my-3 px-1">
              CIRCLES
            </h3>

            {!isAuthenticated && !user?.email ? (
              <div className="bg-[#f8fafc] rounded-3xl p-6 border border-[#e2e8f0] text-center shadow-sm mb-4">
                <div className="w-14 h-14 rounded-full bg-[#103d7c]/10 text-[#103d7c] flex items-center justify-center mx-auto mb-3">
                  <MaterialIcons name="group" size={28} color="#103d7c" />
                </div>
                <h4 className="text-base font-black text-slate-800 mb-1">Log in to Access Circles</h4>
                <p className="text-xs text-slate-500 mb-5 max-w-xs mx-auto leading-relaxed">
                  Log in to get your 6-digit invite code, join your friends' circle, and track each other's live location.
                </p>
                <a
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 bg-[#103d7c] hover:bg-blue-900 text-white font-bold text-sm px-6 py-3 rounded-2xl shadow-md transition-all w-full max-w-xs"
                >
                  <MaterialIcons name="login" size={18} color="#ffffff" />
                  <span>Log In / Sign Up</span>
                </a>
              </div>
            ) : (
              <>
                {/* Invite Code Box */}
                <div className="bg-[#f8fafc] rounded-3xl p-5 border border-[#e2e8f0]/60 shadow-sm mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      YOUR INVITE CODE
                    </span>
                    <button
                      type="button"
                      disabled={isSyncingCode}
                      onClick={async () => {
                        try {
                          setIsSyncingCode(true);
                          const newCode = await generateInviteCode(true);
                          if (newCode) {
                            showAlert('New Code Generated', `Your new circle invite code is: ${newCode}`, 'success');
                          } else {
                            showAlert('Sync Failed', 'Could not generate a new code. Please try again.', 'error');
                          }
                        } catch (e) {
                          showAlert('Error', 'An error occurred while generating a new code.', 'error');
                        } finally {
                          setIsSyncingCode(false);
                        }
                      }}
                      className="text-[11px] font-bold text-[#103d7c] hover:underline flex items-center gap-1 disabled:opacity-50"
                    >
                      <MaterialIcons
                        name="refresh"
                        size={14}
                        color="#103d7c"
                        className={isSyncingCode ? 'animate-spin' : ''}
                      />
                      <span>{isSyncingCode ? 'Generating...' : 'Sync code'}</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between bg-white rounded-2xl p-3 border border-[#e2e8f0]">
                    <span className="text-xl font-black font-mono tracking-widest text-[#103d7c]">
                      {inviteCode || '------'}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (inviteCode && inviteCode !== '------') {
                            navigator.clipboard.writeText(inviteCode);
                            showAlert('Copied', 'Invite code copied to clipboard!', 'info');
                          } else {
                            showAlert('Invite Code', 'Invite code is loading. Please tap Sync code or wait a moment.', 'info');
                          }
                        }}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700"
                        title="Copy Code"
                      >
                        <MaterialIcons name="content_copy" size={18} color="#103d7c" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setQrModalVisible(true)}
                        className="p-2 rounded-xl bg-[#103d7c] text-white"
                        title="QR Code"
                      >
                        <MaterialIcons name="qr_code" size={18} color="#ffffff" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Join Circle Code Box */}
                <div className="bg-white rounded-3xl p-5 border border-[#e2e8f0] shadow-sm mb-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                    JOIN A CIRCLE
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="Enter 6-digit code"
                      value={joinCodeInput}
                      onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-sm font-black font-mono uppercase tracking-widest text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#103d7c]"
                    />
                    <button
                      type="button"
                      onClick={handleJoinCircle}
                      disabled={isJoining}
                      className="w-24 shrink-0 bg-[#103d7c] hover:bg-blue-900 text-white font-bold text-xs py-2.5 rounded-2xl shadow-sm transition-all flex items-center justify-center"
                    >
                      {isJoining ? 'Joining...' : 'Join'}
                    </button>
                  </div>
                </div>

                {/* Circle Members List */}
                {circles.length === 0 ? (
                  <div className="bg-[#f8fafc] rounded-3xl p-5 border border-[#e2e8f0]/60 text-center">
                    <span className="text-xs text-slate-400 font-medium italic">No circle members yet.</span>
                  </div>
                ) : (
                  <div className="bg-[#f8fafc] rounded-3xl p-4 border border-[#e2e8f0]/60 shadow-sm mb-6 space-y-2">
                    {circles.map((friend, index) => {
                      const initials = (friend.name || friend.email || '?').substring(0, 2).toUpperCase();
                      const { isOnline, statusText } = getFriendOnlineStatus(friend);

                      return (
                        <div
                          key={friend.id || index}
                          onClick={() => {
                            const lat = parseFloat(friend.latitude as string);
                            const lng = parseFloat(friend.longitude as string);
                            if (!isNaN(lat) && !isNaN(lng)) {
                              focusOnFriend(friend);
                            } else {
                              showAlert('Location Unavailable', `${friend.name || 'Friend'} does not have a live location shared.`, 'info');
                            }
                          }}
                          className="flex items-center py-3 border-b border-[#e2e8f0]/50 last:border-0 cursor-pointer hover:bg-slate-50 transition-colors rounded-lg px-2 -mx-2"
                        >
                          <div className="relative mr-3.5">
                            {friend.profile_picture ? (
                              <img
                                src={friend.profile_picture.startsWith('http') ? friend.profile_picture : `${serverUrl}/${friend.profile_picture}`}
                                alt=""
                                className={`w-12 h-12 rounded-full border border-slate-200 object-cover ${!isOnline ? 'opacity-75' : ''}`}
                              />
                            ) : (
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isOnline ? 'bg-[#dbeafe]' : 'bg-slate-100'}`}>
                                <span className={`font-bold text-sm ${isOnline ? 'text-[#1e3a8a]' : 'text-slate-500'}`}>{initials}</span>
                              </div>
                            )}
                            <span
                              className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${
                                isOnline ? 'bg-[#10b981]' : 'bg-[#94a3b8]'
                              }`}
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="text-[15px] font-black text-slate-800 truncate">{friend.name || friend.email}</div>
                            <div className="flex items-center mt-1">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[9px] font-black tracking-wider ${
                                  isOnline
                                    ? 'bg-[#dcfce7] text-[#15803d]'
                                    : 'bg-[#f1f5f9] text-[#64748b]'
                                }`}
                              >
                                {isOnline ? 'ONLINE' : 'OFFLINE'}
                              </span>
                              <span className="text-[10px] text-[#64748b] font-bold ml-2 truncate max-w-[150px]">
                                {statusText}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveMemberAction(friend.id, friend.name || friend.email);
                            }}
                            className="p-2 text-[#103d7c] hover:text-red-600"
                            title="Remove circle member"
                          >
                            <MaterialIcons name="person_remove" size={22} color="#103d7c" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Tab 4: BUS PICKUP POINTS */}
        {currentTab === 'busstops' && (
          <div className="pb-48">
            {/* Section header row */}
            <div className="flex justify-between items-center mb-3 mt-2">
              <h3 className="text-[13px] font-black text-black uppercase tracking-widest px-1">
                BUS PICK UP POINTS
              </h3>
              <button
                type="button"
                onClick={() => setStopsRoute(stopsRoute === 'LAUREL - TANAUAN' ? 'TANAUAN - LAUREL' : 'LAUREL - TANAUAN')}
                className="flex items-center bg-[#f1f5f9] px-3 py-1.5 rounded-full gap-1.5 text-[10px] font-black text-slate-700 uppercase tracking-wider hover:bg-slate-200 transition-colors"
              >
                <span>{stopsRoute}</span>
                {/* Swap arrows inline */}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16 3L20 7L16 11" stroke="#334155" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M4 7H20" stroke="#334155" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 21L4 17L8 13" stroke="#334155" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M20 17H4" stroke="#334155" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            {filteredStops.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <img
                  src="/images/icons/busStopMarkerFinalBlue.svg"
                  alt="No stops"
                  className="w-12 h-12 object-contain opacity-50"
                />
                <span className="text-sm text-slate-400 font-bold mt-3">No pickup points defined</span>
              </div>
            ) : (
              (() => {
                let sortedStops = [...filteredStops];
                if (userLocation) {
                  sortedStops.forEach(stop => {
                    const lat = parseFloat(String(stop.lat || stop.latitude || 0));
                    const lng = parseFloat(String(stop.lng || stop.longitude || 0));
                    if (lat && lng) {
                      const dLat = (userLocation.lat - lat) * Math.PI / 180;
                      const dLon = (userLocation.lng - lng) * Math.PI / 180;
                      const a =
                        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                        Math.cos(lat * Math.PI / 180) *
                        Math.cos(userLocation.lat * Math.PI / 180) *
                        Math.sin(dLon / 2) *
                        Math.sin(dLon / 2);
                      stop._distance = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                    } else {
                      stop._distance = Infinity;
                    }
                  });
                  sortedStops.sort((a, b) => (a._distance || Infinity) - (b._distance || Infinity));
                }

                return sortedStops.map((stop, idx) => {
                  let distanceStr = '-- m away';
                  if (stop._distance !== undefined && stop._distance !== Infinity) {
                    if (stop._distance < 1) {
                      distanceStr = `${Math.round(stop._distance * 1000)} m away`;
                    } else {
                      distanceStr = `${stop._distance.toFixed(1)} km away`;
                    }
                  }

                  const typeUpper = (stop.type || 'stop').toUpperCase();
                  const isBusStop = typeUpper === 'TERMINAL' || typeUpper === 'BUS_STOP';
                  const labelType = isBusStop ? 'BUS STOP' : 'PICKUP POINT';

                  // Address subtext: prefer location_name, fallback to route + landmark
                  const addressLine = [
                    stop.location_name,
                    stop.location_landmark,
                  ].filter(Boolean).join(' • ') || (stop.route || 'Laurel - Tanauan');

                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        focusOnStop(stop);
                        if (onSelectStop) onSelectStop(stop);
                      }}
                      className="bg-white rounded-2xl px-4 py-4 mb-3 border border-[#e2e8f0] shadow-sm flex items-center justify-between cursor-pointer hover:border-[#103d7c] hover:shadow-md transition-all active:scale-[0.99]"
                    >
                      {/* Left: Name & Address */}
                      <div className="min-w-0 flex-1 pr-3">
                        <span className="text-[15px] font-black text-slate-900 uppercase leading-tight block truncate">
                          {stop.name}
                        </span>
                        <span className="text-[11px] text-slate-400 font-semibold block truncate mt-0.5">
                          {addressLine}
                        </span>
                      </div>

                      {/* Right: PICKUP POINT badge + walk distance */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className="text-[9px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider whitespace-nowrap bg-[#e8eef6] text-[#334155]">
                          {labelType}
                        </span>
                        <div className="flex items-center gap-1 text-[#103d7c]">
                          {/* Walking figure SVG */}
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="#103d7c" xmlns="http://www.w3.org/2000/svg">
                            <path d="M13.5 5.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7z"/>
                          </svg>
                          <span className="text-[11px] font-black">{distanceStr}</span>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()
            )}
          </div>
        )}
      </div>

      {/* QR Code Modal for Circle Invite */}
      {qrModalVisible && (
        <div className="fixed inset-0 z-[5000] bg-black/60 flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-xs w-full text-center shadow-2xl">
            <h4 className="text-lg font-black text-slate-800 mb-2">Circle Invite QR</h4>
            <p className="text-xs text-slate-400 mb-5">
              Ask your friends to scan or input code below
            </p>

            <div className="w-48 h-48 bg-slate-100 rounded-2xl border-2 border-slate-200 flex flex-col items-center justify-center mx-auto mb-4 p-4">
              <MaterialIcons name="qr_code_2" size={140} color="#103d7c" />
            </div>

            <span className="text-2xl font-black font-mono tracking-widest text-[#103d7c] block mb-5">
              {inviteCode || '------'}
            </span>

            <button
              type="button"
              onClick={() => setQrModalVisible(false)}
              className="w-full bg-[#103d7c] text-white font-bold text-sm py-3 rounded-full"
            >
              Close
            </button>
          </div>
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
export default PassengerBottomSheet;
