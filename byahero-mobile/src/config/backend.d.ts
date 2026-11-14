export const PRIMARY_SERVER_URL: string;
export const API_BASE_URL: string;
export const GOOGLE_CALLBACK_URL: string;
export const BACKUP_SERVER_URL: string;
export const EMAIL_FEATURES_AVAILABLE: boolean;
export function normalizeServerUrl(value: unknown): string;
interface StorageAdapter {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): unknown;
  removeItem(key: string): unknown;
}
export function createBackendSettings(storage: StorageAdapter, browserOrigin?: string): {
  getServerUrl(): Promise<string>;
  setServerUrl(value: string): Promise<void>;
};
