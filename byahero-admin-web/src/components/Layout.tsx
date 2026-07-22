import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { Smartphone, ArrowRight, X, Sparkles } from 'lucide-react';

interface LayoutProps {
  adminEmail: string;
  onLogout: () => void;
}

export default function Layout({ adminEmail, onLogout }: LayoutProps) {
  const [showBanner, setShowBanner] = useState(true);

  return (
    <div className="app-container">
      <Sidebar onLogout={onLogout} />
      <main className="main-content">
        {showBanner && (
          <div
            className="admin-app-banner"
            style={{
              background: 'linear-gradient(135deg, #0f3878 0%, #1d4ed8 50%, #2563eb 100%)',
              color: '#ffffff',
              padding: '10px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 2px 8px rgba(15, 56, 120, 0.15)',
              fontSize: '0.875rem',
              fontWeight: 500,
              gap: '16px',
              position: 'relative',
              zIndex: 50,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.18)',
                  borderRadius: '8px',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Smartphone size={18} color="#ffffff" />
              </div>
              <div>
                <span style={{ fontWeight: 700, marginRight: '6px' }}>Try the ByaHero Admin Application!</span>
                <span style={{ opacity: 0.9, fontSize: '0.8rem' }}>
                  Experience real-time mobile fleet management, conductor monitoring, and live analytics on Android.
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <a
                href="https://github.com/ByaHero/ByaHero/releases/latest/download/byahero-admin.apk"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  backgroundColor: '#ffffff',
                  color: '#0f3878',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                }}
              >
                <Sparkles size={14} color="#0f3878" />
                Download Admin App
                <ArrowRight size={14} />
              </a>

              <button
                type="button"
                onClick={() => setShowBanner(false)}
                title="Dismiss Banner"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.8)',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}
        <Navbar adminEmail={adminEmail} />
        <Outlet />
      </main>
    </div>
  );
}

