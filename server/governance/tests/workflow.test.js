'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluate } = require('../domain');

const valid = () => ({
  location: { id: 'lot-1', inventoryVersion: 'inv-v3', pricingVersion: 'price-v2', timezone: 'America/New_York' },
  reservations: [{ id: 'r1', customerId: 'c1', spaceId: 's1', staffOwnerId: 'staff-1', startAt: '2026-07-18T12:00:00Z', endAt: '2026-07-18T13:00:00Z', status: 'confirmed', price: { subtotal: 1000, tax: 80, discount: 0, total: 1080, currency: 'USD' }, payment: { status: 'authorized' } }],
  reconciliation: { batchVersion: 'batch-v1', expectedAmount: 1080, settledAmount: 1080, unmatchedCount: 0 },
  failureCases: { stockRace: true, paymentDivergence: true, cancellationRefund: true, noShow: true, partialFulfillment: true, recovery: true }
});

test('accepts reconciled reservation fulfillment', () => assert.deepEqual(evaluate(valid()).errors, []));
test('blocks double-booking and payment divergence', () => { const input = valid(); input.reservations.push({ ...input.reservations[0], id: 'r2', customerId: 'c2' }); input.reconciliation.settledAmount = 0; assert.ok(evaluate(input).errors.some((e) => e.includes('double booked'))); assert.ok(evaluate(input).errors.some((e) => e.includes('reconciliation'))); });
