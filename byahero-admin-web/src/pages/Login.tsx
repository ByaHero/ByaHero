import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, Loader2 } from 'lucide-react';
import { adminService } from '../services/admin';

interface LoginProps {
  onLoginSuccess: (email: string) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await adminService.login(email.trim(), password);
      
      if (data.success) {
        const redirect = data.redirect || '';
        const user = data.user || {};
        
        if (redirect.includes('admin') || user.role === 'admin') {
          localStorage.setItem('byahero_admin_user', JSON.stringify({ email: email.trim() }));
          onLoginSuccess(email.trim());
          navigate('/');
        } else {
          setError('Access Denied. Only administrators are allowed to login.');
          await adminService.logout();
        }
      } else {
        setError(data.message || 'Invalid email or password.');
      }
    } catch (e: any) {
      console.error(e);
      setError('Connection failure. Please verify backend state.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#0f3878] via-[#1e40af] to-[#4C85C5] p-5">
      <div className="bg-white rounded-3xl p-8 sm:p-10 w-full max-w-[420px] shadow-2xl text-center border border-white/20 backdrop-blur-md">
        {/* Decorative Badge logo */}
        <div className="inline-flex p-3.5 rounded-2xl bg-blue-50 text-[#0f3878] mb-5 shadow-sm border border-blue-100/50">
          <Shield size={32} />
        </div>

        <h1 className="text-2xl font-black text-[#0f3878] tracking-tight mb-1.5">ByaHero Admin</h1>
        <p className="text-xs text-slate-500 font-medium mb-7">Sign in to control and monitor the bus system</p>

        {error && (
          <div className="bg-red-50 text-red-700 p-3.5 rounded-xl text-xs font-bold mb-5 text-left border border-red-200/80 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="text-left flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">Admin Email Address</label>
            <input
              type="email"
              className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 text-xs bg-slate-50 transition duration-150 focus:outline-none focus:border-[#4C85C5] focus:bg-white focus:ring-2 focus:ring-[#4C85C5]/20 disabled:opacity-60 disabled:cursor-not-allowed"
              placeholder="admin@byahero.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5 relative">
            <label className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="w-full py-2.5 px-3.5 pr-10 rounded-xl border border-slate-200 text-xs bg-slate-50 transition duration-150 focus:outline-none focus:border-[#4C85C5] focus:bg-white focus:ring-2 focus:ring-[#4C85C5]/20 disabled:opacity-60 disabled:cursor-not-allowed"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-0 text-slate-400 hover:text-slate-700 cursor-pointer transition p-1"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-2 h-11 inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold rounded-xl bg-[#0f3878] hover:bg-[#0a2958] text-white transition duration-150 shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin mr-1.5" />
                Authenticating...
              </>
            ) : (
              'Sign In to Dashboard'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
