import React, { useEffect, useState } from 'react';
import { 
  Save, 
  User, 
  Loader2, 
  Key, 
  Lock, 
  Eye, 
  EyeOff, 
  Mail, 
  Phone, 
  CheckCircle, 
  XCircle, 
  X,
  Edit2
} from 'lucide-react';
import { adminService } from '../services/admin';

interface ProfileProps {
  adminEmail: string;
}

export default function Profile({ adminEmail }: ProfileProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState(adminEmail);
  const [contacts, setContacts] = useState('');
  
  // Modals state
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // Form input states
  const [newName, setNewName] = useState('');
  const [newContacts, setNewContacts] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Eye toggles for password
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  // Custom feedback/notification modal state
  const [feedbackModal, setFeedbackModal] = useState<{
    visible: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
  }>({
    visible: false,
    type: 'success',
    title: '',
    message: ''
  });

  const showFeedback = (type: 'success' | 'error', title: string, message: string) => {
    setFeedbackModal({ visible: true, type, title, message });
  };

  useEffect(() => {
    // Attempt to load current local details
    const userStr = localStorage.getItem('byahero_admin_user');
    if (userStr) {
      const parsed = JSON.parse(userStr);
      const initialName = parsed.name || email.split('@')[0];
      const initialContacts = parsed.contacts || '';
      setName(initialName);
      setNewName(initialName);
      setContacts(initialContacts);
      setNewContacts(initialContacts);
    }
  }, [email]);

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      showFeedback('error', 'Validation Error', 'Name cannot be empty.');
      return;
    }

    setIsLoading(true);
    try {
      const data = await adminService.updateProfile({
        action: 'update_info',
        name: newName.trim(),
        contacts
      });

      if (data.success) {
        setName(newName.trim());
        const userStr = localStorage.getItem('byahero_admin_user');
        if (userStr) {
          const parsed = JSON.parse(userStr);
          localStorage.setItem('byahero_admin_user', JSON.stringify({ ...parsed, name: newName.trim() }));
        }
        setIsNameModalOpen(false);
        showFeedback('success', 'Name Updated', 'Your full name has been updated successfully.');
      } else {
        showFeedback('error', 'Update Failed', data.error || 'Failed to update name.');
      }
    } catch (e) {
      showFeedback('error', 'Network Error', 'Failed to connect to the server.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const data = await adminService.updateProfile({
        action: 'update_info',
        name,
        contacts: newContacts.trim()
      });

      if (data.success) {
        setContacts(newContacts.trim());
        const userStr = localStorage.getItem('byahero_admin_user');
        if (userStr) {
          const parsed = JSON.parse(userStr);
          localStorage.setItem('byahero_admin_user', JSON.stringify({ ...parsed, contacts: newContacts.trim() }));
        }
        setIsContactModalOpen(false);
        showFeedback('success', 'Contact Updated', 'Your contact number has been updated successfully.');
      } else {
        showFeedback('error', 'Update Failed', data.error || 'Failed to update contact number.');
      }
    } catch (e) {
      showFeedback('error', 'Network Error', 'Failed to connect to the server.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      showFeedback('error', 'Validation Error', 'All password fields are required.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showFeedback('error', 'Validation Error', 'New passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      showFeedback('error', 'Validation Error', 'Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    try {
      const data = await adminService.updateProfile({
        action: 'update_password',
        name,
        email,
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword
      });

      if (data.success) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setIsPasswordModalOpen(false);
        showFeedback('success', 'Password Changed', 'Your password has been changed successfully.');
      } else {
        showFeedback('error', 'Change Failed', data.error || 'Failed to change password.');
      }
    } catch (e) {
      showFeedback('error', 'Network Error', 'Failed to connect to the server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleUp {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .profile-container-card {
          background-color: var(--surface);
          border-radius: var(--radius-lg);
          padding: 30px;
          border: 1px solid #f1f5f9;
          box-shadow: var(--shadow-md);
          width: 100%;
        }
        .row-item-card {
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: var(--shadow-sm);
          margin-bottom: 16px;
        }
        .row-icon-container {
          background-color: var(--primary-light);
          color: var(--primary-color);
          border-radius: 50%;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 12px;
        }
        .edit-action-btn {
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #475569;
          transition: background-color 0.2s;
        }
        .edit-action-btn:hover {
          background-color: #e2e8f0;
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          backgroundColor: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          zIndex: 99999;
          animation: fadeIn 0.2s ease-out;
        }
        .modal-card {
          background-color: var(--surface);
          border-radius: var(--radius-lg);
          padding: 30px 24px;
          width: 90%;
          max-width: 400px;
          box-shadow: var(--shadow-lg);
          border: 1px solid #e2e8f0;
          animation: scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .profile-input-wrapper {
          display: flex;
          align-items: center;
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 2px 14px;
          margin-top: 6px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .profile-input-wrapper:focus-within {
          border-color: var(--primary-color);
          box-shadow: 0 0 0 3px rgba(15, 56, 120, 0.1);
        }
        .profile-input-field {
          border: none;
          background: transparent;
          outline: none;
          width: 100%;
          padding: 12px 0;
          font-size: 0.9rem;
          font-weight: 500;
          color: #0f172a;
        }
        .dialog-btn-group {
          display: flex;
          gap: 12px;
          margin-top: 24px;
        }
        .dialog-btn {
          flex: 1;
          height: 42px;
          border: none;
          border-radius: var(--radius-sm);
          font-weight: 700;
          font-size: 0.875rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .dialog-btn-cancel {
          background-color: #f1f5f9;
          color: #475569;
        }
        .dialog-btn-submit {
          background-color: var(--primary-color);
          color: white;
        }
        .dialog-btn-submit:hover {
          background-color: var(--primary-hover);
        }
      `}</style>

      {/* Avatar Header */}
      <div className="profile-container-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{
          width: '96px',
          height: '96px',
          borderRadius: '50%',
          backgroundColor: '#e2e8fb',
          color: 'var(--primary-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2.5rem',
          fontWeight: 800,
          boxShadow: '0 4px 12px rgba(15, 56, 120, 0.1)'
        }}>
          {name ? name.charAt(0).toUpperCase() : 'A'}
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '16px', marginBottom: '4px' }}>{name}</h2>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>System Administrator</span>
      </div>

      {/* Account Details Info list */}
      <div className="profile-container-card">
        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '20px' }}>
          Account Details
        </div>

        {/* Name Row */}
        <div className="row-item-card">
          <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
            <div className="row-icon-container">
              <User size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Full Name</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {name || 'Loading...'}
              </div>
            </div>
          </div>
          <button className="edit-action-btn" onClick={() => { setNewName(name); setIsNameModalOpen(true); }} title="Edit Name">
            <Edit2 size={14} />
          </button>
        </div>

        {/* Contact Row */}
        <div className="row-item-card">
          <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
            <div className="row-icon-container">
              <Phone size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Contact Number</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {contacts || 'No contact number'}
              </div>
            </div>
          </div>
          <button className="edit-action-btn" onClick={() => { setNewContacts(contacts); setIsContactModalOpen(true); }} title="Edit Contact">
            <Edit2 size={14} />
          </button>
        </div>

        {/* Email Row (Read-only) */}
        <div className="row-item-card" style={{ opacity: 0.75 }}>
          <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
            <div className="row-icon-container" style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}>
              <Mail size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Email Address</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {email}
              </div>
            </div>
          </div>
        </div>

        {/* Password Row */}
        <div className="row-item-card">
          <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
            <div className="row-icon-container">
              <Lock size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Password</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                ••••••••••••
              </div>
            </div>
          </div>
          <button className="edit-action-btn" onClick={() => setIsPasswordModalOpen(true)} title="Edit Password">
            <Edit2 size={14} />
          </button>
        </div>
      </div>

      {/* Edit Name Modal */}
      {isNameModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>Edit Name</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '20px' }}>Update your full name below.</p>
            
            <form onSubmit={handleNameSubmit}>
              <div className="form-group" style={{ textAlign: 'left' }}>
                <label className="form-label">Full Name</label>
                <div className="profile-input-wrapper">
                  <User size={18} color="#64748b" style={{ marginRight: '10px' }} />
                  <input
                    type="text"
                    className="profile-input-field"
                    placeholder="Name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="dialog-btn-group">
                <button type="button" className="dialog-btn dialog-btn-cancel" onClick={() => setIsNameModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="dialog-btn dialog-btn-submit" disabled={isLoading}>
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Contact Modal */}
      {isContactModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>Edit Contact Number</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '20px' }}>Update your contact number below.</p>
            
            <form onSubmit={handleContactSubmit}>
              <div className="form-group" style={{ textAlign: 'left' }}>
                <label className="form-label">Contact Number</label>
                <div className="profile-input-wrapper">
                  <Phone size={18} color="#64748b" style={{ marginRight: '10px' }} />
                  <input
                    type="text"
                    className="profile-input-field"
                    placeholder="e.g. 09171234567"
                    maxLength={11}
                    value={newContacts}
                    onChange={(e) => setNewContacts(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  />
                </div>
              </div>

              <div className="dialog-btn-group">
                <button type="button" className="dialog-btn dialog-btn-cancel" onClick={() => setIsContactModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="dialog-btn dialog-btn-submit" disabled={isLoading}>
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Password Modal */}
      {isPasswordModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>Edit Password</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '20px' }}>Enter your current and new password below.</p>
            
            <form onSubmit={handlePasswordSubmit}>
              <div className="form-group" style={{ textAlign: 'left', marginBottom: '14px' }}>
                <label className="form-label">Current Password</label>
                <div className="profile-input-wrapper">
                  <Lock size={18} color="#64748b" style={{ marginRight: '10px' }} />
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    className="profile-input-field"
                    placeholder="Current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                  <button type="button" onClick={() => setShowCurrent(!showCurrent)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }}>
                    {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ textAlign: 'left', marginBottom: '14px' }}>
                <label className="form-label">New Password</label>
                <div className="profile-input-wrapper">
                  <Lock size={18} color="#64748b" style={{ marginRight: '10px' }} />
                  <input
                    type={showNew ? 'text' : 'password'}
                    className="profile-input-field"
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <button type="button" onClick={() => setShowNew(!showNew)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }}>
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ textAlign: 'left', marginBottom: '20px' }}>
                <label className="form-label">Confirm New Password</label>
                <div className="profile-input-wrapper">
                  <Lock size={18} color="#64748b" style={{ marginRight: '10px' }} />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    className="profile-input-field"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }}>
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="dialog-btn-group">
                <button type="button" className="dialog-btn dialog-btn-cancel" onClick={() => {
                  setIsPasswordModalOpen(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}>
                  Cancel
                </button>
                <button type="submit" className="dialog-btn dialog-btn-submit" disabled={isLoading}>
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Styled Popup Notification Modal */}
      {feedbackModal.visible && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100000,
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
            border: `1px solid ${feedbackModal.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
            position: 'relative',
            animation: 'scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            {/* Close button */}
            <button 
              onClick={() => setFeedbackModal({ ...feedbackModal, visible: false })}
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

            {/* Icon */}
            <div style={{
              display: 'inline-flex',
              padding: '16px',
              borderRadius: '50%',
              backgroundColor: feedbackModal.type === 'success' ? 'var(--success-light)' : 'var(--error-light)',
              color: feedbackModal.type === 'success' ? 'var(--success)' : 'var(--error)',
              marginBottom: '20px'
            }}>
              {feedbackModal.type === 'success' ? <CheckCircle size={36} /> : <XCircle size={36} />}
            </div>

            {/* Title */}
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: 'var(--text-main)',
              marginBottom: '10px'
            }}>
              {feedbackModal.title}
            </h3>

            {/* Message */}
            <p style={{
              fontSize: '0.9rem',
              color: 'var(--text-muted)',
              marginBottom: '24px',
              lineHeight: 1.5
            }}>
              {feedbackModal.message}
            </p>

            <button
              onClick={() => setFeedbackModal({ ...feedbackModal, visible: false })}
              style={{
                backgroundColor: feedbackModal.type === 'success' ? 'var(--success)' : 'var(--error)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 24px',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
                width: '100%',
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
