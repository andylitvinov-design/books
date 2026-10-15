import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { manualOrderQuote, MANUAL_ORDER_PLANS, MANUAL_CHANNEL_CURRENCIES, validManualReceipt, validInvoiceQuote, manualOrderResponse } from '../lib/billing/manual-order-model.js'

test('fixed manual prices match approved 20/100 EUR, only Advanced has first-month 10 EUR candidate', () => {
  assert.equal(MANUAL_ORDER_PLANS.advanced.regularEuroCents, 2000)
  assert.equal(MANUAL_ORDER_PLANS.advanced.firstMonthEuroCents, 1000)
  assert.equal(MANUAL_ORDER_PLANS.premium.regularEuroCents, 10000)
  const advanced = manualOrderQuote('advanced','paypal-eur',{firstMonthCandidate:true})
  assert.equal(advanced.promotionalReferenceCents, 1000)
  assert.equal(advanced.payable, false)
  assert.equal(advanced.invoiceAmountMinor, null)
  assert.equal(manualOrderQuote('premium','paypal-eur',{firstMonthCandidate:true}).promotionalReferenceCents, null)
  for (const channel of Object.keys(MANUAL_CHANNEL_CURRENCIES)) assert.ok(manualOrderQuote('premium',channel))
  for (const invalid of ['free','start','plus','unknown','']) assert.equal(manualOrderQuote(invalid,'paypal-eur'), null)
})

test('invoice quote rules cannot invent EUR amounts, copy promotional amounts to Premium or accept NaN', () => {
  assert.equal(validInvoiceQuote('advanced','paypal-eur',1000,{introduction:true}),true)
  assert.equal(validInvoiceQuote('advanced','paypal-eur',2000),true)
  assert.equal(validInvoiceQuote('advanced','paypal-eur',1000),false)
  assert.equal(validInvoiceQuote('premium','paypal-eur',10000),true)
  assert.equal(validInvoiceQuote('premium','paypal-eur',1000,{introduction:true}),false)
  for(const amount of [0,-1,NaN,Infinity,1.4,999999999]) assert.equal(validInvoiceQuote('premium','paypal-usd',amount),false)
  assert.equal(validInvoiceQuote('premium','fake-method',10000),false)
})

test('receipt and projection boundaries avoid fake confirmation and sensitive data leaks', () => {
  assert.equal(validManualReceipt('ABCD1234-abcd'),true)
  for (const ref of ['', '123', 'x'.repeat(121), '<script>', 'has spaces']) assert.equal(validManualReceipt(ref),false)
  const result=manualOrderResponse({id:'order',plan_id:'advanced',method_id:'paypal-eur',currency:'EUR',status:'requested',
    reference_euro_cents:2000,first_month_candidate:true,account_id:'sensitive',receipt_digest:'secret',created_at:new Date('2026-10-15T21:00:00Z')})
  assert.equal(result.status,'requested')
  assert.equal(result.invoiceAmountMinor,null)
  assert.equal(result.paidThrough,null)
  assert.ok(!('accountId' in result))
  assert.ok(!('receiptDigest' in result))
})

test('reviewed private migration enforces ownership and reviewer-only paid mutations', () => {
  const sql=readFileSync(new URL('../docs/billing/proposed-manual-order-schema.sql',import.meta.url),'utf8')
  assert.match(sql,/enable row level security/)
  assert.match(sql,/force row level security/)
  assert.match(sql,/from PUBLIC,anon,authenticated,hh_app_inbox/)
  assert.match(sql,/current_setting\('hh\.moderator',true\)='1'/)
  assert.match(sql,/receipt_digest text unique/)
  assert.match(sql,/manual_one_pending_per_owner/)
})
