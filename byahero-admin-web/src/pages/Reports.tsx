import React, { useEffect, useState } from 'react';
import { Edit2, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { adminService } from '../services/admin';
import { IncidentReport } from '../types';
import Modal from '../components/Modal';
import AlertModal from '../components/AlertModal';
import { useAlertModal } from '../hooks/useAlertModal';

export default function Reports() {
  const [reports, setReports] = useState<IncidentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { alertConfig, showAlert } = useAlertModal();

  // Modals
  const [isResolveOpen, setIsResolveOpen] = useState(false);
  const [currentReport, setCurrentReport] = useState<IncidentReport | null>(null);
  const [status, setStatus] = useState<'pending' | 'resolved'>('pending');

  const fetchReports = async () => {
    try {
      setLoading(true);
      const data = await adminService.listReports();
      if (data && data.success) {
        setReports(data.reports || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const openResolveModal = (report: IncidentReport) => {
    setCurrentReport(report);
    setStatus(report.status);
    setIsResolveOpen(true);
  };

  const handleSaveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentReport) return;
    setSaving(true);
    try {
      const data = await adminService.manageReports({
        action: 'update_status',
        id: currentReport.id,
        status
      });

      if (data && data.success) {
        setIsResolveOpen(false);
        fetchReports();
      } else {
        alert(data?.error || 'Failed to update report status.');
      }
    } catch (e) {
      showAlert('Network Error', 'Network error while updating report.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Incident & Delays Log</h2>
          <p className="text-xs text-slate-500 font-medium mt-1">Access safety hazards, maintenance delays, or passenger incident records.</p>
        </div>
        <button 
          className="inline-flex items-center gap-2 py-2 px-3.5 text-xs font-bold rounded-xl bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 transition cursor-pointer disabled:opacity-60" 
          onClick={fetchReports} 
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {loading && reports.length === 0 ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-[#0f3878]" size={32} />
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-12 px-4 text-slate-500 bg-slate-50/50 rounded-2xl border border-dashed border-slate-300">
          <AlertTriangle size={48} className="mx-auto mb-3 text-slate-300" />
          <p className="text-xs font-semibold">No safety hazards or incident reports logged in database.</p>
        </div>
      ) : (
        <div className="w-full overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Report Summary</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Description details</th>
                <th className="py-3.5 px-4">Reported By</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Date Received</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3.5 px-4 font-extrabold text-slate-900">
                    {report.bus_number ? `Incident Report: Bus ${report.bus_number}` : 'Incident Report: Bus Unknown'}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center py-1 px-2.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                      {report.report_reason || 'Unknown'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 max-w-xs">
                    <p className="text-xs text-slate-600 leading-relaxed break-words">
                      {report.others_details || 'No additional details provided.'}
                    </p>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-700">{report.reporter_name || 'Anonymous'}</td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center py-1 px-2.5 text-[10px] font-extrabold rounded-full uppercase tracking-wider ${
                      report.status === 'resolved' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {report.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 font-medium">
                    {report.created_at ? new Date(report.created_at).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button 
                      className="inline-flex items-center gap-1 py-1.5 px-3 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer" 
                      onClick={() => openResolveModal(report)}
                    >
                      <Edit2 size={12} /> Resolve
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Resolve Incident Status Modal */}
      <Modal isOpen={isResolveOpen} onClose={() => setIsResolveOpen(false)} title="Update Incident Status">
        <form onSubmit={handleSaveStatus} className="space-y-4">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <p className="text-xs font-bold text-slate-900">
              {currentReport?.bus_number ? `Incident Report: Bus ${currentReport.bus_number}` : 'Incident Report: Bus Unknown'}
            </p>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {currentReport?.others_details || 'No additional details provided.'}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">Incident Resolution Status</label>
            <select 
              className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-[#4C85C5] focus:bg-white focus:ring-2 focus:ring-[#4C85C5]/20" 
              value={status} 
              onChange={(e) => setStatus(e.target.value as any)}
            >
              <option value="pending">Pending Review / Unresolved</option>
              <option value="resolved">Resolved / Action Taken</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button 
              type="button" 
              className="py-2 px-4 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer" 
              onClick={() => setIsResolveOpen(false)} 
              disabled={saving}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="py-2 px-4 rounded-xl text-xs font-bold text-white bg-[#0f3878] hover:bg-[#0a2958] transition shadow-md cursor-pointer disabled:opacity-60" 
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Update Status'}
            </button>
          </div>
        </form>
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
