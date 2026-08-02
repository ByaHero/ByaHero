import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';

interface AlertModalProps {
  visible: boolean;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning' | 'confirm';
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export default function AlertModal({
  visible,
  title,
  message,
  type = 'error',
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
  onCancel
}: AlertModalProps) {
  let iconName: any = 'close-circle';
  let iconColor = '#ef4444';
  let iconBg = 'bg-rose-50';
  let btnBg = 'bg-rose-500';

  if (type === 'success') {
    iconName = 'checkmark-circle';
    iconColor = '#10b981';
    iconBg = 'bg-emerald-50';
    btnBg = 'bg-emerald-500';
  } else if (type === 'info') {
    iconName = 'information-circle';
    iconColor = '#3b82f6';
    iconBg = 'bg-blue-50';
    btnBg = 'bg-[#0f3878]';
  } else if (type === 'warning' || type === 'confirm') {
    iconName = 'warning';
    iconColor = '#f59e0b';
    iconBg = 'bg-amber-50';
    btnBg = type === 'confirm' ? 'bg-[#0f3878]' : 'bg-amber-500';
  }

  const isConfirm = type === 'confirm';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (isConfirm && onCancel) {
          onCancel();
        } else {
          onConfirm();
        }
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={[styles.iconContainer, tw`${iconBg}`]}>
            <Ionicons name={iconName} size={38} color={iconColor} />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {isConfirm ? (
            <View style={styles.buttonContainerRow}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={onCancel} 
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>{cancelText}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.confirmButton, tw`${btnBg}`]} 
                onPress={onConfirm} 
                activeOpacity={0.8}
              >
                <Text style={styles.confirmButtonText}>{confirmText}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              style={[styles.fullButton, tw`${btnBg}`]} 
              onPress={onConfirm} 
              activeOpacity={0.8}
            >
              <Text style={styles.confirmButtonText}>{confirmText}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
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
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  buttonContainerRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cancelButtonText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 14,
  },
  confirmButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  fullButton: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
