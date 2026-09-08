import React, { useState, useEffect } from 'react';
import { Server, Save, X, RotateCcw, Terminal, RefreshCw, Trash2, Copy, Check, Activity } from 'lucide-react';
import { getServerUrl, setServerUrl } from '../services/authService';
import { debugLogger, LogEntry } from '../utils/debugLogger';

interface DevSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved: (newUrl: string) => void;
}

export const DevSettingsModal: React.FC<DevSettingsModalProps> = ({ visible, onClose, onSaved }) => {
  const [activeTab, setActiveTab] = useState<'config' | 'console'>('config');
  const [url, setUrl] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [copied, setCopied] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      getServerUrl().then(setUrl);
      setLogs(debugLogger.getLogs());

      const unsubscribe = debugLogger.subscribe((updatedLogs) => {
        setLogs(updatedLogs);
      });

      return () => unsubscribe();
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

  const handleTestPing = async () => {
    const target = url.trim() || 'https://byahero.alwaysdata.net';
    setIsPinging(true);
    setPingResult('Pinging server...');
    const start = Date.now();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${target}/api/ping`, { signal: controller.signal });
      clearTimeout(timeout);
      const ms = Date.now() - start;

      if (res.ok) {
        setPingResult(`✅ Online (HTTP ${res.status}, ${ms}ms)`);
      } else {
        setPingResult(`⚠️ HTTP ${res.status} (${ms}ms)`);
      }
    } catch (e: any) {
      const ms = Date.now() - start;
      if (e.name === 'AbortError') {
        setPingResult(`❌ Timed out after 8s`);
      } else {
        setPingResult(`❌ Failed to connect (${e.message || 'refused'})`);
      }
    } finally {
      setIsPinging(false);
    }
  };

  const handleCopyLogs = () => {
    try {
      navigator.clipboard.writeText(JSON.stringify(logs, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-slate-100 my-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-[#1d72f8]">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Developer & Error Console</h3>
              <p className="text-xs text-slate-400 font-medium">Diagnostics & Backend Configuration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl mb-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className={`flex-1 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'config' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Server Config</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('console')}
            className={`flex-1 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'console' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Live Logs ({logs.length})</span>
          </button>
        </div>

        {activeTab === 'config' ? (
          <>
            <div className="space-y-4 mb-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Target Backend URL
                  </label>
                  <button
                    type="button"
                    onClick={handleTestPing}
                    disabled={isPinging}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isPinging ? 'animate-spin' : ''}`} />
                    <span>Test Ping</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://byahero.alwaysdata.net"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d72f8]/40"
                />
                {pingResult && (
                  <div className="mt-1.5 text-xs font-mono font-semibold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                    {pingResult}
                  </div>
                )}
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl text-xs text-slate-600 space-y-1.5 border border-slate-100">
                <div className="font-semibold text-slate-700">Quick Presets:</div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setUrl('https://byahero.alwaysdata.net')}
                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-blue-50 hover:text-blue-600 font-mono text-[11px] cursor-pointer"
                  >
                    AlwaysData (Production)
                  </button>
                  <button
                    type="button"
                    onClick={() => setUrl('http://localhost/ByaHero')}
                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-blue-50 hover:text-blue-600 font-mono text-[11px] cursor-pointer"
                  >
                    Local XAMPP (Apache)
                  </button>
                  <button
                    type="button"
                    onClick={() => setUrl('http://localhost:8000')}
                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-blue-50 hover:text-blue-600 font-mono text-[11px] cursor-pointer"
                  >
                    Artisan Serve (:8000)
                  </button>
                </div>
              </div>

              {/* Mobile Notice */}
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/60 text-[11.5px] text-amber-900 leading-relaxed">
                <strong>Mobile Tip:</strong> If accessing via mobile phone on 4G or Wi-Fi, <code>localhost</code> will not work because it points to the phone. Use the AlwaysData URL or your computer's local Wi-Fi IP address.
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-slate-500 hover:bg-slate-100 font-semibold text-xs transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Default
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-full border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-[#1d72f8] text-white font-bold text-xs shadow-md shadow-blue-500/20 hover:bg-[#1856b0] transition-colors cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Config
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Live Console Tab */
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-[#1d72f8]" />
                Recent Console Events
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyLogs}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-bold text-slate-700 cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy All'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => debugLogger.clearLogs()}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-[11px] font-bold text-slate-500 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              </div>
            </div>

            <div className="bg-slate-950 text-slate-200 p-3 rounded-2xl font-mono text-[11px] h-64 overflow-y-auto space-y-2 border border-slate-800 shadow-inner">
              {logs.length === 0 ? (
                <div className="text-slate-500 text-center py-8">No console events captured yet.</div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="border-b border-slate-800/60 pb-1.5 last:border-b-0">
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="text-slate-500">{log.timestamp}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold uppercase ${
                          log.level === 'error'
                            ? 'bg-rose-950 text-rose-400 border border-rose-800'
                            : log.level === 'warn'
                            ? 'bg-amber-950 text-amber-400 border border-amber-800'
                            : log.level === 'success'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-blue-950 text-blue-400 border border-blue-800'
                        }`}
                      >
                        {log.level}
                      </span>
                      <span className="text-slate-400 font-bold">[{log.tag}]</span>
                    </div>
                    <div className="text-slate-200 mt-0.5 break-words">{log.message}</div>
                    {log.data && (
                      <pre className="mt-1 text-[10px] text-slate-400 overflow-x-auto bg-slate-900/80 p-1.5 rounded border border-slate-800/80 whitespace-pre-wrap">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Close Console
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DevSettingsModal;
