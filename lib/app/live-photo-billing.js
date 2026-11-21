import 'server-only';
import { createHmac, randomUUID } from 'node:crypto';
import { AppError } from '../assessments/contracts.js';
import { transaction } from './database.js';
import { isLivePhotoCreationEnabled } from './live-photo-heygen.mjs';

export const LIVE_PHOTO_PRICE_EUR_MINOR = 250;
export const LIVE_PHOTO_CURRENCY = 'EUR';
export const LIVE_PHOTO_MANUAL_PAYMENT_CONTACT = 'https://t.me/AndyTherapist';

const ORDERS = 'app_private.client_live_photo_orders_v1';
const PHOTOS = 'app_private.client_live_photos_v1';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const RECEIPT = /^[A-Za-z0-9][A-Za-z0-9_.:/-]{5,119}$/;
function fail(code, status = 409) { throw new AppError(code, status); }
export function livePhotoPaidOrdersEnabled(env = process.env) {
  return isLivePhotoCreationEnabled(env) &&
    env.HH_LIVE_PHOTO_PAID_ORDERS_ENABLED === 'true' &&
    env.HH_MANUAL_BILLING_PAYEE_APPROVED === 'true';
}
export function livePhotoReceiptReviewEnabled(env = process.env) {
  return livePhotoPaidOrdersEnabled(env) &&
    env.HH_LIVE_PHOTO_RECEIPT_REVIEW_ENABLED === 'true';
}
function serial(value) {
  if (typeof value !== 'string' || !UUID.test(value)) fail('INVALID_LIVE_PHOTO_OPERATION', 400);
  return value;
}
function paymentResponse(row) {
  return Object.freeze({
    id: row.id, status: row.status, currency: row.currency,
    priceMinor: row.price_minor, paymentMethod: row.payment_method,
    createdAt: row.created_at, verifiedAt: row.verified_at || null,
  });
}
export async function livePhotoBillingStatus(config, actor) {
  return transaction(config, actor, async db => {
    const used = (await db.query("select exists(select 1 from " + PHOTOS +
      " where account_id=$1 and billing_kind='free') as used", [actor.id])).rows[0]?.used === true;
    const orders = (await db.query('select * from ' + ORDERS +
      " where account_id=$1 and status in ('requested','verified','consumed') order by created_at desc limit 20",
      [actor.id])).rows.map(paymentResponse);
    return { freeRemaining: !used, freeAllowance: 1,
      paidOrdersEnabled: livePhotoPaidOrdersEnabled(), currency: LIVE_PHOTO_CURRENCY,
      priceMinor: LIVE_PHOTO_PRICE_EUR_MINOR, orders,
      paymentContact: livePhotoPaidOrdersEnabled() ? LIVE_PHOTO_MANUAL_PAYMENT_CONTACT : null };
  });
}
export async function createLivePhotoPaymentRequest(config, actor, input) {
  if (!livePhotoPaidOrdersEnabled()) fail('LIVE_PHOTO_PAYMENTS_UNAVAILABLE', 503);
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      Object.keys(input).some(k => !['requestId'].includes(k)))
    fail('INVALID_LIVE_PHOTO_ORDER', 400);
  const requestId = serial(input.requestId);
  return transaction(config, actor, async db => {
    const current = (await db.query('select * from ' + ORDERS +
      ' where account_id=$1 and request_id=$2', [actor.id, requestId])).rows[0];
    if (current) return { order: paymentResponse(current), created: false };
    await db.query('select pg_advisory_xact_lock(hashtext($1))', ['live-photo-order:' + actor.id]);
    const another = (await db.query('select * from ' + ORDERS +
      " where account_id=$1 and status in ('requested','verified') order by created_at desc limit 1",
      [actor.id])).rows[0];
    if (another) return { order: paymentResponse(another), created: false };
    const row = (await db.query('insert into ' + ORDERS +
      ' (id,account_id,request_id,price_minor,currency,payment_method) ' +
      "values($1,$2,$3,$4,'EUR','paypal-eur') returning *",
      [randomUUID(), actor.id, requestId, LIVE_PHOTO_PRICE_EUR_MINOR])).rows[0];
    return { order: paymentResponse(row), created: true };
  });
}
// Admin portal ONLY: requireAdminRequest() and verified app account before use.
// A browser checkbox, unverified screenshot or client receipt string is never payment proof.
export async function listLivePhotoPaymentReview(config, actor) {
  return transaction(config, actor, async db => ({
    orders: (await db.query('select * from ' + ORDERS +
      " where status in ('requested','verified','consumed') order by created_at desc limit 50"
    )).rows.map(row => ({ ...paymentResponse(row), accountId: row.account_id })),
    reviewEnabled: livePhotoReceiptReviewEnabled(),
  }), { moderator: true });
}
export async function verifyLivePhotoPayment(config, actor, input) {
  if (!livePhotoReceiptReviewEnabled()) fail('LIVE_PHOTO_PAYMENT_REVIEW_UNAVAILABLE', 503);
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      Object.keys(input).some(k => !['orderId','receiptReference','amountMinor','confirmed'].includes(k)) ||
      input.confirmed !== true || input.amountMinor !== LIVE_PHOTO_PRICE_EUR_MINOR ||
      typeof input.receiptReference !== 'string' || !RECEIPT.test(input.receiptReference))
    fail('LIVE_PHOTO_RECEIPT_INVALID', 400);
  const orderId = serial(input.orderId);
  if (!Buffer.isBuffer(config.encryptionKey) || config.encryptionKey.byteLength !== 32)
    fail('LIVE_PHOTO_RECEIPT_KEY_NOT_CONFIGURED', 503);
  const digest = createHmac('sha256', config.encryptionKey)
    .update('hh-live-photo-paypal-eur-v1\0' + input.receiptReference).digest('hex');
  return transaction(config, actor, async db => {
    const row = (await db.query('select * from ' + ORDERS + ' where id=$1 for update',
      [orderId])).rows[0];
    if (!row || row.status !== 'requested') fail('LIVE_PHOTO_ORDER_NOT_PAYABLE', 409);
    if (row.price_minor !== LIVE_PHOTO_PRICE_EUR_MINOR || row.currency !== 'EUR' ||
        row.payment_method !== 'paypal-eur') fail('LIVE_PHOTO_AMOUNT_MISMATCH');
    const updated = (await db.query('update ' + ORDERS +
      " set status='verified',receipt_digest=$2,reviewer_id=$3,verified_at=now(),updated_at=now() " +
      "where id=$1 and status='requested' returning *", [row.id, digest, actor.id])).rows[0];
    if (!updated) fail('LIVE_PHOTO_PAYMENT_CONFLICT');
    return { order: paymentResponse(updated) };
  }, { moderator: true });
}
