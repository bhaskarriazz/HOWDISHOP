const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const helper = import(pathToFileURL(path.resolve(__dirname, '../../apps/customer/src/v8/move/driverMove.mjs')).href);

test('driver availability is derived only from the server application DTO', async () => {
  const { driverAvailability } = await helper;
  assert.equal(driverAvailability(null).canToggle, false);
  assert.equal(driverAvailability({ state: 'submitted', reason: 'Evidence under review' }).title, 'Driver submitted');
  assert.match(driverAvailability({ state: 'approved', eligible_now: false, available: true }).detail, /Availability is off/);
  const online = driverAvailability({ state: 'approved', eligible_now: true, available: true, vehicle_class: 'Auto', zone: 'Pilot' });
  assert.equal(online.canToggle, true);
  assert.match(online.detail, /Auto/);
});

test('driver offer expiry never remains actionable in presentation', async () => {
  const { driverOfferStatus } = await helper;
  assert.equal(driverOfferStatus({ offer_expires_at: new Date(Date.now() - 1).toISOString() }), 'expired');
  assert.equal(driverOfferStatus({ offer_expires_at: new Date(Date.now() + 60000).toISOString() }), 'active');
});

test('driver trip copy does not create an arrived state', async () => {
  const { driverTripTitle } = await helper;
  assert.equal(driverTripTitle({ state: 'accepted' }), 'Navigate to pickup');
  assert.equal(driverTripTitle({ state: 'in_trip' }), 'Trip active');
});
