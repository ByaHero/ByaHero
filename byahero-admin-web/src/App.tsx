import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Buses from './pages/Buses';
import ActiveBuses from './pages/ActiveBuses';
import Conductors from './pages/Conductors';
import Schedules from './pages/Schedules';
import Fares from './pages/Fares';
import WaitingPassengers from './pages/WaitingPassengers';
import Stops from './pages/Stops';
import FeedbackPage from './pages/Feedback';
import LostFound from './pages/LostFound';
import Reports from './pages/Reports';
import Analytics from './pages/Analytics';
import Profile from './pages/Profile';
import Receipts from './pages/Receipts';
import WebAlertContainer from './components/WebAlert';

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
      } catch {
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
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-sm font-bold text-slate-500 animate-pulse">Checking access credentials...</div>
      </div>
    );
  }

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      {import.meta.env.VITE_TEST_DEPLOYMENT === 'true' && (
        <div role="status" className="fixed bottom-3 left-1/2 z-[100] -translate-x-1/2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-center text-xs font-bold text-amber-950 shadow-lg">
          TEST ENVIRONMENT · Supabase copy · Live apps are unchanged
        </div>
      )}
      <WebAlertContainer />
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
          <Route path="conductors" element={<Conductors />} />
          <Route path="stops" element={<Stops />} />
          <Route path="lost-and-found" element={<LostFound />} />
          <Route path="reports" element={<Reports />} />
          <Route path="feedbacks" element={<FeedbackPage />} />
          <Route path="fares" element={<Fares />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="receipts" element={<Receipts />} />
          <Route path="profile" element={<Profile adminEmail={adminEmail || ''} />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
