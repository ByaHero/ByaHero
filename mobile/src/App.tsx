import React, { useEffect, useState } from 'react';
import { Redirect, Route, useLocation } from 'react-router-dom';
import {
  IonApp,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  setupIonicReact
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { mapOutline, shieldOutline, busOutline } from 'ionicons/icons';

// ByaHero custom pages
import Login from './pages/auth/Login';
import SignUp from './pages/auth/SignUp';
import ForgotPassword from './pages/auth/ForgotPassword';
import PassengerMap from './pages/PassengerMap';
import ConductorDashboard from './pages/ConductorDashboard';
import SosAlert from './pages/SosAlert';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/* Theme variables */
import './theme/variables.css';

setupIonicReact();

const MainApp: React.FC = () => {
  const location = useLocation();
  const [userRole, setUserRole] = useState<'passenger' | 'conductor' | 'admin' | null>(null);

  // Sync state with LocalStorage session continuously
  const checkUserSession = () => {
    const userStr = localStorage.getItem('byahero_user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserRole(user.role || 'passenger');
      } catch (e) {
        setUserRole(null);
      }
    } else {
      setUserRole(null);
    }
  };

  useEffect(() => {
    checkUserSession();
    // Intercept storage updates or logins instantly
    window.addEventListener('storage', checkUserSession);
    const interval = setInterval(checkUserSession, 1000);
    return () => {
      window.removeEventListener('storage', checkUserSession);
      clearInterval(interval);
    };
  }, []);

  // Determine if the current screen is Login, Sign Up, or Forgot Password
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup' || location.pathname === '/forgot-password';

  // Safeguard unauthenticated users from bypassing login
  const hasSession = localStorage.getItem('byahero_user') !== null;
  if (!hasSession && !isAuthPage) {
    return <Redirect to="/login" />;
  }

  return (
    <IonTabs>
      <IonRouterOutlet>
        {/* Global Flat Routes */}
        <Route exact path="/login" component={Login} />
        <Route exact path="/signup" component={SignUp} />
        <Route exact path="/forgot-password" component={ForgotPassword} />
        
        {/* Protected Dashboard Screens */}
        <Route exact path="/passenger/map" component={PassengerMap} />
        <Route exact path="/conductor/dashboard" component={ConductorDashboard} />
        <Route exact path="/sos" component={SosAlert} />

        {/* Root Fallback Redirection */}
        <Route exact path="/">
          {hasSession ? (
            userRole === 'conductor' ? (
              <Redirect to="/conductor/dashboard" />
            ) : (
              <Redirect to="/passenger/map" />
            )
          ) : (
            <Redirect to="/login" />
          )}
        </Route>
      </IonRouterOutlet>

      {/* Conditionally render Tab Bar only inside the App (hidden on Login & SignUp) */}
      {!isAuthPage && (
        <IonTabBar slot="bottom">
          {userRole !== 'conductor' ? (
            // Passenger Bottom Tab Options
            <IonTabButton tab="map" href="/passenger/map">
              <IonIcon icon={mapOutline} />
              <IonLabel>Live Map</IonLabel>
            </IonTabButton>
          ) : (
            // Conductor Bottom Tab Options
            <IonTabButton tab="conductor" href="/conductor/dashboard">
              <IonIcon icon={busOutline} />
              <IonLabel>Conductor Hub</IonLabel>
            </IonTabButton>
          )}

          {/* Common SOS Emergency Option */}
          <IonTabButton tab="sos" href="/sos">
            <IonIcon icon={shieldOutline} style={{ color: '#ef4444' }} />
            <IonLabel style={{ color: '#ef4444', fontWeight: '700' }}>Emergency SOS</IonLabel>
          </IonTabButton>
        </IonTabBar>
      )}
    </IonTabs>
  );
};

const App: React.FC = () => (
  <IonApp>
    <IonReactRouter>
      <MainApp />
    </IonReactRouter>
  </IonApp>
);

export default App;
