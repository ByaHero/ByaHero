import React, { useEffect, useRef, useState } from 'react';
import {
  IonContent,
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonCard,
  IonCardContent,
  IonText,
  IonSpinner,
  IonBadge,
  IonSegment,
  IonSegmentButton,
  IonLabel,
} from '@ionic/react';
import { busOutline, locateOutline, logOutOutline, refreshOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ApiService } from '../api/client';
import './PassengerMap.css';

// Fix leaflet default icon marker assets in build tools
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const PassengerMap: React.FC = () => {
  const history = useHistory();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: number]: L.Marker }>({});
  
  const [buses, setBuses] = useState<any[]>([]);
  const [selectedBus, setSelectedBus] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [filterRoute, setFilterRoute] = useState('all');

  const handleLogout = () => {
    ApiService.logout();
    history.replace('/login');
  };

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current) {
      // Default to Manila Center
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
      }).setView([14.5995, 120.9842], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: 'ByaHero Live Tracking System',
      }).addTo(map);

      L.control.zoom({ position: 'topright' }).addTo(map);
      mapRef.current = map;
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // 2. Poll Backend Buses Coordinates
  const fetchBusData = async () => {
    if (!mapRef.current) return;
    try {
      const res = await ApiService.getBuses();
      if (res && res.success) {
        setBuses(res.buses || []);
        updateMapMarkers(res.buses || []);
      }
    } catch (e) {
      console.error('Error polling bus positions', e);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchBusData().finally(() => setIsLoading(false));
    
    // Poll coordinates every 3 seconds for high-fidelity updates, identical to web version
    const interval = setInterval(fetchBusData, 3000);
    return () => clearInterval(interval);
  }, []);

  // 3. Render Leaflet Markers
  const updateMapMarkers = (busList: any[]) => {
    const map = mapRef.current;
    if (!map) return;

    // Filter buses based on selected route segment
    const filtered = filterRoute === 'all' 
      ? busList 
      : busList.filter(b => b.route && b.route.toLowerCase().includes(filterRoute.toLowerCase()));

    // Clear old markers that are no longer active or filtered out
    const activeIds = filtered.map(b => Number(b.Bus_ID));
    Object.keys(markersRef.current).forEach(id => {
      const numericId = Number(id);
      if (!activeIds.includes(numericId)) {
        markersRef.current[numericId].remove();
        delete markersRef.current[numericId];
      }
    });

    // Draw/Update markers
    filtered.forEach(bus => {
      const busId = Number(bus.Bus_ID);
      
      // Parse coordinates from custom geojson
      let lat = 14.5995;
      let lng = 120.9842;
      let hasCoordinates = false;

      if (bus.current_location) {
        try {
          const geo = typeof bus.current_location === 'string' 
            ? JSON.parse(bus.current_location) 
            : bus.current_location;
            
          if (geo && geo.geometry && geo.geometry.coordinates) {
            lng = geo.geometry.coordinates[0];
            lat = geo.geometry.coordinates[1];
            hasCoordinates = true;
          }
        } catch (e) {
          console.warn('Could not parse location JSON for bus', busId, e);
        }
      }

      if (!hasCoordinates) return; // Skip buses with no coordinates set yet

      // Custom high-contrast marker icon based on bus status
      const markerColor = bus.status === 'full' 
        ? 'red' 
        : bus.status === 'on_stop' 
          ? 'orange' 
          : 'blue';

      const busIcon = L.divIcon({
        className: 'custom-bus-marker',
        html: `
          <div class="marker-pin ${markerColor}">
            <i class="bus-icon">🚌</i>
            <span class="bus-label">${bus.code || 'Bus'}</span>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
      });

      if (markersRef.current[busId]) {
        // Update coordinate positions
        markersRef.current[busId].setLatLng([lat, lng]);
      } else {
        // Create new marker pin
        const marker = L.marker([lat, lng], { icon: busIcon }).addTo(map);
        
        // Listen to marker selections
        marker.on('click', () => {
          setSelectedBus(bus);
          map.setView([lat, lng], 16);
        });

        markersRef.current[busId] = marker;
      }
    });
  };

  useEffect(() => {
    if (buses.length > 0) {
      updateMapMarkers(buses);
    }
  }, [filterRoute]);

  const centerOnUser = () => {
    const map = mapRef.current;
    if (!map) return;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          map.setView([pos.coords.latitude, pos.coords.longitude], 15);
        },
        () => alert('Could not access current location.')
      );
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>ByaHero Live Map</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={fetchBusData} title="Refresh Locations">
              <IonIcon icon={refreshOutline} slot="icon-only" />
            </IonButton>
            <IonButton onClick={handleLogout} title="Log Out">
              <IonIcon icon={logOutOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent scrollY={false}>
        {/* Dynamic Route Filter Bar */}
        <div className="filter-overlay">
          <IonSegment value={filterRoute} onIonChange={(e) => setFilterRoute(e.detail.value as string)} className="segment-dark">
            <IonSegmentButton value="all">
              <IonLabel>All Routes</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="cubao">
              <IonLabel>Cubao</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="pasay">
              <IonLabel>Pasay</IonLabel>
            </IonSegmentButton>
          </IonSegment>
        </div>

        {/* Core Leaflet Container */}
        <div ref={mapContainerRef} className="map-view-container"></div>

        {/* Locate Floating Action Button */}
        <IonButton onClick={centerOnUser} className="fab-locate" shape="round" color="secondary">
          <IonIcon icon={locateOutline} />
        </IonButton>

        {/* Glassmorphic Selected Bus Detail Sheet */}
        {selectedBus && (
          <IonCard className="bus-detail-sheet">
            <IonCardContent className="sheet-content">
              <div className="sheet-header">
                <div className="header-info">
                  <IonIcon icon={busOutline} className="bus-avatar" />
                  <div>
                    <h2 className="bus-title">Bus {selectedBus.code}</h2>
                    <p className="bus-route">Route: {selectedBus.route || 'Not Set'}</p>
                  </div>
                </div>
                <IonButton fill="clear" color="medium" onClick={() => setSelectedBus(null)} size="small">
                  Close
                </IonButton>
              </div>

              <div className="sheet-grid">
                <div className="grid-item">
                  <span className="item-title">Status</span>
                  <IonBadge color={selectedBus.status === 'full' ? 'danger' : selectedBus.status === 'on_stop' ? 'warning' : 'success'} className="status-badge">
                    {selectedBus.status ? selectedBus.status.toUpperCase() : 'UNKNOWN'}
                  </IonBadge>
                </div>
                <div className="grid-item">
                  <span className="item-title">Available Seats</span>
                  <IonText className="item-count">
                    {selectedBus.seat_availability !== null ? selectedBus.seat_availability : selectedBus.total_seats} / {selectedBus.total_seats}
                  </IonText>
                </div>
              </div>
            </IonCardContent>
          </IonCard>
        )}

        {isLoading && (
          <div className="map-loading-overlay">
            <IonSpinner name="crescent" />
            <IonText className="loading-text">Loading live buses...</IonText>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default PassengerMap;
