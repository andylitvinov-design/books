import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { assertAlchemyBookingGate } from '../scripts/helpers/alchemy-payment-disclosure-verifier.mjs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

function fakePage({ booking=1, legacy=0, payment=0, cart=0, height=48, width=200 } = {}) {
  const counts = new Map([
    ['[data-booking-cta="book"]', booking],
    ['[data-alchemy-payment-disclosure]', legacy],
    ['[data-booking-payment-options]', payment],
    ['[data-booking-cart-link]', cart],
  ])
  const pricing = {
    count: async () => 1,
    locator: selector => {
      if (!counts.has(selector)) throw new Error('Unknown locator: '+selector)
      return { count: async () => counts.get(selector), boundingBox: async () => ({width,height}) }
    },
  }
  const main = { locator: selector => {
    assert.equal(selector,'[data-alchemy-booking-formats]')
    return pricing
  } }
  const expect = node => ({ toHaveCount: async count => assert.equal(await node.count(),count) })
  return {main,expect}
}

test('Spanish Alchemy at 320/360/390/1188px has accessible request CTA without payment', async () => {
  const qa = read('scripts/verify-public-services-production.mjs')
  for (const size of [320,360,390,1188]) {
    const {main,expect} = fakePage()
    await assertAlchemyBookingGate(main,expect,size)
  }
  for (const contract of [
    'Ten Alchemy chapters including video and public sample report',
    'All twelve original-language testimonials are visible in a vertical feed',
    'assertViewport', 'captureAlchemyPanelOverflow',
    'data-booking-step="contact"',
    'No cart or payment method before a server-confirmed booking',
  ]) assert.ok(qa.includes(contract),contract)
  assert.match(qa,/await pricing\.locator\('\[data-alchemy-format="month"\]'\)\.click\(\)/)
})

test('an unconfirmed booking cannot reveal a provider link, cart or missing Book button', async () => {
  for (const setting of [{legacy:1},{payment:1},{cart:1},{booking:0},{booking:2}]) {
    const {main,expect} = fakePage(setting)
    await assert.rejects(assertAlchemyBookingGate(main,expect,390))
  }
})

test('mobile Book button must be at least 44px in both axes', async () => {
  for (const setting of [{width:43},{height:43}]) {
    const {main,expect} = fakePage(setting)
    await assert.rejects(assertAlchemyBookingGate(main,expect,320))
  }
  const chooser = read('components/contact-channel-chooser.tsx')
  assert.match(chooser,/data-booking-cta=\{paidReady \? "pay" : "book"\}/)
  assert.match(chooser,/!googleReady \|\| !email\.trim\(\)/)
  assert.match(chooser,/checkBookingStatus/)
})
