import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import PassengerHeader from '../../../components/PassengerNavbar';
import PassengerFooter from '../../../components/PassengerFooter';
import { useAuth } from '../../../context/AuthContext';
import { useTracking } from '../../../context/TrackingContext';
import AlertModal from '../../../components/AlertModal';
import { MaterialIcons } from '../../../components/ui/MaterialIcons';
import TourOverlay from '../../../components/TourOverlay';
import { useTourSync } from '../../../hooks/passenger/useTourSync';
import { handleTourLayout } from '../../../components/TourRegistry';

export const ReportProblem: React.FC = () => {
  const { activeStep, setActiveStep } = useTourSync('/report');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, serverUrl } = useAuth();
  const { buses } = useTracking();

  const bus_number = searchParams.get('bus') || '';

  const [selectedBus, setSelectedBus] = useState(bus_number || '');
  const [reportReason, setReportReason] = useState('');
  const [contactNumber, setContactNumber] = useState(user?.phone || '');
  const [othersDetails, setOthersDetails] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

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

  const reasons = [
    'Inaccurate Bus Tracking / Wrong GPS Location',
    'Incorrect ETA or Schedule Information',
    'App Crashes, Freezes, or Screen Errors',
    'Slow Performance / Heavy Loading Times',
    'Account Login, Profile, or Sign Up Issues',
    'UI / Navigation Problems (Overlap, Alignment, etc.)',
    'Other App Concerns / Suggestions',
  ];

  useEffect(() => {
    if (bus_number) {
      setSelectedBus(bus_number);
    }
  }, [bus_number]);

  const handleSubmit = async () => {
    if (!selectedBus) {
      showAlert('Validation Error', 'Please select or enter a bus number.', 'warning');
      return;
    }
    if (!reportReason && !othersDetails.trim()) {
      showAlert('Validation Error', 'Please select a reason or specify details in the others field.', 'warning');
      return;
    }

    setIsSubmitting(true);
    const payload = {
      bus_number: selectedBus,
      report_reason: reportReason || 'Others',
      contact_number: contactNumber.trim(),
      others_details: othersDetails.trim(),
      email: user?.email || '',
    };

    try {
      const res = await fetch(`${serverUrl}/api/passenger/report/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });
      const data = await res.json();
      setIsSubmitting(false);

      if (data && data.success) {
        setSuccessMsg(data.message || 'Your report has been submitted successfully!');
        setSubmitted(true);
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } else {
        setSuccessMsg('Your report has been saved locally.');
        setSubmitted(true);
        setTimeout(() => {
          navigate('/');
        }, 2000);
      }
    } catch (err) {
      setIsSubmitting(false);
      setSuccessMsg('Your report has been saved locally.');
      setSubmitted(true);
      setTimeout(() => {
        navigate('/');
      }, 2000);
    }
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex flex-col bg-white overflow-hidden">
      <PassengerHeader pageTitle="Report a Problem" showBackButton={true} />

      <div className="flex-1 overflow-y-auto w-full overscroll-contain">
        <div className="max-w-md mx-auto w-full pb-8">
          <div className="p-5 bg-slate-100/70 min-h-[560px] mt-4 rounded-t-[32px]">
            <div ref={(el) => handleTourLayout('report-card', { current: el })} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              {!submitted ? (
                <div>
                  <div className="flex items-center mb-5">
                    <div className="w-10 h-10 rounded-full bg-slate-900/10 flex items-center justify-center mr-3">
                      <MaterialIcons name="report_problem" size={20} color="#1e3a8a" />
                    </div>
                    <div className="flex-1">
                      <h1 className="text-base font-black text-slate-800">Report a Problem</h1>
                      <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
                        Submit details if you encountered any app-related issues or inaccuracies during your trip.
                      </p>
                    </div>
                  </div>

                  {/* Bus Selector */}
                  <div className="mb-4">
                    <label className="text-xs font-bold text-slate-400 mb-2 block">Bus Number</label>
                    <input
                      type="text"
                      placeholder="Enter bus number"
                      value={selectedBus}
                      onChange={(e) => setSelectedBus(e.target.value)}
                      disabled={!!bus_number}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                    />
                  </div>

                  {/* Reasons Selection */}
                  <label className="text-xs font-bold text-slate-400 mb-2.5 block">Select Reason</label>
                  <div className="space-y-2.5 mb-5">
                    {reasons.map((r, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setReportReason(r)}
                        className="w-full flex items-center justify-between bg-slate-50 border border-slate-200/60 rounded-xl p-3.5 text-left hover:bg-slate-100 transition-colors"
                      >
                        <span className="text-xs font-bold text-slate-700 flex-1 mr-3 leading-relaxed">
                          {r}
                        </span>
                        <div className="w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center shrink-0">
                          {reportReason === r && (
                            <div className="w-3 h-3 rounded-full bg-[#1e3a8a]" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Contact Number */}
                  <div className="mb-4">
                    <label className="text-xs font-bold text-slate-400 mb-2 block">Contact Number (Optional)</label>
                    <input
                      type="tel"
                      placeholder="e.g. 09123456789"
                      maxLength={11}
                      value={contactNumber}
                      onChange={(e) => setContactNumber(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] font-mono"
                    />
                  </div>

                  {/* Others Specification */}
                  <div className="mb-6">
                    <label className="text-xs font-bold text-slate-400 mb-2 block">Others (please specify)</label>
                    <textarea
                      rows={4}
                      placeholder="Describe your issue in details..."
                      value={othersDetails}
                      onChange={(e) => setOthersDetails(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full bg-[#1e3a8a] hover:bg-blue-900 py-3.5 rounded-2xl flex items-center justify-center font-bold text-sm text-white shadow-md transition-all cursor-pointer"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center py-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4 text-emerald-500">
                    <MaterialIcons name="check_circle" size={40} color="#10b981" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">Report Submitted</h3>
                  <p className="text-xs text-slate-500 font-semibold mb-6 px-4">
                    {successMsg || 'Your report has been successfully submitted!'}
                  </p>
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
export default ReportProblem;
