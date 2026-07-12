import React, { useEffect, useState } from 'react';
import { Edit2, Loader2, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { adminService } from '../services/admin';
import { IncidentReport } from '../types';
import Modal from '../components/Modal';

export default function Reports() {
  const [reports, setReports] = useState<IncidentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modals
  const [isResolveOpen, setIsResolveOpen] = useState(false);
  const [currentReport, setCurrentReport] = useState<IncidentReport | null>(null);
  const [status, setStatus] = useState<'pending' | 'resolved'>('pending');

  const fetchReports = async () => {
    try {
      setLoading(true);
      const data = await adminService.listReports();
      if (data.success) {
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

      if (data.success) {
        setIsResolveOpen(false);
        fetchReports();
      } else {
        alert(data.error || 'Failed to update report status.');
      }
    } catch (e) {
      alert('Network error while updating report.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <div className="page-header-actions">
        <h2 className="card-title">Incident & Delays Log</h2>
        <button className="btn btn-secondary" onClick={fetchReports} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {loading && reports.length === 0 ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <Loader2 className="animate-spin" size={32} color="var(--primary-color)" />
        </div>
      ) : reports.length === 0 ? (
        <div className="empty-state">
          <AlertTriangle size={48} className="empty-state-icon" />
          <p>No safety hazards or incident reports logged in database.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Report Summary</th>
                <th>Category</th>
                <th>Description details</th>
                <th>Reported By</th>
                <th>Status</th>
                <th>Date Received</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id}>
                  <td style={{ fontWeight: 700 }}>
                    {report.bus_number ? `Incident Report: Bus ${report.bus_number}` : 'Incident Report: Bus Unknown'}
                  </td>
                  <td>
                    <span className="badge badge-secondary">{report.report_reason || 'Unknown'}</span>
                  </td>
                  <td>
                    <p style={{ maxWidth: '300px', whiteSpace: 'normal', wordBreak: 'break-word', fontSize: '0.8rem' }}>
                      {report.others_details || 'No additional details provided.'}
                    </p>
                  </td>
                  <td>{report.reporter_name || 'Anonymous'}</td>
                  <td>
                    <span className={`badge badge-${report.status === 'resolved' ? 'success' : 'error'}`}>
                      {report.status}
                    </span>
                  </td>
                  <td>{report.created_at ? new Date(report.created_at).toLocaleDateString() : 'N/A'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-secondary" style={{ padding: '6px 10px' }} onClick={() => openResolveModal(report)}>
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
        <form onSubmit={handleSaveStatus}>
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
              {currentReport?.bus_number ? `Incident Report: Bus ${currentReport.bus_number}` : 'Incident Report: Bus Unknown'}
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {currentReport?.others_details || 'No additional details provided.'}
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">Incident Resolution Status</label>
            <select className="form-input" value={status} onChange={(e) => setStatus(e.target.value as any)}>
              <option value="pending">Pending Review / Unresolved</option>
              <option value="resolved">Resolved / Action Taken</option>
            </select>
          </div>

          <div className="modal-footer" style={{ paddingBottom: 0, marginBottom: 0 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsResolveOpen(false)} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Update Status'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
