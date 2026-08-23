import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { forgotRequestOtp, forgotVerifyOtp, forgotResetPassword } from '../services/authService';
import AlertModal from '../components/AlertModal';

export const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [timeLeft, setTimeLeft] = useState(900); // 15 mins
  const timerIntervalRef = useRef<any>(null);

  // AlertModal State
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

  useEffect(() => {
    if (step === 2) {
      setTimeLeft(900);
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (timerIntervalRef.current !== null) {
              clearInterval(timerIntervalRef.current);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [step]);

  const formatTime = (seconds: number) => {
    if (seconds <= 0) return 'Expired';
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      showAlert('Validation Error', 'Please enter your email address.', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      const response = await forgotRequestOtp(email.trim());
      setIsLoading(false);
      if (response.success) {
        if (response.devOtp) {
          setDevOtp(response.devOtp);
        } else {
          setDevOtp('');
        }
        setStep(2);
      }
    } catch (error: any) {
      setIsLoading(false);
      showAlert('Request Failed', error.message || 'Error occurred. Try again.', 'error');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.trim().length !== 6) {
      showAlert('Validation Error', 'Please enter the 6-digit OTP code.', 'warning');
      return;
    }
    if (timeLeft <= 0) {
      showAlert('Code Expired', 'The recovery code has expired. Please request a new one.', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      const response = await forgotVerifyOtp(email.trim(), otp.trim());
      setIsLoading(false);
      if (response.success) {
        setStep(3);
      }
    } catch (error: any) {
      setIsLoading(false);
      showAlert('Verification Failed', error.message || 'Invalid code.', 'error');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showAlert('Validation Error', 'Password must be at least 6 characters.', 'warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlert('Validation Error', 'Passwords do not match.', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      const response = await forgotResetPassword(email.trim(), otp.trim(), newPassword);
      setIsLoading(false);
      if (response.success) {
        setStep(4);
      }
    } catch (error: any) {
      setIsLoading(false);
      showAlert('Reset Failed', error.message || 'Error occurred. Try again.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center px-6 py-10">
      <div className="w-full max-w-[400px] flex flex-col items-center">
        {/* Logo Header */}
        <div className="flex flex-col items-center mb-7">
          <img
            src="/images/byaheroLogo.png"
            alt="ByaHero Logo"
            className="w-[105px] h-[105px] object-contain drop-shadow-sm"
          />
          <img
            src="/images/ByaHero_rext_.svg"
            alt="ByaHero"
            className="w-[180px] h-[40px] mt-2 object-contain"
          />
        </div>

        {/* Card Form */}
        <div className="bg-white rounded-[28px] px-7 py-8 w-full shadow-md">
          {step === 1 && (
            // STEP 1: Enter Email
            <form onSubmit={handleRequestOtp} className="flex flex-col">
              <h2 className="text-[#1d72f8] text-sm font-extrabold tracking-wider mb-2 text-center">
                PASSWORD RECOVERY
              </h2>
              <p className="text-slate-500 text-xs text-center mb-6 px-2">
                Enter your email address to receive a 6-digit confirmation code.
              </p>

              <div className="flex items-center bg-white rounded-full px-6 mb-6 border border-slate-100 shadow-sm">
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

              <button
                type="submit"
                disabled={isLoading}
                className="bg-[#1d72f8] hover:bg-[#1856b0] text-white rounded-full py-3 px-12 self-center justify-center shadow-md text-sm font-bold tracking-wider transition-all disabled:opacity-75"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>SENDING CODE...</span>
                  </div>
                ) : (
                  'SEND RECOVERY CODE'
                )}
              </button>
            </form>
          )}

          {step === 2 && (
            // STEP 2: Enter OTP
            <form onSubmit={handleVerifyOtp} className="flex flex-col">
              <h2 className="text-[#1d72f8] text-sm font-extrabold tracking-wider mb-2 text-center">
                ENTER CODE
              </h2>
              <p className="text-slate-500 text-xs text-center mb-4">
                We sent a 6-digit code to <strong className="text-[#1d72f8]">{email}</strong>
              </p>

              {devOtp !== '' && (
                <div className="bg-slate-100 border border-slate-200 rounded-2xl p-3 mb-4 text-center">
                  <span className="text-slate-400 text-[10px] font-bold block uppercase">Dev Mode Intercept</span>
                  <span className="text-slate-400 text-[9px] block mb-1">Email transmission bypassed.</span>
                  <span className="text-[#1d72f8] text-lg font-extrabold font-mono tracking-widest block">{devOtp}</span>
                  <button
                    type="button"
                    onClick={() => setOtp(devOtp)}
                    className="text-[11px] text-blue-600 underline font-semibold mt-1"
                  >
                    Click to auto-fill
                  </button>
                </div>
              )}

              {/* OTP Input */}
              <div className="flex items-center bg-white rounded-2xl px-4 py-2 mb-4 border border-slate-200 shadow-sm justify-center">
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                  placeholder="------"
                  maxLength={6}
                  required
                  className="text-slate-800 py-2 text-xl font-bold tracking-widest text-center font-mono focus:outline-none bg-transparent w-full"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="bg-[#1d72f8] hover:bg-[#1856b0] text-white rounded-full py-3 px-12 self-center justify-center shadow-md text-sm font-bold tracking-wider transition-all disabled:opacity-75"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>VERIFYING...</span>
                  </div>
                ) : (
                  'VERIFY CODE'
                )}
              </button>

              <span className="text-slate-500 text-center text-xs mt-3">
                Code expires in <strong className="text-red-500">{formatTime(timeLeft)}</strong>
              </span>
            </form>
          )}

          {step === 3 && (
            // STEP 3: Enter New Password
            <form onSubmit={handleResetPassword} className="flex flex-col">
              <h2 className="text-[#1d72f8] text-sm font-extrabold tracking-wider mb-2 text-center">
                CREATE NEW PASSWORD
              </h2>
              <p className="text-slate-500 text-xs text-center mb-6 px-2">
                Your identity has been verified. Please enter your new password below.
              </p>

              {/* New Password Input */}
              <div className="flex items-center bg-white rounded-full px-6 mb-4 border border-slate-100 shadow-sm">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New Password"
                  required
                  minLength={6}
                  autoCapitalize="none"
                  className="w-full text-slate-800 py-3 text-sm font-semibold placeholder:text-[#94a3b8] focus:outline-none bg-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[#94a3b8] hover:text-slate-600 focus:outline-none ml-2"
                >
                  {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                </button>
              </div>

              {/* Confirm Password Input */}
              <div className="flex items-center bg-white rounded-full px-6 mb-6 border border-slate-100 shadow-sm">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm Password"
                  required
                  minLength={6}
                  autoCapitalize="none"
                  className="w-full text-slate-800 py-3 text-sm font-semibold placeholder:text-[#94a3b8] focus:outline-none bg-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="text-[#94a3b8] hover:text-slate-600 focus:outline-none ml-2"
                >
                  {showConfirmPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="bg-[#1d72f8] hover:bg-[#1856b0] text-white rounded-full py-3 px-12 self-center justify-center shadow-md text-sm font-bold tracking-wider transition-all disabled:opacity-75"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>UPDATING...</span>
                  </div>
                ) : (
                  'RESET PASSWORD'
                )}
              </button>
            </form>
          )}

          {step === 4 && (
            // STEP 4: Success
            <div className="flex flex-col items-center py-4 text-center">
              <span className="text-emerald-500 text-5xl font-bold mb-4">✓</span>
              <h3 className="text-[#1d72f8] text-sm font-extrabold tracking-wider mb-2">Password Reset Complete</h3>
              <p className="text-slate-500 text-xs mb-6 px-4">
                Your account is now secure. You can log in using your new password.
              </p>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="bg-[#1d72f8] hover:bg-[#1856b0] text-white rounded-full py-3.5 w-full items-center justify-center shadow-sm text-sm font-bold tracking-wider"
              >
                GO TO LOGIN
              </button>
            </div>
          )}

          {/* Back to Login link */}
          {step !== 4 && (
            <Link
              to="/login"
              className="flex items-center justify-center py-2 mt-4 gap-1.5 text-slate-500 text-[13px] font-bold hover:text-slate-700"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Login</span>
            </Link>
          )}
        </div>
      </div>

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
export default ForgotPassword;
