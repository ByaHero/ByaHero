import React, { useState, useEffect } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { IonPage, IonContent, useIonToast } from '@ionic/react';
import { ApiService } from '../../api/client';
import './Login.css'; // Reuse form card layout
import './ForgotPassword.css'; // Add forgot password specific styles

const ForgotPassword: React.FC = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [devOtp, setDevOtp] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes in seconds

  const history = useHistory();
  const [present] = useIonToast();

  // Timer logic for step 2
  useEffect(() => {
    if (step !== 2) return;
    
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [step]);

  const formatTime = (seconds: number) => {
    if (seconds <= 0) return 'Expired';
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setErrorMsg('');
    setLoading(true);

    try {
      const res = await ApiService.recoverRequestOtp(email);
      if (res.success) {
        if (res.dev_otp) {
          setDevOtp(res.dev_otp);
        } else {
          setDevOtp('');
        }
        setTimeLeft(900); // Reset timer to 15 mins
        setStep(2);
      } else {
        setErrorMsg(res.message || 'Failed to request OTP. Make sure the email is registered.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;

    setErrorMsg('');
    setLoading(true);

    try {
      const res = await ApiService.recoverVerifyOtp(email, otp);
      if (res.success) {
        setStep(3);
      } else {
        setErrorMsg(res.message || 'Invalid or expired OTP.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) return;

    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      const res = await ApiService.recoverResetPassword(email, otp, newPassword);
      if (res.success) {
        setStep(4);
        present({
          message: 'Password reset successfully!',
          duration: 3000,
          color: 'success'
        });
      } else {
        setErrorMsg(res.message || 'Failed to reset password.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <IonPage>
      <IonContent fullscreen>
        <div className="login-outer">
            <div className="login-card">
                <header className="brand-wrap">
                    <img src="/assets/images/byaheroLogo.png" alt="ByaHero Logo" className="brand-logo" />
                    <h1 className="brand-title">BYAHERO</h1>
                </header>

                <main className="form-card text-center">
                    {/* STEP 1: Request OTP */}
                    {step === 1 && (
                      <div className="step-fade">
                          <h2 className="form-heading">Password Recovery</h2>
                          <p className="form-subheading">Enter your email address to receive a 6-digit confirmation code.</p>
                          
                          {errorMsg && (
                              <div className="alert alert-danger alert-small">{errorMsg}</div>
                          )}

                          <form onSubmit={handleRequestOtp}>
                              <div className="mb-3">
                                  <input 
                                    type="email" 
                                    placeholder="Email Address" 
                                    className="form-control input-pill" 
                                    required 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                  />
                              </div>
                              <button type="submit" className="submit-pill w-100" disabled={loading}>
                                {loading ? <span className="spinner-border spinner-border-sm"></span> : 'Send Recovery Code'}
                              </button>
                          </form>
                          <Link to="/login" className="back-link">
                              <span className="material-icons-round" style={{ fontSize: '18px', verticalAlign: 'middle', marginRight: '4px' }}>arrow_back</span> 
                              Back to Login
                          </Link>
                      </div>
                    )}

                    {/* STEP 2: Verify OTP */}
                    {step === 2 && (
                      <div className="step-fade">
                          <h2 className="form-heading">Enter Code</h2>
                          <p className="form-subheading">We sent a 6-digit code to <strong>{email}</strong></p>
                          
                          {errorMsg && (
                              <div className="alert alert-danger alert-small">{errorMsg}</div>
                          )}
                          
                          {devOtp && (
                              <div className="dev-alert text-start">
                                  <strong>[Dev Mode Intercept]</strong><br />
                                  Your reset code is: <strong className="fs-5" style={{ letterSpacing: '2px' }}>{devOtp}</strong>
                              </div>
                          )}

                          <form onSubmit={handleVerifyOtp}>
                              <div className="mb-3">
                                  <input 
                                    type="text" 
                                    placeholder="6-Digit Code" 
                                    className="form-control input-pill text-center fs-4 fw-bold" 
                                    maxLength={6} 
                                    style={{ letterSpacing: '5px' }} 
                                    required 
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                  />
                              </div>
                              <button type="submit" className="submit-pill w-100" disabled={loading || timeLeft <= 0}>
                                {loading ? <span className="spinner-border spinner-border-sm"></span> : 'Verify Code'}
                              </button>
                          </form>
                          <div className="text-center mt-3 small text-muted">
                              Code expires in <span className="timer-text">{formatTime(timeLeft)}</span>
                          </div>
                          <button type="button" className="btn btn-link w-100 mt-2 text-decoration-none text-muted small" onClick={() => setStep(1)}>Change email</button>
                      </div>
                    )}

                    {/* STEP 3: Reset Password */}
                    {step === 3 && (
                      <div className="step-fade">
                          <h2 className="form-heading">Create New Password</h2>
                          <p className="form-subheading">Your identity has been verified. Please enter your new password below.</p>
                          
                          {errorMsg && (
                              <div className="alert alert-danger alert-small">{errorMsg}</div>
                          )}

                          <form onSubmit={handleResetPassword}>
                              <div className="mb-3">
                                  <input 
                                    type="password" 
                                    placeholder="New Password" 
                                    className="form-control input-pill" 
                                    required 
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                  />
                              </div>
                              <div className="mb-3">
                                  <input 
                                    type="password" 
                                    placeholder="Confirm Password" 
                                    className="form-control input-pill" 
                                    required 
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                  />
                              </div>
                              <button type="submit" className="submit-pill w-100" disabled={loading}>
                                {loading ? <span className="spinner-border spinner-border-sm"></span> : 'Reset Password'}
                              </button>
                          </form>
                      </div>
                    )}

                    {/* STEP 4: Success Message */}
                    {step === 4 && (
                      <div className="step-fade">
                          <div className="text-center mb-3">
                              <span className="material-icons-round text-success" style={{ fontSize: '80px' }}>check_circle</span>
                          </div>
                          <h2 className="form-heading">Password Reset Complete</h2>
                          <p className="form-subheading">Your account is now secure. You can log in using your new password.</p>
                          
                          <button type="button" className="submit-pill w-100" onClick={() => history.push('/login')}>
                            Go to Login
                          </button>
                      </div>
                    )}
                </main>
            </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ForgotPassword;
