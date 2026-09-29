'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
test('Send Items contract keeps peer delivery separate from Shop logistics and blocks unsupported claims', () => {
  const doc = fs.readFileSync(path.join(__dirname, '../../docs/MOVE-SEND-ITEMS-CONTRACT.md'), 'utf8');
  const screen = fs.readFileSync(path.join(__dirname, '../../apps/customer/src/v8/move/SendItems.jsx'), 'utf8');
  assert.match(doc, /Shop shipments must not be reused/i); assert.match(doc, /idempotency key/i); assert.match(doc, /prohibited/i); assert.match(doc, /internal IDs, storage paths, full contact details/i);
  assert.match(screen, /not available/i); assert.match(screen, /No delivery request, estimate, driver, proof of delivery, tracking, payment or settlement has been created/i);
});
