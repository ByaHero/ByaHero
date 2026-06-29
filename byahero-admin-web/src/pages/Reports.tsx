import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertTriangle, Bus, Phone, Trash2, FileText } from 'lucide-react';
import { apiRequest } from '../services/api';
import Modal from '../components/Modal';

interface PassengerReport {
  id: number;
  status: 'pending' | 'resolved';
  created_at: string;
  reporter_name?: string;
  user_id?: number;
  reporter_email?: string;
  bus_number?: string;
  contact_number?: string;
  report_reason: string;
  others_details?: string;
}

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<PassengerReport[]>([]);

  // Modals
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: '' });
  const [errorModal, setErrorModal] = useState({ isOpen: false, message: '' });
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean, id: number | null }>({ isOpen: false, id: null });

  const fetchReports = useCallback(async () => {
    try {
      const data = await apiRequest('/api/admin/reports'); // Or manageReports.php?json=1 based on backend
      if (data.success !== false) {
        setReports(data.reports || data || []);
      } else {
        setErrorModal({ isOpen: true, message: data.error || 'Failed to fetch reports.' });
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      setErrorModal({ isOpen: true, message: 'Network error while fetching reports.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchReports();
  }, [fetchReports]);

  const updateStatus = async (id: number, newStatus: string) => {
    try {
      const data = await apiRequest('/api/admin/reports', {
        method: 'POST',
        body: JSON.stringify({ action: 'update_status', id, status: newStatus })
      });
      if (data.success) {
        setSuccessModal({ isOpen: true, message: data.message || 'Report status updated.' });
        fetchReports();
      } else {
        setErrorModal({ isOpen: true, message: data.error || 'Failed to update report status.' });
      }
    } catch (error) {
      setErrorModal({ isOpen: true, message: 'Network error while updating status.' });
    }
  };

  const executeDelete = async () => {
    if (!deleteConfirm.id) return;
    try {
      const data = await apiRequest('/api/admin/reports', {
        method: 'POST',
        body: JSON.stringify({ action: 'delete_report', id: deleteConfirm.id })
      });
      if (data.success) {
        setDeleteConfirm({ isOpen: false, id: null });
        setSuccessModal({ isOpen: true, message: data.message || 'Report deleted successfully.' });
        fetchReports();
      } else {
        setDeleteConfirm({ isOpen: false, id: null });
        setErrorModal({ isOpen: true, message: data.error || 'Failed to delete report.' });
      }
    } catch (error) {
      setDeleteConfirm({ isOpen: false, id: null });
      setErrorModal({ isOpen: true, message: 'Network error while deleting report.' });
    }
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
      
      <div className="mb-6 flex items-center">
        <div className="bg-blue-100 p-2.5 rounded-2xl mr-4">
          <FileText size={28} className="text-[#0f3878]" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-[#0f3878] tracking-tight">Passenger Reports</h1>
          <p className="text-slate-500 text-[14px] mt-1">Review feedback and incident reports</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={32} className="text-[#1d4ed8] animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center shadow-sm border border-slate-100 mt-4">
          <AlertTriangle size={48} className="text-slate-200 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">No passenger reports submitted yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map(report => {
            const firstName = (report.reporter_name || 'Unknown User').split(' ')[0];

            return (
              <div key={report.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow relative overflow-hidden">
                {/* Status Indicator Bar */}
                <div className={`absolute top-0 left-0 w-1.5 h-full ${report.status === 'resolved' ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                
                {/* Header */}
                <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4 pl-2">
                  <div className="flex items-center text-[#1d4ed8] font-bold uppercase tracking-wider text-[14px]">
                    <AlertTriangle size={18} className="mr-2" />
                    REPORT #{report.id}
                  </div>
                  <span className="text-slate-500 text-[12px] font-medium">{formatDate(report.created_at)}</span>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5 pl-2">
                  <div>
                    <span className="block text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1">Reporter</span>
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 h-full">
                      <div className="text-slate-800 text-[14px] font-bold">#{report.user_id || '?'} - {firstName}</div>
                      <div className="text-slate-500 text-[12px] mt-1 break-all">{report.reporter_email}</div>
                    </div>
                  </div>
                  <div>
                    <span className="block text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1">Bus Number</span>
                    <div className="bg-blue-50/50 rounded-xl p-3 border border-blue-100 h-full flex items-center">
                      <div className="text-[#1d4ed8] text-[15px] font-bold flex items-center">
                        <Bus size={18} className="mr-2 opacity-80" />
                        {report.bus_number || 'N/A'}
                      </div>
                    </div>
                  </div>
                  <div>
                    <span className="block text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1">Contact Number</span>
                    <div className="bg-slate-50 rounded-xl p-3 text-slate-800 text-[14px] border border-slate-100 h-full flex items-center">
                      {report.contact_number ? (
                        <a href={`tel:${report.contact_number}`} className="text-[#1d4ed8] font-bold flex items-center hover:underline">
                          <Phone size={14} className="mr-1.5" />
                          {report.contact_number}
                        </a>
                      ) : (
                        <span className="text-slate-400 italic">None provided</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Report Reason */}
                <div className="mb-4 pl-2">
                  <span className="block text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1">Report Reason</span>
                  <div className="bg-red-50 text-red-700 rounded-xl p-3 text-[14px] font-bold border border-red-100">
                    {report.report_reason}
                  </div>
                </div>

                {/* Additional Details */}
                {report.others_details && report.others_details.trim() !== '' && (
                  <div className="mb-5 pl-2">
                    <span className="block text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1">Additional Details</span>
                    <div className="bg-slate-50 rounded-xl p-4 text-slate-700 text-[14px] whitespace-pre-wrap border border-slate-100 leading-relaxed">
                      {report.others_details}
                    </div>
                  </div>
                )}

                <div className="border-t border-slate-100 my-4"></div>

                {/* Footer Actions */}
                <div className="flex justify-between items-center pl-2">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500 text-[12px] font-bold uppercase tracking-wider">Status:</span>
                    <div className="relative">
                      <select 
                        className={`appearance-none bg-slate-100 border border-slate-200 text-[13px] font-bold rounded-full pl-4 pr-8 py-1.5 cursor-pointer outline-none focus:ring-2 focus:ring-blue-500/30 transition-shadow ${report.status === 'resolved' ? 'text-green-700 bg-green-50' : 'text-amber-700 bg-amber-50'}`}
                        value={report.status || 'pending'}
                        onChange={(e) => updateStatus(report.id, e.target.value)}
                      >
                        <option value="pending">Pending</option>
                        <option value="resolved">Resolved</option>
                      </select>
                      <div className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${report.status === 'resolved' ? 'text-green-700' : 'text-amber-700'}`}>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => setDeleteConfirm({ isOpen: true, id: report.id })}
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

      {/* Confirmation and Alert Modals */}
      <Modal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
        title="Delete Report"
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
        <p>Are you sure you want to permanently delete this passenger report? This action cannot be undone.</p>
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
