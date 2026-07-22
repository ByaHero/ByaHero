import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, Loader2, CheckCircle, XCircle, X } from 'lucide-react';
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

  // Custom modal states
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'success' | 'error'>('success');
  const [modalMessage, setModalMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setModalType('error');
      setModalMessage('Please fill in all fields.');
      setShowModal(true);
      return;
    }

    setLoading(true);

    try {
      const data = await adminService.login(email.trim(), password);
      
      if (data.success) {
        // Double check if redirect is admin or user has admin capabilities
        const redirect = data.redirect || '';
        const user = data.user || {};
        
        if (redirect.includes('admin') || user.role === 'admin') {
          let adminName = user.name || user.username || email.trim();
          if (adminName.includes('@')) {
            adminName = adminName.split('@')[0];
          }
          // Capitalize first letter
          adminName = adminName.charAt(0).toUpperCase() + adminName.slice(1);

          localStorage.setItem('byahero_admin_user', JSON.stringify({ email: email.trim(), name: adminName }));
          
          setModalType('success');
          setModalMessage(`Hello, welcome back ${adminName}!`);
          setShowModal(true);
          
          setTimeout(() => {
            onLoginSuccess(email.trim());
            navigate('/');
          }, 2000);
        } else {
          setModalType('error');
          setModalMessage('Access Denied. Only administrators are allowed to login.');
          setShowModal(true);
          await adminService.logout();
        }
      } else {
        setModalType('error');
        setModalMessage(data.message || 'Invalid email or password.');
        setShowModal(true);
      }
    } catch (e: any) {
      console.error(e);
      setModalType('error');
      setModalMessage('Connection failure. Please verify backend state.');
      setShowModal(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleUp {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>

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
        <p className="login-subtitle">Sign in to control and monitor the bus system</p>

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

      {/* Premium Notification Popup Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            backgroundColor: 'var(--surface)',
            borderRadius: 'var(--radius-lg)',
            padding: '30px 24px',
            width: '90%',
            maxWidth: '380px',
            boxShadow: 'var(--shadow-lg)',
            textAlign: 'center',
            border: `1px solid ${modalType === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
            position: 'relative',
            animation: 'scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            {/* Close button for errors only */}
            {modalType === 'error' && (
              <button 
                onClick={() => setShowModal(false)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={18} />
              </button>
            )}

            {/* Icon */}
            <div style={{
              display: 'inline-flex',
              padding: '16px',
              borderRadius: '50%',
              backgroundColor: modalType === 'success' ? 'var(--success-light)' : 'var(--error-light)',
              color: modalType === 'success' ? 'var(--success)' : 'var(--error)',
              marginBottom: '20px'
            }}>
              {modalType === 'success' ? <CheckCircle size={36} /> : <XCircle size={36} />}
            </div>

            {/* Title */}
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: 'var(--text-main)',
              marginBottom: '10px'
            }}>
              {modalType === 'success' ? 'Access Granted' : 'Login Failed'}
            </h3>

            {/* Message */}
            <p style={{
              fontSize: '0.9rem',
              color: 'var(--text-muted)',
              marginBottom: modalType === 'error' ? '24px' : '0px',
              lineHeight: 1.5
            }}>
              {modalMessage}
            </p>

            {/* Button (Errors Only) */}
            {modalType === 'error' && (
              <button
                onClick={() => setShowModal(false)}
                style={{
                  backgroundColor: 'var(--error)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 24px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  width: '100%',
                  transition: 'background-color 0.2s',
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--error)'}
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
