import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider, useNotifications } from './context/NotificationContext';
import { TrackingProvider } from './context/TrackingContext';
import { usePushNotifications } from './hooks/passenger/usePushNotifications';
import { IncomingSosModal } from './components/IncomingSosModal';
import { NotificationToast } from './components/NotificationToast';

// Auth Pages
import Login from './pages/auth/Login';
import SignUp from './pages/auth/SignUp';
import ForgotPassword from './pages/auth/ForgotPassword';

// Passenger Pages
import CompleteProfile from './pages/passenger/CompleteProfile';
import Dashboard from './pages/passenger/Dashboard';
import RideHistory from './pages/passenger/RideHistory';

import BusInfo from './pages/passenger/busInfo/BusInfo';

import LostAndFound from './pages/passenger/lostAndFound/LostAndFound';
import MyReports from './pages/passenger/lostAndFound/MyReports';

import SOS from './pages/passenger/sos/SOS';
import ReportProblem from './pages/passenger/report/ReportProblem';
import Notifications from './pages/passenger/notifications/Notifications';

// Profile Pages
import Profile from './pages/passenger/profile/Profile';
import AccountSettings from './pages/passenger/profile/AccountSettings';
import ChangePassword from './pages/passenger/profile/ChangePassword';
import LoginActivity from './pages/passenger/profile/LoginActivity';
import DeleteAccount from './pages/passenger/profile/DeleteAccount';

// Settings Pages
import Settings from './pages/passenger/settings/Settings';
import SmartNotification from './pages/passenger/settings/SmartNotification';
import AccessibilitySettings from './pages/passenger/settings/AccessibilitySettings';
import PrivacySecurity from './pages/passenger/settings/PrivacySecurity';
import Feedback from './pages/passenger/settings/Feedback';
import StaticPages from './pages/passenger/settings/StaticPages';

// Protected Route Wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-[#1d72f8] animate-spin" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Loading ByaHero...
          </span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Auth Flow */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/complete-profile" element={<CompleteProfile />} />

      {/* Main Passenger Dashboard & Features */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/bus-info"
        element={
          <ProtectedRoute>
            <BusInfo />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lost-and-found"
        element={
          <ProtectedRoute>
            <LostAndFound />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lost-and-found/my-reports"
        element={
          <ProtectedRoute>
            <MyReports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sos"
        element={
          <ProtectedRoute>
            <SOS />
          </ProtectedRoute>
        }
      />
      <Route
        path="/report"
        element={
          <ProtectedRoute>
            <ReportProblem />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <Notifications />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ride-history"
        element={
          <ProtectedRoute>
            <RideHistory />
          </ProtectedRoute>
        }
      />

      {/* Profile & Account Management */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile/account-settings"
        element={
          <ProtectedRoute>
            <AccountSettings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile/change-password"
        element={
          <ProtectedRoute>
            <ChangePassword />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile/login-activity"
        element={
          <ProtectedRoute>
            <LoginActivity />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile/delete-account"
        element={
          <ProtectedRoute>
            <DeleteAccount />
          </ProtectedRoute>
        }
      />

      {/* Settings & Preferences */}
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/smart-notifications"
        element={
          <ProtectedRoute>
            <SmartNotification />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/accessibility"
        element={
          <ProtectedRoute>
            <AccessibilitySettings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/privacy-security"
        element={
          <ProtectedRoute>
            <PrivacySecurity />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/feedback"
        element={
          <ProtectedRoute>
            <Feedback />
          </ProtectedRoute>
        }
      />

      {/* Legal & Static Information */}
      <Route
        path="/settings/privacy"
        element={
          <ProtectedRoute>
            <StaticPages />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/terms"
        element={
          <ProtectedRoute>
            <StaticPages />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/about"
        element={
          <ProtectedRoute>
            <StaticPages />
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function AppContent() {
  usePushNotifications();
  const { latestSosAlert, dismissSosModal } = useNotifications();

  return (
    <>
      <AppRoutes />
      <NotificationToast />
      <IncomingSosModal alert={latestSosAlert} onClose={dismissSosModal} />
    </>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <TrackingProvider>
            <AppContent />
          </TrackingProvider>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
export default App;
