/**
 * ByaHero In-App & Console Diagnostics Logger
 * Captures network calls, errors, and system state for debugging on mobile devices.
 */

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  tag: string;
  message: string;
  data?: any;
}

export interface ApiDiagnosticInfo {
  action: string;
  endpoint: string;
  baseUrl: string;
  storedUrl: string | null;
  origin: string;
  protocol: string;
  isOnline: boolean;
  connectionType?: string;
  downlink?: string;
  rtt?: string;
  errorName: string;
  errorMessage: string;
  statusCode?: number;
  statusText?: string;
  timestamp: string;
  probableCauses: string[];
}

const STORAGE_KEY = 'byahero_debug_logs';
const MAX_LOGS = 60;

class DebugLogger {
  private logs: LogEntry[] = [];
  private listeners: ((logs: LogEntry[]) => void)[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.logs = JSON.parse(saved);
      }
    } catch {
      this.logs = [];
    }
  }

  private saveToStorage() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.logs.slice(-MAX_LOGS)));
    } catch {
      // Storage might be disabled or full
    }
    this.notifyListeners();
  }

  public subscribe(listener: (logs: LogEntry[]) => void): () => void {
    this.listeners.push(listener);
    listener(this.getLogs());
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    const current = this.getLogs();
    this.listeners.forEach(fn => fn(current));
  }

  public log(level: 'info' | 'warn' | 'error' | 'success', tag: string, message: string, data?: any) {
    const entry: LogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      level,
      tag,
      message,
      data,
    };

    this.logs.push(entry);
    if (this.logs.length > MAX_LOGS) {
      this.logs.shift();
    }
    this.saveToStorage();

    // Pretty console output for desktop/remote DevTools
    const badgeColors = {
      info: 'background: #2563eb; color: white;',
      warn: 'background: #d97706; color: white;',
      error: 'background: #dc2626; color: white;',
      success: 'background: #16a34a; color: white;',
    };

    const style = `${badgeColors[level]} font-weight: bold; border-radius: 4px; padding: 2px 6px;`;
    if (level === 'error') {
      console.groupCollapsed(`%c[ByaHero ${tag}]%c ${message}`, style, 'font-weight: bold;');
      if (data) console.error('Details:', data);
      console.trace('Stack trace:');
      console.groupEnd();
    } else if (level === 'warn') {
      console.warn(`%c[ByaHero ${tag}]%c ${message}`, style, 'font-weight: normal;', data || '');
    } else {
      console.log(`%c[ByaHero ${tag}]%c ${message}`, style, 'font-weight: normal;', data || '');
    }
  }

  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  public clearLogs() {
    this.logs = [];
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
    this.notifyListeners();
  }

  /**
   * Generates a detailed diagnostic report for network errors
   */
  public createDiagnosticReport(
    action: string,
    endpoint: string,
    baseUrl: string,
    error: any,
    statusCode?: number,
    statusText?: string
  ): ApiDiagnosticInfo {
    const storedUrl = localStorage.getItem('byahero_server_url');
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const navConn = (navigator as any)?.connection;
    const connectionType = navConn?.effectiveType || 'unknown';
    const downlink = navConn?.downlink ? `${navConn.downlink} Mbps` : undefined;
    const rtt = navConn?.rtt ? `${navConn.rtt} ms` : undefined;

    const probableCauses: string[] = [];

    // Analyze specific failure causes
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && baseUrl.startsWith('http://')) {
      probableCauses.push(
        'Mixed Content Block: Web app is loaded on secure HTTPS, but target backend is insecure HTTP.'
      );
    }

    if (
      typeof window !== 'undefined' &&
      (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) &&
      !window.location.hostname.includes('localhost')
    ) {
      probableCauses.push(
        'Localhost Unreachable on Mobile: "localhost" points to the phone, not your computer server. Use https://byahero.alwaysdata.net or your PC LAN IP.'
      );
    }

    if (!isOnline) {
      probableCauses.push('Device Offline: Mobile device has no internet connection.');
    }

    if (error?.name === 'TypeError' && String(error?.message).toLowerCase().includes('fetch')) {
      probableCauses.push(
        'Network Connection Refused or Timed Out: The browser could not connect to the backend server. It may be sleeping (AlwaysData cold start), blocked by CORS, or affected by poor mobile signal.'
      );
    }

    if (statusCode && statusCode >= 500) {
      probableCauses.push(`Backend Server Error (HTTP ${statusCode}): PHP or database exception on the server.`);
    }

    if (statusCode === 404) {
      probableCauses.push(`Endpoint Not Found (HTTP 404): Route ${endpoint} does not exist on target server.`);
    }

    if (probableCauses.length === 0) {
      probableCauses.push('Unknown communication error between browser and server.');
    }

    const report: ApiDiagnosticInfo = {
      action,
      endpoint,
      baseUrl,
      storedUrl,
      origin: typeof window !== 'undefined' ? window.location.origin : 'N/A',
      protocol: typeof window !== 'undefined' ? window.location.protocol : 'N/A',
      isOnline,
      connectionType,
      downlink,
      rtt,
      errorName: error?.name || 'Error',
      errorMessage: error?.message || String(error),
      statusCode,
      statusText,
      timestamp: new Date().toISOString(),
      probableCauses,
    };

    this.log('error', `API:${action}`, `Failed: ${report.errorMessage}`, report);

    return report;
  }
}

export const debugLogger = new DebugLogger();
