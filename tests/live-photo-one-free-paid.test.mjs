import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = file => readFileSync(file, 'utf8');

test('One lifetime free live photo survives DELETE, failed uploads and repeated logins', () => {
  const schema = source('supabase/migrations/20261121221900_hh_client_live_photo_first_free_paid_v1.sql');
  assert.match(schema, /create unique index if not exists hh_one_free_live_photo_lifetime_idx/i);
  assert.match(schema, /on app_private\.client_live_photos_v1\(account_id\) where billing_kind='free'/i);
  assert.doesNotMatch(schema, /where billing_kind='free' and status/i);
  assert.match(schema, /unique\(account_id, request_id\)/i);
  assert.match(schema, /force row level security/i);
  assert.match(schema, /from public, anon, authenticated, hh_app_inbox/i);
  assert.match(schema, /foreign key\(account_id,paid_order_id\)/i);
  assert.match(schema, /hh_one_render_per_paid_live_photo_order_idx/i);
});

test('Paid job only after independent admin verification; single-use receipt/order', () => {
  const service = source('lib/app/live-photo-service.js');
  const billing = source('lib/app/live-photo-billing.js');
  const adminRoute = source('app/api/admin/videos/live-photo-orders/route.js');
  assert.match(service, /if \(freeUsed\) bad\('LIVE_PHOTO_PAYMENT_REQUIRED', 402\)/);
  assert.match(service, /paid\.status !== 'verified'/);
  assert.match(service, /paid\.receipt_digest/);
  assert.match(service, /paid\.verified_at/);
  assert.match(service, /status='consumed',consumed_at=now\(\)/);
  assert.match(service, /submitHeyGenLivePhoto\(assetId, motion, id\)/);
  assert.ok(service.indexOf("status='consumed'") < service.indexOf('submitHeyGenLivePhoto(assetId, motion, id)'));
  assert.match(adminRoute, /requireAdminRequest/);
  assert.match(adminRoute, /requireSameOrigin/);
  assert.match(adminRoute, /auth\.verified\(\)/);
  assert.match(billing, /createHmac\('sha256'/);
  assert.match(billing, /HH_MANUAL_BILLING_PAYEE_APPROVED/);
  assert.match(billing, /HH_LIVE_PHOTO_RECEIPT_REVIEW_ENABLED/);
  assert.match(billing, /LIVE_PHOTO_PRICE_EUR_MINOR = 250/);
  assert.match(billing, /confirmed !== true/);
  assert.match(billing, /receiptReference/);
});

test('No free quota reset when user deletes a video; no billing in read paths', () => {
  const service = source('lib/app/live-photo-service.js');
  const schema = source('supabase/migrations/20261121221900_hh_client_live_photo_first_free_paid_v1.sql');
  assert.match(service, /deleteClientLivePhoto/);
  assert.match(service, /set status='deleted',deleted_at=now/);
  assert.doesNotMatch(service, /delete from app_private\.client_live_photos_v1/);
  assert.doesNotMatch(schema, /create or replace function\s+\w+reset_free/i);
  assert.match(service, /return \{ items: rows.map\(toClient\), creationEnabled/);
  assert.match(service, /billing: await livePhotoBillingStatus\(config, actor\)/);
});

test('Client can request manual payment but cannot verify it himself or set server price', () => {
  const client = source('components/app/my-live-photos.jsx');
  const paymentRoute = source('app/api/app/live-photos/orders/route.js');
  const billing = source('lib/app/live-photo-billing.js');
  assert.match(client, /paidOrderId/);
  assert.match(client, /nextPaidOrder/);
  assert.match(client, /freeRemaining/);
  assert.match(client, /€2,50/);
  assert.match(client, /live-photos\/orders/);
  assert.match(paymentRoute, /requireSameOrigin/);
  assert.match(paymentRoute, /auth\.verified\(\)/);
  assert.match(paymentRoute, /readBody\(request, 1024\)/);
  assert.match(billing, /Object\.keys\(input\)\.some\(k => !\['requestId'\]/);
  assert.doesNotMatch(paymentRoute, /verifyLivePhotoPayment/);
  assert.match(source('app/admin/videos/page.tsx'), /LivePhotoPaymentsAdmin/);
});

test('No public AI assets or provider key in client and status URL remains read-only', () => {
  const ui = source('components/app/my-live-photos.jsx');
  const provider = source('lib/app/live-photo-heygen.mjs');
  assert.doesNotMatch(ui, /HH_LIVE_PHOTO_HEYGEN_API_KEY/);
  assert.match(provider, /key\(method !== 'GET'\)/);
  assert.match(provider, /isAllowedHeyGenDownloadUrl/);
  assert.match(provider, /LIVE_PHOTO_MAX_BYTES = 12_000_000/);
  assert.match(provider, /duration: 5/);
  assert.match(provider, /resolution: '768p'/);
});
