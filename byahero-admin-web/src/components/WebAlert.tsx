import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';

interface AlertItem {
  id: number;
  type: 'alert' | 'confirm';
  title: string;
  message: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

type AlertListener = (alerts: AlertItem[]) => void;

class AlertManager {
  private static listeners: Set<AlertListener> = new Set();
  private static alerts: AlertItem[] = [];

  static subscribe(listener: AlertListener) {
    this.listeners.add(listener);
    listener([...this.alerts]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  static alert(message: string, title: string = 'Notification') {
    // Attempt to guess title based on message content if it is generic
    let inferredTitle = title;
    const msgLower = message.toLowerCase();
    if (inferredTitle === 'Notification') {
      if (msgLower.includes('success') || msgLower.includes('complete') || msgLower.includes('saved')) {
        inferredTitle = 'Success';
      } else if (msgLower.includes('error') || msgLower.includes('failed') || msgLower.includes('invalid')) {
        inferredTitle = 'Error';
      } else if (msgLower.includes('warning') || msgLower.includes('required') || msgLower.includes('restricted')) {
        inferredTitle = 'Warning';
      }
    }

    this.alerts.push({
      id: Date.now() + Math.random(),
      type: 'alert',
      title: inferredTitle,
      message,
    });
    this.notify();
  }

  static confirm(message: string, onConfirm: () => void, onCancel?: () => void, title: string = 'Confirmation Required') {
    this.alerts.push({
      id: Date.now() + Math.random(),
      type: 'confirm',
      title,
      message,
      onConfirm,
      onCancel,
    });
    this.notify();
  }

  static dismiss(id: number) {
    this.alerts = this.alerts.filter((a) => a.id !== id);
    this.notify();
  }

  private static notify() {
    this.listeners.forEach((listener) => listener([...this.alerts]));
  }
}

// Monkey-patch window.alert
window.alert = (message: any) => {
  AlertManager.alert(String(message));
};

export { AlertManager };

export default function WebAlertContainer() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  useEffect(() => {
    return AlertManager.subscribe((currAlerts) => {
      setAlerts(currAlerts);
    });
  }, []);

  if (alerts.length === 0) return null;

  return (
    <div className="web-alert-overlay-root">
      {alerts.map((alert) => {
        const titleLower = alert.title.toLowerCase();
        let icon = <Info size={36} className="text-blue-500" />;
        let iconBg = 'bg-blue-50 border border-blue-100';
        let titleColor = 'text-slate-800';

        if (titleLower.includes('success') || titleLower.includes('complete')) {
          icon = <CheckCircle2 size={36} className="text-emerald-500" />;
          iconBg = 'bg-emerald-50 border border-emerald-100';
        } else if (titleLower.includes('error') || titleLower.includes('failed') || titleLower.includes('invalid')) {
          icon = <XCircle size={36} className="text-red-500" />;
          iconBg = 'bg-red-50 border border-red-100';
        } else if (titleLower.includes('warning') || titleLower.includes('attention') || titleLower.includes('required') || titleLower.includes('confirm')) {
          icon = <AlertTriangle size={36} className="text-amber-500" />;
          iconBg = 'bg-amber-50 border border-amber-100';
        }

        const handleConfirm = () => {
          AlertManager.dismiss(alert.id);
          if (alert.onConfirm) alert.onConfirm();
        };

        const handleCancel = () => {
          AlertManager.dismiss(alert.id);
          if (alert.onCancel) alert.onCancel();
        };

        return (
          <div key={alert.id} className="web-alert-overlay" onClick={handleCancel}>
            <div className="web-alert-card" onClick={(e) => e.stopPropagation()}>
              <div className={`web-alert-icon-container ${iconBg}`}>
                {icon}
              </div>
              <h3 className={`web-alert-title ${titleColor}`}>{alert.title}</h3>
              <p className="web-alert-message">{alert.message}</p>
              
              <div className="web-alert-buttons">
                {alert.type === 'confirm' && (
                  <button className="web-alert-btn web-alert-btn-cancel" onClick={handleCancel}>
                    Cancel
                  </button>
                )}
                <button className="web-alert-btn web-alert-btn-confirm" onClick={handleConfirm}>
                  OK
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
