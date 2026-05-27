import React, { useState } from 'react';
import { useHistory, Link } from 'react-router-dom';
import { IonPage, IonContent, useIonToast } from '@ionic/react';
import { ApiService, ByaHeroUser } from '../../api/client';
import './Login.css';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const history = useHistory();
  const [present] = useIonToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Email and password are required.');
      return;
    }
    
    setLoading(true);
    setErrorMsg('');

    try {
      const response = await ApiService.login(email, password);
      if (response.success) {
        // Mock save user session. 
        // Real implementation should get full user details from the backend.
        const mockUser: ByaHeroUser = {
          id: 1,
          email: email,
          role: email.includes('conductor') ? 'conductor' : (email.includes('admin') ? 'admin' : 'passenger'),
          name: email.split('@')[0],
          contacts: ''
        };
        localStorage.setItem('byahero_user', JSON.stringify(mockUser));
        
        // Dispatch storage event to notify App.tsx to redirect
        window.dispatchEvent(new Event('storage'));
      } else {
        setErrorMsg(response.message || 'Invalid email or password.');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'An error occurred during login.');
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
                    <h2 className="form-heading">LOG IN TO YOUR ACCOUNT</h2>

                    {errorMsg && (
                        <div className="alert alert-danger alert-small">{errorMsg}</div>
                    )}

                    <form onSubmit={handleLogin} noValidate>
                        <div className="mb-3">
                            <input 
                              name="email" 
                              type="email" 
                              inputMode="email" 
                              autoComplete="username" 
                              placeholder="Email"
                              className="form-control input-pill" 
                              required
                              value={email}
                              onChange={e => setEmail(e.target.value)} 
                            />
                        </div>

                        <div className="mb-2 input-group-pill">
                            <input 
                              id="password" 
                              name="password" 
                              type={showPassword ? "text" : "password"} 
                              autoComplete="current-password"
                              placeholder="Password" 
                              className="form-control input-pill" 
                              required 
                              value={password}
                              onChange={e => setPassword(e.target.value)}
                            />
                            <button 
                              type="button" 
                              className="input-addon" 
                              aria-pressed={showPassword}
                              onClick={() => setShowPassword(!showPassword)}
                              title={showPassword ? "Hide password" : "Show password"}
                            >
                                <span className="material-icons-round" style={{ fontSize: '18px', lineHeight: 1 }}>
                                  {showPassword ? 'visibility' : 'visibility_off'}
                                </span>
                            </button>
                        </div>

                        <div className="d-flex justify-content-start">
                            <Link className="forgot" to="/forgot-password" tabIndex={-1}>Forgot Password?</Link>
                        </div>

                        <button type="submit" className="submit-pill" disabled={loading}>
                          {loading ? <span className="spinner-border spinner-border-sm"></span> : 'Login'}
                        </button>
                    </form>

                    <div className="mt-4 mb-2">
                        <div className="d-flex align-items-center mb-3">
                            <hr className="flex-grow-1" />
                            <span className="mx-2 text-muted small">OR</span>
                            <hr className="flex-grow-1" />
                        </div>
                        {/* Google Auth Container Placeholder */}
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <button type="button" style={{
                              background: '#fff', border: '1px solid #dadce0', borderRadius: '999px', padding: '10px 24px', 
                              fontWeight: 500, color: '#3c4043', display: 'flex', alignItems: 'center', gap: '12px', 
                              cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
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
                        Don't have an account?{' '}
                        <Link to="/signup" className="fw-bold text-primary text-decoration-none">Sign up</Link>
                    </div>
                </main>
            </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Login;
