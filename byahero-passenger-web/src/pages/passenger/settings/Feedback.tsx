import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PassengerHeader from '../../../components/PassengerNavbar';
import PassengerFooter from '../../../components/PassengerFooter';
import { useAuth } from '../../../context/AuthContext';
import { MaterialIcons } from '../../../components/ui/MaterialIcons';
import AlertModal from '../../../components/AlertModal';
import { Loader2 } from 'lucide-react';
import TourOverlay from '../../../components/TourOverlay';
import { useTourSync } from '../../../hooks/passenger/useTourSync';

interface UserFeedbackData {
  id?: number;
  rating: number;
  feedback_text: string;
  updated_at?: string;
}

export const Feedback: React.FC = () => {
  const { activeStep, setActiveStep } = useTourSync('/settings/feedback');
  const navigate = useNavigate();
  const { user, serverUrl } = useAuth();

  const [rating, setRating] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>('');
  const [existingFeedback, setExistingFeedback] = useState<UserFeedbackData | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // AlertModal state
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning' | 'confirm';
    onConfirm: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'error',
    onConfirm: () => {},
  });

  const showAlert = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'info' | 'warning' | 'confirm' = 'error',
    onConfirm?: () => void
  ) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      type,
      onConfirm: () => {
        setAlertConfig((p) => ({ ...p, visible: false }));
        if (onConfirm) onConfirm();
      },
    });
  };

  useEffect(() => {
    async function loadInitialData() {
      try {
        const cached = localStorage.getItem('byahero_cached_user_feedback');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.rating) {
            setExistingFeedback(parsed);
            setRating(parsed.rating);
            setFeedback(parsed.feedback_text || '');
            setIsEditing(false);
          }
        }
      } catch (e) {}

      await fetchUserFeedback();
    }

    loadInitialData();
  }, []);

  const fetchUserFeedback = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${serverUrl}/api/settings/feedback`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const data = await res.json();
      setIsLoading(false);

      if (data && data.success && data.feedback) {
        const fbData: UserFeedbackData = {
          id: data.feedback.id,
          rating: Number(data.feedback.rating) || 0,
          feedback_text: data.feedback.feedback_text || '',
          updated_at: data.feedback.updated_at,
        };
        setExistingFeedback(fbData);
        setRating(fbData.rating);
        setFeedback(fbData.feedback_text);
        setIsEditing(false);
        localStorage.setItem('byahero_cached_user_feedback', JSON.stringify(fbData));
      } else {
        if (!existingFeedback) {
          setIsEditing(true);
        }
      }
    } catch (e) {
      setIsLoading(false);
      if (!existingFeedback) {
        setIsEditing(true);
      }
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      showAlert('Validation Error', 'Please select a star rating.', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append('rating', rating.toString());
      formData.append('feedback', feedback.trim());

      const res = await fetch(`${serverUrl}/api/settings/feedback`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const data = await res.json();
      setIsSaving(false);

      const updatedData: UserFeedbackData = {
        rating,
        feedback_text: feedback.trim(),
        updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
      };
      setExistingFeedback(updatedData);
      setIsEditing(false);
      localStorage.setItem('byahero_cached_user_feedback', JSON.stringify(updatedData));
      showAlert(
        'Success',
        existingFeedback ? 'Your feedback has been updated.' : 'Thank you for your feedback!',
        'success'
      );
    } catch (e) {
      setIsSaving(false);
      const offlineData: UserFeedbackData = {
        rating,
        feedback_text: feedback.trim(),
        updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
      };
      setExistingFeedback(offlineData);
      setIsEditing(false);
      localStorage.setItem('byahero_cached_user_feedback', JSON.stringify(offlineData));
      showAlert('Saved Locally', 'Feedback saved locally.', 'info');
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await fetch(`${serverUrl}/api/settings/feedback/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
    } catch (e) {}

    setIsDeleting(false);
    setExistingFeedback(null);
    setRating(0);
    setFeedback('');
    setIsEditing(true);
    localStorage.removeItem('byahero_cached_user_feedback');
    showAlert('Removed', 'Your feedback has been deleted.', 'success');
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex flex-col bg-white overflow-hidden">
      <PassengerHeader pageTitle="Feedback" showBackButton={true} />

      <div className="flex-1 overflow-y-auto w-full overscroll-contain">
        <div className="max-w-md mx-auto w-full pb-8">
          <div className="p-5 bg-slate-100/70 min-h-[560px] mt-4 rounded-t-[32px]">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              {isLoading ? (
                <div className="py-12 flex flex-col items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-[#1e3a8a]" />
                  <span className="text-xs text-slate-400 font-semibold mt-3">Loading feedback...</span>
                </div>
              ) : existingFeedback && !isEditing ? (
                /* VIEW MODE */
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h2 className="text-base font-black text-[#1e3a8a]">Your Feedback</h2>
                    {existingFeedback.updated_at && (
                      <span className="text-[11px] font-semibold text-slate-400">
                        {existingFeedback.updated_at.substring(0, 10)}
                      </span>
                    )}
                  </div>

                  {/* Stars Display */}
                  <div className="flex items-center mb-4">
                    {[1, 2, 3, 4, 5].map((starVal) => (
                      <MaterialIcons
                        key={starVal}
                        name={starVal <= existingFeedback.rating ? 'star' : 'star_outline'}
                        size={28}
                        color={starVal <= existingFeedback.rating ? '#f59e0b' : '#cbd5e1'}
                        className="mr-1"
                      />
                    ))}
                    <span className="ml-2 text-sm font-bold text-slate-700">
                      {existingFeedback.rating} / 5
                    </span>
                  </div>

                  {/* Feedback Comment Box */}
                  {existingFeedback.feedback_text ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6">
                      <p className="text-sm text-slate-700 font-semibold leading-relaxed">
                        "{existingFeedback.feedback_text}"
                      </p>
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6">
                      <span className="text-xs text-slate-400 italic">No written review provided.</span>
                    </div>
                  )}

                  {/* Action Buttons: Edit and Delete */}
                  <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="flex items-center px-4 py-2.5 bg-rose-50 rounded-xl border border-rose-200 text-xs font-bold text-rose-600 hover:bg-rose-100 cursor-pointer"
                    >
                      <MaterialIcons name="delete_outline" size={18} color="#e11d48" className="mr-1.5" />
                      <span>{isDeleting ? 'Removing...' : 'Delete'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setRating(existingFeedback.rating);
                        setFeedback(existingFeedback.feedback_text);
                        setIsEditing(true);
                      }}
                      className="flex items-center px-4 py-2.5 bg-[#1e3a8a] rounded-xl shadow-sm text-xs font-bold text-white hover:bg-blue-900 cursor-pointer"
                    >
                      <MaterialIcons name="edit" size={18} color="#ffffff" className="mr-1.5" />
                      <span>Edit Feedback</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* EDIT MODE */
                <div>
                  <h2 className="text-xl font-black text-[#1e3a8a] text-center mb-1">
                    {existingFeedback ? 'Edit your feedback' : 'Help us improve!'}
                  </h2>
                  <p className="text-xs text-slate-400 text-center font-semibold mb-6">
                    {existingFeedback
                      ? 'Update your star rating and review for ByaHero.'
                      : 'How would you rate your experience with ByaHero?'}
                  </p>

                  {/* Star Rating Selector */}
                  <div className="flex justify-center gap-3.5 p-4 mb-5 bg-slate-50 rounded-2xl border border-slate-100">
                    {[1, 2, 3, 4, 5].map((starVal) => (
                      <button
                        key={starVal}
                        type="button"
                        onClick={() => setRating(starVal)}
                        className="p-1 hover:scale-110 transition-transform cursor-pointer"
                      >
                        <MaterialIcons
                          name={starVal <= rating ? 'star' : 'star_outline'}
                          size={36}
                          color={starVal <= rating ? '#f59e0b' : '#cbd5e1'}
                        />
                      </button>
                    ))}
                  </div>

                  {/* Feedback Text Area */}
                  <div className="mb-5">
                    <label className="text-xs font-bold text-slate-400 mb-2 block">
                      Additional Information (What would you like to say?)
                    </label>
                    <textarea
                      rows={4}
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Share your thoughts, suggestions, or report issues..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                    />
                  </div>

                  {/* Submit & Cancel Buttons */}
                  <div className="flex justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => (existingFeedback ? setIsEditing(false) : navigate(-1))}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 py-3 rounded-2xl font-bold text-sm text-slate-500 border border-slate-200 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={rating === 0 || isSaving}
                      className={`flex-1 py-3 rounded-2xl font-bold text-sm transition-all cursor-pointer ${
                        rating > 0
                          ? 'bg-[#1e3a8a] text-white shadow-md hover:bg-blue-900'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {isSaving ? 'Saving...' : existingFeedback ? 'Update' : 'Submit'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <PassengerFooter activeTab="location" />

      <AlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={alertConfig.onConfirm}
      />

      {activeStep !== null && (
        <TourOverlay
          currentStep={activeStep}
          onStepChange={setActiveStep}
          onClose={() => setActiveStep(null)}
        />
      )}
    </div>
  );
};
export default Feedback;
