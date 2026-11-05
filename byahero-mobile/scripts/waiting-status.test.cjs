const assert = require('node:assert/strict');
const { test } = require('node:test');
const { shouldCancelWaiting } = require('../src/utils/waitingStatus.ts');
const { features } = require('../assets/data/laurel-talisay-tanauan.json');

const location = { lat: 14.092, lng: 121.023 };
const origin = { ...location, locationName: 'Talisay' };

test('registration stays waiting at its actual location, away from the area centroid', () => {
  const nearEdge = { lat: 14.0858, lng: 121.020 };
  assert.equal(shouldCancelWaiting(nearEdge, 'Talisay', { ...nearEdge, locationName: 'Talisay' }, [], features), false);
});

test('roadside and Near pickup labels remain waiting without a matching database stop', () => {
  for (const locationName of ['Roadside Pickup Point', 'Near Talisay Pickup Point']) {
    assert.equal(shouldCancelWaiting(location, locationName, { ...location, locationName }, [], features), false);
    assert.equal(shouldCancelWaiting(location, locationName, null, [], features), false);
  }
});

test('moving within 300 m keeps waiting, moving more than 300 m cancels', () => {
  assert.equal(shouldCancelWaiting({ ...location, lat: location.lat + 0.002 }, 'Talisay', origin, [], features), false);
  assert.equal(shouldCancelWaiting({ ...location, lat: location.lat + 0.004 }, 'Talisay', origin, [], features), true);
});

test('the registration origin takes priority over a distant stop with the same name', () => {
  const stops = [{ name: 'Talisay', lat: 14.2, lng: 121.1 }];
  assert.equal(shouldCancelWaiting(location, 'Talisay', origin, stops, features), false);
});

test('restored Talisay registration stays waiting inside the full polygon', () => {
  assert.equal(shouldCancelWaiting({ lat: 14.0858, lng: 121.020 }, 'Talisay', null, [], features), false);
  assert.equal(shouldCancelWaiting({ lat: 14.096, lng: 121.024 }, 'Talisay', null, [], features), false);
});

test('restored areas allow 300 m beyond their boundary before cancellation', () => {
  assert.equal(shouldCancelWaiting({ lat: 14.09, lng: 121.026 }, 'Talisay', null, [], features), false);
  assert.equal(shouldCancelWaiting({ lat: 14.09, lng: 121.04 }, 'Talisay', null, [], features), true);
});

test('restored MultiPolygon requests recognize every component', () => {
  const ring = [[121, 14], [121.01, 14], [121.01, 14.01], [121, 14.01], [121, 14]];
  const secondRing = ring.map(([lng, lat]) => [lng + 0.1, lat]);
  const areas = [{ properties: { 'Current Location': 'Area' }, geometry: { type: 'MultiPolygon', coordinates: [[ring], [secondRing]] } }];
  assert.equal(shouldCancelWaiting({ lat: 14.005, lng: 121.005 }, 'Area', null, [], areas), false);
  assert.equal(shouldCancelWaiting({ lat: 14.005, lng: 121.105 }, 'Area', null, [], areas), false);
  assert.equal(shouldCancelWaiting({ lat: 14.005, lng: 121.05 }, 'Area', null, [], areas), true);
});

test('missing or invalid location/stop data never cancels a saved request', () => {
  assert.equal(shouldCancelWaiting(null, 'Talisay', origin, [], features), false);
  assert.equal(shouldCancelWaiting({ lat: NaN, lng: 121 }, 'Talisay', origin, [], features), false);
  assert.equal(shouldCancelWaiting(location, 'Unknown', null, [], features), false);
  assert.equal(shouldCancelWaiting(location, 'Stop', null, [{ name: 'Stop', lat: '', lng: '' }], []), false);
});

test('restored named stops keep their 300 m movement check', () => {
  const stops = [{ name: 'Stop', latitude: String(location.lat), longitude: String(location.lng) }];
  assert.equal(shouldCancelWaiting(location, 'Stop', null, stops, []), false);
  assert.equal(shouldCancelWaiting({ ...location, lat: location.lat + 0.004 }, 'Stop', null, stops, []), true);
});

test('a previous registration origin is ignored when the waiting location changes', () => {
  assert.equal(shouldCancelWaiting({ lat: 14.09, lng: 121.04 }, 'Other location', origin, [], []), false);
});
