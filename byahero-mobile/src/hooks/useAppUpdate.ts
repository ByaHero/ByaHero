import { useState, useEffect } from 'react';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import pkg from '../../package.json';
import { getServerUrl } from '../services/authService';

export interface UpdateInfo {
  latest_version: string;
  min_required_version: string;
  download_url: string;
  release_notes?: string;
  force_update?: boolean;
}

/**
 * Utility to compare semantic version strings (e.g., '1.0.0' vs '1.0.1')
 */
function isVersionLower(currentVersion: string, targetVersion: string): boolean {
  const currentParts = currentVersion.split('.').map((v) => parseInt(v, 10) || 0);
  const targetParts = targetVersion.split('.').map((v) => parseInt(v, 10) || 0);

  const maxLength = Math.max(currentParts.length, targetParts.length);
  for (let i = 0; i < maxLength; i++) {
    const curr = currentParts[i] || 0;
    const targ = targetParts[i] || 0;
    if (curr < targ) return true;
    if (curr > targ) return false;
  }
  return false;
}

export function useAppUpdate() {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState<boolean>(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [dismissed, setDismissed] = useState<boolean>(false);

  const currentVersion = Application.nativeApplicationVersion || Constants.expoConfig?.version || pkg.version || '1.0.0';

  useEffect(() => {
    let isMounted = true;

    async function checkVersion() {
      try {
        const baseUrl = await getServerUrl();
        const response = await fetch(`${baseUrl}/api/app-version`);
        if (!response.ok) return;

        const data = await response.json();
        if (data.success && data.latest_version) {
          const needsUpdate = isVersionLower(currentVersion, data.latest_version);
          if (needsUpdate && isMounted) {
            setUpdateInfo({
              latest_version: data.latest_version,
              min_required_version: data.min_required_version || '1.0.0',
              download_url: data.download_url,
              release_notes: data.release_notes,
              force_update: data.force_update || isVersionLower(currentVersion, data.min_required_version || '1.0.0'),
            });
            setIsUpdateAvailable(true);
          }
        }
      } catch (err) {
        console.log('[useAppUpdate] Version check skipped:', err);
      }
    }

    checkVersion();

    return () => {
      isMounted = false;
    };
  }, [currentVersion]);

  const dismissUpdate = () => {
    setDismissed(true);
  };

  return {
    isUpdateAvailable: isUpdateAvailable && !dismissed,
    updateInfo,
    currentVersion,
    dismissUpdate,
  };
}
