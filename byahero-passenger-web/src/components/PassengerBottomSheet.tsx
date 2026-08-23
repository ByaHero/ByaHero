import React, { useState } from 'react';
import { MaterialIcons } from './ui/MaterialIcons';
import { useTracking } from '../context/TrackingContext';
import { useAuth } from '../context/AuthContext';
import AlertModal from './AlertModal';

export type SheetTab = 'location' | 'routes' | 'groups' | 'busstops';

interface PassengerBottomSheetProps {
  currentTab: SheetTab;
  onTabChange: (tab: SheetTab) => void;
  onSelectBus?: (bus: any) => void;
  onSelectStop?: (stop: any) => void;
}

export const PassengerBottomSheet: React.FC<PassengerBottomSheetProps> = ({
  currentTab,
  onTabChange,
  onSelectBus,
  onSelectStop,
}) => {
  const { serverUrl } = useAuth();
  const {
    buses,
    busStops,
    circles,
    userLocation,
    selectedRoute,
    setSelectedRoute,
    inviteCode,
    generateInviteCode,
    joinCircle,
    removeCircleMember,
    isBoarded,
    boardedBus,
  } = useTracking();

  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [stopsRoute, setStopsRoute] = useState<'LAUREL - TANAUAN' | 'TANAUAN - LAUREL'>('LAUREL - TANAUAN');
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

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

  // Filter buses by route
  const filteredBuses = buses.filter(bus => {
    if (!selectedRoute) return true;
    return bus.route?.toUpperCase().includes(selectedRoute.toUpperCase());
  });

  // Calculate distance for bus stops
  const filteredStops = busStops.filter(stop => {
    return true;
  });

  return (
    <div
      className={`fixed bottom-[75px] left-0 right-0 max-w-md mx-auto bg-white rounded-t-[32px] shadow-[0_-8px_30px_rgba(0,0,0,0.12)] border-t border-slate-100 z-[1000] transition-all duration-300 flex flex-col ${
        isExpanded ? 'h-[75vh]' : 'h-[360px]'
      }`}
    >
      {/* Handle / Drag Bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-center pt-3 pb-2 cursor-pointer touch-none"
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
            src="/images/busStopWhiteIcon.png"
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
            src="/images/icons/routes active.svg"
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
            src="/images/icons/groupsActive.svg"
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
            src="/images/icons/busStopMarkerFinalWhite.svg"
            alt="Stops"
            className="w-5 h-5 object-contain"
          />
        </button>
      </div>

      {/* Tab Content Panels */}
      <div className="flex-1 overflow-y-auto px-5 pb-6 pt-1 text-left">
        {/* Tab 1: BUS LOCATION */}
        {currentTab === 'location' && (
          <div>
            <h3 className="text-[13px] font-bold text-black uppercase tracking-widest my-3 px-1">
              BUS LOCATION
            </h3>

            {filteredBuses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <img
                  src="/images/icons/noBusFound.svg"
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
                      onClick={() => onSelectBus && onSelectBus(bus)}
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
          <div>
            <h3 className="text-[13px] font-bold text-black uppercase tracking-widest my-3 px-1">
              CIRCLES
            </h3>

            {/* Invite Code Box */}
            <div className="bg-[#f8fafc] rounded-3xl p-5 border border-[#e2e8f0]/60 shadow-sm mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  YOUR INVITE CODE
                </span>
                <button
                  type="button"
                  onClick={() => generateInviteCode(true)}
                  className="text-[11px] font-bold text-[#103d7c] hover:underline flex items-center gap-1"
                >
                  <MaterialIcons name="refresh" size={14} color="#103d7c" />
                  <span>Sync code</span>
                </button>
              </div>

              <div className="flex items-center justify-between bg-white rounded-2xl p-3 border border-[#e2e8f0]">
                <span className="text-xl font-black font-mono tracking-widest text-[#103d7c]">
                  {inviteCode || 'BYA678'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(inviteCode || 'BYA678');
                      showAlert('Copied', 'Invite code copied to clipboard!', 'info');
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
                  className="bg-[#103d7c] hover:bg-blue-900 text-white font-bold text-xs px-5 py-2.5 rounded-2xl shadow-sm transition-all"
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
                  const statusText = friend.waiting_status
                    ? `Waiting at ${friend.waiting_location || 'Stop'}`
                    : (friend.ride_status === 'active' ? `Onboard Bus ${friend.boarded_bus_code || ''}` : 'Live location active');

                  return (
                    <div
                      key={friend.id || index}
                      className="flex items-center py-3 border-b border-[#e2e8f0]/50 last:border-0"
                    >
                      <div className="relative mr-3.5">
                        {friend.profile_picture ? (
                          <img
                            src={friend.profile_picture.startsWith('http') ? friend.profile_picture : `${serverUrl}/${friend.profile_picture}`}
                            alt=""
                            className="w-12 h-12 rounded-full border border-slate-200 object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-[#dbeafe] flex items-center justify-center">
                            <span className="text-[#1e3a8a] font-bold text-sm">{initials}</span>
                          </div>
                        )}
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white bg-[#10b981]" />
                      </div>

                      <div className="flex-1">
                        <div className="text-[15px] font-black text-slate-800">{friend.name || friend.email}</div>
                        <div className="flex items-center mt-1">
                          <span className="px-2 py-0.5 rounded-md bg-[#dcfce7] text-[#15803d] text-[9px] font-black tracking-wider">
                            ONLINE
                          </span>
                          <span className="text-[10px] text-[#64748b] font-bold ml-2 truncate max-w-[150px]">
                            {statusText}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveMemberAction(friend.id, friend.name || friend.email)}
                        className="p-2 text-[#103d7c] hover:text-red-600"
                      >
                        <MaterialIcons name="person_remove" size={22} color="#103d7c" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: BUS PICK UP POINTS */}
        {currentTab === 'busstops' && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-[13px] font-bold text-black uppercase tracking-widest my-3 px-1">
                BUS PICK UP POINTS
              </h3>
              <button
                type="button"
                onClick={() => setStopsRoute(stopsRoute === 'LAUREL - TANAUAN' ? 'TANAUAN - LAUREL' : 'LAUREL - TANAUAN')}
                className="flex items-center bg-[#f1f5f9] px-3 py-1.5 rounded-full gap-1 text-[10px] font-black text-slate-700 uppercase tracking-wider"
              >
                <span>{stopsRoute}</span>
                <img src="/images/swap.svg" alt="Swap" className="w-4 h-4 object-contain" />
              </button>
            </div>

            {filteredStops.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <img
                  src="/images/icons/busStopMarkerFinalBlue.svg"
                  alt="No stops"
                  className="w-9 h-9 object-contain"
                />
                <span className="text-sm text-slate-500 font-bold mt-3">No stops defined</span>
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

                  const labelType = (stop.type || 'stop').toUpperCase() === 'TERMINAL' ? 'BUS STOP' : 'PICKUP POINT';

                  return (
                    <div
                      key={idx}
                      onClick={() => onSelectStop && onSelectStop(stop)}
                      className="bg-white rounded-2xl p-4 mb-3 border border-[#e2e8f0] shadow-sm flex items-center justify-between cursor-pointer hover:border-[#103d7c] transition-all"
                    >
                      <div className="flex items-center gap-3.5 flex-1 min-w-0">
                        <div className="w-11 h-11 rounded-2xl bg-[#103d7c]/10 flex items-center justify-center shrink-0">
                          <img
                            src="/images/icons/KM_AWAY.svg"
                            alt="Pin"
                            className="w-6 h-6 object-contain"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                            {labelType}
                          </span>
                          <span className="text-[15px] font-black text-slate-800 truncate block">
                            {stop.name}
                          </span>
                          <span className="text-xs text-slate-400 font-semibold block truncate">
                            {stop.location_name || 'Laurel - Tanauan Zone'}
                          </span>
                        </div>
                      </div>

                      <div className="bg-[#103d7c] text-white text-[11px] font-black px-3 py-1.5 rounded-full shrink-0 ml-2">
                        {distanceStr}
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
              {inviteCode || 'BYA678'}
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
