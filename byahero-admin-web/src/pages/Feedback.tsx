import React, { useEffect, useState } from 'react';
import { Loader2, MessageSquare, Trash2, Star } from 'lucide-react';
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
      if (data && data.success) {
        setFeedbacks(feedbacks.filter((f) => f.id !== id));
      } else {
        alert(data.error || 'Failed to delete feedback.');
      }
    );
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Passenger Feedbacks</h2>
          <p className="text-xs text-slate-500 font-medium mt-1">Read suggestions, reviews, and commuter satisfaction ratings.</p>
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
                      {f.feedback_text}
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
