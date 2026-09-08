import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, MessageSquare, Trash2, Star, StarHalf } from 'lucide-react';
import { adminService } from '../services/admin';
import { Feedback } from '../types';
import AlertModal from '../components/AlertModal';
import { useAlertModal } from '../hooks/useAlertModal';

export default function FeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { alertConfig, showAlert, showConfirm } = useAlertModal();

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const data = await adminService.listFeedbacks();
      if (data && data.success) {
        setFeedbacks(data.feedbacks || []);
      }
    } catch (e) {
      console.error('Error fetching feedbacks:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const stats = useMemo(() => {
    const total = feedbacks.length;
    if (total === 0) {
      return { totalFeedbacks: 0, averageRating: 0, totalComments: 0 };
    }
    const avg = feedbacks.reduce((acc, f) => acc + (f.rating || 0), 0) / total;
    const comments = feedbacks.filter((f) => (f.feedback_text || '').trim().length > 0).length;
    return {
      totalFeedbacks: total,
      averageRating: avg,
      totalComments: comments,
    };
  }, [feedbacks]);

  const handleDelete = (id: number) => {
    showConfirm(
      'Delete Feedback',
      'Are you sure you want to permanently delete this passenger feedback? This action cannot be undone.',
      async () => {
        setDeletingId(id);
        try {
          const data = await adminService.deleteFeedback(id);
          if (data && data.success) {
            setFeedbacks((prev) => prev.filter((f) => f.id !== id));
            showAlert('Success', 'Feedback deleted successfully.', 'success');
          } else {
            showAlert('Error', data?.error || 'Failed to delete feedback.', 'error');
          }
        } catch (e: any) {
          showAlert('Error', e?.message || 'Network error while deleting feedback.', 'error');
        } finally {
          setDeletingId(null);
        }
      }
    );
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Passenger Feedbacks</h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Review suggestions, commuter satisfaction ratings, and passenger feedback.
          </p>
        </div>
      </div>

      {/* Aggregate KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50/70 to-indigo-50/40 border border-blue-100/80 rounded-2xl p-4 flex items-center gap-4 shadow-xs">
          <div className="text-3xl font-black text-[#0f3878]">
            {stats.averageRating.toFixed(1)}
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Average Rating</div>
            <div className="flex items-center gap-1 text-amber-400 mt-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={14}
                  className={i < Math.round(stats.averageRating) ? 'fill-amber-400 text-amber-400' : 'text-slate-200 fill-slate-200'}
                />
              ))}
              <span className="text-[11px] text-slate-400 ml-1 font-semibold">({stats.totalFeedbacks})</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 flex items-center gap-4 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#0f3878] flex items-center justify-center shrink-0">
            <MessageSquare size={18} />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Total Feedbacks</div>
            <div className="text-2xl font-black text-slate-800">{stats.totalFeedbacks}</div>
          </div>
        </div>

        <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 flex items-center gap-4 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <MessageSquare size={18} />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Written Comments</div>
            <div className="text-2xl font-black text-slate-800">{stats.totalComments}</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-[#0f3878]" size={32} />
        </div>
      ) : feedbacks.length === 0 ? (
        <div className="text-center py-12 px-4 text-slate-500 bg-slate-50/50 rounded-2xl border border-dashed border-slate-300">
          <MessageSquare size={48} className="mx-auto mb-3 text-slate-300" />
          <p className="text-xs font-semibold">No passenger feedback reviews submitted yet.</p>
        </div>
      ) : (
        <div className="w-full overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Passenger</th>
                <th className="py-3.5 px-4">Satisfaction Rating</th>
                <th className="py-3.5 px-4">Feedback Message</th>
                <th className="py-3.5 px-4">Date Received</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {feedbacks.map((f) => (
                <tr key={f.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3.5 px-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800">{f.passenger_name || 'Anonymous Passenger'}</span>
                      <span className="text-[11px] text-slate-400 font-medium">{f.passenger_email}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1 text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={14}
                          className={i < f.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200 fill-slate-200'}
                        />
                      ))}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 max-w-md">
                    <p className="text-xs text-slate-600 leading-relaxed break-words">
                      {f.feedback_text || <span className="text-slate-400 italic">No comment provided</span>}
                    </p>
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 font-medium text-xs">
                    {f.created_at ? new Date(f.created_at).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition cursor-pointer disabled:opacity-60"
                      onClick={() => handleDelete(f.id)}
                      disabled={deletingId === f.id}
                      title="Delete Feedback"
                    >
                      {deletingId === f.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
