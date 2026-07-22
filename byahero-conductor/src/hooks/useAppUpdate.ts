import { useState, useEffect } from 'react';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import pkg from '../../package.json';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UpdateInfo {
  latest_version: string;
  min_required_version: string;
  download_url: string;
  release_notes?: string;
  force_update?: boolean;
}

const DEFAULT_SERVER_URL = 'https://byahero.alwaysdata.net';

async function getServerUrl() {
  try {
    const storedUrl = await AsyncStorage.getItem('byahero_server_url');
    if (storedUrl) return storedUrl;
  } catch (error) {
    console.error('Error getting server URL:', error);
  }
  return DEFAULT_SERVER_URL;
}

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
      // 1. Direct GitHub Releases API Check (Find ABSOLUTE HIGHEST version available)
      try {
        const ghRes = await fetch('https://api.github.com/repos/ByaHero/ByaHero/releases');
        if (ghRes.ok) {
          const releases = await ghRes.json();
          let highestVersion = currentVersion;
          let highestRelease: any = null;
          let highestDownloadUrl = '';

          for (const release of releases) {
            const tagName: string = release.tag_name || '';
            const assets: any[] = release.assets || [];

            let isMatch = false;
            let matchedUrl = '';

            if (tagName.toLowerCase().includes('conductor')) {
              isMatch = true;
            } else {
              const asset = assets.find((a: any) => a.name && a.name.toLowerCase().includes('conductor'));
              if (asset) {
                isMatch = true;
                matchedUrl = asset.browser_download_url;
              }
            }

            if (isMatch) {
              const match = tagName.match(/(\d+\.\d+\.\d+)/);
              const candidateVersion = match ? match[1] : tagName.replace(/^v/i, '');

              if (isVersionLower(highestVersion, candidateVersion)) {
                highestVersion = candidateVersion;
                highestRelease = release;
                highestDownloadUrl = matchedUrl || assets[0]?.browser_download_url || 'https://github.com/ByaHero/ByaHero/releases/latest/download/byahero-conductor.apk';
              }
            }
          }

          if (highestRelease && isMounted) {
            setUpdateInfo({
              latest_version: highestVersion,
              min_required_version: '1.0.0',
              download_url: highestDownloadUrl,
              release_notes: highestRelease.body || 'Bug fixes and performance improvements.',
              force_update: false,
            });
            setIsUpdateAvailable(true);
            return;
          }
        }
      } catch (ghErr) {
        console.log('[useAppUpdate Conductor] Direct GitHub check skipped:', ghErr);
      }

      // 2. Fallback to Backend
      try {
        const baseUrl = await getServerUrl();
        const response = await fetch(`${baseUrl}/api/app-version?app=conductor`);
        if (!response.ok) return;

        const data = await response.json();
        if (data.success && data.latest_version) {
          const needsUpdate = isVersionLower(currentVersion, data.latest_version);
          if (needsUpdate && isMounted) {
            setUpdateInfo({
              latest_version: data.latest_version,
              min_required_version: data.min_required_version || '1.0.0',
              download_url: data.download_url || 'https://github.com/ByaHero/ByaHero/releases/latest/download/byahero-conductor.apk',
              release_notes: data.release_notes,
              force_update: data.force_update || isVersionLower(currentVersion, data.min_required_version || '1.0.0'),
            });
            setIsUpdateAvailable(true);
          }
        }
      } catch (err) {
        console.log('[useAppUpdate Conductor] Backend check skipped:', err);
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
