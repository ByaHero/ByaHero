import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Search, Archive, Phone, Trash2, Image as ImageIcon, X } from 'lucide-react';
import { apiRequest } from '../services/api';
import Modal from '../components/Modal';

interface LostFoundTicket {
  id: number;
  type: 'lost' | 'found';
  status: 'open' | 'resolved' | 'closed';
  created_at: string;
  reporter_name?: string;
  user_id?: number;
  reporter_contact?: string;
  bus_number?: string;
  item_description: string;
  image1_path?: string;
  image2_path?: string;
}

const SERVER_URL = localStorage.getItem('byahero_server_url') || 'https://byahero.alwaysdata.net';

export default function LostFound() {
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<LostFoundTicket[]>([]);

  // Modals
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: '' });
  const [errorModal, setErrorModal] = useState({ isOpen: false, message: '' });
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean, id: number | null }>({ isOpen: false, id: null });
  const [imageModal, setImageModal] = useState<{ isOpen: boolean, src: string }>({ isOpen: false, src: '' });

  const fetchTickets = useCallback(async () => {
    try {
      const data = await apiRequest('/api/admin/lost-and-found'); // Or manageLostAndFound.php?json=1 based on backend
      // Note: adjust payload parsing based on actual backend response structure
      if (data.success !== false) {
        setTickets(data.tickets || data || []);
      } else {
        setErrorModal({ isOpen: true, message: data.error || 'Failed to fetch tickets.' });
      }
    } catch (error) {
      console.error('Error fetching lost and found:', error);
      setErrorModal({ isOpen: true, message: 'Network error while fetching tickets.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchTickets();
  }, [fetchTickets]);

  const updateStatus = async (id: number, newStatus: string) => {
    try {
      const data = await apiRequest('/api/admin/lost-and-found', {
        method: 'POST',
        body: JSON.stringify({ action: 'update_status', id, status: newStatus })
      });
      if (data.success) {
        setSuccessModal({ isOpen: true, message: data.message || 'Ticket status updated.' });
        fetchTickets();
      } else {
        setErrorModal({ isOpen: true, message: data.error || 'Failed to update ticket status.' });
      }
    } catch (error) {
      setErrorModal({ isOpen: true, message: 'Network error while updating status.' });
    }
  };

  const executeDelete = async () => {
    if (!deleteConfirm.id) return;
    try {
      const data = await apiRequest('/api/admin/lost-and-found', {
        method: 'POST',
        body: JSON.stringify({ action: 'delete_ticket', id: deleteConfirm.id })
      });
      if (data.success) {
        setDeleteConfirm({ isOpen: false, id: null });
        setSuccessModal({ isOpen: true, message: data.message || 'Ticket deleted successfully.' });
        fetchTickets();
      } else {
        setDeleteConfirm({ isOpen: false, id: null });
        setErrorModal({ isOpen: true, message: data.error || 'Failed to delete ticket.' });
      }
    } catch (error) {
      setDeleteConfirm({ isOpen: false, id: null });
      setErrorModal({ isOpen: true, message: 'Network error while deleting ticket.' });
    }
  };

  const getImageUrl = (path?: string) => {
    if (!path) return '';
    return path.startsWith('http') ? path : `${SERVER_URL}/${path}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="p-4 pt-6 max-w-3xl mx-auto w-full pb-16 font-sans bg-slate-50 min-h-screen">
      
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#0f3878] tracking-tight">Lost and Found Board</h1>
        <p className="text-slate-500 text-[14px] mt-1">Manage reported lost and found items</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={32} className="text-[#1d4ed8] animate-spin" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center shadow-sm border border-slate-100">
          <Archive size={48} className="text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">No items reported yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tickets.map(ticket => {
            const isLost = ticket.type === 'lost';
            const Icon = isLost ? Search : Archive;
            const typeColor = isLost ? 'text-red-600' : 'text-green-600';
            const firstName = (ticket.reporter_name || 'Unknown User').split(' ')[0];

            return (
              <div key={ticket.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                {/* Header */}
                <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                  <div className={`flex items-center ${typeColor} font-bold uppercase tracking-wider text-[14px]`}>
                    <Icon size={18} className="mr-2" />
                    {ticket.type} ITEM
                  </div>
                  <span className="text-slate-500 text-[12px] font-medium">{formatDate(ticket.created_at)}</span>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                  <div>
                    <span className="block text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1">Reporter</span>
                    <div className="bg-slate-50 rounded-xl p-3 text-slate-800 text-[14px] font-medium border border-slate-100">
                      #{ticket.user_id || '?'} - {firstName}
                    </div>
                  </div>
                  <div>
                    <span className="block text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1">Contact Number</span>
                    <div className="bg-slate-50 rounded-xl p-3 text-slate-800 text-[14px] border border-slate-100 flex items-center">
                      {ticket.reporter_contact && ticket.reporter_contact !== 'None provided' ? (
                        <a href={`tel:${ticket.reporter_contact}`} className="text-[#1d4ed8] font-bold flex items-center hover:underline">
                          <Phone size={14} className="mr-1.5" />
                          {ticket.reporter_contact}
                        </a>
                      ) : (
                        <span className="text-slate-400 italic">None provided</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="block text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1">Bus Number</span>
                    <div className="bg-slate-50 rounded-xl p-3 text-slate-800 text-[14px] font-medium border border-slate-100">
                      {ticket.bus_number || <span className="text-slate-400 italic">Not specified</span>}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="mb-5">
                  <span className="block text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1">Item Description</span>
                  <div className="bg-slate-50 rounded-xl p-4 text-slate-700 text-[14px] whitespace-pre-wrap border border-slate-100 leading-relaxed">
                    {ticket.item_description}
                  </div>
                </div>

                {/* Attached Photos */}
                {(ticket.image1_path || ticket.image2_path) && (
                  <div className="mb-5">
                    <span className="block text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-2">Attached Photos</span>
                    <div className="flex gap-3">
                      {ticket.image1_path && (
                        <button 
                          onClick={() => setImageModal({ isOpen: true, src: getImageUrl(ticket.image1_path) })}
                          className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-slate-200 hover:border-[#1d4ed8] transition-colors focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/30 relative group"
                        >
                          <img src={getImageUrl(ticket.image1_path)} alt="Attachment 1" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <ImageIcon size={20} className="text-white opacity-0 group-hover:opacity-100 drop-shadow-md" />
                          </div>
                        </button>
                      )}
                      {ticket.image2_path && (
                        <button 
                          onClick={() => setImageModal({ isOpen: true, src: getImageUrl(ticket.image2_path) })}
                          className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-slate-200 hover:border-[#1d4ed8] transition-colors focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/30 relative group"
                        >
                          <img src={getImageUrl(ticket.image2_path)} alt="Attachment 2" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <ImageIcon size={20} className="text-white opacity-0 group-hover:opacity-100 drop-shadow-md" />
                          </div>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="border-t border-slate-100 my-4"></div>

                {/* Footer Actions */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500 text-[12px] font-bold uppercase tracking-wider">Status:</span>
                    <div className="relative">
                      <select 
                        className="appearance-none bg-slate-100 border border-slate-200 text-slate-800 text-[13px] font-bold rounded-full pl-4 pr-8 py-1.5 cursor-pointer outline-none focus:ring-2 focus:ring-blue-500/30 transition-shadow"
                        value={ticket.status || 'open'}
                        onChange={(e) => updateStatus(ticket.id, e.target.value)}
                      >
                        <option value="open">Open</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => setDeleteConfirm({ isOpen: true, id: ticket.id })}
                    className="bg-red-50 hover:bg-red-100 text-red-600 rounded-full px-4 py-1.5 flex items-center transition-colors shadow-sm border border-red-100"
                  >
                    <Trash2 size={14} className="mr-1.5" />
                    <span className="font-bold text-[12px]">Delete</span>
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Image Viewer Modal */}
      {imageModal.isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm animate-in fade-in duration-200">
          <button 
            className="absolute top-6 right-6 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"
            onClick={() => setImageModal({ isOpen: false, src: '' })}
          >
            <X size={24} />
          </button>
          <img 
            src={imageModal.src} 
            alt="Full Screen Attachment" 
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300"
          />
        </div>
      )}

      {/* Confirmation and Alert Modals */}
      <Modal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
        title="Delete Ticket"
        type="warning"
        secondaryAction={{
          label: 'Cancel',
          onClick: () => setDeleteConfirm({ isOpen: false, id: null })
        }}
        primaryAction={{
          label: 'Yes, delete',
          danger: true,
          onClick: executeDelete
        }}
      >
        <p>Are you sure you want to permanently delete this lost & found ticket? This action cannot be undone.</p>
      </Modal>

      <Modal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal({ isOpen: false, message: '' })}
        title="Success"
        type="success"
        primaryAction={{
          label: 'Okay',
          onClick: () => setSuccessModal({ isOpen: false, message: '' })
        }}
      >
        <p>{successModal.message}</p>
      </Modal>

      <Modal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, message: '' })}
        title="Action Failed"
        type="error"
        primaryAction={{
          label: 'Okay',
          onClick: () => setErrorModal({ isOpen: false, message: '' })
        }}
      >
        <p>{errorModal.message}</p>
      </Modal>

    </div>
  );
}
