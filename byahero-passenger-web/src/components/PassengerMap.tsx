import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Crosshair, MapPin, Bus, User, Users } from 'lucide-react';
import { useTracking } from '../context/TrackingContext';
import { useAuth } from '../context/AuthContext';
import routeGeoJSON from '../assets/data/laurel-talisay-tanauan.json';

interface PassengerMapProps {
  onOpenWaitingModal: () => void;
}

export const PassengerMap: React.FC<PassengerMapProps> = ({ onOpenWaitingModal }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  
  const userMarkerRef = useRef<L.Marker | null>(null);
  const busMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const stopMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const friendMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const geojsonLayerRef = useRef<L.GeoJSON | null>(null);

  const {
    userLocation,
    filteredBuses,
    filteredStops,
    circles,
    isWaiting,
    waitingLocation,
    mapCenterTarget,
    centerOnUser,
    isBoarded,
    boardedBus,
  } = useTracking();

  const { user, serverUrl } = useAuth();
  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : '?';

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Philippines Bounds
    const phBounds = L.latLngBounds(
      [4.5, 116.9],
      [21.5, 126.6]
    );

    // Initial center: Laurel / Talisay / Tanauan
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      maxZoom: 19,
      minZoom: 9,
      maxBounds: phBounds,
      maxBoundsViscosity: 0.9,
    }).setView([14.0760, 120.9389], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Add GeoJSON Route Boundaries Layer - Disabled to keep map plain as requested
    /*
    if (routeGeoJSON && (routeGeoJSON as any).features) {
      geojsonLayerRef.current = L.geoJSON(routeGeoJSON as any, {
        style: (feature) => ({
          color: '#1d72f8',
          weight: 2,
          opacity: 0.7,
          fillColor: '#3b82f6',
          fillOpacity: 0.1,
          dashArray: '4, 4'
        }),
        onEachFeature: (feature, layer) => {
          const locName = feature.properties?.['Current Location'] || feature.properties?.name;
          if (locName) {
            layer.bindTooltip(locName, {
              permanent: false,
              direction: 'center',
              className: 'bg-white/90 text-slate-700 text-xs font-bold py-1 px-2 rounded-lg shadow-sm border border-slate-200'
            });
          }
        }
      }).addTo(map);
    }
    */

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Center on mapCenterTarget changes
  useEffect(() => {
    if (!mapInstanceRef.current || !mapCenterTarget) return;
    mapInstanceRef.current.flyTo(
      [mapCenterTarget.lat, mapCenterTarget.lng],
      mapCenterTarget.zoom || 16,
      { duration: 1.2 }
    );
  }, [mapCenterTarget]);

  // Update User Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !userLocation) return;

    const userHtml = `
      <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer">
        ${isWaiting ? `
          <div class="absolute -top-7 whitespace-nowrap bg-emerald-500 text-white font-black text-[9px] uppercase px-2 py-0.5 rounded-full shadow-md border border-white">
            WAITING
          </div>
        ` : ''}
        <div class="w-8 h-8 rounded-full bg-[#1d72f8] border-2 border-white shadow-lg flex items-center justify-center text-white font-black text-xs user-gps-pulse">
          ${user?.profile_picture ? `
            <img src="${user.profile_picture.startsWith('http') ? user.profile_picture : `${serverUrl}/${user.profile_picture}`}" class="w-full h-full rounded-full object-cover" />
          ` : userInitial}
        </div>
      </div>
    `;

    const userIcon = L.divIcon({
      className: 'custom-user-icon',
      html: userHtml,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
      userMarkerRef.current.setIcon(userIcon);
    } else {
      userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon, zIndexOffset: 1000 })
        .addTo(map)
        .on('click', onOpenWaitingModal);
    }
  }, [userLocation, isWaiting, user, userInitial, serverUrl, onOpenWaitingModal]);

  // Update Live Buses Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const currentBusIds = new Set<string>();

    filteredBuses.forEach((bus) => {
      const lat = parseFloat(bus.lat as string);
      const lng = parseFloat(bus.lng as string);
      if (isNaN(lat) || isNaN(lng)) return;

      const busKey = bus.code || bus.plate_number || `${bus.Bus_ID}`;
      currentBusIds.add(busKey);

      const isFull = bus.status === 'full' || bus.seats_available <= 0;
      const isBoardedThis = isBoarded && boardedBus === bus.code;

      const busHtml = `
        <div class="relative flex flex-col items-center cursor-pointer group">
          <div class="px-2 py-0.5 rounded-full text-[10px] font-black text-white shadow-md border-2 border-white mb-0.5 flex items-center gap-1 ${
            isBoardedThis ? 'bg-indigo-600 ring-2 ring-indigo-400' : isFull ? 'bg-rose-600' : 'bg-[#103d7c]'
          }">
            <span>${bus.code || 'BUS'}</span>
            <span class="text-[9px] opacity-90">• ${bus.seats_available || 0} left</span>
          </div>
          <div class="w-7 h-7 rounded-full bg-[#1856b0] text-white flex items-center justify-center shadow-lg border-2 border-white">
            <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/></svg>
          </div>
        </div>
      `;

      const busIcon = L.divIcon({
        className: 'custom-bus-icon',
        html: busHtml,
        iconSize: [70, 50],
        iconAnchor: [35, 45],
      });

      const popupContent = `
        <div class="p-1 min-w-[160px] text-slate-800 font-sans">
          <div class="font-black text-sm text-[#0f2c59] flex items-center justify-between border-b pb-1 mb-1.5">
            <span>Bus ${bus.code}</span>
            <span class="text-[10px] font-bold px-1.5 py-0.5 rounded ${isFull ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}">
              ${bus.status?.toUpperCase() || 'ACTIVE'}
            </span>
          </div>
          <div class="text-xs space-y-1 text-slate-600">
            <div><strong>Route:</strong> ${bus.route || 'N/A'}</div>
            <div><strong>Seats:</strong> <span class="font-bold text-[#1d72f8]">${bus.seats_available}</span> / ${bus.seats_total || 25} available</div>
            ${bus.current_location_name ? `<div><strong>Near:</strong> ${bus.current_location_name}</div>` : ''}
            ${bus.speed ? `<div><strong>Speed:</strong> ${bus.speed} km/h</div>` : ''}
          </div>
        </div>
      `;

      if (busMarkersRef.current.has(busKey)) {
        const marker = busMarkersRef.current.get(busKey)!;
        marker.setLatLng([lat, lng]);
        marker.setIcon(busIcon);
        marker.setPopupContent(popupContent);
      } else {
        const marker = L.marker([lat, lng], { icon: busIcon, zIndexOffset: 900 })
          .addTo(map)
          .bindPopup(popupContent);
        busMarkersRef.current.set(busKey, marker);
      }
    });

    // Remove deleted buses
    busMarkersRef.current.forEach((marker, key) => {
      if (!currentBusIds.has(key)) {
        marker.remove();
        busMarkersRef.current.delete(key);
      }
    });
  }, [filteredBuses, isBoarded, boardedBus]);

  // Update Bus Stops Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const currentStopIds = new Set<string>();

    filteredStops.forEach((stop, index) => {
      const lat = parseFloat((stop.lat || stop.latitude) as string);
      const lng = parseFloat((stop.lng || stop.longitude) as string);
      if (isNaN(lat) || isNaN(lng)) return;

      const stopKey = `${stop.id || stop.name}-${index}`;
      currentStopIds.add(stopKey);

      const stopHtml = `
        <div class="relative flex flex-col items-center cursor-pointer group">
          <div class="w-5 h-5 rounded-full bg-rose-500 text-white font-bold text-[9px] flex items-center justify-center shadow-md border-2 border-white">
            ${index + 1}
          </div>
        </div>
      `;

      const stopIcon = L.divIcon({
        className: 'custom-stop-icon',
        html: stopHtml,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      const popupContent = `
        <div class="p-1 min-w-[150px] text-slate-800 font-sans">
          <div class="font-black text-sm text-slate-800 mb-1 flex items-center gap-1">
            <span>#${index + 1} ${stop.name}</span>
          </div>
          <div class="text-xs text-slate-600">
            <div><strong>Route:</strong> ${stop.route}</div>
            ${stop.location_landmark ? `<div><strong>Landmark:</strong> ${stop.location_landmark}</div>` : ''}
          </div>
        </div>
      `;

      if (stopMarkersRef.current.has(stopKey)) {
        const marker = stopMarkersRef.current.get(stopKey)!;
        marker.setLatLng([lat, lng]);
        marker.setIcon(stopIcon);
        marker.setPopupContent(popupContent);
      } else {
        const marker = L.marker([lat, lng], { icon: stopIcon, zIndexOffset: 500 })
          .addTo(map)
          .bindPopup(popupContent);
        stopMarkersRef.current.set(stopKey, marker);
      }
    });

    stopMarkersRef.current.forEach((marker, key) => {
      if (!currentStopIds.has(key)) {
        marker.remove();
        stopMarkersRef.current.delete(key);
      }
    });
  }, [filteredStops]);

  // Update Friend Circles Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const currentFriendIds = new Set<string>();

    circles.forEach((friend) => {
      const lat = parseFloat(friend.latitude as string);
      const lng = parseFloat(friend.longitude as string);
      if (isNaN(lat) || isNaN(lng)) return;

      const friendKey = `friend-${friend.id || friend.email}`;
      currentFriendIds.add(friendKey);

      const fInitial = friend.name ? friend.name.charAt(0).toUpperCase() : 'F';
      const friendHtml = `
        <div class="relative flex flex-col items-center cursor-pointer">
          <div class="w-7 h-7 rounded-full bg-emerald-500 text-white font-black text-xs flex items-center justify-center shadow-lg border-2 border-white">
            ${fInitial}
          </div>
          <div class="bg-white/90 text-slate-800 text-[9px] font-bold px-1.5 py-0.2 rounded shadow-sm border border-slate-200 mt-0.5 truncate max-w-[80px]">
            ${friend.name.split(' ')[0]}
          </div>
        </div>
      `;

      const friendIcon = L.divIcon({
        className: 'custom-friend-icon',
        html: friendHtml,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      if (friendMarkersRef.current.has(friendKey)) {
        const marker = friendMarkersRef.current.get(friendKey)!;
        marker.setLatLng([lat, lng]);
        marker.setIcon(friendIcon);
      } else {
        const marker = L.marker([lat, lng], { icon: friendIcon, zIndexOffset: 800 })
          .addTo(map)
          .bindPopup(`<strong>${friend.name}</strong><br/>${friend.email}`);
        friendMarkersRef.current.set(friendKey, marker);
      }
    });

    friendMarkersRef.current.forEach((marker, key) => {
      if (!currentFriendIds.has(key)) {
        marker.remove();
        friendMarkersRef.current.delete(key);
      }
    });
  }, [circles]);

  return (
    <div className="relative w-full h-full flex-1">
      {/* Leaflet Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Floating Action Controls */}
      <div className="absolute right-4 bottom-24 md:bottom-8 z-[1000] flex flex-col items-end gap-2.5">
        {/* Waiting Status Floating Trigger */}
        <button
          type="button"
          onClick={onOpenWaitingModal}
          className={`flex items-center gap-2 py-2.5 px-4 rounded-full shadow-lg font-bold text-xs border-2 border-white transition-all transform active:scale-95 ${
            isWaiting
              ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/30'
              : 'bg-white hover:bg-slate-50 text-slate-700 shadow-slate-900/10'
          }`}
        >
          <img
            src="/images/waitingButton.svg"
            alt=""
            className="w-4 h-4 object-contain"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <span>{isWaiting ? 'Waiting Active' : 'Waiting for Bus?'}</span>
        </button>

        {/* GPS Recenter Button */}
        <button
          type="button"
          onClick={centerOnUser}
          className="w-12 h-12 rounded-full bg-white hover:bg-slate-50 text-[#103d7c] flex items-center justify-center shadow-lg shadow-slate-900/15 border-2 border-white transition-all transform active:scale-95"
          title="Center on My Location"
        >
          <img src="/images/my_location.svg" alt="Recenter" className="w-5 h-5 object-contain" />
        </button>
      </div>
    </div>
  );
};
export default PassengerMap;
