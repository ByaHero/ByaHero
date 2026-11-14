import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const script = readFileSync('laravel-backend/public/js/google-callback.js', 'utf8');
function callback(hash, search = '') {
  const result = { redirects: [], history: [], message: {} };
  vm.runInNewContext(script, {
    URLSearchParams,
    document: { getElementById: () => result.message },
    window: {
      location: { hash, search, pathname: '/auth/google/callback', replace: url => result.redirects.push(url) },
      history: { replaceState: (...args) => result.history.push(args) },
    },
  });
  assert.equal(result.history[0][2], '/auth/google/callback');
  return result;
}

test('returns only the fragment ID token to the production app root', () => {
  for (const uri of ['byaheromobile://', 'byaheromobile:///']) {
    const hash = new URLSearchParams({ id_token: 'synthetic.token+/=', state: uri, other: 'discard' });
    const result = callback(`#${hash}`);
    assert.equal(result.redirects.length, 1);
    const target = new URL(result.redirects[0]);
    assert.equal(target.protocol, 'byaheromobile:');
    assert.equal(target.searchParams.get('id_token'), 'synthetic.token+/=');
    assert.equal(target.searchParams.has('other'), false);
  }
});

test('rejects remote, script, Expo Go, and modified app destinations', () => {
  for (const state of ['', 'https://untrusted.invalid', '//untrusted.invalid', 'javascript:alert(1)',
    'exp://192.168.1.1:8081/--/', 'byaheromobile://untrusted.invalid', 'byaheromobile:///?next=https://untrusted.invalid',
    'byaheromobile:///#fragment', 'byaheromobile:///passenger']) {
    const result = callback(`#${new URLSearchParams({ id_token: 'synthetic.token', state })}`);
    assert.equal(result.redirects.length, 0, state);
    assert.match(result.message.textContent, /invalid/);
  }
});

test('does not relay query-string tokens, access tokens, or raw fragments', () => {
  for (const [hash, query] of [
    ['', '?id_token=synthetic&state=byaheromobile%3A%2F%2F%2F'],
    ['#access_token=synthetic&state=byaheromobile%3A%2F%2F%2F', ''],
    ['#state=byaheromobile%3A%2F%2F%2F&unexpected=synthetic', ''],
    [`#${new URLSearchParams({ id_token: 'x'.repeat(12001), state: 'byaheromobile:///' })}`, ''],
  ]) {
    assert.equal(callback(hash, query).redirects.length, 0);
  }
});

test('returns Google cancellation errors to the app without a token', () => {
  const result = callback('#error=access_denied&state=byaheromobile%3A%2F%2F%2F');
  const target = new URL(result.redirects[0]);
  assert.equal(target.searchParams.get('error'), 'access_denied');
  assert.equal(target.searchParams.has('id_token'), false);
});
