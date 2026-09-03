import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { useTracking } from '../context/TrackingContext';
import { useAuth } from '../context/AuthContext';
import routeGeoJSON from '../assets/data/laurel-talisay-tanauan.json';
import { SheetTab } from './PassengerBottomSheet';
import busMarkerIcon from '../assets/images/icons/marker.svg';
import busStopMarkerIcon from '../assets/images/icons/busStopMarkerFinalBlue.svg';
import { getFriendOnlineStatus } from '../utils/userUtils';

interface PassengerMapProps {
  onOpenWaitingModal: () => void;
  currentTab: SheetTab;
}

export const PassengerMap: React.FC<PassengerMapProps> = ({ onOpenWaitingModal, currentTab }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  
  const userMarkerRef = useRef<L.Marker | null>(null);
  const busMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const stopMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const friendMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const geojsonLayerRef = useRef<L.GeoJSON | null>(null);
  const hasAutoCenteredRef = useRef(false);

  const [currentZoom, setCurrentZoom] = useState(16);

  const {
    userLocation,
    filteredBuses,
    filteredStops,
    circles,
    isWaiting,
    mapCenterTarget,
    isBoarded,
    boardedBus,
  } = useTracking();

  const { user, serverUrl } = useAuth();
  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : '?';

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Philippines Bounds
    const phBounds = L.latLngBounds(
      [4.5, 116.9],
      [21.5, 126.6]
    );

    const initLat = userLocation?.lat || 14.0905;
    const initLng = userLocation?.lng || 121.0550;
    const initZoom = userLocation ? 16 : 12;

    // Initial center
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      maxZoom: 19,
      minZoom: 9,
      maxBounds: phBounds,
      maxBoundsViscosity: 0.9,
    }).setView([initLat, initLng], initZoom);

    map.on('zoomend', () => {
      setCurrentZoom(map.getZoom());
    });
    setCurrentZoom(initZoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Add GeoJSON Route Boundaries Layer - Disabled to keep map plain as requested
    /*
    if (routeGeoJSON && (routeGeoJSON as any).features) {
      geojsonLayerRef.current = L.geoJSON(routeGeoJSON as any, {
        style: () => ({
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
    hasAutoCenteredRef.current = !!userLocation;

    // Handle container resizing
    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    const resizeTimer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 150);

    return () => {
      clearTimeout(resizeTimer);
      resizeObserver.disconnect();

      // Clean up markers
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      busMarkersRef.current.forEach((marker) => marker.remove());
      busMarkersRef.current.clear();
      stopMarkersRef.current.forEach((marker) => marker.remove());
      stopMarkersRef.current.clear();
      friendMarkersRef.current.forEach((marker) => marker.remove());
      friendMarkersRef.current.clear();
      if (geojsonLayerRef.current) {
        geojsonLayerRef.current.remove();
        geojsonLayerRef.current = null;
      }

      map.remove();
      mapInstanceRef.current = null;
      hasAutoCenteredRef.current = false;
    };
  }, []);

  // Helper function to calculate offset map center (so marker appears higher on screen)
  const getOffsetLatLng = (map: L.Map, lat: number, lng: number, zoom: number, offsetYPixels: number) => {
    const targetPoint = map.project([lat, lng], zoom);
    targetPoint.y += offsetYPixels;
    return map.unproject(targetPoint, zoom);
  };

  // Center on mapCenterTarget changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapCenterTarget) return;
    
    const zoom = mapCenterTarget.zoom || 16;
    const targetLatLng = getOffsetLatLng(map, mapCenterTarget.lat, mapCenterTarget.lng, zoom, 160);

    map.flyTo(
      targetLatLng,
      zoom,
      { duration: 1.2 }
    );
  }, [mapCenterTarget]);

  // Auto-center on user location once when it becomes available
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (map && userLocation && !hasAutoCenteredRef.current) {
      const zoom = 16;
      const targetLatLng = getOffsetLatLng(map, userLocation.lat, userLocation.lng, zoom, 160);

      map.flyTo(targetLatLng, zoom, { duration: 1.2 });
      hasAutoCenteredRef.current = true;
    }
  }, [userLocation]);

  // Update User Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!userLocation) {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      return;
    }

    const userHtml = `
      <div class="relative flex items-center justify-center w-full h-full cursor-pointer">
        ${isWaiting ? `
          <div class="absolute -top-7 whitespace-nowrap bg-emerald-500 text-white font-black text-[9px] uppercase px-2 py-0.5 rounded-full shadow-md border border-white">
            WAITING
          </div>
        ` : ''}
        <div class="w-8 h-8 rounded-full bg-[#1d72f8] border-2 border-white shadow-lg flex items-center justify-center text-white font-black text-xs user-gps-pulse relative overflow-hidden">
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

    if (userMarkerRef.current && map.hasLayer(userMarkerRef.current)) {
      userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
      userMarkerRef.current.setIcon(userIcon);
      userMarkerRef.current.off('click').on('click', onOpenWaitingModal);
    } else {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
      }
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
    
    // Scale factor based on zoom (base 16)
    const scale = Math.max(0.5, Math.min(3, Math.pow(1.3, currentZoom - 16)));
    const busSize = 40 * scale;

    filteredBuses.forEach((bus) => {
      const lat = parseFloat(bus.lat as string);
      const lng = parseFloat(bus.lng as string);
      if (isNaN(lat) || isNaN(lng)) return;

      const busKey = bus.code || bus.plate_number || `${bus.Bus_ID}`;
      currentBusIds.add(busKey);

      const isFull = bus.status === 'full' || bus.seats_available <= 0;
      const isBoardedThis = isBoarded && boardedBus === bus.code;

      const busHtml = `
        <div class="relative flex flex-col items-center cursor-pointer group transform transition-transform hover:scale-110">
          <img src="${busMarkerIcon}" style="width: ${busSize}px; height: ${busSize}px;" class="object-contain drop-shadow-md" alt="Bus Marker" />
        </div>
      `;

      const busIcon = L.divIcon({
        className: 'custom-bus-icon',
        html: busHtml,
        iconSize: [busSize, busSize],
        iconAnchor: [busSize / 2, busSize],
      });

        if (busMarkersRef.current.has(busKey) && map.hasLayer(busMarkersRef.current.get(busKey)!)) {
          const marker = busMarkersRef.current.get(busKey)!;
          marker.setLatLng([lat, lng]);
          marker.setIcon(busIcon);
        } else {
          if (busMarkersRef.current.has(busKey)) {
            busMarkersRef.current.get(busKey)!.remove();
          }
          const marker = L.marker([lat, lng], { icon: busIcon, zIndexOffset: 900 })
            .addTo(map);
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
  }, [filteredBuses, isBoarded, boardedBus, currentZoom]);

  // Update Bus Stops Markers – only visible on the 'busstops' tab
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const currentStopIds = new Set<string>();
    
    // Scale factor based on zoom (base 16)
    const scale = Math.max(0.5, Math.min(3, Math.pow(1.3, currentZoom - 16)));
    const stopSize = 46 * scale;

    if (currentTab === 'busstops') {
      filteredStops.forEach((stop, index) => {
        const lat = parseFloat((stop.lat || stop.latitude) as string);
        const lng = parseFloat((stop.lng || stop.longitude) as string);
        if (isNaN(lat) || isNaN(lng)) return;

        const stopKey = `${stop.id || stop.name}-${index}`;
        currentStopIds.add(stopKey);

        const stopHtml = `
          <div class="relative flex flex-col items-center cursor-pointer group transform transition-transform hover:scale-110">
            <img src="${busStopMarkerIcon}" style="width: ${stopSize}px; height: ${stopSize}px;" class="object-contain drop-shadow-md" alt="Bus Stop Marker" />
          </div>
        `;

        const stopIcon = L.divIcon({
          className: 'custom-stop-icon',
          html: stopHtml,
          iconSize: [stopSize, stopSize],
          iconAnchor: [stopSize / 2, stopSize],
        });

        const popupContent = `
          <div class="p-1 min-w-[150px] text-slate-800 font-sans">
            <div class="font-black text-sm text-slate-800 mb-1 flex items-center gap-1">
              <span>${stop.name}</span>
            </div>
            <div class="text-xs text-slate-600">
              <div><strong>Route:</strong> ${stop.route}</div>
              ${stop.location_landmark ? `<div><strong>Landmark:</strong> ${stop.location_landmark}</div>` : ''}
            </div>
          </div>
        `;

        if (stopMarkersRef.current.has(stopKey) && map.hasLayer(stopMarkersRef.current.get(stopKey)!)) {
          const marker = stopMarkersRef.current.get(stopKey)!;
          marker.setLatLng([lat, lng]);
          marker.setIcon(stopIcon);
          marker.setPopupContent(popupContent);
        } else {
          if (stopMarkersRef.current.has(stopKey)) {
            stopMarkersRef.current.get(stopKey)!.remove();
          }
          const marker = L.marker([lat, lng], { icon: stopIcon, zIndexOffset: 500 })
            .addTo(map)
            .bindPopup(popupContent);
          stopMarkersRef.current.set(stopKey, marker);
        }
      });
    }

    // Remove all stop markers when not on busstops tab, or remove stale ones
    stopMarkersRef.current.forEach((marker, key) => {
      if (!currentStopIds.has(key)) {
        marker.remove();
        stopMarkersRef.current.delete(key);
      }
    });
  }, [filteredStops, currentTab, currentZoom]);

  // Update Friend Circles Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const currentFriendIds = new Set<string>();

    if (currentTab === 'groups') {
      circles.forEach((friend) => {
        const lat = parseFloat(friend.latitude as string);
        const lng = parseFloat(friend.longitude as string);
        if (isNaN(lat) || isNaN(lng)) return;

        const friendKey = `friend-${friend.id || friend.email}`;
        currentFriendIds.add(friendKey);

        const { isOnline, statusText } = getFriendOnlineStatus(friend);
        const friendName = friend.name || friend.email || 'Friend';
        const fInitial = friendName.charAt(0).toUpperCase();
        const firstName = friendName.split(' ')[0] || 'Friend';
        const profilePicUrl = friend.profile_picture
          ? (friend.profile_picture.startsWith('http') || friend.profile_picture.startsWith('data:')
              ? friend.profile_picture
              : `${serverUrl}/${friend.profile_picture}`)
          : null;

        const avatarBg = isOnline ? 'bg-emerald-500' : 'bg-slate-400';
        const dotColor = isOnline ? '#10b981' : '#94a3b8';
        const badgeColor = isOnline ? 'text-emerald-700' : 'text-slate-500';

        const friendHtml = `
          <div class="relative flex flex-col items-center cursor-pointer ${!isOnline ? 'opacity-85' : ''}">
            <div class="relative">
              <div class="w-8 h-8 rounded-full ${avatarBg} text-white font-black text-xs flex items-center justify-center shadow-md border-2 border-white overflow-hidden">
                ${profilePicUrl
                  ? `<img src="${profilePicUrl}" class="w-full h-full object-cover" onerror="this.style.display='none'" />`
                  : fInitial
                }
              </div>
              <span class="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white" style="background-color: ${dotColor};"></span>
            </div>
            <div class="bg-white/95 text-slate-800 text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm border border-slate-200 mt-0.5 truncate max-w-[85px] text-center">
              ${firstName}
            </div>
          </div>
        `;

        const friendIcon = L.divIcon({
          className: 'custom-friend-icon',
          html: friendHtml,
          iconSize: [42, 46],
          iconAnchor: [21, 23],
        });

        const popupHtml = `
          <div class="p-1 min-w-[130px] font-sans">
            <strong class="text-sm text-slate-800">${friendName}</strong>
            <div class="text-xs text-slate-500">${friend.email || ''}</div>
            <div class="mt-1 flex items-center gap-1.5">
              <span class="inline-block w-2 h-2 rounded-full" style="background-color: ${dotColor};"></span>
              <span class="text-[10px] uppercase font-black ${badgeColor}">${isOnline ? 'ONLINE' : 'OFFLINE'}</span>
            </div>
            <div class="text-[11px] text-slate-600 font-semibold mt-1">${statusText}</div>
          </div>
        `;

        if (friendMarkersRef.current.has(friendKey) && map.hasLayer(friendMarkersRef.current.get(friendKey)!)) {
          const marker = friendMarkersRef.current.get(friendKey)!;
          marker.setLatLng([lat, lng]);
          marker.setIcon(friendIcon);
          marker.setPopupContent(popupHtml);
        } else {
          if (friendMarkersRef.current.has(friendKey)) {
            friendMarkersRef.current.get(friendKey)!.remove();
          }
          const marker = L.marker([lat, lng], { icon: friendIcon, zIndexOffset: 800 })
            .addTo(map)
            .bindPopup(popupHtml);
          friendMarkersRef.current.set(friendKey, marker);
        }
      });
    }

    friendMarkersRef.current.forEach((marker, key) => {
      if (!currentFriendIds.has(key)) {
        marker.remove();
        friendMarkersRef.current.delete(key);
      }
    });
  }, [circles, currentTab]);

  return (
    <div className="relative w-full h-full flex-1">
      {/* Leaflet Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};
export default PassengerMap;
