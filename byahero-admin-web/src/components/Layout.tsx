import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

interface LayoutProps {
  adminEmail: string;
  onLogout: () => void;
}

export default function Layout({ adminEmail, onLogout }: LayoutProps) {
  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col font-sans">
      <Navbar adminEmail={adminEmail} onLogout={onLogout} />
      <main className="flex-1 relative w-full">
        <Outlet />
      </main>
    </div>
  );
}
