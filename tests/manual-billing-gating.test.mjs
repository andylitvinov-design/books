import test from 'node:test'
import assert from 'node:assert/strict'
import { manualBillingConfig } from '../lib/billing/manual-config.js'
import { subscriptionEntitlement } from '../lib/billing/entitlements.js'
import { normalizeBillingStatus, SUBSCRIPTION_PLANS } from '../lib/billing/public-plan.js'

test('manual paid months cannot grant anything without server approvals', () => {
  const config=manualBillingConfig({})
  assert.equal(config.requestsEnabled,false)
  assert.equal(config.accessEnabled,false)
  assert.equal(config.premiumSessionEnabled,false)
})

test('manual paid coverage uses existing plan entitlement clock and no automatic renewal',()=>{
  const current=new Date('2026-10-15T16:00:00Z')
  const manual={planId:'advanced',environment:'live',status:'active',revokedAt:null,
    paidThroughAt:'2026-11-15T16:00:00.000Z',cancelAtPeriodEnd:true}
  const ent=subscriptionEntitlement(manual,{environment:'live',now:current.getTime()})
  assert.equal(ent.active,true)
  assert.equal(ent.tier,'advanced')
  assert.equal(ent.activeCourseLimit,5)
  assert.equal(subscriptionEntitlement(manual,{environment:'sandbox',now:current.getTime()}).active,false)
  assert.equal(subscriptionEntitlement(manual,{environment:'live',now:Date.parse('2026-11-16T00:00:00Z')}).active,false)
  assert.equal(subscriptionEntitlement({...manual,revokedAt:'2026-10-16'},{environment:'live',now:current.getTime()}).active,false)
  const result=normalizeBillingStatus({
    available:true,enabled:false,provider:'manual',sandbox:false,plans:SUBSCRIPTION_PLANS,
    plan:SUBSCRIPTION_PLANS.advanced,entitlement:ent,subscription:null,enabledPlans:[],
    manual:{autoRenew:false,paidThrough:ent.paidThrough},
  })
  assert.equal(result.provider,'manual')
  assert.equal(result.enabled,false)
  assert.equal(result.manual.autoRenew,false)
  assert.equal(result.entitlement.tier,'advanced')
})

test('Premium cannot be approved using the Stripe-only session credit implementation',()=>{
  const onlyBasic={HH_MANUAL_BILLING_REQUESTS_ENABLED:'true',
    HH_MANUAL_BILLING_REVIEW_ENABLED:'true',HH_MANUAL_BILLING_PAYEE_APPROVED:'true',
    HH_MANUAL_BILLING_ACCESS_APPROVED:'true',HH_BILLING_ENVIRONMENT:'live',
    HH_BILLING_SCHEMA_APPROVED:'true',HH_MULTICOURSE_SCHEMA_APPROVED:'true',
    HH_PREMIUM_SESSION_SCHEMA_APPROVED:'true',HH_PREMIUM_SESSION_FULFILLMENT_APPROVED:'true'}
  const cfg=manualBillingConfig(onlyBasic)
  assert.equal(cfg.accessEnabled,true)
  assert.equal(cfg.premiumSessionEnabled,false)
  assert.equal(manualBillingConfig({...onlyBasic,HH_MANUAL_PREMIUM_CREDIT_SCHEMA_APPROVED:'true'}).premiumSessionEnabled,false)
  assert.equal(manualBillingConfig({...onlyBasic,HH_MANUAL_PREMIUM_CREDIT_SCHEMA_APPROVED:'true',HH_MANUAL_PREMIUM_FULFILLMENT_APPROVED:'true'}).premiumSessionEnabled,false)
})
