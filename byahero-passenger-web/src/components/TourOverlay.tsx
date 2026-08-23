import React from 'react';
import { ChevronRight, ChevronLeft, X, Sparkles } from 'lucide-react';

export interface TourStep {
  title: string;
  description: string;
  targetId?: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    title: 'Welcome to ByaHero!',
    description: 'Track buses in real-time, view live seat availability, and travel safely across Laurel, Talisay, and Tanauan.',
  },
  {
    title: 'Top Navigation & Menu',
    description: 'Access your profile, notifications, ride history, lost & found, problem reporting, and settings from the top header.',
  },
  {
    title: 'Emergency SOS Panic Trigger',
    description: 'Need immediate assistance? Tap the SOS button anytime to broadcast your GPS location to emergency responders and family.',
  },
  {
    title: 'Live Interactive Transit Map',
    description: 'View moving buses, stops, route paths, and your live GPS location marker on the map in real-time.',
  },
  {
    title: 'Active Buses Directory',
    description: 'Filter buses by route, check seat occupancy (available / full), speeds, and conductor assignments.',
  },
  {
    title: 'Routes & Timetables',
    description: 'Check official operating schedules, departure frequency, and route paths for Laurel and Tanauan trips.',
  },
  {
    title: 'Circles - Family & Friends',
    description: 'Share your live location with family and loved ones using a private 6-character circle invite code.',
  },
  {
    title: 'Bus Stops & Distance',
    description: 'Browse all designated pickup stops with live distance calculations from your current location.',
  },
  {
    title: 'Waiting for Bus Signal',
    description: 'Tap "I am waiting" at a pickup stop to notify incoming conductors and reserve your spot.',
  },
  {
    title: 'GPS Recenter',
    description: 'Tap the GPS button anytime to bring the camera view right back to your current position.',
  }
];

interface TourOverlayProps {
  currentStep: number;
  onStepChange: (step: number) => void;
  onClose: () => void;
}

export const TourOverlay: React.FC<TourOverlayProps> = ({
  currentStep,
  onStepChange,
  onClose,
}) => {
  const step = TOUR_STEPS[currentStep] || TOUR_STEPS[0];
  const isLast = currentStep === TOUR_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[9990] flex items-end sm:items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in pointer-events-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-100 text-left relative overflow-hidden mb-6 sm:mb-0">
        {/* Top accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#1d72f8] via-blue-500 to-indigo-600" />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-[#1d72f8] font-black text-xs">
              {currentStep + 1}
            </span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Step {currentStep + 1} of {TOUR_STEPS.length}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-black text-slate-800 mb-2 flex items-center gap-2">
            {currentStep === 0 && <Sparkles className="w-5 h-5 text-amber-500" />}
            {step.title}
          </h3>
          <p className="text-sm text-slate-600 font-medium leading-relaxed">
            {step.description}
          </p>
        </div>

        {/* Progress dots & buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="flex gap-1.5">
            {TOUR_STEPS.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentStep ? 'w-6 bg-[#1d72f8]' : 'w-1.5 bg-slate-200'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={() => onStepChange(currentStep - 1)}
                className="p-2 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (isLast) {
                  onClose();
                } else {
                  onStepChange(currentStep + 1);
                }
              }}
              className="flex items-center gap-1 py-2 px-5 rounded-full bg-[#1d72f8] hover:bg-[#1856b0] text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all"
            >
              {isLast ? 'Get Started' : 'Next'}
              {!isLast && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default TourOverlay;
