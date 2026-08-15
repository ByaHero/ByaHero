import React, { useEffect, useState, useMemo } from 'react';
import { 
  Loader2, 
  Radio, 
  Navigation, 
  RefreshCw, 
  StopCircle, 
  ShieldAlert, 
  CheckCircle2, 
  Search, 
  Map as MapIcon, 
  List, 
  Gauge, 
  Users, 
  Bus as BusIconLucide, 
  AlertTriangle,
  Compass
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import busIconSvg from '../assets/busStopMarkerFinalBlue.svg';

import { adminService } from '../services/admin';
import { ActiveBus } from '../types';
import Modal from '../components/Modal';

// Setup leaflet default icons
const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const BusMapMarkerIcon = L.icon({
  iconUrl: busIconSvg,
  iconSize: [36, 46],
  iconAnchor: [18, 46],
  popupAnchor: [0, -46]
});

export default function ActiveBuses() {
  const [activeBuses, setActiveBuses] = useState<ActiveBus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'map'>('table');
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(15); // in seconds
  
  // Force Stop Modal State
  const [stoppingBusId, setStoppingBusId] = useState<number | null>(null);
  const [isStopModalOpen, setIsStopModalOpen] = useState(false);
  const [selectedBusToStop, setSelectedBusToStop] = useState<ActiveBus | null>(null);

  // Success & Error Modal State
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const fetchActiveBuses = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      const data = await adminService.listActiveBuses();
      if (data && data.success) {
        setActiveBuses(data.activeBuses || data.active_buses || []);
      } else {
        setActiveBuses([]);
      }
    } catch (e: any) {
      console.error('Failed to fetch active buses:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchActiveBuses();
  }, []);

  // Handle auto-refresh interval timer
  useEffect(() => {
    if (autoRefreshInterval <= 0) return;
    const interval = setInterval(() => {
      fetchActiveBuses();
    }, autoRefreshInterval * 1000);
    return () => clearInterval(interval);
  }, [autoRefreshInterval]);

  const confirmStopBus = (bus: ActiveBus) => {
    setSelectedBusToStop(bus);
    setIsStopModalOpen(true);
  };

  const handleForceStop = async () => {
    if (!selectedBusToStop) return;
    const busId = selectedBusToStop.Bus_ID || selectedBusToStop.id;
    const busCode = selectedBusToStop.bus_no || (selectedBusToStop as any).code || `#${busId}`;

    try {
      setStoppingBusId(busId);
      setIsStopModalOpen(false);
      const res = await adminService.stopActiveBus(busId);

      if (res && res.success) {
        await fetchActiveBuses();
        setSuccessMessage(`Live tracking session for Bus ${busCode} has been forcefully terminated. Active rides were concluded and conductor unassigned.`);
        setSuccessModalVisible(true);
      } else {
        setErrorMessage(res?.error || 'Failed to stop live tracking for this bus.');
        setErrorModalVisible(true);
      }
    } catch (e: any) {
      console.error(e);
      setErrorMessage(e.message || 'An unexpected error occurred while terminating tracking.');
      setErrorModalVisible(true);
    } finally {
      setStoppingBusId(null);
      setSelectedBusToStop(null);
    }
  };

  // Filter active buses based on search keyword
  const filteredBuses = useMemo(() => {
    if (!searchTerm.trim()) return activeBuses;
    const q = searchTerm.toLowerCase();
    return activeBuses.filter((b: any) => {
      const busNo = (b.bus_no || b.code || '').toString().toLowerCase();
      const plateNo = (b.plate_no || '').toLowerCase();
      const conductor = (b.conductor_name || b.conductor_email || '').toLowerCase();
      const route = (b.route_name || b.route || '').toLowerCase();
      const loc = (b.current_location || '').toLowerCase();
      return busNo.includes(q) || plateNo.includes(q) || conductor.includes(q) || route.includes(q) || loc.includes(q);
    });
  }, [activeBuses, searchTerm]);

  // Telemetry KPIs
  const totalActive = activeBuses.length;
  const avgSpeed = useMemo(() => {
    if (totalActive === 0) return '0.0';
    const sum = activeBuses.reduce((acc, b) => acc + (Number(b.speed) || 0), 0);
    return (sum / totalActive).toFixed(1);
  }, [activeBuses, totalActive]);

  const uniqueConductors = useMemo(() => {
    const set = new Set();
    activeBuses.forEach((b: any) => {
      if (b.conductor_email || b.conductor_name) {
        set.add(b.conductor_email || b.conductor_name);
      }
    });
    return set.size;
  }, [activeBuses]);

  // Center map coordinates
  const mapCenter: [number, number] = useMemo(() => {
    const busWithCoords = activeBuses.find(b => b.latitude && b.longitude);
    if (busWithCoords && busWithCoords.latitude && busWithCoords.longitude) {
      return [Number(busWithCoords.latitude), Number(busWithCoords.longitude)];
    }
    return [14.076, 120.931];
  }, [activeBuses]);

  return (
    <div className="space-y-6">
      {/* Top Operations Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black text-slate-800 tracking-tight">Active Buses Telemetry</h2>
              <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200/80 py-1 px-3 rounded-full text-xs font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-500 relative flex items-center justify-center">
                  <span className="absolute -inset-0.5 rounded-full bg-emerald-500/50 animate-ping"></span>
                </span>
                <span>{totalActive} {totalActive === 1 ? 'Bus' : 'Buses'} Live</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Monitor live GPS tracking feeds, conductor links, telemetry velocities, and manage force stop operations.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Auto-Sync:</label>
              <select 
                className="py-1.5 px-3 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50 text-slate-700 focus:outline-none focus:border-[#4C85C5] focus:bg-white"
                value={autoRefreshInterval}
                onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
              >
                <option value={5}>Every 5s</option>
                <option value={10}>Every 10s</option>
                <option value={15}>Every 15s</option>
                <option value={30}>Every 30s</option>
                <option value={0}>Paused</option>
              </select>
            </div>

            <button 
              className="inline-flex items-center justify-center gap-2 py-2 px-3.5 text-xs font-bold rounded-xl bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 transition cursor-pointer disabled:opacity-60" 
              onClick={() => fetchActiveBuses(true)} 
              disabled={loading || refreshing}
            >
              <RefreshCw size={14} className={refreshing || loading ? 'animate-spin' : ''} />
              Sync Live Feed
            </button>
          </div>
        </div>

        {/* Telemetry KPI Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-inner">
              <BusIconLucide size={22} />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 leading-tight">{totalActive}</div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Transmissions</div>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-inner">
              <Gauge size={22} />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 leading-tight">{avgSpeed} <span className="text-sm font-bold text-slate-500">km/h</span></div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Average Fleet Velocity</div>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 shadow-inner">
              <Users size={22} />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 leading-tight">{uniqueConductors}</div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Assigned Conductors</div>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 shadow-inner">
              <Compass size={22} />
            </div>
            <div>
              <div className="text-lg font-black text-slate-900 leading-tight">{totalActive > 0 ? 'Optimal' : 'Standby'}</div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Telemetry Status</div>
            </div>
          </div>
        </div>

        {/* Search & View Switcher Toolbar */}
        <div className="flex flex-wrap justify-between items-center gap-3 mb-6 bg-slate-50/80 p-3 px-4 rounded-2xl border border-slate-200">
          <div className="relative flex-1 min-w-[240px] max-w-sm">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              className="w-full py-2 pl-10 pr-4 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:border-[#4C85C5] focus:ring-2 focus:ring-[#4C85C5]/20" 
              placeholder="Search by bus #, plate, conductor, route..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="inline-flex bg-slate-200/70 p-1 rounded-xl gap-1">
            <button 
              className={`inline-flex items-center gap-1.5 py-1.5 px-3.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'table' 
                  ? 'bg-white text-[#0f3878] shadow-sm' 
                  : 'bg-transparent text-slate-600 hover:text-slate-900'
              }`}
              onClick={() => setViewMode('table')}
            >
              <List size={15} /> Table View
            </button>
            <button 
              className={`inline-flex items-center gap-1.5 py-1.5 px-3.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'map' 
                  ? 'bg-white text-[#0f3878] shadow-sm' 
                  : 'bg-transparent text-slate-600 hover:text-slate-900'
              }`}
              onClick={() => setViewMode('map')}
            >
              <MapIcon size={15} /> Live Map View
            </button>
          </div>
        </div>

        {/* Content Area */}
        {loading && activeBuses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <Loader2 className="animate-spin text-[#0f3878] mb-3" size={36} />
            <p className="text-xs font-semibold text-slate-500">Synchronizing real-time telemetry from active transit units...</p>
          </div>
        ) : filteredBuses.length === 0 ? (
          <div className="text-center py-12 px-4 text-slate-500 bg-slate-50/50 rounded-2xl border border-dashed border-slate-300">
            <Radio size={48} className="mx-auto mb-3 text-slate-300 animate-pulse" />
            <h4 className="font-extrabold text-slate-800 text-sm mb-1">
              {activeBuses.length === 0 ? 'No Active Buses Currently Transmitting' : 'No Buses Match Your Filter'}
            </h4>
            <p className="max-w-md mx-auto text-xs text-slate-500 leading-relaxed">
              {activeBuses.length === 0 
                ? 'There are currently no active conductor sessions or live telemetry streams. When a conductor initiates a trip, it will automatically populate here.' 
                : 'Try adjusting your search criteria to match bus numbers, plates, or conductor details.'}
            </p>
          </div>
        ) : viewMode === 'table' ? (
          /* Table View */
          <div className="w-full overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Bus Identifier</th>
                  <th className="py-3.5 px-4">Plate Number</th>
                  <th className="py-3.5 px-4">Assigned Conductor</th>
                  <th className="py-3.5 px-4">Route / Heading</th>
                  <th className="py-3.5 px-4">Current Coordinates</th>
                  <th className="py-3.5 px-4">Velocity</th>
                  <th className="py-3.5 px-4">Live Status</th>
                  <th className="py-3.5 px-4 text-right">Force Stop Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBuses.map((bus, idx) => {
                  const busId = bus.Bus_ID || bus.id || idx;
                  const busCode = bus.bus_no || (bus as any).code || `Bus #${busId}`;
                  const isStopping = stoppingBusId === busId;
                  const hasCoords = bus.latitude && bus.longitude;

                  return (
                    <tr key={busId} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xs">
                            <BusIconLucide size={16} />
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900">Bus {busCode}</div>
                            <div className="text-[10px] text-slate-400 font-medium">ID: {busId}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold bg-slate-100 text-slate-700 px-2 py-1 rounded-md text-[11px]">
                          {bus.plate_no || 'N/A'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div>
                          <div className="font-bold text-slate-800 text-xs">
                            {bus.conductor_name || (bus.conductor_email ? bus.conductor_email.split('@')[0] : 'Unassigned')}
                          </div>
                          {bus.conductor_email && (
                            <div className="text-[10px] text-slate-400 font-medium">
                              {bus.conductor_email}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="text-xs font-bold text-[#0f3878] bg-blue-50/60 px-2 py-1 rounded-md">
                          {bus.route_name || (bus as any).route || 'Active Route'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {hasCoords ? (
                          <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-600">
                            <Navigation size={12} className="text-blue-600 shrink-0" />
                            <span>
                              {bus.current_location && bus.current_location.trim() !== '' 
                                ? bus.current_location 
                                : `${Number(bus.latitude).toFixed(5)}, ${Number(bus.longitude).toFixed(5)}`}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Positioning pending...</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg font-extrabold text-[11px]">
                          <Gauge size={12} />
                          {bus.speed ? `${Number(bus.speed).toFixed(1)} km/h` : '0.0 km/h'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/70 py-1 px-2.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span>Tracking Active</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button 
                          className="inline-flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white px-3 py-1.5 rounded-xl text-xs font-bold transition duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shadow-xs"
                          onClick={() => confirmStopBus(bus)}
                          disabled={isStopping}
                          title={`Force terminate tracking for Bus ${busCode}`}
                        >
                          {isStopping ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <StopCircle size={13} />
                          )}
                          Force Stop
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Live Map View */
          <div className="rounded-2xl overflow-hidden border border-slate-200 h-[540px] relative shadow-inner">
            <MapContainer 
              center={mapCenter}
              zoom={12} 
              style={{ width: '100%', height: '100%', zIndex: 1 }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {filteredBuses.map((bus, idx) => {
                const busId = bus.Bus_ID || bus.id || idx;
                const busCode = bus.bus_no || (bus as any).code || `#${busId}`;

                if (bus.latitude && bus.longitude) {
                  return (
                    <Marker 
                      key={busId} 
                      position={[Number(bus.latitude), Number(bus.longitude)]}
                      icon={BusMapMarkerIcon}
                    >
                      <Popup>
                        <div className="p-1 min-w-[200px] text-slate-800">
                          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                            <strong className="text-sm font-extrabold text-slate-900">Bus {busCode}</strong>
                            <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold">
                              {bus.plate_no || 'N/A'}
                            </span>
                          </div>

                          <div className="text-xs space-y-1 mb-3 text-slate-600">
                            <div><strong>Conductor:</strong> {bus.conductor_name || bus.conductor_email || 'N/A'}</div>
                            <div><strong>Speed:</strong> {bus.speed ? `${Number(bus.speed).toFixed(1)} km/h` : '0.0 km/h'}</div>
                            <div><strong>Route:</strong> {bus.route_name || (bus as any).route || 'Active Route'}</div>
                            <div><strong>Coords:</strong> {Number(bus.latitude).toFixed(4)}, {Number(bus.longitude).toFixed(4)}</div>
                          </div>

                          <button 
                            className="w-full inline-flex items-center justify-center gap-1.5 bg-red-600 text-white hover:bg-red-700 py-1.5 px-3 rounded-lg text-xs font-bold transition cursor-pointer"
                            onClick={() => confirmStopBus(bus)}
                          >
                            <StopCircle size={13} />
                            Force Stop Tracking
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  );
                }
                return null;
              })}
            </MapContainer>
          </div>
        )}
      </div>

      {/* Force Stop Tracking Confirmation Modal */}
      <Modal 
        isOpen={isStopModalOpen} 
        onClose={() => setIsStopModalOpen(false)} 
        title="Force Stop Tracking Authorization"
      >
        <div className="space-y-4">
          {/* Warning Card */}
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <div className="flex items-center gap-2.5 text-red-600 font-extrabold text-sm">
              <ShieldAlert size={20} />
              <span>Administrative Force Stop Tracking</span>
            </div>
            <p className="text-xs text-red-800 mt-1.5 leading-relaxed font-medium">
              You are about to forcefully terminate the live telemetry session for this unit. This command takes immediate effect across the network.
            </p>
          </div>

          {/* Vehicle Info Box */}
          {selectedBusToStop && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Bus Identifier</span>
                <span className="text-xs font-extrabold text-slate-900">Bus {selectedBusToStop.bus_no || (selectedBusToStop as any).code}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Plate Number</span>
                <span className="text-xs font-extrabold text-slate-900">{selectedBusToStop.plate_no || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Assigned Conductor</span>
                <span className="text-xs font-extrabold text-slate-900">
                  {selectedBusToStop.conductor_name || selectedBusToStop.conductor_email || 'Unassigned'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Telemetry Velocity</span>
                <span className="text-xs font-extrabold text-slate-900">
                  {selectedBusToStop.speed ? `${Number(selectedBusToStop.speed).toFixed(1)} km/h` : '0.0 km/h'}
                </span>
              </div>
            </div>
          )}

          {/* Impact summary list */}
          <div>
            <div className="text-xs font-extrabold text-slate-800 mb-2">Actions performed upon execution:</div>
            <ul className="space-y-2 text-xs text-red-800">
              <li className="flex items-start gap-2">
                <AlertTriangle size={14} className="text-red-600 shrink-0 mt-0.5" />
                <span><strong>Live Telemetry Ceased:</strong> GPS coordinates and tracking files for this bus will be immediately removed.</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle size={14} className="text-red-600 shrink-0 mt-0.5" />
                <span><strong>Conductor Unassigned:</strong> The conductor will be dissociated from this active bus session.</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle size={14} className="text-red-600 shrink-0 mt-0.5" />
                <span><strong>Passenger Rides Finalized:</strong> Any in-transit passenger trips on this operation will be marked completed.</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle size={14} className="text-red-600 shrink-0 mt-0.5" />
                <span><strong>Bus Status Reset:</strong> Bus availability status will be set to unavailable.</span>
              </li>
            </ul>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button 
              type="button" 
              className="py-2 px-4 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer" 
              onClick={() => setIsStopModalOpen(false)}
              disabled={stoppingBusId !== null}
            >
              Cancel
            </button>
            <button 
              type="button" 
              className="py-2 px-4 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition cursor-pointer inline-flex items-center gap-2 disabled:opacity-60 shadow-md shadow-red-500/20" 
              onClick={handleForceStop}
              disabled={stoppingBusId !== null}
            >
              {stoppingBusId !== null ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Terminating Session...
                </>
              ) : (
                <>
                  <StopCircle size={14} />
                  Authorize & Force Stop Tracking
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Error Modal */}
      <Modal isOpen={errorModalVisible} onClose={() => setErrorModalVisible(false)} title="Force Stop Failed">
        <div className="flex items-start gap-3.5 mb-5">
          <div className="text-red-600 bg-red-50 p-2.5 rounded-full shrink-0 border border-red-100">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-1">Action Could Not Be Completed</h4>
            <p className="text-xs text-slate-600 leading-relaxed">{errorMessage}</p>
          </div>
        </div>
        <div className="flex justify-end">
          <button 
            className="py-2 px-4 rounded-xl text-xs font-bold text-white bg-[#0f3878] hover:bg-[#0a2958] transition cursor-pointer" 
            onClick={() => setErrorModalVisible(false)}
          >
            Acknowledge
          </button>
        </div>
      </Modal>

      {/* Success Modal */}
      <Modal isOpen={successModalVisible} onClose={() => setSuccessModalVisible(false)} title="Tracking Session Terminated">
        <div className="flex items-start gap-3.5 mb-5">
          <div className="text-emerald-600 bg-emerald-50 p-2.5 rounded-full shrink-0 border border-emerald-100">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-1">Tracking Forcefully Stopped</h4>
            <p className="text-xs text-slate-600 leading-relaxed">{successMessage}</p>
          </div>
        </div>
        <div className="flex justify-end">
          <button 
            className="py-2 px-4 rounded-xl text-xs font-bold text-white bg-[#0f3878] hover:bg-[#0a2958] transition cursor-pointer" 
            onClick={() => setSuccessModalVisible(false)}
          >
            Close
          </button>
        </div>
      </Modal>
    </div>
  );
}
