import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  WALLET_CURRENCY, WALLET_PRESETS_MINOR, walletAmountMinor, walletPrice,
  walletPayPalUrl, walletSettings,
} from '../lib/wallet/model.js'

const file = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('wallet is CAD-only, exact integer cents and offers CA$40 / CA$50 vouchers', () => {
  assert.equal(WALLET_CURRENCY, 'CAD')
  assert.deepEqual([...WALLET_PRESETS_MINOR], [4000, 5000])
  for (const [value, expected] of [
    ['1', 100], ['1.01', 101], ['9.9', 990], ['40', 4000], ['40.00', 4000],
    ['50.00', 5000], ['123.45', 12345], ['1000', 100000],
  ]) assert.equal(walletAmountMinor(value), expected)
  for (const invalid of [null, 50, 0, -1, '0.99', '0', '-40', '1e2', '1,50',
    '1.234', '1000.01', '1001', '040', '40CAD', 'NaN', '__proto__', '']) {
    assert.throws(() => walletAmountMinor(invalid))
  }
})
test('wallet payment link carries exact CAD amount, never user identity or arbitrary URL', () => {
  assert.equal(walletPayPalUrl(4000), 'https://paypal.me/psitrends/40.00CAD')
  assert.equal(walletPayPalUrl(5000), 'https://paypal.me/psitrends/50.00CAD')
  assert.equal(walletPayPalUrl(12345), 'https://paypal.me/psitrends/123.45CAD')
  assert.equal(walletPrice(100), '1.00')
  assert.throws(() => walletPayPalUrl(0))
})
test('wallet and each payment rail fail closed without approved feature flags', () => {
  assert.deepEqual(walletSettings({}), { enabled: false, paypalEnabled: false, squareEnabled: false })
  const approved = { HH_APP_ENABLED: 'true', HH_WALLET_ENABLED: 'true',
    HH_WALLET_SCHEMA_APPROVED: 'true', HH_WALLET_PAYPAL_ENABLED: 'true' }
  assert.deepEqual(walletSettings(approved), { enabled: true, paypalEnabled: true, squareEnabled: false })
  assert.equal(walletSettings({ ...approved, HH_PAYPAL_PERSONAL_DISABLED: 'true' }).paypalEnabled, false)
  assert.equal(walletSettings({ ...approved, VERCEL_ENV: 'production' }).enabled, false)
  assert.equal(walletSettings({ ...approved, VERCEL_ENV: 'production',
    HH_APP_PRODUCTION_APPROVED: 'true', HH_WALLET_SQUARE_ENABLED: 'true' }).squareEnabled, true)
})
test('public wallet API requires authenticated matching owner, same-origin mutations and rate limit', () => {
  const route = file('app/api/app/wallet/[action]/route.js')
  for (const contract of ['auth.verified()', 'x-hh-account-id', 'ACCOUNT_CHANGED',
    'requireSameOrigin', 'consumeRate', 'readBody', 'PRIVATE_HEADERS', 'createWalletService'])
    assert.ok(route.includes(contract), contract)
  assert.doesNotMatch(route, /getServiceRole|NEXT_PUBLIC_.*SECRET|markAsPaid|paid:\s*true/)
})
test('admin wallet reviews require both legacy admin and verified owner identity', () => {
  const route = file('app/admin/api/wallet/route.js')
  for (const contract of ['requireAdminRequest', 'practitionerEmailAllowed', 'isPractitioner',
    'requireSameOrigin', 'consumeRate']) assert.ok(route.includes(contract))
  const service = file('lib/wallet/service.js')
  for (const contract of ['receiptDigest', 'reviewerId', 'receiptReference(body.transactionId)',
    'squareApiRequest', 'verifiedSquarePayment', 'for update', 'wallet_entries',
    'WALLET_IDEMPOTENCY_CONFLICT']) assert.ok(service.includes(contract))
  // An already reviewed or credited PayPal top-up must not create a new
  // payable link when its original operation ID is retried.
  assert.match(service, /created.status === 'pending' \? trustedPayPalLink\(created\) : null/)
  // Signed Square webhooks that arrive before order persistence return 503 for
  // provider redelivery, rather than silently losing a paid wallet event.
  assert.match(service, /WALLET_PAYMENT_RECONCILIATION_REQUIRED/)
  assert.match(service, /\^HH wallet/)
})
test('private DB schema prevents unauthenticated credits and duplicate receipt/ledger events', () => {
  const sql = file('supabase/migrations/20261030045723_hh_wallet_cad_topups.sql')
  for (const condition of ['force row level security', 'from public, anon, authenticated',
    'unique(topup_id, kind)', 'receipt_digest text unique',
    'wallet_topup_update_guard', 'wallet_ledger_guard', 'WALLET_LEDGER_EVIDENCE_MISMATCH',
    'WALLET_PROVIDER_PROOF_REQUIRED', 'hh.wallet_review_verified',
    'hh.wallet_provider_verified']) assert.ok(sql.includes(condition), condition)
  const ui = file('components/wallet/wallet-panel.jsx')
  assert.match(ui, /WALLET_PRESETS_MINOR/)
  assert.match(ui, /order\.status === 'pending'/)
  assert.match(ui, /transactionId/)
  assert.doesNotMatch(ui, /markAsPaid|localStorage\.setItem/)
})
