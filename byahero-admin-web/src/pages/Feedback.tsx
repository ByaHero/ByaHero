import React, { useEffect, useState } from 'react';
import { Loader2, MessageSquare, Trash2, Star } from 'lucide-react';
import { adminService } from '../services/admin';
import { Feedback } from '../types';

export default function FeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const data = await adminService.listFeedbacks();
      if (data.success) {
        setFeedbacks(data.feedbacks || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this passenger feedback?')) return;
    setDeletingId(id);
    try {
      const data = await adminService.deleteFeedback(id);
      if (data.success) {
        setFeedbacks(feedbacks.filter((f) => f.id !== id));
      } else {
        alert(data.error || 'Failed to delete feedback.');
      }
    } catch (e) {
      alert('Network error while deleting feedback.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="card">
      <div className="page-header-actions">
        <h2 className="card-title">Passenger Feedbacks</h2>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <Loader2 className="animate-spin" size={32} color="var(--primary-color)" />
        </div>
      ) : feedbacks.length === 0 ? (
        <div className="empty-state">
          <MessageSquare size={48} className="empty-state-icon" />
          <p>No passenger feedback reviews submitted yet.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Passenger</th>
                <th>Satisfaction Rating</th>
                <th>Feedback Message</th>
                <th>Date Received</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {feedbacks.map((f) => (
                <tr key={f.id}>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 700 }}>{f.passenger_name || 'Anonymous Passenger'}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{f.passenger_email}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: 'var(--warning)' }}>
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={14} fill={i < f.rating ? 'var(--warning)' : 'none'} stroke="var(--warning)" />
                      ))}
                    </div>
                  </td>
                  <td>
                    <p style={{ maxWidth: '400px', whiteSpace: 'normal', wordBreak: 'break-word', fontSize: '0.8rem' }}>
                      {f.feedback_text}
                    </p>
                  </td>
                  <td>{f.created_at ? new Date(f.created_at).toLocaleDateString() : 'N/A'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button 
                      className="btn btn-danger" 
                      style={{ padding: '6px 10px' }} 
                      onClick={() => handleDelete(f.id)}
                      disabled={deletingId === f.id}
                    >
                      {deletingId === f.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
