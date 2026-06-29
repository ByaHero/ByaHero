import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, MessageSquare, Star, Trash2, StarHalf } from 'lucide-react';
import { apiRequest } from '../services/api';
import Modal from '../components/Modal';

interface PassengerFeedback {
  id: number;
  created_at: string;
  rating: number;
  passenger_name?: string;
  user_id?: number;
  passenger_email?: string;
  feedback_text?: string;
}

interface FeedbackStats {
  totalFeedbacks: number;
  averageRating: number;
  totalComments: number;
}

export default function FeedbackPage() {
  const [loading, setLoading] = useState(true);
  const [feedbacks, setFeedbacks] = useState<PassengerFeedback[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);

  // Modals
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: '' });
  const [errorModal, setErrorModal] = useState({ isOpen: false, message: '' });
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean, id: number | null }>({ isOpen: false, id: null });

  const fetchFeedbacks = useCallback(async () => {
    try {
      const data = await apiRequest('/api/admin/feedbacks'); // Or manageFeedbacks.php?json=1
      if (data.success !== false) {
        setFeedbacks(data.feedbacks || []);
        
        if (data.totalFeedbacks > 0) {
          setStats({
            totalFeedbacks: data.totalFeedbacks,
            averageRating: parseFloat(data.averageRating),
            totalComments: data.totalComments
          });
        } else {
          setStats(null);
        }
      } else {
        setErrorModal({ isOpen: true, message: data.error || 'Failed to fetch feedbacks.' });
      }
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
      setErrorModal({ isOpen: true, message: 'Network error while fetching feedbacks.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  const executeDelete = async () => {
    if (!deleteConfirm.id) return;
    try {
      const data = await apiRequest('/api/admin/feedbacks', {
        method: 'POST',
        body: JSON.stringify({ action: 'delete_feedback', id: deleteConfirm.id })
      });
      if (data.success) {
        setDeleteConfirm({ isOpen: false, id: null });
        setSuccessModal({ isOpen: true, message: data.message || 'Feedback deleted successfully.' });
        fetchFeedbacks();
      } else {
        setDeleteConfirm({ isOpen: false, id: null });
        setErrorModal({ isOpen: true, message: data.error || 'Failed to delete feedback.' });
      }
    } catch (error) {
      setDeleteConfirm({ isOpen: false, id: null });
      setErrorModal({ isOpen: true, message: 'Network error while deleting feedback.' });
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

  const renderStars = (rating: number, size = 20) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= Math.round(rating)) {
        stars.push(<Star key={i} size={size} className="text-yellow-400 fill-yellow-400 mr-0.5" />);
      } else {
        stars.push(<Star key={i} size={size} className="text-slate-200 fill-slate-200 mr-0.5" />);
      }
    }
    return <div className="flex items-center">{stars}</div>;
  };

  return (
    <div className="p-4 pt-6 max-w-3xl mx-auto w-full pb-16 font-sans bg-slate-50 min-h-screen">
      
      <div className="mb-6 flex items-center">
        <div className="bg-blue-100 p-2.5 rounded-2xl mr-4">
          <MessageSquare size={28} className="text-[#0f3878]" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-[#0f3878] tracking-tight">Passenger Feedbacks</h1>
          <p className="text-slate-500 text-[14px] mt-1">Review commuter ratings and comments</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={32} className="text-[#1d4ed8] animate-spin" />
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          {stats && (
            <div className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 h-full">
                  <div className="text-4xl font-extrabold text-[#1d4ed8]">{stats.averageRating.toFixed(1)}</div>
                  <div>
                    <div className="text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1">Average Rating</div>
                    <div className="flex items-center">
                      {renderStars(stats.averageRating, 18)}
                      <span className="ml-2 text-slate-400 text-[12px] font-medium">({stats.totalFeedbacks} ratings)</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 h-full">
                  <div className="bg-blue-50 p-3 rounded-2xl">
                    <MessageSquare size={28} className="text-[#1d4ed8]" />
                  </div>
                  <div>
                    <div className="text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1">Total Comments</div>
                    <div className="text-2xl font-extrabold text-slate-800">{stats.totalComments}</div>
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-200 my-6"></div>
            </div>
          )}

          {feedbacks.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center shadow-sm border border-slate-100 mt-4">
              <MessageSquare size={48} className="text-slate-200 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">No feedbacks submitted yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {feedbacks.map(fb => {
                const firstName = (fb.passenger_name || 'Unknown User').split(' ')[0];

                return (
                  <div key={fb.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                    {/* Header */}
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                      <div className="flex items-center text-[#1d4ed8] font-bold uppercase tracking-wider text-[14px]">
                        <MessageSquare size={18} className="mr-2" />
                        FEEDBACK #{fb.id}
                      </div>
                      <span className="text-slate-500 text-[12px] font-medium">{formatDate(fb.created_at)}</span>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                      <div>
                        <span className="block text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1">Passenger</span>
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 h-full">
                          <div className="text-slate-800 text-[14px] font-bold">#{fb.user_id || '?'} - {firstName}</div>
                          <div className="text-slate-500 text-[12px] mt-1 break-all">{fb.passenger_email}</div>
                        </div>
                      </div>
                      <div>
                        <span className="block text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1">Rating</span>
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 h-full flex items-center min-h-[48px]">
                          {renderStars(fb.rating)}
                        </div>
                      </div>
                    </div>

                    {/* Comments */}
                    <div className="mb-2">
                      <span className="block text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1">Comments</span>
                      {fb.feedback_text && fb.feedback_text.trim() !== '' ? (
                        <div className="bg-slate-50 rounded-xl p-4 text-slate-700 text-[14px] whitespace-pre-wrap border border-slate-100 leading-relaxed">
                          {fb.feedback_text}
                        </div>
                      ) : (
                        <div className="bg-slate-50 rounded-xl p-4 text-slate-400 italic text-[14px] border border-slate-100">
                          No additional comments.
                        </div>
                      )}
                    </div>

                    <div className="border-t border-slate-100 my-4"></div>

                    {/* Footer Actions */}
                    <div className="flex justify-end items-center">
                      <button 
                        onClick={() => setDeleteConfirm({ isOpen: true, id: fb.id })}
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
        </>
      )}

      {/* Confirmation and Alert Modals */}
      <Modal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
        title="Delete Feedback"
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
        <p>Are you sure you want to permanently delete this passenger feedback? This action cannot be undone.</p>
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
