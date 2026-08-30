import React, { useState } from 'react';
import { useTracking } from '../context/TrackingContext';
import { MapPin, AlertTriangle, X, RefreshCw } from 'lucide-react';

export const LocationPromptBanner: React.FC = () => {
  const {
    userLocation,
    locationPermission,
    isLocating,
    locationError,
    requestLocationPermission,
  } = useTracking();

  const [dismissed, setDismissed] = useState(false);

  // If location is active or user dismissed banner, hide it
  if (userLocation || dismissed) return null;

  if (locationPermission === 'denied') {
    return (
      <div className="absolute top-20 left-4 right-4 md:left-6 md:right-auto md:max-w-md z-[1040] animate-in fade-in slide-in-from-top duration-300">
        <div className="bg-amber-500/95 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-xl border border-amber-400 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-100 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <p className="font-bold text-sm">Location Access Required</p>
            <p className="text-amber-100 mt-0.5 leading-snug">
              On iPhone / Safari, tap the <strong>aA</strong> icon in the address bar &gt; <em>Website Settings</em> &gt; <em>Location: Allow</em> (or in iOS <em>Settings &gt; Safari &gt; Location</em>).
            </p>
            <button
              onClick={() => requestLocationPermission()}
              className="mt-2 inline-flex items-center gap-1 bg-white text-amber-900 font-bold px-3 py-1.5 rounded-lg shadow-sm text-xs hover:bg-amber-50 active:scale-95 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
              {isLocating ? 'Checking...' : 'Try Again'}
            </button>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-amber-200 hover:text-white p-1 -mr-1 -mt-1"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute top-20 left-4 right-4 md:left-6 md:right-auto md:max-w-md z-[1040] animate-in fade-in slide-in-from-top duration-300">
      <div className="bg-[#103d7c]/95 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-xl border border-blue-400/30 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0 text-blue-300">
            <MapPin className="w-5 h-5 animate-bounce" />
          </div>
          <div className="min-w-0">
            <p className="font-black text-xs uppercase tracking-wider text-blue-200">Live GPS Tracking</p>
            <p className="text-xs text-white/90 truncate">Tap to enable location & find nearby buses</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => requestLocationPermission()}
            disabled={isLocating}
            className="bg-[#1d72f8] hover:bg-blue-600 active:scale-95 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-md transition-all whitespace-nowrap flex items-center gap-1 disabled:opacity-75"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
            {isLocating ? 'Locating...' : 'Enable'}
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-blue-300 hover:text-white p-1"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
export default LocationPromptBanner;
