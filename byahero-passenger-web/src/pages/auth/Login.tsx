import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { preWarmServer, login as authServiceLogin, googleAuth } from '../../services/authService';
import DevSettingsModal from '../../components/DevSettingsModal';
import AlertModal from '../../components/AlertModal';
import { MaterialIcons } from '../../components/ui/MaterialIcons';

const GOOGLE_CLIENT_ID = '299495970056-35hqu1hnl0ugisp6270he24qugv24skl.apps.googleusercontent.com';

declare global {
  interface Window {
    google?: any;
  }
}

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login: authContextLogin, serverUrl, setServerUrl } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showWarmingUpMsg, setShowWarmingUpMsg] = useState(false);

  const googleBtnContainerRef = useRef<HTMLDivElement>(null);

  // Logo tap dev modal trigger
  const [logoTapCount, setLogoTapCount] = useState(0);
  const [lastTapTime, setLastTapTime] = useState(0);
  const [isDevModalVisible, setIsDevModalVisible] = useState(false);
  const [loginSuccessVisible, setLoginSuccessVisible] = useState(false);
  const [loginUserName, setLoginUserName] = useState('');

  // AlertModal state
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning' | 'confirm';
    onConfirm: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'error',
    onConfirm: () => {},
  });

  const showAlert = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'info' | 'warning' | 'confirm' = 'error',
    onConfirm?: () => void
  ) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      type,
      onConfirm: () => {
        setAlertConfig((prev) => ({ ...prev, visible: false }));
        if (onConfirm) onConfirm();
      },
    });
  };

  const handleGoogleCredentialResponse = async (response: any) => {
    if (!response?.credential) {
      showAlert('Authentication Error', 'No credential received from Google.', 'error');
      return;
    }

    setIsLoading(true);
    setShowWarmingUpMsg(false);
    const timer = setTimeout(() => {
      setShowWarmingUpMsg(true);
    }, 3500);

    try {
      const result = await googleAuth(response.credential);
      clearTimeout(timer);
      setIsLoading(false);
      setShowWarmingUpMsg(false);

      if (result.success && result.user) {
        const hasContacts = result.user.contacts || result.user.phone || '';
        let displayName = result.user.name || result.user.email || 'User';
        if (displayName.includes('@')) {
          displayName = displayName.split('@')[0];
        }
        setLoginUserName(displayName.split(' ')[0]);

        authContextLogin({
          email: result.user.email,
          name: result.user.name || result.user.email.split('@')[0],
          phone: hasContacts,
          role: 'passenger',
          profile_picture: result.user.profile_picture,
        });

        setLoginSuccessVisible(true);
        setTimeout(() => {
          setLoginSuccessVisible(false);
          if (!hasContacts) {
            navigate('/complete-profile');
          } else {
            navigate('/');
          }
        }, 1200);
      } else {
        throw new Error(result.message || 'Google sign-in failed.');
      }
    } catch (error: any) {
      clearTimeout(timer);
      setIsLoading(false);
      setShowWarmingUpMsg(false);
      showAlert('Google Sign-In Failed', error.message || 'Unable to sign in with Google.', 'error');
    }
  };

  useEffect(() => {
    preWarmServer();

    const initGsi = () => {
      if (window.google?.accounts?.id && googleBtnContainerRef.current) {
        try {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          googleBtnContainerRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
            theme: 'outline',
            size: 'large',
            type: 'standard',
            shape: 'pill',
            width: Math.min(340, googleBtnContainerRef.current.offsetWidth || 340),
            text: 'continue_with',
            logo_alignment: 'left',
          });
        } catch (e) {
          console.warn('GSI Init Error:', e);
        }
      }
    };

    initGsi();
    const interval = setInterval(() => {
      if (window.google?.accounts?.id) {
        initGsi();
        clearInterval(interval);
      }
    }, 300);

    return () => clearInterval(interval);
  }, []);

  const handleLogoTap = () => {
    const now = Date.now();
    if (now - lastTapTime > 1500) {
      setLogoTapCount(1);
    } else {
      const nextCount = logoTapCount + 1;
      setLogoTapCount(nextCount);
      if (nextCount === 5) {
        setLogoTapCount(0);
        setIsDevModalVisible(true);
      }
    }
    setLastTapTime(now);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      showAlert('Validation Error', 'Email and password are required.', 'warning');
      return;
    }

    setIsLoading(true);
    setShowWarmingUpMsg(false);
    const timer = setTimeout(() => {
      setShowWarmingUpMsg(true);
    }, 3500);

    try {
      const result = await authServiceLogin(email.trim(), password);
      clearTimeout(timer);
      setIsLoading(false);
      setShowWarmingUpMsg(false);

      if (result.role === 'conductor' || result.role === 'admin') {
        const targetApp = result.role === 'conductor' ? 'ByaHero Conductor app' : 'ByaHero Admin portal';
        showAlert('Access Restricted', `You must use the ${targetApp}.`, 'warning');
      } else {
        const hasContacts = result.user?.contacts || result.user?.phone || '';
        let displayName = result.user?.name || email;
        if (displayName.includes('@')) {
          displayName = displayName.split('@')[0];
        }
        setLoginUserName(displayName.split(' ')[0]);

        authContextLogin({
          email: email.trim(),
          name: result.user?.name || email.trim().split('@')[0],
          phone: result.user?.contacts || result.user?.phone || '',
          role: result.role || 'passenger',
          profile_picture: result.user?.profile_picture,
        });

        setLoginSuccessVisible(true);
        setTimeout(() => {
          setLoginSuccessVisible(false);
          if (!hasContacts) {
            navigate('/complete-profile');
          } else {
            navigate('/');
          }
        }, 1200);
      }
    } catch (error: any) {
      clearTimeout(timer);
      setIsLoading(false);
      setShowWarmingUpMsg(false);
      showAlert('Authentication Failed', error.message || 'Check network connection or configuration.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center px-6 py-10">
      <div className="w-full max-w-[400px] flex flex-col items-center">
        {/* Logo Container (5 taps open dev modal) */}
        <div
          onClick={handleLogoTap}
          className="flex flex-col items-center mb-7 cursor-pointer select-none"
          title="Tap 5 times to open Dev Settings"
        >
          <img
            src="/images/byaheroLogo.png"
            alt="ByaHero Logo"
            className="w-[105px] h-[105px] object-contain drop-shadow-sm transition-transform active:scale-95"
          />
          <img
            src="/images/ByaHero_rext_.svg"
            alt="ByaHero"
            className="w-[180px] h-[40px] mt-2 object-contain"
          />
        </div>

        {/* Card Form */}
        <div className="bg-white rounded-[28px] px-7 py-8 w-full shadow-md">
          <h2 className="text-[#1d72f8] text-sm font-extrabold tracking-wider mb-6 text-center">
            LOG IN TO YOUR ACCOUNT
          </h2>

          <form onSubmit={handleLogin} className="flex flex-col">
            {/* Email Input */}
            <div className="flex items-center bg-white rounded-full px-6 mb-4 border border-slate-100 shadow-sm focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address"
                required
                autoCapitalize="none"
                className="w-full text-slate-800 py-3 text-sm font-semibold placeholder:text-[#94a3b8] focus:outline-none bg-transparent"
              />
            </div>

            {/* Password Input */}
            <div className="flex items-center bg-white rounded-full px-6 mb-2 border border-slate-100 shadow-sm focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <input
                type={secureTextEntry ? 'password' : 'text'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                autoCapitalize="none"
                className="w-full text-slate-800 py-3 text-sm font-semibold placeholder:text-[#94a3b8] focus:outline-none bg-transparent"
              />
              <button
                type="button"
                onClick={() => setSecureTextEntry(!secureTextEntry)}
                className="text-[#94a3b8] hover:text-slate-600 focus:outline-none ml-2 cursor-pointer"
              >
                {secureTextEntry ? (
                  <EyeOff className="w-[18px] h-[18px]" />
                ) : (
                  <Eye className="w-[18px] h-[18px]" />
                )}
              </button>
            </div>

            {/* Forgot Password */}
            <div className="flex justify-end mb-6">
              <Link
                to="/forgot-password"
                className="text-[#1d72f8] text-[11px] font-bold tracking-wide hover:underline"
              >
                Forgot Password?
              </Link>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="bg-[#1d72f8] hover:bg-[#1856b0] text-white rounded-full py-3 px-12 self-center justify-center shadow-md text-sm font-bold tracking-wider transition-all disabled:opacity-75 cursor-pointer"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>LOGGING IN...</span>
                </div>
              ) : (
                'LOGIN'
              )}
            </button>

            {/* Warming Up Notice */}
            {showWarmingUpMsg && (
              <p className="text-[11px] text-amber-600 text-center font-medium mt-3 animate-pulse">
                Waking up cloud backend (free tier instance), please wait a moment...
              </p>
            )}

            {/* Divider */}
            <div className="flex items-center my-6">
              <div className="flex-1 h-[1px] bg-slate-200" />
              <span className="text-[#94a3b8] text-[11px] font-bold mx-4">OR</span>
              <div className="flex-1 h-[1px] bg-slate-200" />
            </div>

            {/* Google Sign-in */}
            <div className="w-full flex flex-col items-center justify-center">
              <div
                ref={googleBtnContainerRef}
                className="w-full flex justify-center items-center min-h-[44px]"
              />
            </div>

            {/* Sign Up Link */}
            <div className="flex justify-center items-center mt-6">
              <span className="text-slate-500 text-xs font-medium mr-1.5">
                Don't have an account?
              </span>
              <Link to="/signup" className="text-[#1d72f8] text-xs font-bold hover:underline">
                Sign up
              </Link>
            </div>
          </form>
        </div>
      </div>

      {/* Dev Settings Modal */}
      <DevSettingsModal
        visible={isDevModalVisible}
        onClose={() => setIsDevModalVisible(false)}
        onSaved={async (url) => {
          await setServerUrl(url);
          showAlert('Config Saved', `Target backend updated to ${url}`, 'success');
        }}
      />

      {/* Login Success Animated Popup */}
      {loginSuccessVisible && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/40 backdrop-blur-xs p-6 animate-fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-xs w-full flex flex-col items-center text-center shadow-2xl animate-scale-up">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4 text-emerald-500">
              <MaterialIcons name="check_circle" size={42} color="#10b981" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-1">
              Welcome back, {loginUserName}!
            </h3>
            <p className="text-xs text-slate-500 font-semibold">Logging into ByaHero...</p>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      <AlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={alertConfig.onConfirm}
      />
    </div>
  );
};
export default Login;
