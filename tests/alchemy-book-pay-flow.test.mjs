import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { BOOKABLE_SKUS, SESSION_BOOKING_TTL, signSessionBooking, verifySessionBooking, validConfirmedSlot } from '../lib/practitioners/public-session-booking.mjs';
import { normalizePublicServiceEnquiry } from '../lib/practitioners/public-service-enquiry-input.mjs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const config = { encryptionKey: randomBytes(32) };
const operationId = '11111111-2222-4333-8444-555555555555';
const id = '99999999-8888-4777-8aaa-bbbbbbbbbbbb';
const now = Date.now();
const input = {
  operationId, serviceTitle: 'Alchemy of the Soul / Psycho-homeopathy',
  sourcePath: '/en/services/alchemy-of-soul', locale: 'en', contactConsent: true,
  bookingSku: 'personal-session-60', contact: { displayName: 'Booking Visitor',
    email: '', phone: '+14165551234' },
};

test('only two fixed EU consultation products can be booked', () => {
  assert.deepEqual(Object.keys(BOOKABLE_SKUS).sort(),
    ['express-consultation-30','personal-session-60']);
  const request = normalizePublicServiceEnquiry(input);
  assert.equal(request.bookingSku, 'personal-session-60');
  assert.equal(request.contact.source, 'website');
  for (const invalid of [
    { bookingSku: '__proto__' }, { bookingSku: 'month' }, { bookingSku: '' },
    { sourcePath: '/en/services/other' }, { contactConsent: false },
    { contact: null }, { bookingStartsAt: '2030-01-01T10:00:00Z' },
    { paymentStatus: 'paid' }, { amountMinor: 1 },
  ]) assert.throws(() => normalizePublicServiceEnquiry({ ...input, ...invalid }));
  assert.equal(normalizePublicServiceEnquiry({ ...input, bookingSku: undefined }).bookingSku, undefined);
});

test('unforgeable same-browser booking proof expires and is not a public HH reference', () => {
  const createdAt = Math.floor(now / 1000) * 1000;
  const token = signSessionBooking({ id, operationId, createdAt }, config);
  assert.deepEqual(verifySessionBooking(token, config, now),
    { id, operationId, createdAt });
  assert.equal(verifySessionBooking(token.slice(0,-2) + 'AA', config, now), null);
  assert.equal(verifySessionBooking(token, { encryptionKey: randomBytes(32) }, now), null);
  assert.equal(verifySessionBooking(token, config, now + (SESSION_BOOKING_TTL + 2) * 1000), null);
  assert.equal(verifySessionBooking('HH-0123456789AB', config, now), null);
});

test('owner must confirm a real future UTC slot before checkout UI exists', () => {
  const future = new Date(now + 86400e3).toISOString();
  assert.equal(validConfirmedSlot(future, now), future);
  for (const invalid of [
    new Date(now - 86400e3).toISOString(),
    new Date(now + 181*86400e3).toISOString(),
    '2026-10-29T09:00:00-04:00', '2026-13-51T09:00:00Z', 'tomorrow', null,
  ]) assert.equal(validConfirmedSlot(invalid, now), null);
  const status = read('app/api/service-enquiries/booking-status/route.js');
  assert.match(status, /verifySessionBooking/);
  assert.match(status, /SESSION_BOOKING_COOKIE/);
  assert.match(status, /set_config\('hh.public_enquiry_operation'/);
  assert.match(status, /row.status === 'booked'/);
  assert.doesNotMatch(status, /publicServiceEnquiryReference|payment_received|clientEmail/i);
  const update = read('lib/practitioners/public-service-enquiry.js');
  assert.match(update, /input.action === 'confirm_booking'/);
  assert.match(update, /validConfirmedSlot/);
  assert.match(update, /SLOT_UNAVAILABLE/);
  assert.match(update, /for update/);
  const owner = read('components/app/practice-workspace.jsx');
  assert.match(owner, /data-owner-confirm-public-booking/);
  assert.match(owner, /action:'confirm_booking'/);
  assert.match(owner, /data-owner-public-booking-confirmed/);
});

test('source page payment links are absent before server-confirmed booking', () => {
  const alchemy = read('components/alchemy-soul-lead-form.tsx');
  assert.doesNotMatch(alchemy, /data-paypal-personal-offer|data-wise-payment-link|data-zen-manual-request/);
  const chooser = read('components/contact-channel-chooser.tsx');
  assert.match(chooser, /const paidReady = bookingConfirmed && Boolean\(saved && bookingStartsAt\)/);
  assert.match(chooser, /paidReady && paymentExpanded/);
  assert.match(chooser, /href=\{"\/" \+ locale \+ "\/cart\?items="/);
  const handler = read('app/api/service-enquiries/route.js');
  assert.match(handler, /result.saved === true && isAlchemyBooking\(payload\)/);
  assert.match(handler, /httpOnly: true/);
  assert.match(handler, /sameSite: 'strict'/);
  assert.doesNotMatch(handler, /markAsPaid|chargePayment|payment_received/);
});
