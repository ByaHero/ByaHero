import { useState } from 'react';

export type AlertType = 'success' | 'error' | 'info' | 'warning' | 'confirm';

interface AlertConfig {
  isOpen: boolean;
  title: string;
  message: string;
  type: AlertType;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
}

const DEFAULT: AlertConfig = {
  isOpen: false,
  title: '',
  message: '',
  type: 'info',
  onConfirm: () => {},
};

export function useAlertModal() {
  const [alertConfig, setAlertConfig] = useState<AlertConfig>(DEFAULT);

  const showAlert = (
    title: string,
    message: string,
    type: AlertType = 'info',
    onConfirm?: () => void
  ) => {
    setAlertConfig({
      isOpen: true,
      title,
      message,
      type,
      onConfirm: () => {
        setAlertConfig((prev) => ({ ...prev, isOpen: false }));
        if (onConfirm) onConfirm();
      },
    });
  };

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    confirmText = 'Confirm',
    cancelText = 'Cancel'
  ) => {
    setAlertConfig({
      isOpen: true,
      title,
      message,
      type: 'confirm',
      confirmText,
      cancelText,
      onConfirm: () => {
        setAlertConfig((prev) => ({ ...prev, isOpen: false }));
        onConfirm();
      },
      onCancel: () => {
        setAlertConfig((prev) => ({ ...prev, isOpen: false }));
        if (onCancel) onCancel();
      },
    });
  };

  const closeAlert = () => setAlertConfig((prev) => ({ ...prev, isOpen: false }));

  return { alertConfig, showAlert, showConfirm, closeAlert };
}
