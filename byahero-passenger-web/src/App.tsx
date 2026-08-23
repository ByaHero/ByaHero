import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TrackingProvider } from './context/TrackingContext';

// Pages
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import ForgotPassword from './pages/ForgotPassword';
import CompleteProfile from './pages/CompleteProfile';
import Dashboard from './pages/Dashboard';
import BusInfo from './pages/BusInfo';
import LostAndFound from './pages/LostAndFound';
import MyReports from './pages/MyReports';
import SOS from './pages/SOS';
import ReportProblem from './pages/ReportProblem';
import RideHistory from './pages/RideHistory';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import AccountSettings from './pages/AccountSettings';
import ChangePassword from './pages/ChangePassword';
import LoginActivity from './pages/LoginActivity';
import DeleteAccount from './pages/DeleteAccount';
import Settings from './pages/Settings';
import SmartNotification from './pages/SmartNotification';
import AccessibilitySettings from './pages/AccessibilitySettings';
import PrivacySecurity from './pages/PrivacySecurity';
import Feedback from './pages/Feedback';
import StaticPages from './pages/StaticPages';

// Protected Route Wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoading } = useAuth();

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
        path="/ride-history"
        element={
          <ProtectedRoute>
            <RideHistory />
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

      {/* Profile & Security */}
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

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TrackingProvider>
          <AppRoutes />
        </TrackingProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
export default App;
