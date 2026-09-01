import React from 'react';
import { X, CheckCircle, MinusCircle, MapPin, Clock, Bus } from 'lucide-react';

interface WaitingStatusModalProps {
  visible: boolean;
  onClose: () => void;
  waitingFeedback: 'waiting' | 'cancelled' | null;
  setWaitingFeedback: (f: 'waiting' | 'cancelled' | null) => void;
  isBoarded: boolean;
  boardedBus: string;
  boardedRoute: string;
  isWaiting: boolean;
  waitingLocation: string;
  waitingSecondsLeft: number | null;
  handleCancelWaiting: () => void;
  isUpdatingWaiting: boolean;
  nearestStopName: string | null;
  handleSetWaiting: (stopName: string) => void;
}

export const WaitingStatusModal: React.FC<WaitingStatusModalProps> = ({
  visible,
  onClose,
  waitingFeedback,
  setWaitingFeedback,
  isBoarded,
  boardedBus,
  boardedRoute,
  isWaiting,
  waitingLocation,
  waitingSecondsLeft,
  handleCancelWaiting,
  isUpdatingWaiting,
  nearestStopName,
  handleSetWaiting
}) => {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 relative border border-slate-100 text-center transform transition-all my-8">
        <button
          type="button"
          onClick={() => {
            setWaitingFeedback(null);
            onClose();
          }}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {waitingFeedback !== null ? (
          <div className="py-4 flex flex-col items-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
              waitingFeedback === 'waiting' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'
            }`}>
              {waitingFeedback === 'waiting' ? (
                <CheckCircle className="w-8 h-8" />
              ) : (
                <MinusCircle className="w-8 h-8" />
              )}
            </div>
            <h3 className="text-base font-black text-slate-800 mb-2">
              {waitingFeedback === 'waiting'
                ? 'You are now registered as a waiting passenger'
                : 'You are currently not waiting for a bus'}
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              {waitingFeedback === 'waiting'
                ? 'Conductors and nearby buses can now see your waiting signal.'
                : 'Your waiting broadcast has been removed.'}
            </p>
          </div>
        ) : (
          <>
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center border-4 border-white shadow-md">
                <img
                  src="/images/waitingMark.svg"
                  alt="Waiting"
                  className="w-12 h-12 object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            </div>

            <h3 className="text-lg font-black text-slate-800 mb-1.5">
              Are you waiting for a bus?
            </h3>
            <p className="text-xs text-slate-400 font-medium mb-4">
              Signal conductors along the Laurel - Tanauan route
            </p>

            {isBoarded ? (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-center">
                  <span className="text-[10px] font-black text-blue-800 uppercase tracking-widest block mb-1">
                    STATUS: BOARDED
                  </span>
                  <div className="text-base font-black text-[#1e3a8a] flex items-center justify-center gap-2 mb-1">
                    <Bus className="w-5 h-5 text-[#1d72f8]" />
                    Bus {boardedBus}
                  </div>
                  <div className="text-[11px] text-blue-600 font-semibold uppercase tracking-wider">
                    Route: {boardedRoute}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3 rounded-full bg-slate-100 text-slate-600 font-bold text-xs hover:bg-slate-200 transition-colors"
                >
                  Close
                </button>
              </div>
            ) : isWaiting ? (
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
                  <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest block mb-1">
                    STATUS: ACTIVE WAITING
                  </span>
                  <div className="text-sm font-bold text-emerald-800 flex items-center justify-center gap-1.5 mb-1.5">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    At {waitingLocation}
                  </div>
                  {waitingSecondsLeft !== null && (
                    <div className="text-[11px] text-emerald-600 font-semibold flex items-center justify-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {waitingSecondsLeft > 0
                        ? `Auto-expires in ${Math.floor(waitingSecondsLeft / 60)}m ${waitingSecondsLeft % 60}s`
                        : 'Expired — refreshing...'}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleCancelWaiting}
                  disabled={isUpdatingWaiting}
                  className="w-full py-3.5 px-6 rounded-full bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-lg shadow-rose-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Stop Waiting Signal
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {nearestStopName ? (
                  <>
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                        RECOGNIZED LOCATION
                      </span>
                      <div className="text-sm font-black text-[#1e3a8a] flex items-center justify-center gap-1.5">
                        <MapPin className="w-4 h-4 text-[#1d72f8]" />
                        {nearestStopName}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSetWaiting(nearestStopName)}
                      disabled={isUpdatingWaiting}
                      className="w-full py-3.5 px-6 rounded-full bg-[#1d72f8] hover:bg-[#1856b0] text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      I AM WAITING FOR A BUS
                    </button>
                  </>
                ) : (
                  <>
                    <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 text-center">
                      <span className="text-[10px] font-black text-rose-800 uppercase tracking-widest block mb-1">
                        UNRECOGNIZED LOCATION
                      </span>
                      <p className="text-xs text-rose-600 font-semibold leading-relaxed">
                        Waiting signals can only be broadcasted near transit stops or designated pickup points.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={onClose}
                      className="w-full py-3 rounded-full bg-slate-100 text-slate-600 font-bold text-xs hover:bg-slate-200 transition-colors"
                    >
                      Close
                    </button>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
export default WaitingStatusModal;
