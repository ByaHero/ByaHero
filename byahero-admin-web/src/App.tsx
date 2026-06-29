import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Buses from './pages/Buses';
import ActiveBuses from './pages/ActiveBuses';
import Schedules from './pages/Schedules';
import WaitingPassengers from './pages/WaitingPassengers';
import Stops from './pages/Stops';
import Conductors from './pages/Conductors';
import LostFound from './pages/LostFound';
import Reports from './pages/Reports';
import FeedbackPage from './pages/FeedbackPage';
import Fares from './pages/Fares';
import Analytics from './pages/Analytics';
import Profile from './pages/Profile';

export default function App() {
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const userStr = localStorage.getItem('byahero_admin_user');
    if (userStr) {
      try {
        const parsed = JSON.parse(userStr);
        if (parsed && parsed.email) {
          setAdminEmail(parsed.email);
        }
      } catch (e) {
        localStorage.removeItem('byahero_admin_user');
      }
    }
    setCheckingAuth(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('byahero_admin_user');
    setAdminEmail(null);
  };

  if (checkingAuth) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--background)' }}>
        <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Checking access credentials...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            adminEmail ? <Navigate to="/" replace /> : <Login onLoginSuccess={(email) => setAdminEmail(email)} />
          }
        />

        <Route
          path="/"
          element={
            adminEmail ? <Layout adminEmail={adminEmail} onLogout={handleLogout} /> : <Navigate to="/login" replace />
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="buses" element={<Buses />} />
          <Route path="active-buses" element={<ActiveBuses />} />
          <Route path="schedules" element={<Schedules />} />
          <Route path="waiting-passengers" element={<WaitingPassengers />} />
          <Route path="stops" element={<Stops />} />
          <Route path="conductors" element={<Conductors />} />
          <Route path="lost-and-found" element={<LostFound />} />
          <Route path="reports" element={<Reports />} />
          <Route path="feedbacks" element={<FeedbackPage />} />
          <Route path="fares" element={<Fares />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="profile" element={<Profile adminEmail={adminEmail || ''} />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}


