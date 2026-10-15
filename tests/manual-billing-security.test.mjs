import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { manualBillingConfig } from '../lib/billing/manual-orders.js'

const file = name => readFileSync(new URL('../'+name, import.meta.url), 'utf8')
test('manual billing must fail closed until merchant, RLS, course and Premium fulfillment gates all approved',()=>{
  assert.equal(manualBillingConfig({}).requestsEnabled,false)
  assert.equal(manualBillingConfig({HH_MANUAL_BILLING_REQUESTS_ENABLED:'true'}).requestsEnabled,true)
  for(const key of ['HH_MANUAL_BILLING_REQUESTS_ENABLED','HH_MANUAL_BILLING_REVIEW_ENABLED',
    'HH_MANUAL_BILLING_PAYEE_APPROVED','HH_MANUAL_BILLING_ACCESS_APPROVED','HH_PREMIUM_SESSION_SCHEMA_APPROVED',
    'HH_PREMIUM_SESSION_FULFILLMENT_APPROVED','HH_BILLING_SCHEMA_APPROVED','HH_MULTICOURSE_SCHEMA_APPROVED']) {
    const flags={HH_MANUAL_BILLING_REQUESTS_ENABLED:'true',HH_MANUAL_BILLING_REVIEW_ENABLED:'true',
      HH_MANUAL_BILLING_PAYEE_APPROVED:'true',HH_MANUAL_BILLING_ACCESS_APPROVED:'true',
      HH_PREMIUM_SESSION_SCHEMA_APPROVED:'true',HH_PREMIUM_SESSION_FULFILLMENT_APPROVED:'true',
      HH_BILLING_SCHEMA_APPROVED:'true',HH_MULTICOURSE_SCHEMA_APPROVED:'true'}
    flags[key]='false'
    assert.equal(manualBillingConfig(flags).accessEnabled,false,key)
  }
})
test('owner account and rate scoping guard every request and reject cross-account headers',()=>{
  const source=file('app/api/app/manual-billing/[action]/route.js')
  assert.match(source,/await auth\.verified\(\)/)
  assert.match(source,/request\.headers\.get\('x-hh-account-id'\) !== actor\.id/)
  assert.match(source,/requireSameOrigin\(request, config\)/)
  assert.match(source,/manual-orders-create/)
  assert.doesNotMatch(source,/entitlement:\s*\{\s*active:\s*true/)
})
test('reviewer requires both Google-verified owner and secret admin cookie with same origin',()=>{
  const source=file('app/admin/api/manual-billing/route.js')
  assert.match(source,/requireAdminRequest\(\)/)
  assert.match(source,/await auth\.verified\(\)/)
  assert.match(source,/practitionerEmailAllowed\(actor\)/)
  assert.match(source,/isPractitioner\(actor\)/)
  assert.match(source,/requireSameOrigin\(request,config\)/)
  assert.match(source,/readBody\(request,4096\)/)
})
test('server protects funds with unique digest, external proof fields, owner review and no browser grant',()=>{
  const source=file('lib/billing/manual-orders.js')
  assert.match(source,/createHmac\('sha256', secret\)/)
  assert.match(source,/MANUAL_PAYMENT_AMOUNT_MISMATCH/)
  assert.match(source,/MANUAL_RECEIPT_SOURCE_INVALID/)
  assert.match(source,/MANUAL_ACCESS_NOT_APPROVED/)
  assert.match(source,/revision\s*!==\s*input.expectedRevision/)
  assert.match(source,/receipt_digest=\$2/)
  assert.match(source,/status='paid'/)
  assert.match(source,/status='refunded'/)
})
