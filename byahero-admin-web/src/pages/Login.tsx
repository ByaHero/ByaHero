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
        // Double check if redirect is admin or user has admin capabilities
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
    <div className="login-container">
      <div className="login-card">
        {/* Decorative Badge logo */}
        <div style={{
          display: 'inline-flex',
          padding: '12px',
          borderRadius: '50%',
          backgroundColor: 'var(--primary-light)',
          color: 'var(--primary-color)',
          marginBottom: '20px'
        }}>
          <Shield size={32} />
        </div>

        <h1 className="login-title">ByaHero Admin</h1>
        <p className="login-subtitle">Sign in to control and monitor the fleet system</p>

        {error && (
          <div style={{
            backgroundColor: 'var(--error-light)',
            color: 'var(--error)',
            padding: '12px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.8rem',
            fontWeight: 600,
            marginBottom: '20px',
            textAlign: 'left',
            border: '1px solid rgba(239, 68, 68, 0.15)'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          <div className="form-group">
            <label className="form-label">Admin Email Address</label>
            <input
              type="email"
              className="form-input"
              placeholder="admin@byahero.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group" style={{ position: 'relative' }}>
            <label className="form-label">Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '12px',
                bottom: '10px',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '16px', height: '42px' }}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" style={{ marginRight: '6px' }} />
                Authenticating...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
