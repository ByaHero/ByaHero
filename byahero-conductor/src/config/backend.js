export const PRIMARY_SERVER_URL = 'https://api.byahero.app';
export const API_BASE_URL = `${PRIMARY_SERVER_URL}/api`;
export const BACKUP_SERVER_URL = 'https://byahero.alwaysdata.net';
export const EMAIL_FEATURES_AVAILABLE = false;
const MIGRATION_KEY = 'byahero_backend_migration';
const MIGRATION_VERSION = 'api-byahero-app-v1';
const SESSION_KEYS = [
  'byahero_cached_email', 'byahero_cached_role', 'byahero_cached_user_id',
  'byahero_cached_name', 'byahero_cached_contacts', 'byahero_cached_phone',
  'byahero_cached_profile_picture', 'byahero_admin_user',
];

export function normalizeServerUrl(value) {
  const clean = String(value || '').trim().replace(/\/+$/, '').replace(/\/api$/, '');
  return clean;
}

// Storage can be AsyncStorage or localStorage. Pending offline work is preserved.
export function createBackendSettings(storage, browserOrigin) {
  let migration;
  const clearSession = async () => {
    await Promise.all(SESSION_KEYS.map(key => storage.removeItem(key)));
  };
  const migrate = () => migration ??= (async () => {
    if (await storage.getItem(MIGRATION_KEY) === MIGRATION_VERSION) return;
    const previous = normalizeServerUrl(await storage.getItem('byahero_server_url'));
    if (!previous || previous === BACKUP_SERVER_URL || previous === PRIMARY_SERVER_URL || previous === browserOrigin) {
      await storage.removeItem('byahero_server_url');
      await clearSession();
    }
    await storage.setItem(MIGRATION_KEY, MIGRATION_VERSION);
  })();
  const getServerUrl = async () => {
    await migrate();
    const configured = normalizeServerUrl(await storage.getItem('byahero_server_url'));
    if (!configured || configured === PRIMARY_SERVER_URL) return browserOrigin || PRIMARY_SERVER_URL;
    return configured;
  };
  return {
    getServerUrl,
    async setServerUrl(value) {
      const before = await getServerUrl();
      const normalized = normalizeServerUrl(value);
      if (!normalized || normalized === PRIMARY_SERVER_URL || normalized === browserOrigin) await storage.removeItem('byahero_server_url');
      else await storage.setItem('byahero_server_url', normalized);
      if (await getServerUrl() !== before) await clearSession();
    },
  };
}
