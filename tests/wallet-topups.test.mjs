import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  WALLET_CURRENCY, WALLET_PRESETS_MINOR, walletAmountMinor, walletPrice,
  walletPayPalUrl, walletSettings, walletSafePaymentUrl,
} from '../lib/wallet/model.js'
import { getSquareGatewayConfig, getSquareWalletGatewayConfig } from '../lib/commerce/square-gateway.js'

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
  assert.deepEqual(walletSettings(approved), { enabled: true, paypalEnabled: false, squareEnabled: false })
  assert.equal(walletSettings({ ...approved, HH_PAYPAL_PERSONAL_DISABLED: 'true' }).paypalEnabled, false)
  assert.equal(walletSettings(approved).paypalEnabled, false, 'prepaid credits require PayPal terms approval')
  assert.equal(walletSettings({ ...approved, VERCEL_ENV: 'production' }).enabled, false)
  assert.equal(walletSettings({ ...approved, HH_WALLET_PAYPAL_TERMS_APPROVED: 'true' }).paypalEnabled, true)
  assert.equal(walletSettings({ ...approved, VERCEL_ENV: 'production',
    HH_APP_PRODUCTION_APPROVED: 'true', HH_WALLET_SQUARE_ENABLED: 'true' }).squareEnabled, false)
  assert.equal(walletSettings({ ...approved, VERCEL_ENV: 'production',
    HH_APP_PRODUCTION_APPROVED: 'true', HH_WALLET_SQUARE_ENABLED: 'true',
    HH_WALLET_SQUARE_TERMS_APPROVED: 'true' }).squareEnabled, true)
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
  const dedupe = file('supabase/migrations/20261030050812_hh_wallet_receipt_reference_uniqueness.sql')
  assert.match(dedupe, /unique index if not exists wallet_topups_paypal_reference_once/)
  const ui = file('components/wallet/wallet-panel.jsx')
  assert.match(ui, /WALLET_PRESETS_MINOR/)
  assert.match(ui, /order\.status === 'pending'/)
  assert.match(ui, /transactionId/)
  assert.doesNotMatch(ui, /markAsPaid|localStorage\.setItem/)
})

test('unified catalogue validates PayPal and Square links, not arbitrary browser redirects', () => {
  assert.equal(walletSafePaymentUrl('paypal_personal', walletPayPalUrl(4000)),
    'https://paypal.me/psitrends/40.00CAD')
  assert.equal(walletSafePaymentUrl('square_api', 'https://square.link/u/AaBbCCD123'),
    'https://square.link/u/AaBbCCD123')
  for (const invalid of [
    'javascript:alert(1)', 'https://evil.example/psitrends/40.00CAD',
    'https://paypal.me/attacker/40.00CAD', 'https://paypal.me/psitrends/1USD',
    'https://paypal.me/psitrends/40.00CAD?email=test@example.com',
    'https://square.link/u/AaBbCCD123?redirect=https://evil.example',
  ]) {
    assert.equal(walletSafePaymentUrl('paypal_personal', invalid), null)
    assert.equal(walletSafePaymentUrl('square_api', invalid), null)
  }
  assert.equal(walletSafePaymentUrl('paypal_personal', 'https://square.link/u/AaBbCCD123'), null)
})

test('Square wallet merchant readiness is independent of consultation EUR/CAD price SKUs', () => {
  const merchant = {
    VERCEL_ENV: 'production', HH_SQUARE_API_MODE: 'production',
    HH_SQUARE_API_ENABLED: 'true', HH_SQUARE_API_PRODUCTION_APPROVED: 'true',
    HH_SQUARE_INDIVIDUAL_PAYEE_APPROVED: 'true', HH_SQUARE_TAX_REVIEW_APPROVED: 'true',
    HH_SQUARE_REFUND_TERMS_APPROVED: 'true',
    HH_SQUARE_API_TOKEN: 'EAAAtestToken00000000000000',
    HH_SQUARE_MERCHANT_ID: 'TESTMERCHANT001',
    HH_SQUARE_LOCATION_ID: 'TESTLOCATION01',
    HH_SQUARE_WEBHOOK_SIGNATURE_KEY: 'webhooksignaturesecret000000000',
    HH_APP_ENABLED: 'true', HH_APP_PRODUCTION_APPROVED: 'true',
    HH_WALLET_ENABLED: 'true', HH_WALLET_SCHEMA_APPROVED: 'true',
    HH_WALLET_SQUARE_ENABLED: 'true', HH_WALLET_SQUARE_TERMS_APPROVED: 'true',
  }
  assert.equal(getSquareGatewayConfig(merchant).enabled, false,
    'existing consultation checkout must stay closed without its own prices')
  assert.equal(getSquareWalletGatewayConfig(merchant).enabled, true)
  for (const key of [
    'HH_SQUARE_API_TOKEN', 'HH_SQUARE_LOCATION_ID', 'HH_SQUARE_WEBHOOK_SIGNATURE_KEY',
    'HH_SQUARE_API_PRODUCTION_APPROVED', 'HH_WALLET_SCHEMA_APPROVED',
    'HH_WALLET_SQUARE_TERMS_APPROVED', 'HH_APP_PRODUCTION_APPROVED',
  ]) {
    const env = { ...merchant }
    delete env[key]
    assert.equal(getSquareWalletGatewayConfig(env).enabled, false, key)
  }
  assert.equal(getSquareWalletGatewayConfig({ ...merchant, HH_SQUARE_API_MODE: 'sandbox' }).enabled, false)
  assert.equal(getSquareWalletGatewayConfig({ ...merchant,
    HH_SQUARE_WEBHOOK_URL: 'https://evil.example/api/payments/square/webhook' }).enabled, false)
})

test('wallet checkout remains resumable and both payment methods are visible with honest readiness', () => {
  const ui = file('components/wallet/wallet-panel.jsx')
  const service = file('lib/wallet/service.js')
  const webhook = file('app/api/payments/square/webhook/route.js')
  assert.match(ui, /data-wallet-payment-methods/)
  assert.match(ui, /data-wallet-method="square_api"/)
  assert.match(ui, /data-wallet-method="paypal_personal"/)
  assert.match(ui, /data-wallet-resume-payment/)
  assert.match(ui, /walletSafePaymentUrl/)
  assert.doesNotMatch(ui, /window.location.assign/)
  assert.match(service, /getSquareWalletGatewayConfig/)
  assert.match(service, /row.status === 'reversed'/)
  assert.match(service, /paymentUrl: walletPayPalUrl/)
  assert.match(webhook, /servicesSquare.enabled/)
  assert.match(webhook, /walletSquare.enabled/)
  assert.match(webhook, /squareWebhookValid/)
  const admin = file('components/wallet/wallet-review.jsx')
  assert.match(admin, /proof.transactionId/)
  assert.match(admin, /proof.amount/)
})

// Holistic House owner decision 2026-10-30: prepaid wallet integrates PayPal
// and Square, not the legacy subscription processor. Those older codepaths
// remain in the repository but must not enter the wallet purchase flow.
test('wallet checkout supports only PayPal and Square and preserves a single top-up catalogue', () => {
  const walletPaths = [
    'lib/wallet/model.js',
    'lib/wallet/service.js',
    'components/wallet/wallet-panel.jsx',
    'app/api/app/wallet/[action]/route.js',
    'app/admin/api/wallet/route.js',
  ]
  for (const path of walletPaths) {
    const source = file(path)
    assert.equal(source.toLowerCase().includes('stripe'), false, path)
  }
  const wallet = file('components/wallet/wallet-panel.jsx')
  assert.match(wallet, /data-wallet-method="paypal_personal"/)
  assert.match(wallet, /data-wallet-method="square_api"/)
  assert.match(wallet, /title: 'Пополнить баланс'/)
  const payments = file('app/[locale]/payments/page.tsx')
  assert.match(payments, /data-unified-wallet-link/)
  assert.match(payments, /getSquareWalletGatewayConfig\(\)\.enabled/)
  assert.match(payments, /walletTopupAvailable/)
  assert.doesNotMatch(payments, /data-unified-wallet-topup[\s\S]{0,700}buildSquarePaymentForServices/)
})
