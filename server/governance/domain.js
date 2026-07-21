'use strict';
function evaluate(input = {}) {
  const errors = [], location = input.location || {}, reservations = input.reservations || [];
  if (!location.id || !location.inventoryVersion || !location.pricingVersion || !location.timezone) {
    errors.push('versioned location inventory, pricing, and timezone required');
  }
  const slots = new Map();
  for (const reservation of reservations) {
    if (!reservation.id || !reservation.customerId || !reservation.spaceId || !reservation.staffOwnerId ||
        !reservation.startAt || !reservation.endAt || Date.parse(reservation.startAt) >= Date.parse(reservation.endAt) ||
        !['held','confirmed','checked_in','completed','cancelled','no_show','partially_fulfilled'].includes(reservation.status)) {
      errors.push(`reservation ${reservation.id || '?'} invalid`);
    }
    const key = String(reservation.spaceId);
    for (const prior of slots.get(key) || []) {
      if (!['cancelled','no_show'].includes(reservation.status) && !['cancelled','no_show'].includes(prior.status) &&
          Date.parse(reservation.startAt) < Date.parse(prior.endAt) && Date.parse(prior.startAt) < Date.parse(reservation.endAt)) {
        errors.push(`space ${key} is double booked`);
      }
    }
    slots.set(key, [...(slots.get(key) || []), reservation]);
    const expected = Number(reservation.price?.subtotal) + Number(reservation.price?.tax) - Number(reservation.price?.discount || 0);
    if (!reservation.price?.currency || !Number.isFinite(expected) || Math.abs(expected - Number(reservation.price?.total)) > 0.01) errors.push('price/tax total does not reconcile');
    if (reservation.status === 'confirmed' && reservation.payment?.status !== 'authorized') errors.push('confirmed reservation lacks authorization');
    if (reservation.status === 'completed' && reservation.payment?.status !== 'captured') errors.push('completion lacks captured payment');
    if (reservation.status === 'cancelled' && reservation.payment?.status === 'captured' && reservation.refund?.status !== 'settled') errors.push('captured cancellation lacks refund');
    if (['no_show','partially_fulfilled'].includes(reservation.status) && !reservation.exception?.ownerId) errors.push('exception lacks owner');
  }
  const reconciliation = input.reconciliation || {};
  if (!reconciliation.batchVersion || !Number.isFinite(Number(reconciliation.expectedAmount)) ||
      !Number.isFinite(Number(reconciliation.settledAmount)) ||
      Math.abs(Number(reconciliation.expectedAmount) - Number(reconciliation.settledAmount)) > 0.01 ||
      reconciliation.unmatchedCount !== 0) errors.push('payment reconciliation is incomplete');
  const tests = input.failureCases || {};
  for (const key of ['stockRace','paymentDivergence','cancellationRefund','noShow','partialFulfillment','recovery']) {
    if (tests[key] !== true) errors.push(`failure case ${key} not passed`);
  }
  return { errors, result: { reservationCount: reservations.length, reconciliation,
    completed: reservations.filter((item) => item.status === 'completed').length,
    decision: errors.length ? 'revise' : 'reviewable' },
    assumptions: ['space inventory and settlement snapshots are authoritative only at capturedAt'],
    uncertainty: { paymentProviderNotConnected: true, navigationPartnerNotConnected: true } };
}
module.exports = { evaluate };
