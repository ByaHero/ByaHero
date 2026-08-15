import React from 'react';
import { CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react';

interface AlertModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning' | 'confirm';
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export default function AlertModal({
  isOpen,
  title,
  message,
  type = 'error',
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
  onCancel
}: AlertModalProps) {
  if (!isOpen) return null;

  let Icon = XCircle;
  let iconColor = '#ef4444';
  let iconBg = '#fef2f2';

  if (type === 'success') {
    Icon = CheckCircle;
    iconColor = '#10b981';
    iconBg = '#ecfdf5';
  } else if (type === 'info') {
    Icon = Info;
    iconColor = '#3b82f6';
    iconBg = '#eff6ff';
  } else if (type === 'warning' || type === 'confirm') {
    Icon = AlertTriangle;
    iconColor = '#f59e0b';
    iconBg = '#fffbeb';
  }

  const isConfirm = type === 'confirm';

  return (
    <div className="modal-overlay" onClick={isConfirm ? onCancel : onConfirm} style={{ zIndex: 1000 }}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          maxWidth: '360px', 
          textAlign: 'center', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          padding: '28px'
        }}
      >
        {/* Styled Icon Wrapper */}
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: iconBg,
          color: iconColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px'
        }}>
          <Icon size={38} />
        </div>

        {/* Title */}
        <h2 style={{
          fontSize: '1.2rem',
          fontWeight: 800,
          color: 'var(--text-main)',
          marginBottom: '8px',
          border: 'none',
          padding: 0
        }}>
          {title}
        </h2>

        {/* Message */}
        <p style={{
          fontSize: '0.875rem',
          color: 'var(--text-muted)',
          marginBottom: '24px',
          lineHeight: '1.4'
        }}>
          {message}
        </p>

        {/* Action Buttons */}
        {isConfirm ? (
          <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
            <button 
              type="button"
              className="btn btn-secondary" 
              onClick={onCancel}
              style={{ flex: 1, padding: '12px' }}
            >
              {cancelText}
            </button>
            <button 
              type="button"
              className="btn btn-primary" 
              onClick={onConfirm}
              style={{ flex: 1, padding: '12px', backgroundColor: 'var(--primary-color)', color: 'white' }}
            >
              {confirmText}
            </button>
          </div>
        ) : (
          <button 
            type="button"
            className="btn" 
            onClick={onConfirm}
            style={{ 
              width: '100%', 
              padding: '12px', 
              backgroundColor: type === 'success' ? '#10b981' : (type === 'error' ? '#ef4444' : 'var(--primary-color)'), 
              color: 'white',
              border: 'none'
            }}
          >
            {confirmText}
          </button>
        )}
      </div>
    </div>
  );
}
