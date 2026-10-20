import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  MARKETPLACE_PLATFORM_COMMISSION_BPS,
  MARKETPLACE_COMMISSION_POLICY_VERSION,
  calculateMarketplaceCommission,
} from '../lib/practitioners/marketplace-commission.js'

test('Master Network v3: 20% of every verified onsite paid service, including repeats', () => {
  assert.equal(MARKETPLACE_PLATFORM_COMMISSION_BPS, 2000)
  assert.match(MARKETPLACE_COMMISSION_POLICY_VERSION, /2026-10-16/)
  for (const amount of [10000, 5000, 25000]) {
    const result = calculateMarketplaceCommission({serviceSubtotalMinor: amount, paymentCaptured: true, checkoutChannel: 'website'})
    assert.equal(result.platformCommissionMinor, amount * 20 / 100)
    assert.equal(result.practitionerShareMinor, amount * 80 / 100)
    assert.equal(result.eligible, true)
  }
  // A repeat website purchase is subject to the same rule as the first.
  const repeat = calculateMarketplaceCommission({serviceSubtotalMinor:10000,paymentCaptured:true,checkoutChannel:'website'})
  assert.equal(repeat.platformCommissionMinor,2000)
})

test('Master Network v3: free services, off-site transactions and unverified payments incur no platform commission', () => {
  for (const fields of [
    {serviceSubtotalMinor:0,paymentCaptured:true,checkoutChannel:'website'},
    {serviceSubtotalMinor:10000,paymentCaptured:false,checkoutChannel:'website'},
    {serviceSubtotalMinor:10000,paymentCaptured:true,checkoutChannel:'external'},
  ]) {
    const result = calculateMarketplaceCommission(fields)
    assert.equal(result.platformCommissionMinor,0)
    assert.equal(result.eligible,false)
  }
})

test('Master Network v3: commission reverses proportionally for partial/full refunds and rounds deterministically', () => {
  const partial=calculateMarketplaceCommission({serviceSubtotalMinor:10000,refundedServiceMinor:3000,paymentCaptured:true})
  assert.equal(partial.remainingServiceMinor,7000)
  assert.equal(partial.platformCommissionMinor,1400)
  assert.equal(partial.practitionerShareMinor,5600)
  const full=calculateMarketplaceCommission({serviceSubtotalMinor:10000,refundedServiceMinor:10000,paymentCaptured:true})
  assert.equal(full.platformCommissionMinor,0)
  assert.equal(full.practitionerShareMinor,0)
  assert.equal(calculateMarketplaceCommission({serviceSubtotalMinor:999,paymentCaptured:true}).platformCommissionMinor,200)
  assert.equal(calculateMarketplaceCommission({serviceSubtotalMinor:2,paymentCaptured:true}).platformCommissionMinor,0)
})

test('Master Network v3: money amounts and provider state reject invalid values', () => {
  const defaults={serviceSubtotalMinor:10000,paymentCaptured:true}
  assert.throws(()=>calculateMarketplaceCommission({...defaults,serviceSubtotalMinor:-1}),RangeError)
  assert.throws(()=>calculateMarketplaceCommission({...defaults,serviceSubtotalMinor:1.5}),RangeError)
  assert.throws(()=>calculateMarketplaceCommission({...defaults,serviceSubtotalMinor:Number.MAX_SAFE_INTEGER+1}),RangeError)
  assert.throws(()=>calculateMarketplaceCommission({...defaults,refundedServiceMinor:10001}),RangeError)
  assert.throws(()=>calculateMarketplaceCommission({...defaults,checkoutChannel:'unverified'}),RangeError)
  assert.throws(()=>calculateMarketplaceCommission({...defaults,paymentCaptured:'true'}),TypeError)
})

test('Master Network v3: filtered public catalog and actionable My Practice stay connected without activating payments', async () => {
  const [masters,services,finder,css,practice,styles,ownServices] = await Promise.all([
    readFile(new URL('../app/[locale]/masters/page.tsx',import.meta.url),'utf8'),
    readFile(new URL('../app/[locale]/services/page.tsx',import.meta.url),'utf8'),
    readFile(new URL('../components/master-network-explorer.tsx',import.meta.url),'utf8'),
    readFile(new URL('../components/master-network-explorer.module.css',import.meta.url),'utf8'),
    readFile(new URL('../components/app/practice-workspace.jsx',import.meta.url),'utf8'),
    readFile(new URL('../components/app/practice-dashboard.css',import.meta.url),'utf8'),
    readFile(new URL('../components/app/my-services-dashboard.jsx',import.meta.url),'utf8'),
  ])
  assert.match(masters,/<MarketplaceMasterFinder practitioners=/)
  assert.match(services,/<MarketplaceServiceFinder services=/)
  assert.match(finder,/serviceMatches/)
  assert.match(finder,/masterMatches/)
  assert.match(finder,/pricing: PriceChoice/)
  assert.match(finder,/language: string/)
  assert.match(finder,/onClick=\{\(\) => set\("area", id\)\}/)
  assert.match(finder,/Request free service/)
  assert.match(finder,/\/app\/consultations\?service=/)
  assert.match(css,/@media \(max-width:640px\)/)
  assert.match(css,/:focus-visible/)
  assert.match(practice,/hh-practice-overview/)
  assert.match(practice,/<MyServicesDashboard /)
  assert.match(ownServices,/filterPracticeServices/)
  assert.match(ownServices,/aria-controls="hh-services-picker"/)
  assert.match(ownServices,/value=\{price\}/)
  assert.match(practice,/hh-practice-fee-notice/)
  assert.match(practice,/Marketplace checkout and payouts are not yet enabled/)
  assert.match(styles,/hh-practice-overview/)
  assert.doesNotMatch(services,/ServiceCart|service-cart/)
})
