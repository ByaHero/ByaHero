import React, { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import byaheroLogo from '../../assets/images/byaheroLogo.png';
import byaheroText from '../../assets/images/ByaHero_rext_.svg';

interface LoginProps {
  onLoginSuccess: (email: string) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      alert('Email and password are required.');
      return;
    }

    setIsLoading(true);
    // Simulating API delay and successful login for now
    setTimeout(() => {
      setIsLoading(false);
      localStorage.setItem('byahero_admin_user', JSON.stringify({ email }));
      localStorage.setItem('byahero_cached_email', email);
      onLoginSuccess(email);
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-6 font-sans py-10">
      <div className="w-full max-w-[400px] flex flex-col items-center">
        
        {/* Logos */}
        <div className="flex flex-col items-center mb-8">
          <img 
            src={byaheroLogo} 
            alt="ByaHero Logo" 
            className="w-[120px] h-[120px] object-contain"
          />
          <img 
            src={byaheroText} 
            alt="ByaHero Text" 
            className="w-[150px] h-[36px] mt-1 object-contain"
          />
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-[28px] px-7 py-8 w-full shadow-lg border border-slate-100">
          <h2 className="text-[#1d72f8] text-[13px] font-extrabold tracking-widest mb-6 text-center uppercase">
            LOG IN TO YOUR ACCOUNT
          </h2>

          <form onSubmit={handleLogin}>
            {/* Email Input */}
            <div className="flex items-center bg-white rounded-full px-6 mb-4 border border-slate-100 shadow-sm focus-within:ring-2 focus-within:ring-[#1d72f8]/30 transition-shadow">
              <input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                className="flex-1 text-slate-800 py-3 text-sm font-semibold outline-none bg-transparent placeholder-slate-400"
              />
            </div>

            {/* Password Input */}
            <div className="flex items-center bg-white rounded-full px-6 mb-3 border border-slate-100 shadow-sm focus-within:ring-2 focus-within:ring-[#1d72f8]/30 transition-shadow">
              <input 
                type={secureTextEntry ? "password" : "text"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="flex-1 text-slate-800 py-3 text-sm font-semibold outline-none bg-transparent placeholder-slate-400"
              />
              <button 
                type="button" 
                onClick={() => setSecureTextEntry(!secureTextEntry)}
                className="text-slate-400 hover:text-slate-600 focus:outline-none ml-2"
              >
                {secureTextEntry ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Forgot Password */}
            <button
              type="button"
              onClick={() => alert('Please contact the IT administrator to reset your password.')}
              className="self-start mb-6 ml-3 text-slate-500 text-xs font-semibold hover:text-slate-700 transition-colors"
            >
              Forgot Password?
            </button>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full max-w-[200px] mx-auto flex justify-center items-center bg-[#1d72f8] rounded-full py-3 px-12 shadow-md hover:bg-blue-700 transition-colors mb-5"
            >
              {isLoading ? (
                <Loader2 size={20} className="text-white animate-spin" />
              ) : (
                <span className="text-white text-sm font-bold tracking-wider">LOGIN</span>
              )}
            </button>
            
            {/* Divider */}
            <div className="flex items-center w-full mb-5">
              <div className="flex-1 h-[1px] bg-slate-200"></div>
              <span className="text-slate-400 text-[10px] font-bold mx-3">OR</span>
              <div className="flex-1 h-[1px] bg-slate-200"></div>
            </div>

            {/* Google sign-in button */}
            <button
              type="button"
              onClick={() => alert('Google sign-in is managed by ByaHero central authentication.')}
              className="flex items-center justify-center border border-slate-200 rounded-full py-2.5 px-4 w-full bg-white mb-6 shadow-sm hover:bg-slate-50 transition-colors"
            >
              <img
                src="https://developers.google.com/static/identity/images/g-logo.png"
                alt="Google"
                className="w-4 h-4 mr-3 object-contain"
              />
              <span className="text-slate-700 text-xs font-semibold">
                Continue with Google
              </span>
            </button>

            {/* Sign Up Navigation link */}
            <div className="flex flex-row justify-center items-center">
              <span className="text-slate-500 text-xs font-medium">
                Don't have an account?{' '}
              </span>
              <button 
                type="button" 
                onClick={() => alert('Admin accounts must be provisioned by IT.')}
                className="text-[#1d72f8] text-xs font-bold hover:underline ml-1"
              >
                Sign up
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
