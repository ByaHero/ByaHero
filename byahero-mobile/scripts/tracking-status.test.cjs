const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

// Run the hook with controllable network responses, without native modules.
function trackingHarness() {
  const slots = [];
  let cursor = 0;
  let firstRender = true;
  let effect;
  let cleanup;
  let poll;
  const requests = [];
  const react = {
    useState(initial) {
      const index = cursor++;
      if (firstRender) slots[index] = initial;
      return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
    },
    useRef(initial) {
      const index = cursor++;
      if (firstRender) slots[index] = { current: initial };
      return slots[index];
    },
    useCallback(callback) { return callback; },
    useEffect(callback) { if (firstRender) effect = callback; },
  };
  const dependencies = {
    react,
    '@react-native-async-storage/async-storage': { getItem: async () => 'passenger@example.test' },
    '../../services/authService': { getServerUrl: async () => 'https://example.test' },
    '../../utils/locationUtils': { resolveBusLocationName: () => null },
    '../../services/offlineCache': { loadBusData: async () => null },
  };
  const module = { exports: {} };
  const source = readFileSync(require.resolve('../src/hooks/passenger/useTrackingData.ts'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  vm.runInNewContext(compiled, {
    exports: module.exports,
    require: name => {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
    console,
    setInterval: callback => { poll = callback; return 1; },
    clearInterval: () => {},
    fetch: async (url, options) => {
      if (url.includes('/waiting/status')) {
        let resolve;
        const body = new Promise(done => { resolve = done; });
        requests.push({ options, resolve });
        return { ok: true, json: () => body };
      }
      return { ok: true, json: async () => ({ success: true, buses: [], data: [], friends: [] }) };
    },
  });

  function render() {
    cursor = 0;
    const result = module.exports.useTrackingData();
    if (firstRender) {
      firstRender = false;
      cleanup = effect();
    }
    return result;
  }
  render();
  return { render, requests, poll: () => poll(), cleanup: () => cleanup() };
}

const flush = () => new Promise(resolve => setImmediate(resolve));

test('a delayed status poll cannot undo a successful waiting registration', async () => {
  const harness = trackingHarness();
  await flush();
  assert.equal(harness.requests.length, 1);
  const state = harness.render();
  state.setIsWaiting(true);
  state.setWaitingLocation('Talisay');
  state.setWaitingExpiresAt('2026-11-05T13:00:00+08:00');
  harness.requests[0].resolve({ success: true, is_waiting: false, is_boarded: false });
  await flush();
  const updated = harness.render();
  assert.equal(updated.isWaiting, true);
  assert.equal(updated.waitingLocation, 'Talisay');
  assert.equal(updated.waitingExpiresAt, '2026-11-05T13:00:00+08:00');

  // Subsequent polls still apply server changes such as expiration or boarding.
  const pendingPoll = harness.poll();
  await flush();
  assert.equal(harness.requests[1].options.cache, 'no-store');
  harness.requests[1].resolve({ success: true, is_waiting: false, is_boarded: false });
  await pendingPoll;
  assert.equal(harness.render().isWaiting, false);
});

test('a delayed status poll cannot restore waiting after cancellation', async () => {
  const harness = trackingHarness();
  await flush();
  harness.render().setIsWaiting(false);
  harness.requests[0].resolve({ success: true, is_waiting: true, location_name: 'Talisay' });
  await flush();
  assert.equal(harness.render().isWaiting, false);
  assert.equal(harness.render().waitingLocation, '');
});

test('status responses from a disposed tracking effect are ignored', async () => {
  const harness = trackingHarness();
  await flush();
  harness.cleanup();
  harness.requests[0].resolve({ success: true, is_waiting: true, location_name: 'Talisay' });
  await flush();
  assert.equal(harness.render().isWaiting, false);
});
