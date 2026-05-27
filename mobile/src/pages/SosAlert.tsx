import React, { useState, useEffect } from 'react';
import {
  IonContent,
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButton,
  IonIcon,
  IonText,
  IonToast,
  IonLoading,
  IonCard,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
} from '@ionic/react';
import { alertCircleOutline, locateOutline, shieldOutline, volumeHighOutline } from 'ionicons/icons';
import { ApiService } from '../api/client';
import './SosAlert.css';

const SosAlert: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastColor, setToastColor] = useState<'success' | 'danger'>('danger');
  const [alerts, setAlerts] = useState<any[]>([]);

  const fetchAlerts = async () => {
    try {
      const res = await ApiService.getSosAlerts();
      if (res && res.success) {
        setAlerts(res.alerts || []);
      }
    } catch (e) {
      console.warn('Could not load alerts list', e);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

  const triggerSos = async () => {
    setIsLoading(true);
    try {
      // Fetch location if available
      let lat = 14.5995; // Default Manila coordinates
      let lng = 120.9842;

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            lat = position.coords.latitude;
            lng = position.coords.longitude;
            await sendRequest(lat, lng);
          },
          async () => {
            await sendRequest(lat, lng); // fallback
          }
        );
      } else {
        await sendRequest(lat, lng);
      }
    } catch (err) {
      setIsLoading(false);
      setToastMessage('Could not fetch coordinates for SOS.');
      setToastColor('danger');
      setShowToast(true);
    }
  };

  const sendRequest = async (lat: number, lng: number) => {
    try {
      const userStr = localStorage.getItem('byahero_user');
      const user = userStr ? JSON.parse(userStr) : null;
      
      const res = await ApiService.sendSosAlert({
        operation_id: user?.id || 1,
        lat: lat,
        lng: lng,
        message: 'EMERGENCY: SOS requested via ByaHero Mobile App!',
      });
      setIsLoading(false);

      if (res.success) {
        setToastMessage('SOS ALERT SENT SUCCESSFULLY! Help is on the way.');
        setToastColor('success');
        setShowToast(true);
        fetchAlerts();
      } else {
        setToastMessage(res.message || 'Failed to dispatch SOS alert.');
        setToastColor('danger');
        setShowToast(true);
      }
    } catch (e) {
      setIsLoading(false);
      setToastMessage('SOS Dispatch Error. Please contact authorities immediately.');
      setToastColor('danger');
      setShowToast(true);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="danger">
          <IonTitle>Emergency SOS Center</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="sos-content">
        <div className="sos-container">
          <div className="sos-pulsing-circle" onClick={triggerSos}>
            <div className="pulse pulse-1"></div>
            <div className="pulse pulse-2"></div>
            <div className="pulse pulse-3"></div>
            <div className="sos-button">
              <IonIcon icon={shieldOutline} className="sos-main-icon" />
              <IonText className="sos-btn-text">TRIGGER SOS</IonText>
            </div>
          </div>

          <div className="sos-instruction-box">
            <h2 className="sos-title">Need Immediate Help?</h2>
            <p className="sos-desc">
              Press and tap the red button above. This will instantly capture your current GPS location and send an emergency alert notification to all nearby drivers, conductors, and dispatch operations.
            </p>
          </div>

          <IonCard className="sos-alerts-card">
            <IonCardContent>
              <div className="alerts-header">
                <IonIcon icon={alertCircleOutline} className="header-icon" />
                <IonText className="alerts-title">Active Emergency Feeds</IonText>
              </div>

              {alerts.length === 0 ? (
                <div className="no-alerts">
                  <IonText>No active emergencies reported. Safe travels!</IonText>
                </div>
              ) : (
                <IonList className="alerts-list">
                  {alerts.slice(0, 5).map((alert, index) => (
                    <IonItem key={index} lines="full" className="alert-item">
                      <IonLabel>
                        <h3 className="alert-sender">{alert.sender_name || 'Conductor Alert'}</h3>
                        <p className="alert-message">{alert.message || 'SOS Triggered'}</p>
                        <span className="alert-time">{new Date(alert.created_at || Date.now()).toLocaleTimeString()}</span>
                      </IonLabel>
                    </IonItem>
                  ))}
                </IonList>
              )}
            </IonCardContent>
          </IonCard>
        </div>

        <IonLoading isOpen={isLoading} message="Broadcasting Emergency SOS..." spinner="circles" />
        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={5000}
          color={toastColor}
          position="top"
        />
      </IonContent>
    </IonPage>
  );
};

export default SosAlert;
