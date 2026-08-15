import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Loader2, HelpCircle, Image as ImageIcon } from 'lucide-react';
import { adminService } from '../services/admin';
import { API_BASE_URL } from '../services/api';
import { LostItem } from '../types';
import Modal from '../components/Modal';
import AlertModal from '../components/AlertModal';
import { useAlertModal } from '../hooks/useAlertModal';

export default function LostFound() {
  const [items, setItems] = useState<LostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { alertConfig, showAlert } = useAlertModal();

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
      if (data && data.success) {
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
      showAlert('Validation Error', 'All fields are required.', 'error');
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
        showAlert('Error', data.error || 'Failed to save lost item information.', 'error');
      }
    } catch (e) {
      showAlert('Network Error', 'Network error while saving item.', 'error');
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
        showAlert('Error', data.error || 'Failed to remove lost item.', 'error');
      }
    } catch (e) {
      showAlert('Network Error', 'Network error while deleting item.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Lost & Found Inventory</h2>
          <p className="text-xs text-slate-500 font-medium mt-1">Review reported commuter belongings, attachments, and claim resolutions.</p>
        </div>
        <button 
          className="inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold rounded-xl bg-[#0f3878] hover:bg-[#0a2958] text-white transition shadow-sm cursor-pointer" 
          onClick={openAddModal}
        >
          <Plus size={16} /> Log New Item
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-[#0f3878]" size={32} />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 px-4 text-slate-500 bg-slate-50/50 rounded-2xl border border-dashed border-slate-300">
          <HelpCircle size={48} className="mx-auto mb-3 text-slate-300" />
          <p className="text-xs font-semibold">No active lost or found item logs in database.</p>
        </div>
      ) : (
        <div className="w-full overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Item name</th>
                <th className="py-3.5 px-4">Item Description</th>
                <th className="py-3.5 px-4">Reported By</th>
                <th className="py-3.5 px-4">Contact Details</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Date Logged</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3.5 px-4 font-bold text-slate-900">{item.item_name}</td>
                  <td className="py-3.5 px-4 text-slate-600 max-w-xs">{item.description}</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-800">{item.reported_by}</td>
                  <td className="py-3.5 px-4 font-mono text-slate-700">{item.contact_number}</td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center py-1 px-2.5 text-[10px] font-extrabold rounded-full uppercase tracking-wider ${
                      item.status === 'claimed' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : item.status === 'found' 
                        ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 font-medium">
                    {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex justify-end gap-1.5 items-center">
                      {(item.image1_path || item.image2_path) && (
                        <button 
                          className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition cursor-pointer" 
                          onClick={() => window.open(`${API_BASE_URL}/${item.image1_path || item.image2_path}`, '_blank')}
                          title="View Attached Photo"
                        >
                          <ImageIcon size={13} />
                        </button>
                      )}
                      <button 
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer" 
                        onClick={() => openEditModal(item)}
                        title="Edit Item"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button 
                        className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition cursor-pointer" 
                        onClick={() => openDeleteModal(item)}
                        title="Delete Item"
                      >
                        <Trash2 size={13} />
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
        <form onSubmit={handleSave} className="space-y-4">
          {currentItem && (currentItem.image1_path || currentItem.image2_path) && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">Attached Images</label>
              <div className="flex gap-3 mt-1">
                {currentItem.image1_path && (
                  <a href={`${API_BASE_URL}/${currentItem.image1_path}`} target="_blank" rel="noreferrer">
                    <img
                      src={`${API_BASE_URL}/${currentItem.image1_path}`}
                      alt="Lost Item 1"
                      className="w-24 h-24 object-cover rounded-xl border border-slate-200 shadow-sm hover:opacity-90"
                    />
                  </a>
                )}
                {currentItem.image2_path && (
                  <a href={`${API_BASE_URL}/${currentItem.image2_path}`} target="_blank" rel="noreferrer">
                    <img
                      src={`${API_BASE_URL}/${currentItem.image2_path}`}
                      alt="Lost Item 2"
                      className="w-24 h-24 object-cover rounded-xl border border-slate-200 shadow-sm hover:opacity-90"
                    />
                  </a>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">Item Name</label>
            <input
              type="text"
              className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-[#4C85C5] focus:bg-white focus:ring-2 focus:ring-[#4C85C5]/20"
              placeholder="e.g. Leather Wallet"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">Item Description</label>
            <textarea
              className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-[#4C85C5] focus:bg-white focus:ring-2 focus:ring-[#4C85C5]/20"
              rows={3}
              placeholder="e.g. Black leather containing IDs. Found under row 5 seat."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">Reported By</label>
              <input
                type="text"
                className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-[#4C85C5] focus:bg-white focus:ring-2 focus:ring-[#4C85C5]/20"
                placeholder="Passenger Name"
                value={reportedBy}
                onChange={(e) => setReportedBy(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">Contact Number</label>
              <input
                type="text"
                className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-[#4C85C5] focus:bg-white focus:ring-2 focus:ring-[#4C85C5]/20"
                placeholder="e.g. 09171234567"
                maxLength={11}
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value.replace(/\D/g, '').slice(0, 11))}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">Status</label>
            <select 
              className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-[#4C85C5] focus:bg-white focus:ring-2 focus:ring-[#4C85C5]/20" 
              value={status} 
              onChange={(e) => setStatus(e.target.value as any)}
            >
              <option value="lost">Lost</option>
              <option value="found">Found</option>
              <option value="claimed">Claimed / Returned</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button 
              type="button" 
              className="py-2 px-4 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer" 
              onClick={() => setIsFormOpen(false)} 
              disabled={saving}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="py-2 px-4 rounded-xl text-xs font-bold text-white bg-[#0f3878] hover:bg-[#0a2958] transition shadow-md cursor-pointer disabled:opacity-60" 
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Item'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="De-register Lost Item Log">
        <div className="space-y-3">
          <p className="text-xs text-slate-600">
            Are you sure you want to remove the inventory log for <strong>{currentItem?.item_name}</strong>?
          </p>
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button 
              type="button" 
              className="py-2 px-4 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer" 
              onClick={() => setIsDeleteOpen(false)} 
              disabled={saving}
            >
              Cancel
            </button>
            <button 
              type="button" 
              className="py-2 px-4 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition cursor-pointer disabled:opacity-60" 
              onClick={handleDelete} 
              disabled={saving}
            >
              {saving ? 'Deleting...' : 'Delete Permanently'}
            </button>
          </div>
        </div>
      </Modal>
      <AlertModal
        isOpen={alertConfig.isOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={alertConfig.onConfirm}
        onCancel={alertConfig.onCancel}
      />
    </div>
  );
}
