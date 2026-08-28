import React, { useState, useEffect } from 'react';
import PassengerHeader from '../../../components/PassengerNavbar';
import PassengerFooter from '../../../components/PassengerFooter';
import { MaterialIcons } from '../../../components/ui/MaterialIcons';

export const AccessibilitySettings: React.FC = () => {
  const [textSize, setTextSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [highContrast, setHighContrast] = useState(false);
  const [screenReader, setScreenReader] = useState(false);

  useEffect(() => {
    const storedSize = localStorage.getItem('byahero_text_size');
    const storedContrast = localStorage.getItem('byahero_high_contrast');
    const storedReader = localStorage.getItem('byahero_screen_reader');

    if (storedSize) setTextSize(storedSize as any);
    if (storedContrast) setHighContrast(storedContrast === '1');
    if (storedReader) setScreenReader(storedReader === '1');
  }, []);

  const saveSetting = (key: string, value: string) => {
    localStorage.setItem(key, value);
    if (key === 'byahero_high_contrast') {
      if (value === '1') {
        document.documentElement.classList.add('contrast-more');
      } else {
        document.documentElement.classList.remove('contrast-more');
      }
    }
  };

  const adjustTextSize = (direction: 'up' | 'down') => {
    let nextSize: 'small' | 'medium' | 'large' = 'medium';
    if (direction === 'down') {
      if (textSize === 'large') nextSize = 'medium';
      else nextSize = 'small';
    } else {
      if (textSize === 'small') nextSize = 'medium';
      else nextSize = 'large';
    }
    setTextSize(nextSize);
    saveSetting('byahero_text_size', nextSize);
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex flex-col bg-white overflow-hidden">
      <PassengerHeader pageTitle="Accessibility" showBackButton={true} />

      <div className="flex-1 overflow-y-auto w-full overscroll-contain">
        <div className="max-w-md mx-auto w-full pb-8">
          <div className="p-4 bg-slate-100/70 min-h-[560px] mt-4 rounded-t-[32px]">
            <h1 className="text-lg font-black text-slate-800 mb-1 px-1">Accessibility Settings</h1>
            <p className="text-xs text-slate-400 font-medium mb-5 px-1">
              Customize your experience to make ByaHero easier to use.
            </p>

            {/* Text Size Card */}
            <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm mb-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 mr-3">
                  <h3 className="text-sm font-bold text-slate-800">Text Size</h3>
                  <p className="text-xs text-slate-400 mt-0.5 font-semibold">
                    Adjust text size for better readability.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => adjustTextSize('down')}
                    disabled={textSize === 'small'}
                    className="w-10 h-10 rounded-xl bg-slate-100 flex justify-center items-center font-bold text-slate-700 disabled:opacity-40"
                  >
                    A-
                  </button>

                  <span className="text-xs font-bold text-[#1e3a8a] text-center w-14 uppercase">
                    {textSize}
                  </span>

                  <button
                    type="button"
                    onClick={() => adjustTextSize('up')}
                    disabled={textSize === 'large'}
                    className="w-10 h-10 rounded-xl bg-slate-100 flex justify-center items-center font-bold text-slate-700 disabled:opacity-40"
                  >
                    A+
                  </button>
                </div>
              </div>
            </div>

            {/* High Contrast Mode Switch */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm mb-4 overflow-hidden p-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">High Contrast Mode</h3>
                <p className="text-xs text-slate-400 mt-0.5 font-semibold">
                  Increase contrast for better visibility.
                </p>
              </div>
              <input
                type="checkbox"
                checked={highContrast}
                onChange={(e) => {
                  setHighContrast(e.target.checked);
                  saveSetting('byahero_high_contrast', e.target.checked ? '1' : '0');
                }}
                className="w-5 h-5 accent-[#1e3a8a] rounded cursor-pointer"
              />
            </div>

            {/* Screen Reader Switch */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Screen Reader Support</h3>
                <p className="text-xs text-slate-400 mt-0.5 font-semibold">
                  Optimize for screen reader compatibility.
                </p>
              </div>
              <input
                type="checkbox"
                checked={screenReader}
                onChange={(e) => {
                  setScreenReader(e.target.checked);
                  saveSetting('byahero_screen_reader', e.target.checked ? '1' : '0');
                }}
                className="w-5 h-5 accent-[#1e3a8a] rounded cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      <PassengerFooter activeTab="location" />
    </div>
  );
};
export default AccessibilitySettings;
