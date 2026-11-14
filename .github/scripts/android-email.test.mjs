import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

for (const app of ['byahero-mobile', 'byahero-conductor', 'byahero-admin']) {
  test(`${app}: email recovery sends the correct actions and never accepts a rejected code`, async () => {
    const requests = [];
    const stored = new Map();
    let response = { success: true };
    const storage = {
      getItem: async key => stored.get(key) ?? null,
      setItem: async (key, value) => stored.set(key, value),
      removeItem: async key => stored.delete(key),
    };
    const context = vm.createContext({
      FormData, AbortController, setTimeout, clearTimeout, console,
      fetch: async (url, options) => {
        requests.push({ url, credentials: options.credentials, method: options.method, body: Object.fromEntries(options.body) });
        return { ok: true, json: async () => response };
      },
    });
    const settings = new vm.SourceTextModule(await readFile(`${app}/src/config/backend.js`, 'utf8'), { context });
    const asyncStorage = new vm.SyntheticModule(['default'], function () { this.setExport('default', storage); }, { context });
    const native = new vm.SyntheticModule(['NativeModules', 'Platform'], function () {
      this.setExport('NativeModules', {});
      this.setExport('Platform', { OS: 'android' });
    }, { context });
    const auth = new vm.SourceTextModule(await readFile(`${app}/src/services/authService.js`, 'utf8'), { context });
    await auth.link(name => {
      if (name === '../config/backend') return settings;
      if (name === '@react-native-async-storage/async-storage') return asyncStorage;
      if (name === 'react-native') return native;
      throw new Error(`Unexpected auth dependency: ${name}`);
    });
    await auth.evaluate();
    const api = auth.namespace;
    assert.equal((await api.forgotRequestOtp(' person@example.invalid ')).success, true);
    assert.deepEqual(requests.at(-1).body, { action: 'request_otp', email: 'person@example.invalid' });
    await api.forgotVerifyOtp(' person@example.invalid ', ' 123456 ');
    assert.deepEqual(requests.at(-1).body, { action: 'verify_otp', email: 'person@example.invalid', otp: '123456' });
    await api.forgotResetPassword(' person@example.invalid ', ' 123456 ', ' new password ');
    assert.deepEqual(requests.at(-1).body, { action: 'reset_password', email: 'person@example.invalid', otp: '123456', new_password: ' new password ' });
    for (const request of requests) {
      assert.equal(request.url, 'https://api.byahero.app/api/auth');
      assert.equal(request.credentials, 'include');
      assert.equal(request.method, 'POST');
    }
    response = { success: false, message: 'Invalid or expired code' };
    await assert.rejects(api.forgotVerifyOtp('person@example.invalid', '000000'), /Invalid or expired code/);
    await assert.rejects(api.forgotResetPassword('person@example.invalid', '000000', 'not-applied'), /Invalid or expired code/);
    if (app === 'byahero-mobile') {
      response = { success: true };
      await api.signupRequestOtp('Passenger', ' person@example.invalid ', ' 09123456789 ', 'password', 'password');
      assert.equal(requests.at(-1).body.action, 'signup_request_otp');
      assert.equal(requests.at(-1).body.email, 'person@example.invalid');
    }
  });
}
