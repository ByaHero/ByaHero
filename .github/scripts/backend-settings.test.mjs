import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

for (const app of ['byahero-mobile', 'byahero-conductor', 'byahero-admin', 'byahero-passenger-web', 'byahero-admin-web']) {
  const settings = await import(pathToFileURL(path.resolve(app, 'src/config/backend.js')));
  test(`${app}: upgrades saved defaults and expires identity without deleting queued work`, async () => {
    const data = new Map([
      ['byahero_server_url', 'https://byahero.alwaysdata.net/'],
      ['byahero_cached_email', 'test@example.invalid'],
      ['byahero_offline_tickets', '[{"id":1}]'],
    ]);
    const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
    const client = settings.createBackendSettings(storage);
    assert.equal(await client.getServerUrl(), 'https://api.byahero.app');
    assert.equal(data.has('byahero_cached_email'), false);
    assert.equal(data.get('byahero_offline_tickets'), '[{"id":1}]');
    await client.setServerUrl('https://api.byahero.app/api/');
    assert.equal(await client.getServerUrl(), 'https://api.byahero.app');
    await client.setServerUrl('https://byahero.alwaysdata.net');
    assert.equal(await client.getServerUrl(), 'https://byahero.alwaysdata.net');
    assert.equal(await settings.createBackendSettings(storage).getServerUrl(), 'https://byahero.alwaysdata.net');
    assert.equal(settings.EMAIL_FEATURES_AVAILABLE, app !== 'byahero-admin-web');
  });
  test(`${app}: browser defaults use the same-origin session proxy`, async () => {
    const data = new Map();
    const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
    assert.equal(await settings.createBackendSettings(storage, 'https://client.example').getServerUrl(), 'https://client.example');
    assert.equal(settings.API_BASE_URL, 'https://api.byahero.app/api');
  });
}
