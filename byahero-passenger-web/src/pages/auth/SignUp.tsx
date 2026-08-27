import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { signupRequestOtp, signupVerifyOtp } from '../../services/authService';
import AlertModal from '../../components/AlertModal';

export const SignUp: React.FC = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2>(1);
  const [isLoading, setIsLoading] = useState(false);

  // Step 1 Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [contacts, setContacts] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Step 2 OTP Fields
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState('');

  // AlertModal
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
        setAlertConfig(p => ({ ...p, visible: false }));
        if (onConfirm) onConfirm();
      },
    });
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      showAlert('Validation Error', 'Email address is required.', 'warning');
      return;
    }

    const contactVal = contacts.trim();
    if (!/^(09|639|\+639)\d{9}$/.test(contactVal) && contactVal.length < 10) {
      showAlert('Validation Error', 'Please enter a valid Philippine mobile number (e.g., 09123456789).', 'warning');
      return;
    }

    if (password.length < 6) {
      showAlert('Validation Error', 'Password must be at least 6 characters.', 'warning');
      return;
    }

    if (password !== confirmPassword) {
      showAlert('Validation Error', 'Passwords do not match.', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      const response = await signupRequestOtp(name, email, contacts, password, confirmPassword);
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
      showAlert('Registration Request Failed', error.message || 'Server error. Please try again.', 'error');
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (otp.trim().length !== 6) {
      showAlert('Validation Error', 'Please enter the 6-digit OTP code.', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      const response = await signupVerifyOtp(email, otp);
      setIsLoading(false);
      if (response.success) {
        showAlert('Success', 'Verification complete! You can now log in.', 'success', () => {
          navigate('/complete-profile');
        });
      }
    } catch (error: any) {
      setIsLoading(false);
      showAlert('Verification Failed', error.message || 'Invalid code.', 'error');
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
          {step === 1 ? (
            // STEP 1: Registration Form
            <form onSubmit={handleSignUpSubmit} className="flex flex-col">
              <h2 className="text-[#1d72f8] text-sm font-extrabold tracking-wider mb-6 text-center">
                CREATE NEW ACCOUNT
              </h2>

              {/* Name Input */}
              <div className="flex items-center bg-white rounded-full px-6 mb-4 border border-slate-100 shadow-sm">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full Name (optional)"
                  className="w-full text-slate-800 py-3 text-sm font-semibold placeholder:text-[#94a3b8] focus:outline-none bg-transparent"
                />
              </div>

              {/* Email Input */}
              <div className="flex items-center bg-white rounded-full px-6 mb-4 border border-slate-100 shadow-sm">
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

              {/* Contacts Input */}
              <div className="flex items-center bg-white rounded-full px-6 mb-4 border border-slate-100 shadow-sm">
                <input
                  type="tel"
                  value={contacts}
                  onChange={(e) => setContacts(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="Contact Number (e.g. 09123456789)"
                  maxLength={11}
                  required
                  className="w-full text-slate-800 py-3 text-sm font-semibold placeholder:text-[#94a3b8] focus:outline-none bg-transparent font-mono"
                />
              </div>

              {/* Password Input */}
              <div className="flex items-center bg-white rounded-full px-6 mb-4 border border-slate-100 shadow-sm">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
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

              {/* Register Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="bg-[#1d72f8] hover:bg-[#1856b0] text-white rounded-full py-3 px-12 self-center justify-center shadow-md text-sm font-bold tracking-wider transition-all disabled:opacity-75"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>SIGNING UP...</span>
                  </div>
                ) : (
                  'SIGN UP'
                )}
              </button>
            </form>
          ) : (
            // STEP 2: OTP Verification
            <form onSubmit={handleOtpVerify} className="flex flex-col">
              <h2 className="text-[#1d72f8] text-sm font-extrabold tracking-wider mb-2 text-center">
                VERIFY EMAIL
              </h2>
              <p className="text-slate-500 text-xs text-center mb-4">
                We sent a 6-digit code to <strong className="text-[#1d72f8]">{email}</strong>
              </p>

              {devOtp !== '' && (
                <div className="bg-slate-100 border border-slate-200 rounded-2xl p-3 mb-4 text-center">
                  <span className="text-slate-400 text-[10px] font-bold block uppercase">Dev Mode Intercept</span>
                  <span className="text-[#1d72f8] text-lg font-extrabold font-mono tracking-widest block mt-0.5">{devOtp}</span>
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

              {/* Verify Submit Button */}
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
                  'VERIFY'
                )}
              </button>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="self-center py-2 text-slate-500 text-[13px] font-semibold underline mt-2"
              >
                Change email
              </button>
            </form>
          )}

          {/* Back to Login link */}
          <div className="flex justify-center items-center mt-6">
            <span className="text-slate-500 text-[13px] font-medium">
              Already have an account?{' '}
            </span>
            <Link to="/login" className="text-[#1d72f8] text-[13px] font-bold ml-1 hover:underline">
              Login
            </Link>
          </div>
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
export default SignUp;
