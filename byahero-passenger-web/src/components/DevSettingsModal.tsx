import React, { useState, useEffect } from 'react';
import { Server, Save, X, RotateCcw } from 'lucide-react';
import { getServerUrl, setServerUrl } from '../services/authService';

interface DevSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved: (newUrl: string) => void;
}

export const DevSettingsModal: React.FC<DevSettingsModalProps> = ({ visible, onClose, onSaved }) => {
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (visible) {
      getServerUrl().then(setUrl);
    }
  }, [visible]);

  if (!visible) return null;

  const handleSave = async () => {
    await setServerUrl(url);
    const updated = await getServerUrl();
    onSaved(updated);
    onClose();
  };

  const handleReset = async () => {
    const defaultUrl = 'https://byahero.alwaysdata.net';
    setUrl(defaultUrl);
    await setServerUrl(defaultUrl);
    onSaved(defaultUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-100 my-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-[#1d72f8]">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Developer Server Settings</h3>
              <p className="text-xs text-slate-400 font-medium">Configure Laravel Backend API Endpoint</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Target Backend URL
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://byahero.alwaysdata.net"
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d72f8]/40"
            />
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl text-xs text-slate-600 space-y-1.5 border border-slate-100">
            <div className="font-semibold text-slate-700">Quick Presets:</div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => setUrl('https://byahero.alwaysdata.net')}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-blue-50 hover:text-blue-600 font-mono text-[11px]"
              >
                AlwaysData (Production)
              </button>
              <button
                type="button"
                onClick={() => setUrl('http://localhost/ByaHero')}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-blue-50 hover:text-blue-600 font-mono text-[11px]"
              >
                Local XAMPP (Apache)
              </button>
              <button
                type="button"
                onClick={() => setUrl('http://localhost:8000')}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-blue-50 hover:text-blue-600 font-mono text-[11px]"
              >
                Artisan Serve (:8000)
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-slate-500 hover:bg-slate-100 font-semibold text-xs transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Default
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-[#1d72f8] text-white font-bold text-xs shadow-md shadow-blue-500/20 hover:bg-[#1856b0] transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              Save Config
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default DevSettingsModal;
