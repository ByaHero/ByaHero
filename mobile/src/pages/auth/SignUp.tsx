import React, { useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { IonPage, IonContent, useIonToast } from '@ionic/react';
import { ApiService } from '../../api/client';
import './SignUp.css';

const SignUp: React.FC = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Step 1 Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [contacts, setContacts] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Step 2 Form state
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState('');

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const history = useHistory();
  const [present] = useIonToast();

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    if (!/^(09|639)\d{9}$/.test(contacts)) {
      setErrorMsg('Please enter a valid Philippine mobile number (e.g., 09123456789).');
      return;
    }

    setLoading(true);
    try {
      const res = await ApiService.signUpRequestOtp({ name, email, contacts, password, confirm_password: confirmPassword });
      if (res.success) {
        if (res.dev_otp) {
          setDevOtp(res.dev_otp);
        }
        setStep(2);
      } else {
        setErrorMsg(res.message || 'Signup failed');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during signup request.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await ApiService.signUpVerifyOtp(email, otp);
      if (res.success) {
        present({
          message: 'Account created successfully!',
          duration: 2000,
          color: 'success'
        });
        // We simulate a login state and redirect to map
        setTimeout(() => {
          history.push('/login');
        }, 1000);
      } else {
        setErrorMsg(res.message || 'Verification failed');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during OTP verification.');
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

                <main className="form-card">
                    {/* STEP 1 */}
                    {step === 1 && (
                      <div className="signup-step">
                          <h2 className="form-heading">CREATE NEW ACCOUNT</h2>
                          
                          {errorMsg && (
                              <div className="alert alert-danger alert-small">{errorMsg}</div>
                          )}

                          <form onSubmit={handleRequestOtp} autoComplete="off">
                              <div className="mb-3">
                                  <input type="text" name="name" className="form-control input-pill" placeholder="Full Name (optional)" 
                                    value={name} onChange={e => setName(e.target.value)} />
                              </div>
                              
                              <div className="mb-3">
                                  <input type="email" name="email" className="form-control input-pill" placeholder="Email" required 
                                    value={email} onChange={e => setEmail(e.target.value)} />
                              </div>
                              
                              <div className="mb-3">
                                  <input type="tel" name="contacts" className="form-control input-pill" placeholder="Contact Number (e.g. 09123456789)" required 
                                      inputMode="numeric" autoComplete="tel" maxLength={11} pattern="09[0-9]{9}"
                                      value={contacts} onChange={e => setContacts(e.target.value.replace(/[^0-9]/g, ''))} />
                              </div>
                              
                              <div className="mb-3 password-wrapper">
                                  <input type={showPassword ? "text" : "password"} name="password" className="form-control input-pill pe-5" placeholder="Password" required minLength={6} autoComplete="new-password"
                                    value={password} onChange={e => setPassword(e.target.value)} />
                                  <button type="button" className="input-addon" onClick={() => setShowPassword(!showPassword)}>
                                      <span className="material-icons-round" style={{fontSize: '18px'}}>{showPassword ? 'visibility' : 'visibility_off'}</span>
                                  </button>
                              </div>
                              
                              <div className="mb-2 password-wrapper">
                                  <input type={showConfirm ? "text" : "password"} name="confirm_password" className="form-control input-pill pe-5" placeholder="Confirm Password" required minLength={6} autoComplete="new-password"
                                    value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                                  <button type="button" className="input-addon" onClick={() => setShowConfirm(!showConfirm)}>
                                      <span className="material-icons-round" style={{fontSize: '18px'}}>{showConfirm ? 'visibility' : 'visibility_off'}</span>
                                  </button>
                              </div>
                              
                              <button type="submit" className="submit-pill" disabled={loading}>
                                {loading ? <span className="spinner-border spinner-border-sm"></span> : 'Sign Up'}
                              </button>
                          </form>

                          <div className="mt-4 mb-2">
                              <div className="d-flex align-items-center mb-3">
                                  <hr className="flex-grow-1" />
                                  <span className="mx-2 text-muted small">OR</span>
                                  <hr className="flex-grow-1" />
                              </div>
                              {/* Google Auth Placeholder */}
                              <div style={{ display: 'flex', justifyContent: 'center' }}>
                                  <button type="button" style={{
                                    background: '#fff', border: '1px solid #dadce0', borderRadius: '999px', padding: '10px 24px', 
                                    fontWeight: 500, color: '#3c4043', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
                                  }}>
                                      <svg width="18" height="18" viewBox="0 0 48 48">
                                          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.7 17.74 9.5 24 9.5z"/>
                                          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                                          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                                          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                                      </svg>
                                      Continue with Google
                                  </button>
                              </div>
                          </div>

                          <div className="small-muted">
                              Already have an account?{' '}
                              <Link to="/login" className="fw-bold text-primary text-decoration-none">Login</Link>
                          </div>
                      </div>
                    )}

                    {/* STEP 2 */}
                    {step === 2 && (
                      <div className="signup-step">
                          <h2 className="form-heading">VERIFY EMAIL</h2>
                          <div className="small-muted mb-3">We sent a 6-digit code to <strong>{email}</strong></div>
                          
                          {errorMsg && (
                              <div className="alert alert-danger alert-small">{errorMsg}</div>
                          )}

                          {devOtp && (
                              <div className="alert alert-info alert-small">
                                  <strong>Dev Mode:</strong> Your code is <span className="fw-bold">{devOtp}</span>
                              </div>
                          )}

                          <form onSubmit={handleVerifyOtp}>
                              <div className="mb-3">
                                  <input type="text" name="otp" className="form-control input-pill text-center fw-bold fs-4" placeholder="000000" maxLength={6} pattern="[0-9]{6}" required 
                                    value={otp} onChange={e => setOtp(e.target.value)} />
                              </div>
                              <button type="submit" className="submit-pill" disabled={loading}>
                                {loading ? <span className="spinner-border spinner-border-sm"></span> : 'Verify'}
                              </button>
                              <button type="button" className="btn btn-link w-100 mt-2 text-decoration-none text-muted small" onClick={() => setStep(1)}>Change email</button>
                          </form>
                      </div>
                    )}
                </main>
            </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default SignUp;
