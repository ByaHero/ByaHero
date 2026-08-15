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
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <Sidebar onLogout={onLogout} />
      <main className="flex-1 ml-[260px] p-6 min-h-screen flex flex-col">
        {showBanner && (
          <div className="bg-gradient-to-r from-[#0f3878] via-[#1d4ed8] to-[#2563eb] text-white py-2.5 px-5 rounded-2xl flex items-center justify-between shadow-md mb-6 gap-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 backdrop-blur-xs rounded-xl p-2 flex items-center justify-center shrink-0">
                <Smartphone size={18} className="text-white" />
              </div>
              <div>
                <span className="font-extrabold text-xs mr-2">Try the ByaHero Admin Application!</span>
                <span className="text-[11px] text-white/80 hidden sm:inline">
                  Experience real-time mobile fleet management, conductor monitoring, and live analytics on Android.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <a
                href="https://github.com/ByaHero/ByaHero/releases/latest/download/byahero-admin.apk"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white text-[#0f3878] hover:bg-slate-100 py-1.5 px-3.5 rounded-xl font-bold text-xs no-underline inline-flex items-center gap-1.5 shadow-sm transition"
              >
                <Sparkles size={13} className="text-[#0f3878]" />
                <span>Download APK</span>
                <ArrowRight size={13} />
              </a>

              <button
                type="button"
                onClick={() => setShowBanner(false)}
                title="Dismiss Banner"
                className="bg-transparent border-0 text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition cursor-pointer"
              >
                <X size={15} />
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
