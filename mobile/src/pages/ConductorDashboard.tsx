import React, { useState, useEffect, useRef } from 'react';
import {
  IonContent,
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonInput,
  IonButton,
  IonIcon,
  IonText,
  IonToast,
  IonLoading,
  IonGrid,
  IonRow,
  IonCol,
  IonBadge,
  IonButtons,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import {
  busOutline,
  logOutOutline,
  navigateOutline,
  peopleOutline,
  playOutline,
  stopOutline,
  addOutline,
  removeOutline,
} from 'ionicons/icons';
import { ApiService } from '../api/client';
import './ConductorDashboard.css';

const ConductorDashboard: React.FC = () => {
  const history = useHistory();
  
  // App states
  const [buses, setBuses] = useState<any[]>([]);
  const [selectedBusId, setSelectedBusId] = useState<number | null>(null);
  const [route, setRoute] = useState('');
  const [preDepartureCount, setPreDepartureCount] = useState<number>(0);
  
  // Tracking operation states
  const [isTracking, setIsTracking] = useState(false);
  const [activeOperationId, setActiveOperationId] = useState<number | null>(null);
  const [seatsAvailable, setSeatsAvailable] = useState<number>(0);
  const [totalSeats, setTotalSeats] = useState<number>(40);
  const [status, setStatus] = useState<'available' | 'on_stop' | 'full'>('available');

  const [isLoading, setIsLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastColor, setToastColor] = useState<'success' | 'danger'>('danger');

  // Tracking watchers
  const watchIdRef = useRef<number | null>(null);
  const selectedBusRef = useRef<any>(null);

  const triggerToast = (msg: string, color: 'success' | 'danger' = 'danger') => {
    setToastMessage(msg);
    setToastColor(color);
    setShowToast(true);
  };

  // Fetch free buses on load
  const loadAvailableBuses = async () => {
    try {
      const res = await ApiService.getBusesConductor();
      if (res && res.success) {
        setBuses(res.buses || []);
      }
    } catch (e) {
      console.warn('Could not load conductor buses list', e);
    }
  };

  useEffect(() => {
    loadAvailableBuses();
  }, []);

  const handleBusSelection = (busId: number) => {
    setSelectedBusId(busId);
    const bus = buses.find(b => Number(b.Bus_ID) === busId);
    if (bus) {
      selectedBusRef.current = bus;
      setTotalSeats(bus.total_seats || 40);
      setSeatsAvailable(bus.seat_availability !== null ? bus.seat_availability : bus.total_seats);
    }
  };

  const startTracking = async () => {
    if (!selectedBusId || !route) {
      triggerToast('Please select a Bus and enter your Route Name.');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Initialize Active Operation on backend database
      const opRes = await ApiService.startOperation({
        bus_id: selectedBusId,
        route: route,
        pre_departure_count: preDepartureCount,
        start_location: 'Terminal',
      });

      if (!opRes.success) {
        setIsLoading(false);
        triggerToast(opRes.error || 'Failed to start tracking session.');
        return;
      }

      const opId = opRes.operation_id;
      setActiveOperationId(opId);
      setIsTracking(true);
      setIsLoading(false);
      triggerToast('Tracking operation initiated!', 'success');

      // 2. Start Geolocation broadcast loop
      if (navigator.geolocation) {
        // High accuracy background watch coordinates
        const watchId = navigator.geolocation.watchPosition(
          async (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            
            try {
              // Send continuous coordinate pings to PHP API
              await ApiService.updateLocation({
                bus_id: selectedBusId,
                lat: lat,
                lng: lng,
                seats_available: seatsAvailable,
                status: status,
                route: route,
              });
            } catch (err) {
              console.warn('Silent location update failure', err);
            }
          },
          (err) => console.error('Watch position error', err),
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
        
        watchIdRef.current = watchId;
      }
    } catch (e) {
      setIsLoading(false);
      triggerToast('Network initialization failed.');
    }
  };

  const stopTracking = async () => {
    if (!selectedBusId) return;

    setIsLoading(true);
    try {
      // 1. Disable Geolocation Watcher
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }

      // 2. Stop Tracking Session in DB
      await ApiService.stopTracking({
        bus_id: selectedBusId,
        end_location: 'Terminal',
      });

      setIsTracking(false);
      setActiveOperationId(null);
      setIsLoading(false);
      triggerToast('Tracking session stopped.', 'success');
      loadAvailableBuses(); // refresh list
    } catch (e) {
      setIsLoading(false);
      triggerToast('Error stopping tracking.');
    }
  };

  // Sync seat changes instantly to backend
  const handleSeatAdjustment = async (increment: boolean) => {
    let nextSeats = seatsAvailable;
    if (increment) {
      if (seatsAvailable >= totalSeats) return;
      nextSeats = seatsAvailable + 1;
      setSeatsAvailable(nextSeats);
    } else {
      if (seatsAvailable <= 0) return;
      nextSeats = seatsAvailable - 1;
      setSeatsAvailable(nextSeats);
    }

    // Call logging passenger event in backend
    if (activeOperationId) {
      try {
        await ApiService.logPassengerEvent({
          operation_id: activeOperationId,
          event_type: increment ? 'depart' : 'board', // leaving bus empty = depart, entering = board
          count: 1,
          location_name: 'Transit Stop',
        });

        // Also ping general update location to update passenger map instantly
        await ApiService.updateLocation({
          bus_id: selectedBusId!,
          seats_available: nextSeats,
          status: nextSeats === 0 ? 'full' : 'available',
        });
      } catch (e) {
        console.warn('Failed to log seat count event');
      }
    }
  };

  const handleLogout = () => {
    if (isTracking) {
      triggerToast('Please STOP tracking before logging out.');
      return;
    }
    ApiService.logout();
    history.replace('/login');
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Conductor Hub</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleLogout} title="Log Out">
              <IonIcon icon={logOutOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="conductor-content">
        <div className="conductor-container">
          {!isTracking ? (
            // Form state: Select Bus & Route
            <IonCard className="setup-card">
              <IonCardHeader>
                <IonCardTitle className="setup-title">Start Transit Route</IonCardTitle>
                <IonCardSubtitle className="setup-subtitle">Set up details before departure</IonCardSubtitle>
              </IonCardHeader>

              <IonCardContent>
                <IonItem className="setup-item" lines="none">
                  <IonIcon icon={busOutline} slot="start" className="setup-icon" />
                  <IonLabel position="stacked" className="stacked-label">Select Bus Code</IonLabel>
                  <IonSelect
                    value={selectedBusId}
                    placeholder="Choose Bus"
                    onIonChange={(e) => handleBusSelection(e.detail.value)}
                    className="setup-select"
                  >
                    {buses.map((bus) => (
                      <IonSelectOption key={bus.Bus_ID} value={Number(bus.Bus_ID)}>
                        Bus {bus.code} ({bus.total_seats} seats)
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                </IonItem>

                <IonItem className="setup-item" lines="none">
                  <IonIcon icon={navigateOutline} slot="start" className="setup-icon" />
                  <IonInput
                    type="text"
                    placeholder="Route Name (e.g. Cubao - Pasay)"
                    value={route}
                    onIonInput={(e) => setRoute(e.detail.value!)}
                    className="setup-input"
                  />
                </IonItem>

                <IonItem className="setup-item" lines="none">
                  <IonIcon icon={peopleOutline} slot="start" className="setup-icon" />
                  <IonInput
                    type="number"
                    placeholder="Pre-Departure Passenger Count"
                    value={preDepartureCount}
                    onIonInput={(e) => setPreDepartureCount(parseInt(e.detail.value!) || 0)}
                    className="setup-input"
                  />
                </IonItem>

                <IonButton onClick={startTracking} expand="block" color="success" className="action-btn">
                  <IonIcon icon={playOutline} slot="start" /> Start Broadcast Tracking
                </IonButton>
              </IonCardContent>
            </IonCard>
          ) : (
            // Active tracking dashboard
            <React.Fragment>
              <div className="status-indicator-box">
                <div className="active-dot-pulsing"></div>
                <IonText className="active-desc">BROADCASTING GPS LIVE COORDINATES</IonText>
              </div>

              <IonCard className="stats-card">
                <IonCardContent>
                  <IonGrid>
                    <IonRow>
                      <IonCol size="6" className="stat-border-right">
                        <span className="stat-lbl">ACTIVE BUS</span>
                        <h2 className="stat-val">Bus {selectedBusRef.current?.code}</h2>
                      </IonCol>
                      <IonCol size="6">
                        <span className="stat-lbl">ROUTE</span>
                        <h2 className="stat-val truncate-text">{route}</h2>
                      </IonCol>
                    </IonRow>
                  </IonGrid>
                </IonCardContent>
              </IonCard>

              {/* Passenger seat counters */}
              <div className="counter-panel">
                <h3 className="counter-title">Passenger Capacity Management</h3>
                <div className="counter-display">
                  <div className="seats-circle">
                    <span className="seats-count">{seatsAvailable}</span>
                    <span className="seats-lbl">Available Seats</span>
                  </div>
                </div>

                <div className="counter-actions">
                  <IonButton
                    onClick={() => handleSeatAdjustment(false)}
                    color="danger"
                    className="counter-btn"
                    disabled={seatsAvailable <= 0}
                  >
                    <IonIcon icon={removeOutline} className="adjust-icon" /> Board (+1 Passenger)
                  </IonButton>
                  
                  <IonButton
                    onClick={() => handleSeatAdjustment(true)}
                    color="success"
                    className="counter-btn"
                    disabled={seatsAvailable >= totalSeats}
                  >
                    <IonIcon icon={addOutline} className="adjust-icon" /> Depart (-1 Passenger)
                  </IonButton>
                </div>
              </div>

              <IonButton onClick={stopTracking} expand="block" color="danger" className="action-btn-stop">
                <IonIcon icon={stopOutline} slot="start" /> Stop Tracking Operations
              </IonButton>
            </React.Fragment>
          )}
        </div>

        <IonLoading isOpen={isLoading} message="Configuring active transit feeds..." spinner="crescent" />
        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={3000}
          color={toastColor}
          position="bottom"
        />
      </IonContent>
    </IonPage>
  );
};

export default ConductorDashboard;
