import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

type AlertButton = {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

type AlertOptions = {
  cancelable?: boolean;
  onDismiss?: () => void;
};

export type AlertPayload = {
  title: string;
  message?: string;
  buttons?: AlertButton[];
  options?: AlertOptions;
};

type AlertListener = (payload: AlertPayload | null) => void;

class AlertManager {
  private static listeners: Set<AlertListener> = new Set();
  private static currentAlert: AlertPayload | null = null;

  static subscribe(listener: AlertListener) {
    this.listeners.add(listener);
    listener(this.currentAlert);
    return () => {
      this.listeners.delete(listener);
    };
  }

  static alert(
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options?: AlertOptions
  ) {
    this.currentAlert = { title, message, buttons, options };
    this.listeners.forEach((listener) => listener(this.currentAlert));
  }

  static dismiss() {
    const onDismiss = this.currentAlert?.options?.onDismiss;
    this.currentAlert = null;
    this.listeners.forEach((listener) => listener(null));
    if (onDismiss) {
      onDismiss();
    }
  }
}

// Monkey-patch React Native's Alert.alert
Alert.alert = (title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions) => {
  AlertManager.alert(title, message, buttons, options);
};

export { AlertManager };

export function CustomAlertModal() {
  const [alert, setAlert] = useState<AlertPayload | null>(null);

  useEffect(() => {
    return AlertManager.subscribe((currAlert) => {
      setAlert(currAlert);
    });
  }, []);

  if (!alert) return null;

  // Determine icon based on title content
  const getIcon = () => {
    const titleLower = alert.title.toLowerCase();
    if (titleLower.includes('success') || titleLower.includes('complete') || titleLower.includes('verified')) {
      return { name: 'check-circle' as const, color: '#10B981', bg: '#D1FAE5' }; // Emerald/Green
    }
    if (titleLower.includes('error') || titleLower.includes('failed') || titleLower.includes('denied') || titleLower.includes('invalid')) {
      return { name: 'error' as const, color: '#EF4444', bg: '#FEE2E2' }; // Red
    }
    if (titleLower.includes('warning') || titleLower.includes('attention') || titleLower.includes('required') || titleLower.includes('restricted')) {
      return { name: 'warning' as const, color: '#F59E0B', bg: '#FEF3C7' }; // Amber/Yellow
    }
    return { name: 'info' as const, color: '#0F3878', bg: '#E0F2FE' }; // Blue (Theme color)
  };

  const iconInfo = getIcon();

  const handleButtonPress = (onPress?: () => void) => {
    AlertManager.dismiss();
    if (onPress) {
      onPress();
    }
  };

  const isCancelable = alert.options?.cancelable ?? true;

  // Render buttons
  const buttons = alert.buttons && alert.buttons.length > 0
    ? alert.buttons
    : [{ text: 'OK', onPress: undefined, style: 'default' as const }];

  return (
    <Modal
      transparent
      animationType="fade"
      visible={true}
      onRequestClose={() => {
        if (isCancelable) {
          AlertManager.dismiss();
        }
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: iconInfo.bg }]}>
            <MaterialIcons name={iconInfo.name} size={36} color={iconInfo.color} />
          </View>

          {/* Title */}
          <Text style={styles.title}>{alert.title}</Text>

          {/* Message */}
          {alert.message ? (
            <Text style={styles.message}>{alert.message}</Text>
          ) : null}

          {/* Buttons */}
          <View style={[
            styles.buttonContainer,
            buttons.length > 2 ? styles.buttonContainerVertical : styles.buttonContainerHorizontal
          ]}>
            {buttons.map((btn, idx) => {
              const isCancel = btn.style === 'cancel';
              const isDestructive = btn.style === 'destructive';
              
              let buttonStyle = styles.primaryButton;
              let textStyle = styles.primaryButtonText;

              if (isCancel) {
                buttonStyle = styles.cancelButton;
                textStyle = styles.cancelButtonText;
              } else if (isDestructive) {
                buttonStyle = styles.destructiveButton;
                textStyle = styles.destructiveButtonText;
              }

              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    buttonStyle,
                    buttons.length <= 2 ? { flex: 1 } : { width: '100%' }
                  ]}
                  onPress={() => handleButtonPress(btn.onPress)}
                  activeOpacity={0.8}
                >
                  <Text style={textStyle}>{btn.text || 'OK'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#0F3878',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  buttonContainer: {
    width: '100%',
    gap: 8,
  },
  buttonContainerHorizontal: {
    flexDirection: 'row',
  },
  buttonContainerVertical: {
    flexDirection: 'column',
  },
  primaryButton: {
    backgroundColor: '#0F3878',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  cancelButton: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelButtonText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 14,
  },
  destructiveButton: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destructiveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});
