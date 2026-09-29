const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const helper = import(pathToFileURL(path.resolve(__dirname, '../../apps/customer/src/v8/move/rideHome.mjs')).href);

test('history groups customer states without exposing driver trips', async () => {
  const { groupCustomerRides } = await helper;
  const rides = [
    { code: 'one', side: 'customer', state: 'requested' },
    { code: 'two', side: 'customer', state: 'accepted' },
    { code: 'three', side: 'customer', state: 'in_trip' },
    { code: 'four', side: 'customer', state: 'completed' },
    { code: 'five', side: 'customer', state: 'cancelled' },
    { code: 'six', side: 'customer', state: 'expired' },
    { code: 'driver', side: 'driver', state: 'completed', destination: 'Private destination' },
  ];
  const groups = groupCustomerRides(rides);
  assert.deepEqual(groups.current.map(r => r.code), ['one', 'two', 'three']);
  assert.deepEqual(groups.completed.map(r => r.code), ['four']);
  assert.deepEqual(groups.cancelled.map(r => r.code), ['five', 'six']);
});

test('recent destinations come only from completed customer rides', async () => {
  const { recentDestinations } = await helper;
  const rides = [
    { side: 'driver', state: 'completed', destination: 'Private driver destination' },
    { side: 'customer', state: 'cancelled', destination: 'Unvisited' },
    { code: 'a', side: 'customer', state: 'completed', destination: 'Market Road' },
    { code: 'b', side: 'customer', state: 'completed', destination: 'market road' },
    { code: 'c', side: 'customer', state: 'completed', destination: 'College Gate' },
  ];
  assert.deepEqual(recentDestinations(rides), [
    { address: 'Market Road', rideCode: 'a' },
    { address: 'College Gate', rideCode: 'c' },
  ]);
});

test('saved delivery address mapping excludes account contact details', async () => {
  const { savedAddressText } = await helper;
  const place = { name: 'Home', line1: '12 Main Road', line2: 'East Wing', landmark: 'Temple', city: 'Bengaluru', state: 'Karnataka', contact: '***2345' };
  assert.equal(savedAddressText(place), '12 Main Road, East Wing, Temple, Bengaluru, Karnataka');
});
