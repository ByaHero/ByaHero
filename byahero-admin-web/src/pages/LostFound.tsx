import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Loader2, 
  HelpCircle, 
  X, 
  Phone, 
  Bus, 
  RotateCw 
} from 'lucide-react';
import { adminService } from '../services/admin';
import { API_BASE_URL } from '../services/api';
import { LostItem } from '../types';
import Modal from '../components/Modal';
import AlertModal from '../components/AlertModal';
import { useAlertModal } from '../hooks/useAlertModal';

interface EnhancedLostItem extends LostItem {
  bus_number?: string;
  type?: 'lost' | 'found';
}

export default function LostFound() {
  const [items, setItems] = useState<EnhancedLostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const { alertConfig, showAlert, showConfirm } = useAlertModal();

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<EnhancedLostItem | null>(null);

  // Inputs
  const [itemName, setItemName] = useState('');
  const [description, setDescription] = useState('');
  const [reportedBy, setReportedBy] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [busNumber, setBusNumber] = useState('');
  const [itemType, setItemType] = useState<'lost' | 'found'>('lost');
  const [status, setStatus] = useState<string>('open');

  const fetchItems = async () => {
    try {
      setLoading(true);
      const data = await adminService.listLostAndFound();
      if (data && data.success) {
        const rawList = data.tickets || data.items || [];
        const mapped: EnhancedLostItem[] = rawList.map((t: any) => ({
          id: t.id,
          item_name: t.item_description || t.item_name || 'Unspecified Item',
          description: t.item_description || t.description || '',
          reported_by: t.reporter_name || t.reported_by || 'Anonymous',
          contact_number: t.reporter_contact || t.contact_number || '',
          bus_number: t.bus_number || '',
          status: t.status || 'open',
          created_at: t.created_at || '',
          image1_path: t.image1_path,
          image2_path: t.image2_path,
          type: t.type || 'lost'
        }));
        setItems(mapped);
      }
    } catch (e: any) {
      console.error(e);
      showAlert('Error', 'Failed to fetch lost and found items.', 'error');
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
    setBusNumber('');
    setItemType('lost');
    setStatus('open');
    setIsFormOpen(true);
  };

  const openEditModal = (item: EnhancedLostItem) => {
    setCurrentItem(item);
    setItemName(item.item_name);
    setDescription(item.description);
    setReportedBy(item.reported_by);
    setContactNumber(item.contact_number);
    setBusNumber(item.bus_number || '');
    setItemType(item.type || 'lost');
    setStatus(item.status);
    setIsFormOpen(true);
  };

  const openDeleteModal = (item: EnhancedLostItem) => {
    setCurrentItem(item);
    setIsDeleteOpen(true);
  };

  const cycleStatus = async (item: EnhancedLostItem) => {
    const nextStatusMap: Record<string, string> = {
      open: 'resolved',
      resolved: 'closed',
      closed: 'open',
      lost: 'found',
      found: 'claimed',
      claimed: 'open'
    };
    const currentSt = (item.status || 'open').toLowerCase();
    const nextStatus = nextStatusMap[currentSt] || 'open';

    showConfirm(
      'Update Status',
      `Advance status for this ticket from "${currentSt.toUpperCase()}" to "${nextStatus.toUpperCase()}"?`,
      async () => {
        try {
          const res = await adminService.manageLostAndFound({
            action: 'update_status',
            id: item.id,
            status: nextStatus
          });
          if (res && res.success) {
            fetchItems();
          } else {
            showAlert('Error', res?.error || 'Failed to advance status.', 'error');
          }
        } catch (e: any) {
          showAlert('Error', e.message || 'Server error updating status.', 'error');
        }
      }
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !reportedBy.trim()) {
      showAlert('Validation Error', 'Description and Reporter Name are required.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        item_name: itemName || description.slice(0, 30),
        item_description: description,
        description,
        reporter_name: reportedBy,
        reported_by: reportedBy,
        reporter_contact: contactNumber,
        contact_number: contactNumber,
        bus_number: busNumber,
        type: itemType,
        status
      };

      let data;
      if (currentItem) {
        data = await adminService.manageLostAndFound({ action: 'update', id: currentItem.id, ...payload });
      } else {
        data = await adminService.manageLostAndFound({ action: 'create', ...payload });
      }

      if (data && data.success) {
        setIsFormOpen(false);
        fetchItems();
      } else {
        showAlert('Error', data?.error || 'Failed to save lost item information.', 'error');
      }
    } catch (e: any) {
      showAlert('Network Error', e.message || 'Network error while saving item.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentItem) return;
    setSaving(true);
    try {
      let data = await adminService.manageLostAndFound({ action: 'delete_ticket', id: currentItem.id });
      if (!data || !data.success) {
        data = await adminService.manageLostAndFound({ action: 'delete', id: currentItem.id });
      }

      if (data && data.success) {
        setIsDeleteOpen(false);
        fetchItems();
      } else {
        showAlert('Error', data?.error || 'Failed to remove lost item.', 'error');
      }
    } catch (e: any) {
      showAlert('Network Error', e.message || 'Network error while deleting item.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const getFullImgUrl = (path?: string) => {
    if (!path) return '';
    return path.startsWith('http') ? path : `${API_BASE_URL}/${path}`;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Lost & Found Inventory</h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Review reported commuter belongings, vehicle tags, attachments, and claim resolutions.
          </p>
        </div>
        <button 
          className="inline-flex items-center justify-center gap-2 py-2 px-3.5 text-xs font-bold rounded-xl bg-[#0f3878] hover:bg-[#0a2958] text-white transition shadow-sm cursor-pointer" 
          onClick={openAddModal}
        >
          <Plus size={15} /> Log New Item
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 bg-white rounded-3xl border border-slate-200">
          <Loader2 className="animate-spin text-[#0f3878]" size={32} />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 px-4 text-slate-500 bg-white rounded-3xl border border-dashed border-slate-300">
          <HelpCircle size={48} className="mx-auto mb-3 text-slate-300" />
          <p className="text-xs font-semibold">No active lost or found item logs in database.</p>
        </div>
      ) : (
        <div className="w-full overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Item & Vehicle</th>
                <th className="py-3.5 px-4">Description</th>
                <th className="py-3.5 px-4">Photos</th>
                <th className="py-3.5 px-4">Reporter Details</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Date Logged</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => {
                const isResolved = item.status === 'resolved' || item.status === 'claimed';
                const isClosed = item.status === 'closed';

                return (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1">
                        <span className="font-extrabold text-slate-900">{item.item_name}</span>
                        {item.bus_number ? (
                          <div className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-md w-fit">
                            <Bus size={11} />
                            <span>Bus: {item.bus_number}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No bus specified</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 max-w-xs leading-relaxed">
                      {item.description}
                    </td>

                    <td className="py-3.5 px-4">
                      {(item.image1_path || item.image2_path) ? (
                        <div className="flex items-center gap-1.5">
                          {item.image1_path && (
                            <button
                              type="button"
                              onClick={() => setLightboxImg(getFullImgUrl(item.image1_path))}
                              className="w-9 h-9 rounded-lg overflow-hidden border border-slate-200 hover:scale-105 transition cursor-pointer shadow-xs"
                              title="Click to zoom"
                            >
                              <img src={getFullImgUrl(item.image1_path)} alt="Attached 1" className="w-full h-full object-cover" />
                            </button>
                          )}
                          {item.image2_path && (
                            <button
                              type="button"
                              onClick={() => setLightboxImg(getFullImgUrl(item.image2_path))}
                              className="w-9 h-9 rounded-lg overflow-hidden border border-slate-200 hover:scale-105 transition cursor-pointer shadow-xs"
                              title="Click to zoom"
                            >
                              <img src={getFullImgUrl(item.image2_path)} alt="Attached 2" className="w-full h-full object-cover" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No photo</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-slate-800">{item.reported_by}</span>
                        {item.contact_number ? (
                          <a 
                            href={`tel:${item.contact_number}`} 
                            className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline font-mono"
                          >
                            <Phone size={10} />
                            <span>{item.contact_number}</span>
                          </a>
                        ) : null}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() => cycleStatus(item)}
                        title="Click to advance status"
                        className={`inline-flex items-center gap-1.5 py-1 px-3 rounded-full text-[10px] font-extrabold uppercase tracking-wider transition cursor-pointer border ${
                          isResolved
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : isClosed
                            ? 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        <RotateCw size={10} />
                        <span>{item.status}</span>
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 font-medium">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A'}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex justify-end gap-1.5 items-center">
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Image Lightbox Modal */}
      {lightboxImg && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setLightboxImg(null)}
        >
          <div className="relative max-w-2xl max-h-[85vh] bg-black rounded-2xl overflow-hidden shadow-2xl">
            <button
              onClick={() => setLightboxImg(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-white/20 text-white hover:bg-white/40 transition cursor-pointer"
            >
              <X size={18} />
            </button>
            <img 
              src={lightboxImg} 
              alt="Full Preview" 
              className="max-w-full max-h-[80vh] object-contain"
            />
          </div>
        </div>
      )}

      {/* Save Modal */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={currentItem ? 'Update Item Log' : 'Log New Item'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">Item Name</label>
            <input
              type="text"
              className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-[#4C85C5] focus:bg-white focus:ring-2 focus:ring-[#4C85C5]/20 font-medium"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="e.g. Black Leather Wallet"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">Bus Vehicle No. (Optional)</label>
            <input
              type="text"
              className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-[#4C85C5] focus:bg-white focus:ring-2 focus:ring-[#4C85C5]/20 font-medium"
              value={busNumber}
              onChange={(e) => setBusNumber(e.target.value)}
              placeholder="e.g. BUS-001"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">Item Description</label>
            <textarea
              className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-[#4C85C5] focus:bg-white focus:ring-2 focus:ring-[#4C85C5]/20 font-medium h-20 resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide color, brand, contents, or distinguishing features"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">Reported By</label>
              <input
                type="text"
                className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-[#4C85C5] focus:bg-white focus:ring-2 focus:ring-[#4C85C5]/20 font-medium"
                value={reportedBy}
                onChange={(e) => setReportedBy(e.target.value)}
                placeholder="Full Name"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">Contact Number</label>
              <input
                type="text"
                className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-[#4C85C5] focus:bg-white focus:ring-2 focus:ring-[#4C85C5]/20 font-medium"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                placeholder="09171234567"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">Type</label>
              <select
                className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-[#4C85C5] focus:bg-white focus:ring-2 focus:ring-[#4C85C5]/20 font-medium"
                value={itemType}
                onChange={(e) => setItemType(e.target.value as any)}
              >
                <option value="lost">Lost</option>
                <option value="found">Found</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">Status</label>
              <select
                className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-[#4C85C5] focus:bg-white focus:ring-2 focus:ring-[#4C85C5]/20 font-medium"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="open">Open</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              className="py-2 px-4 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
              onClick={() => setIsFormOpen(false)}
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
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Confirm Deletion">
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Are you sure you want to permanently delete this lost item log for <strong className="text-slate-900">{currentItem?.item_name}</strong>?
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              className="py-2 px-4 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
              onClick={() => setIsDeleteOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="py-2 px-4 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition shadow-md cursor-pointer disabled:opacity-60"
              onClick={handleDelete}
              disabled={saving}
            >
              {saving ? 'Deleting...' : 'Delete'}
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
