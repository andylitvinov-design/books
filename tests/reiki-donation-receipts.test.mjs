import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import {
  normalizeReikiDonationReference, reikiDonationAmountMinor,
  buildReikiDonationPayPalUrl,
} from '../data/academy/reiki-donation-model.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const sql = read('supabase/migrations/20261025122852_hh_reiki_donation_manual_receipts_20261025.sql')
const service = read('lib/academy/reiki-donation-orders.js')
const route = read('app/api/app/reiki-donations/route.js')
const adminRoute = read('app/admin/reiki-leads/data/route.js')
const client = read('components/reiki-donation-checkout.tsx')
const learner = read('components/energywork-ai-learner.tsx')
const owner = read('components/admin-reiki-leads.jsx')
const css = read('components/reiki-donation-checkout.module.css')

test('EUR donations accept only safe, intentional whole-EUR values', () => {
  for (const [eur, cents] of [[1, 100],[5, 500],[10, 1000],[250, 25000]]) {
    assert.equal(reikiDonationAmountMinor(eur), cents)
    assert.equal(buildReikiDonationPayPalUrl(cents, true), 'https://paypal.me/psitrends/' + eur + 'EUR')
  }
  for (const bad of [0,-1,251,10.5,'10',null,NaN,Infinity,{}]) {
    assert.equal(reikiDonationAmountMinor(bad), null)
  }
  for (const minor of [0,100000,150,120.5,'1000',-100,NaN]) {
    assert.equal(buildReikiDonationPayPalUrl(minor, true), null)
  }
  assert.equal(buildReikiDonationPayPalUrl(1000, false), null)
  assert.equal(new URL(buildReikiDonationPayPalUrl(1000, true)).search, '')
})

test('client transaction references are normalized but never become payment proof alone', () => {
  assert.equal(normalizeReikiDonationReference('  ab01234-56789_zz  '),'AB01234-56789_ZZ')
  for (const bad of ['','x','23 456 7','../foo','a'.repeat(81),123,null, '123\n456']) {
    assert.equal(normalizeReikiDonationReference(bad),null)
  }
  assert.match(service,/createHmac\('sha256', config\.encryptionKey\)/)
  assert.match(service,/seal\(\{ reference \}/)
  assert.match(service,/claim_ciphertext/)
  assert.match(service,/openSealed\(row\.claim_ciphertext/)
  assert.match(service,/DONATION_PROVIDER_PROOF_MISMATCH/)
  assert.match(service,/status='review'/)
  assert.match(service,/status='paid'/)
  assert.doesNotMatch(client,/markAsPaid|setPaid\(true\)|paymentSucceeded: true/)
})

test('private RLS and immutable financial scope: learner cannot mark paid', () => {
  assert.match(sql,/create table if not exists app_private\.reiki_donation_orders/)
  assert.match(sql,/account_id uuid not null references app\.accounts/)
  assert.match(sql,/application_lead_id uuid not null unique references app_private\.reiki_course_leads/)
  assert.match(sql,/amount_minor integer not null check/)
  assert.match(sql,/status text not null default 'pending' check \(status in \('pending','review','paid'\)\)/)
  assert.match(sql,/constraint reiki_donation_receipt_state check/)
  assert.match(sql,/enable row level security/)
  assert.match(sql,/force row level security/)
  assert.match(sql,/revoke all on app_private\.reiki_donation_orders from public, anon, authenticated/)
  assert.match(sql,/app_private\.account_active\(\)/)
  assert.match(sql,/grant update\(status,claim_ciphertext,claim_digest,revision,updated_at\)/)
  assert.match(sql,/and status = 'pending'\)/)
  assert.match(sql,/and status = 'review' and paid_minor is null/)
  assert.match(sql,/grant update\(status,paid_minor,verified_digest,verified_at,revision,updated_at\)/)
  assert.match(sql,/hh_app_inbox/)
  assert.match(sql,/current_setting\('hh\.practitioner_id',true\)/)
  assert.doesNotMatch(sql,/grant (?:all|update\(paid_minor|delete) on app_private\.reiki_donation_orders to (?:authenticated|anon|hh_app_backend)/i)
})

test('new donation order is only created after a consented application and never from chosen UI amounts alone', () => {
  assert.match(service,/HH_REIKI_DONATIONS_ENABLED === 'true'/)
  assert.match(service,/HH_REIKI_DONATION_PAYEE_APPROVED === 'true'/)
  assert.match(service,/HH_REIKI_DONATION_SCHEMA_APPROVED === 'true'/)
  assert.match(service,/personalPayPalEnabled\(env\)/)
  assert.match(service,/stage='application' for update/)
  assert.match(service,/openSealed\(row\.payload_ciphertext/)
  assert.match(service,/payload\?\.initiationRequest\?\.donationInitiations/)
  assert.match(service,/donationInitiations|DONATION_NOT_SELECTED/)
  assert.match(service,/application_lead_id=\$1 for update/)
  assert.match(service,/DONATION_ORDER_ALREADY_EXISTS/)
  assert.match(sql,/unique \(account_id, operation_id\)/)
  assert.match(service,/status === 'paid' \? row\.paid_minor \/ 100 : null/)
  assert.match(service,/status === 'pending'/)
})

test('private learner and owner APIs have independent auth and same-origin protection', () => {
  assert.match(route,/createRequestAuth\(request, config\)/)
  assert.match(route,/auth\.verified\(\)/)
  assert.match(route,/requireSameOrigin\(request, config\)/)
  assert.match(route,/consumeRate/)
  assert.match(route,/PRIVATE_HEADERS/)
  assert.match(route,/orders\.status\(actor\)/)
  assert.match(route,/orders\.claim\(actor, input\)/)
  assert.match(adminRoute,/requireAdminRequest\(\)/)
  assert.match(adminRoute,/requireSameOrigin\(request, config\)/)
  assert.match(adminRoute,/donations\.listOwner\(\)/)
  assert.match(adminRoute,/donations\.verifyOwner\(body\)/)
  assert.match(service,/inbox: true, practitionerId: PRACTITIONER_ID/)
  assert.doesNotMatch(service,/sendMail|sendTelegram|trackingPixel|metaPixel|GA4|console\.log/)
})

test('mobile accessible cart previews, explicit confirmation and per-client verified amount', () => {
  assert.match(learner,/ReikiDonationPreview/)
  assert.match(learner,/ReikiDonationCheckout/)
  assert.match(learner,/setDonationCartOpen\(true\)/)
  assert.match(client,/showModal\(\)/)
  assert.match(client,/onCancel=/)
  assert.match(client,/data-reiki-donation-preview/)
  assert.match(client,/data-reiki-donation-awaiting-verification/)
  assert.match(client,/data-reiki-donation-confirmed/)
  assert.match(client,/order\.status === "paid"/)
  assert.match(client,/order\.receivedEur/)
  assert.match(owner,/data-reiki-donation-crm/)
  assert.match(owner,/data-reiki-crm-received/)
  assert.match(owner,/receiptReference:receiptRefs\[order\.id\]/)
  assert.match(owner,/confirmed:true/)
  assert.match(css,/@media\(max-width:380px\)/)
  assert.match(css,/min-height:44px/)
  assert.doesNotMatch(learner,/sessionStorage\.setItem\([^)]*donation/)
})
