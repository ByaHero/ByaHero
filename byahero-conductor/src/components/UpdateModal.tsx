import React from 'react';
import { Modal, View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppUpdate } from '../hooks/useAppUpdate';

export default function UpdateModal() {
  const { isUpdateAvailable, updateInfo, currentVersion, dismissUpdate } = useAppUpdate();

  if (!isUpdateAvailable || !updateInfo) {
    return null;
  }

  const handleUpdate = () => {
    if (updateInfo.download_url) {
      Linking.openURL(updateInfo.download_url).catch((err: unknown) => {
        console.error('Failed to open download link:', err);
      });
    }
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={isUpdateAvailable}
      onRequestClose={() => {
        if (!updateInfo.force_update) {
          dismissUpdate();
        }
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <MaterialIcons name="system-update" size={42} color="#059669" />
          </View>

          <Text style={styles.title}>Conductor App Update Available!</Text>
          <Text style={styles.versionBadge}>
            v{currentVersion} ➔ v{updateInfo.latest_version}
          </Text>

          {updateInfo.release_notes ? (
            <View style={styles.notesBox}>
              <Text style={styles.notesHeader}>What's New:</Text>
              <Text style={styles.notesText}>{updateInfo.release_notes}</Text>
            </View>
          ) : null}

          <Text style={styles.subtext}>
            {updateInfo.force_update
              ? 'A required update is available for ByaHero Conductor. Please update to continue your shift.'
              : 'Please download the latest Conductor App version for the newest tracking and trip features.'}
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.updateButton} onPress={handleUpdate} activeOpacity={0.8}>
              <MaterialIcons name="file-download" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.updateButtonText}>Update Now</Text>
            </TouchableOpacity>

            {!updateInfo.force_update && (
              <TouchableOpacity style={styles.laterButton} onPress={dismissUpdate} activeOpacity={0.7}>
                <Text style={styles.laterButtonText}>Maybe Later</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  iconContainer: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 6,
  },
  versionBadge: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 14,
  },
  notesBox: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  notesHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  subtext: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  buttonContainer: {
    width: '100%',
    gap: 10,
  },
  updateButton: {
    flexDirection: 'row',
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  laterButton: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  laterButtonText: {
    color: '#6B7280',
    fontWeight: '600',
    fontSize: 14,
  },
});
