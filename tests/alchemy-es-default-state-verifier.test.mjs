import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
test('Spanish and small iPhone E2E verification opens no payment provider', () => {
  const qa = read('scripts/verify-public-services-production.mjs');
  const helper = read('scripts/helpers/alchemy-payment-disclosure-verifier.mjs');
  assert.match(qa, /320, 360, 390, 1188/);
  assert.match(qa, /assertAlchemyBookingGate/);
  assert.match(qa, /assertViewport/);
  assert.match(qa, /captureAlchemyPanelOverflow/);
  assert.match(qa, /data-booking-step="contact"/);
  assert.match(qa, /data-booking-payment-options/);
  assert.ok(!qa.includes('assertAlchemyPaymentsExpanded'));
  assert.match(helper, /Cart methods require a server-confirmed booking/);
  assert.match(helper, /bounds.height >= 44 && bounds.width >= 44/);
});
