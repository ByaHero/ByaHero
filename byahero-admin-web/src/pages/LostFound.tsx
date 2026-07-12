import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Loader2, HelpCircle, Image as ImageIcon } from 'lucide-react';
import { adminService } from '../services/admin';
import { API_BASE_URL } from '../services/api';
import { LostItem } from '../types';
import Modal from '../components/Modal';

export default function LostFound() {
  const [items, setItems] = useState<LostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<LostItem | null>(null);

  // Inputs
  const [itemName, setItemName] = useState('');
  const [description, setDescription] = useState('');
  const [reportedBy, setReportedBy] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [status, setStatus] = useState<'lost' | 'found' | 'claimed'>('lost');

  const fetchItems = async () => {
    try {
      setLoading(true);
      const data = await adminService.listLostAndFound();
      if (data.success) {
        setItems(data.items || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const openAddModal = () => {
    setCurrentItem(null);
    setItemName('');
    setDescription('');
    setReportedBy('');
    setContactNumber('');
    setStatus('lost');
    setIsFormOpen(true);
  };

  const openEditModal = (item: LostItem) => {
    setCurrentItem(item);
    setItemName(item.item_name);
    setDescription(item.description);
    setReportedBy(item.reported_by);
    setContactNumber(item.contact_number);
    setStatus(item.status);
    setIsFormOpen(true);
  };

  const openDeleteModal = (item: LostItem) => {
    setCurrentItem(item);
    setIsDeleteOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || !description.trim() || !reportedBy.trim() || !contactNumber.trim()) {
      alert('All fields are required.');
      return;
    }

    setSaving(true);
    try {
      let data;
      const payload = {
        item_name: itemName,
        description,
        reported_by: reportedBy,
        contact_number: contactNumber,
        status
      };

      if (currentItem) {
        data = await adminService.manageLostAndFound({ action: 'update', id: currentItem.id, ...payload });
      } else {
        data = await adminService.manageLostAndFound({ action: 'create', ...payload });
      }

      if (data.success) {
        setIsFormOpen(false);
        fetchItems();
      } else {
        alert(data.error || 'Failed to save lost item information.');
      }
    } catch (e) {
      alert('Network error while saving item.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentItem) return;
    setSaving(true);
    try {
      const data = await adminService.manageLostAndFound({ action: 'delete', id: currentItem.id });
      if (data.success) {
        setIsDeleteOpen(false);
        fetchItems();
      } else {
        alert(data.error || 'Failed to remove lost item.');
      }
    } catch (e) {
      alert('Network error while deleting item.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <div className="page-header-actions">
        <h2 className="card-title">Lost & Found Inventory</h2>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={16} /> Log New Item
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <Loader2 className="animate-spin" size={32} color="var(--primary-color)" />
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <HelpCircle size={48} className="empty-state-icon" />
          <p>No active lost or found item logs in database.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Item name</th>
                <th>Item Description</th>
                <th>Reported By</th>
                <th>Contact Details</th>
                <th>Status</th>
                <th>Date Logged</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 700 }}>{item.item_name}</td>
                  <td>{item.description}</td>
                  <td>{item.reported_by}</td>
                  <td>{item.contact_number}</td>
                  <td>
                    <span className={`badge badge-${item.status === 'claimed' ? 'success' :
                        item.status === 'found' ? 'primary' : 'error'
                      }`}>
                      {item.status}
                    </span>
                  </td>
                  <td>{item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      {(item.image1_path || item.image2_path) && (
                        <button 
                          className="btn btn-primary" 
                          style={{ padding: '6px 10px' }} 
                          onClick={() => window.open(`${API_BASE_URL}/${item.image1_path || item.image2_path}`, '_blank')}
                          title="View Image"
                        >
                          <ImageIcon size={12} />
                        </button>
                      )}
                      <button className="btn btn-secondary" style={{ padding: '6px 10px' }} onClick={() => openEditModal(item)}>
                        <Edit2 size={12} />
                      </button>
                      <button className="btn btn-danger" style={{ padding: '6px 10px' }} onClick={() => openDeleteModal(item)}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Save Modal */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={currentItem ? 'Update Item Log' : 'Log New Item'}>
        <form onSubmit={handleSave}>
          {currentItem && (currentItem.image1_path || currentItem.image2_path) && (
            <div className="form-group">
              <label className="form-label">Attached Images (From Passenger)</label>
              <div style={{ display: 'flex', gap: '12px', marginTop: '5px' }}>
                {currentItem.image1_path && (
                  <a href={`${API_BASE_URL}/${currentItem.image1_path}`} target="_blank" rel="noreferrer">
                    <img
                      src={`${API_BASE_URL}/${currentItem.image1_path}`}
                      alt="Lost Item 1"
                      style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                    />
                  </a>
                )}
                {currentItem.image2_path && (
                  <a href={`${API_BASE_URL}/${currentItem.image2_path}`} target="_blank" rel="noreferrer">
                    <img
                      src={`${API_BASE_URL}/${currentItem.image2_path}`}
                      alt="Lost Item 2"
                      style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                    />
                  </a>
                )}
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Item Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Leather Wallet"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Item Description</label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="e.g. Black leather containing IDs and cards. Found under row 5 seat."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Reported By</label>
              <input
                type="text"
                className="form-input"
                placeholder="Passenger Name"
                value={reportedBy}
                onChange={(e) => setReportedBy(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Contact Number</label>
              <input
                type="text"
                className="form-input"
                placeholder="Phone number"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-input" value={status} onChange={(e) => setStatus(e.target.value as any)}>
              <option value="lost">Lost</option>
              <option value="found">Found</option>
              <option value="claimed">Claimed / Returned</option>
            </select>
          </div>

          <div className="modal-footer" style={{ paddingBottom: 0, marginBottom: 0 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsFormOpen(false)} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Item'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="De-register Lost Item Log">
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Are you sure you want to remove the inventory log for <strong>{currentItem?.item_name}</strong>?
        </p>
        <div className="modal-footer" style={{ paddingBottom: 0, marginBottom: 0 }}>
          <button type="button" className="btn btn-secondary" onClick={() => setIsDeleteOpen(false)} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={saving}>
            {saving ? 'Deleting...' : 'Delete Permanently'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
