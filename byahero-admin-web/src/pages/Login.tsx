import React from 'react';

interface LoginProps {
  onLoginSuccess: (email: string) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate a successful login for now
    const email = 'admin@byahero.com';
    localStorage.setItem('byahero_admin_user', JSON.stringify({ email }));
    onLoginSuccess(email);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa] px-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-[#0f3878]">ByaHero Admin</h2>
          <p className="text-gray-500 mt-2 text-sm">Sign in to access the control center</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
            <input 
              type="email" 
              required 
              defaultValue="admin@byahero.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4C85C5] focus:border-transparent outline-none transition-shadow"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input 
              type="password" 
              required 
              defaultValue="password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4C85C5] focus:border-transparent outline-none transition-shadow"
            />
          </div>
          <button 
            type="submit"
            className="w-full bg-[#0f3878] text-white py-2.5 rounded-lg font-bold hover:bg-[#0f3878]/90 transition-colors shadow-sm"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
