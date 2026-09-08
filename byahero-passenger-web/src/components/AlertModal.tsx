import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle, Info, XCircle, Terminal, Copy, Check, ChevronDown, ChevronUp, RefreshCw, Server } from 'lucide-react';
import { ApiDiagnosticInfo } from '../utils/debugLogger';

export interface AlertModalConfig {
  visible: boolean;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning' | 'confirm';
  confirmText?: string;
  cancelText?: string;
  diagnosticInfo?: ApiDiagnosticInfo | Record<string, any> | string;
  onConfirm: () => void;
  onCancel?: () => void;
}

interface AlertModalProps extends AlertModalConfig {
  onClose?: () => void;
}

export const AlertModal: React.FC<AlertModalProps> = ({
  visible,
  title,
  message,
  type = 'info',
  confirmText = 'OK',
  cancelText = 'Cancel',
  diagnosticInfo,
  onConfirm,
  onCancel,
}) => {
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<string | null>(null);

  if (!visible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-12 h-12 text-emerald-500" />;
      case 'error':
        return <XCircle className="w-12 h-12 text-rose-500" />;
      case 'warning':
      case 'confirm':
        return <AlertTriangle className="w-12 h-12 text-amber-500" />;
      default:
        return <Info className="w-12 h-12 text-blue-500" />;
    }
  };

  const getHeaderBg = () => {
    switch (type) {
      case 'success':
        return 'bg-emerald-50 text-emerald-900';
      case 'error':
        return 'bg-rose-50 text-rose-900';
      case 'warning':
      case 'confirm':
        return 'bg-amber-50 text-amber-900';
      default:
        return 'bg-blue-50 text-blue-900';
    }
  };

  const diagObj = typeof diagnosticInfo === 'object' && diagnosticInfo !== null
    ? (diagnosticInfo as Partial<ApiDiagnosticInfo>)
    : null;

  const handleCopyDiagnostics = () => {
    try {
      const textToCopy = typeof diagnosticInfo === 'string'
        ? diagnosticInfo
        : JSON.stringify(diagnosticInfo, null, 2);
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handlePingBackend = async () => {
    const targetUrl = diagObj?.baseUrl || 'https://byahero.alwaysdata.net';
    setIsPinging(true);
    setPingResult('Pinging server...');
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${targetUrl}/api/ping`, { signal: controller.signal });
      clearTimeout(timeout);
      const duration = Date.now() - startTime;

      if (res.ok) {
        setPingResult(`✅ Online (HTTP ${res.status} in ${duration}ms)`);
      } else {
        setPingResult(`⚠️ Responded with HTTP ${res.status} (${duration}ms)`);
      }
    } catch (e: any) {
      const duration = Date.now() - startTime;
      if (e.name === 'AbortError') {
        setPingResult(`❌ Timed out after 8s (Server sleeping or unreachable)`);
      } else {
        setPingResult(`❌ Failed to reach ${targetUrl} (${e.message || 'Connection refused'})`);
      }
    } finally {
      setIsPinging(false);
    }
  };

  const handleResetServerUrl = () => {
    try {
      localStorage.removeItem('byahero_server_url');
      window.location.reload();
    } catch {
      // ignore
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 transform transition-all text-center my-8">
        <div className={`p-6 flex flex-col items-center justify-center ${getHeaderBg()}`}>
          <div className="mb-2">{getIcon()}</div>
          <h3 className="text-lg font-bold text-slate-800 tracking-tight">{title}</h3>
        </div>

        <div className="p-6">
          <p className="text-sm text-slate-600 font-medium leading-relaxed mb-4">{message}</p>

          {/* Diagnostic Error Console Accordion */}
          {diagnosticInfo && (
            <div className="mb-5 text-left">
              <button
                type="button"
                onClick={() => setShowDiagnostics(!showDiagnostics)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-slate-500" />
                  <span>View Diagnostic Error Console</span>
                </span>
                {showDiagnostics ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
              </button>

              {showDiagnostics && (
                <div className="mt-2.5 p-3 rounded-xl bg-slate-950 text-emerald-400 font-mono text-[11px] leading-relaxed shadow-inner overflow-hidden border border-slate-800">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-slate-400 text-[10px]">
                    <span className="font-bold flex items-center gap-1 text-slate-300">
                      <span className="inline-block w-2 h-2 rounded-full bg-rose-500"></span>
                      CONSOLE DIAGNOSTICS
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyDiagnostics}
                      className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                    {diagObj ? (
                      <>
                        <div className="text-slate-300">
                          <span className="text-slate-500">Action: </span>
                          <span className="text-amber-300 font-bold">{diagObj.action || 'Unknown'}</span>
                        </div>
                        <div className="break-all text-slate-300">
                          <span className="text-slate-500">Target Endpoint: </span>
                          <span className="text-cyan-300 underline">{diagObj.endpoint || diagObj.baseUrl || 'N/A'}</span>
                        </div>
                        <div className="text-slate-300">
                          <span className="text-slate-500">Configured Base: </span>
                          <span>{diagObj.baseUrl || 'N/A'}</span>
                        </div>
                        <div className="text-slate-300">
                          <span className="text-slate-500">Stored Custom URL: </span>
                          <span className={diagObj.storedUrl ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                            {diagObj.storedUrl ? diagObj.storedUrl : 'None (Using default AlwaysData)'}
                          </span>
                        </div>
                        <div className="text-slate-300">
                          <span className="text-slate-500">Web Origin: </span>
                          <span>{diagObj.origin || 'N/A'}</span>
                        </div>
                        <div className="text-slate-300">
                          <span className="text-slate-500">Network Status: </span>
                          <span className={diagObj.isOnline ? 'text-emerald-400' : 'text-rose-400 font-bold'}>
                            {diagObj.isOnline ? 'Online' : 'OFFLINE'}
                          </span>
                          {diagObj.connectionType && (
                            <span className="text-slate-400 text-[10px]"> ({diagObj.connectionType})</span>
                          )}
                        </div>
                        <div className="text-slate-300">
                          <span className="text-slate-500">Raw Error: </span>
                          <span className="text-rose-400 font-bold">{diagObj.errorName}: {diagObj.errorMessage}</span>
                        </div>

                        {diagObj.probableCauses && diagObj.probableCauses.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-slate-800">
                            <span className="text-amber-400 font-bold block mb-1">Likely Cause(s):</span>
                            <ul className="list-disc pl-4 space-y-1 text-slate-300 text-[10.5px]">
                              {diagObj.probableCauses.map((cause, idx) => (
                                <li key={idx} className="leading-snug">{cause}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    ) : (
                      <pre className="whitespace-pre-wrap break-all text-[10.5px]">
                        {typeof diagnosticInfo === 'string' ? diagnosticInfo : JSON.stringify(diagnosticInfo, null, 2)}
                      </pre>
                    )}
                  </div>

                  {/* Diagnostic Action Bar */}
                  <div className="mt-3 pt-2.5 border-t border-slate-800 flex flex-wrap items-center gap-2 text-[10.5px]">
                    <button
                      type="button"
                      onClick={handlePingBackend}
                      disabled={isPinging}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-200 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${isPinging ? 'animate-spin' : ''}`} />
                      <span>{isPinging ? 'Testing...' : 'Test Server Ping'}</span>
                    </button>

                    {diagObj?.storedUrl && (
                      <button
                        type="button"
                        onClick={handleResetServerUrl}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/40 text-amber-200 transition-colors cursor-pointer"
                        title="Clear custom localStorage URL and reload"
                      >
                        <Server className="w-3 h-3" />
                        <span>Reset Server URL</span>
                      </button>
                    )}

                    {pingResult && (
                      <div className="w-full text-slate-300 font-mono text-[10px] mt-1 p-1.5 rounded bg-slate-900 border border-slate-800">
                        {pingResult}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-center gap-3">
            {type === 'confirm' && onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-3 px-5 rounded-full border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors cursor-pointer"
              >
                {cancelText}
              </button>
            )}

            <button
              type="button"
              onClick={onConfirm}
              className={`flex-1 py-3 px-5 rounded-full text-white font-bold text-sm shadow-md transition-all cursor-pointer ${
                type === 'error'
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                  : type === 'warning' || type === 'confirm'
                  ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                  : type === 'success'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  : 'bg-[#1d72f8] hover:bg-[#1856b0] shadow-blue-500/20'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AlertModal;
