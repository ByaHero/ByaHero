import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

interface LayoutProps {
  adminEmail: string;
  onLogout: () => void;
}

export default function Layout({ adminEmail, onLogout }: LayoutProps) {
  return (
    <div className="app-container">
      <Sidebar onLogout={onLogout} />
      <main className="main-content">
        <Navbar adminEmail={adminEmail} />
        <Outlet />
      </main>
    </div>
  );
}
