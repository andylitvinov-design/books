import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { configuredPayPalHostedLinks, buildPayPalHostedCartUrl } from '../lib/commerce/paypal-hosted-links.js'
import { getCommerceConfig } from '../lib/commerce/config.js'
import {
  PERSONAL_PAYPAL_ME_BASE, PERSONAL_PAYPAL_PAYEE,
  personalPayPalEnabled, buildPersonalPayPalServiceUrl, buildPersonalPayPalCartUrl,
} from '../lib/commerce/paypal-personal.js'

const file = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

function cartPayPalGuards(cart, page) {
  assert.match(page, /const verifiedPayPalCheckout = commerce\.provider === "paypal" && commerce\.enabled;/)
  assert.match(page, /verifiedPayPalEnabled=\{verifiedPayPalCheckout\}/)
  assert.match(page, /hostedPayPalLinks=\{configuredPayPalHostedLinks\(\)\}/)
  assert.match(cart, /const paypalUrl = paypalEnabled \? buildPersonalPayPalCartUrl\(chosen\.map\(product => product\.id\)\) : null;/)
  assert.match(cart, /const hostedPayPalUrl = buildPayPalHostedCartUrl\(chosen\.map\(product => product\.id\), hostedPayPalLinks\);/)
  assert.doesNotMatch(cart, /markAsPaid|paymentVerified:\s*true|orderStatus\s*=\s*"paid"|autoDebit/)
  const patterns = {
    selector: /(method === "paypal" && \(paypalUrl \|\| hostedPayPalUrl \|\| verifiedPayPalEnabled\)) \? <>/,
    verified: /\{(verifiedPayPalEnabled) \? <Link className=\{styles\.primary\}\s+href=\{`\/\$\{locale\}\/services\/checkout\?items=\$\{chosen\.map\(product => product\.id\)\.join\(","\)\}`\}\s+data-cart-verified-paypal-checkout>/,
    hosted: /<\/Link> : (hostedPayPalUrl) \? <a className=\{styles\.primary\} href=\{hostedPayPalUrl\}\s+target="_blank" rel="noopener noreferrer" data-cart-paypal-hosted>/,
    personal: /\{(paypalUrl) \? <a className=\{verifiedPayPalEnabled \|\| hostedPayPalUrl \? styles\.booking : styles\.primary\} href=\{paypalUrl\} target="_blank" rel="noopener noreferrer" data-cart-paypal-personal>/,
  }
  return Object.fromEntries(Object.entries(patterns).map(([name, pattern]) => {
    const match = cart.match(pattern)
    assert.ok(match, name + ' must retain its exact mode, approval and destination guard')
    return [name, match[1]]
  }))
}

function visiblePayPalLinks(guards, state) {
  // Evaluate only the tightly matched pure guard expressions, never component code.
  const enabled = name => Boolean(runInNewContext(guards[name], { ...state }, { timeout: 50 }))
  const selected = enabled('selector')
  const verified = selected && enabled('verified')
  return {
    verified,
    hosted: selected && !verified && enabled('hosted'),
    personal: selected && enabled('personal'),
  }
}

test('personal PayPal.Me link is the independently checked owner payee, no Business credentials', () => {
  assert.equal(PERSONAL_PAYPAL_ME_BASE, 'https://paypal.me/psitrends')
  assert.equal(PERSONAL_PAYPAL_PAYEE, 'Andrii Litvinov')
  assert.equal(personalPayPalEnabled({}), true)
  assert.equal(personalPayPalEnabled({ HH_PAYPAL_PERSONAL_DISABLED: 'true' }), false)
  assert.equal(personalPayPalEnabled({ HH_PAYPAL_PERSONAL_DISABLED: 'false' }), true)
})

test('server-only product catalog fixes EUR amounts and disallows arbitrary products/amounts', () => {
  assert.equal(buildPersonalPayPalServiceUrl('express-consultation-30', {}), 'https://paypal.me/psitrends/50EUR')
  assert.equal(buildPersonalPayPalServiceUrl('personal-session-60', {}), 'https://paypal.me/psitrends/100EUR')
  for (const bad of ['0', '../50EUR', 'personal-session-60?amount=1', 'plus', 'free', 'from', '__proto__', null, 20])
    assert.equal(buildPersonalPayPalServiceUrl(bad, {}), null)
  assert.equal(buildPersonalPayPalServiceUrl('personal-session-60', { HH_PAYPAL_PERSONAL_DISABLED: 'true' }), null)
})

test('redirect always goes to owner-controlled PayPal.Me with no browser prices, client data or false paid status', () => {
  const route = file('app/api/payments/paypal/[productId]/route.ts')
  assert.match(route, /buildPersonalPayPalServiceUrl\(productId\)/)
  assert.match(route, /personalPayPalEnabled\(\)/)
  assert.match(route, /status: 303/)
  assert.match(route, /Cache-Control/)
  assert.match(route, /Referrer-Policy/)
  assert.doesNotMatch(route, /request\.json|searchParams|markAsPaid|payment_verified|grantEntitlement|PAYPAL_CLIENT_SECRET/)
})

test('EN/RU/ES service selectors retain fixed prices and route booking payment choices through the guarded cart', () => {
  const capture = file('components/consultation-choice-capture.tsx')
  const alchemy = file('components/alchemy-soul-lead-form.tsx')
  const main = file('app/[locale]/services/page.tsx')
  const spanish = file('app/es/services/page.tsx')
  const landing = file('components/alchemy-soul-landing.tsx')
  const cta = file('components/public-consultation-cta.tsx')
  const cartEntry = file('components/commerce/consultation-cart-entry.tsx')
  const cartPage = file('app/[locale]/cart/page.tsx')
  const cart = file('components/commerce/personal-cart.tsx')
  assert.match(capture, /isPaidRequest && paypalPersonalEnabled/)
  assert.match(capture, /\/api\/payments\/paypal\//)
  assert.match(alchemy, /selected !== "month" && \(wiseEnabled \|\| paypalPersonalEnabled \|\| Boolean\(zenInquiryUrl\)\)/)
  assert.match(alchemy, /\{paypalPersonalEnabled \? \(/)
  assert.match(alchemy, /"express-consultation-30" : "personal-session-60"/)
  assert.match(landing, /paypalPersonalEnabled=\{personalPayPalEnabled\(\)\}/)
  // #1167 deliberately moved service-booking payment selection into the cart.
  assert.match(cta, /if \(serviceBooking\) return <ConsultationCartEntry locale=\{locale\} id=\{id\} \/>/)
  assert.match(cartEntry, /publicServiceCatalog\(locale\)/)
  assert.match(cartEntry, /href=\{`\/\$\{locale\}\/cart/)
  assert.doesNotMatch(cartEntry, /paypal\.me|\/api\/payments\/paypal\//)
  assert.match(cartPage, /<PersonalCart locale=\{locale\} paypalEnabled=\{personalPayPalEnabled\(\)\}/)
  assert.match(cart, /const paypalUrl = paypalEnabled \? buildPersonalPayPalCartUrl\(chosen\.map\(product => product\.id\)\) : null/)
  cartPayPalGuards(cart, cartPage)
  assert.match(cart, /href=\{paypalUrl\}[^>]*data-cart-paypal-personal/)
  assert.doesNotMatch(cart, /markAsPaid|paymentVerified:\s*true|orderStatus\s*=\s*"paid"|autoDebit/)
  assert.match(main, /paypalPersonalEnabled=\{personalPayPalEnabled\(\)\}/)
  assert.match(spanish, /paypalPersonalEnabled=\{personalPayPalEnabled\(\)\}/)
})

test('payment page transparently requires Goods & Services and manual verification', () => {
  const page = file('app/[locale]/payments/page.tsx')
  for (const phrase of ['Goods & Services', 'Товары и услуги', 'Productos y servicios', 'PERSONAL_PAYPAL_PAYEE'])
    assert.match(page, new RegExp(phrase))
  assert.match(page, /data-paypal-manual-confirmation/)
  assert.match(page, /data-paypal-personal-link/)
  assert.match(page, /Transaction ID|ID транзакции|ID de transacción/)
  assert.match(page, /paypal-personal/)
  assert.doesNotMatch(page, /markAsPaid|paid: true|paymentVerified: true|granted: true/)
})

test('source-bound PayPal guards cover all three modes and reject unavailable or wrong-method links', () => {
  const guards = cartPayPalGuards(file('components/commerce/personal-cart.tsx'), file('app/[locale]/cart/page.tsx'))
  for (const method of ['paypal', 'square', 'interac', 'zen', 'wise']) {
    for (let mask = 0; mask < 8; mask += 1) {
      const personal = Boolean(mask & 1)
      const hosted = Boolean(mask & 2)
      const verified = Boolean(mask & 4)
      const state = {
        method,
        paypalUrl: personal ? 'https://paypal.me/psitrends/50EUR' : null,
        hostedPayPalUrl: hosted ? 'https://www.paypal.com/ncp/payment/PLB-12345678ABC' : null,
        verifiedPayPalEnabled: verified,
      }
      assert.deepEqual(visiblePayPalLinks(guards, state), {
        verified: method === 'paypal' && verified,
        hosted: method === 'paypal' && !verified && hosted,
        personal: method === 'paypal' && personal,
      }, method + ' availability mask ' + mask)
    }
  }
})

test('absent and unapproved links stay unavailable without changing fixed EUR or manual-payment semantics', () => {
  const guards = cartPayPalGuards(file('components/commerce/personal-cart.tsx'), file('app/[locale]/cart/page.tsx'))
  const ids = ['express-consultation-30']
  const approved = {
    VERCEL_ENV: 'production',
    HH_PAYPAL_HOSTED_LINKS_ENABLED: 'true',
    HH_PAYPAL_HOSTED_PAYEE_APPROVED: 'true',
    HH_PAYPAL_HOSTED_EUR_AMOUNTS_VERIFIED: 'true',
    HH_PAYPAL_HOSTED_50_EUR_LINK: 'https://www.paypal.com/ncp/payment/PLB-12345678ABC',
  }
  assert.equal(buildPayPalHostedCartUrl(ids, configuredPayPalHostedLinks(approved)), approved.HH_PAYPAL_HOSTED_50_EUR_LINK)
  assert.equal(buildPersonalPayPalCartUrl(ids, {}), 'https://paypal.me/psitrends/50EUR')
  assert.equal(buildPersonalPayPalCartUrl([...ids, 'personal-session-60'], {}), 'https://paypal.me/psitrends/150EUR')
  for (const invalid of [[...ids, ...ids], ['fake'], [{ id: ids[0], amountMinor: 1 }]])
    assert.equal(buildPersonalPayPalCartUrl(invalid, {}), null)
  const unapproved = [{}, { ...approved, VERCEL_ENV: 'preview' }, { ...approved, HH_PAYPAL_HOSTED_50_EUR_LINK: '' }]
  for (const key of ['HH_PAYPAL_HOSTED_LINKS_ENABLED', 'HH_PAYPAL_HOSTED_PAYEE_APPROVED', 'HH_PAYPAL_HOSTED_EUR_AMOUNTS_VERIFIED']) {
    const missing = { ...approved }; delete missing[key]; unapproved.push(missing)
  }
  for (const env of unapproved) {
    const commerce = getCommerceConfig({ VERCEL_ENV: 'production', HH_COMMERCE_PROVIDER: 'paypal' })
    const state = {
      method: 'paypal',
      paypalUrl: buildPersonalPayPalCartUrl(ids, { HH_PAYPAL_PERSONAL_DISABLED: 'true' }),
      hostedPayPalUrl: buildPayPalHostedCartUrl(ids, configuredPayPalHostedLinks(env)),
      verifiedPayPalEnabled: commerce.provider === 'paypal' && commerce.enabled,
    }
    assert.deepEqual(state, { method: 'paypal', paypalUrl: null, hostedPayPalUrl: null, verifiedPayPalEnabled: false })
    assert.deepEqual(visiblePayPalLinks(guards, state), { verified: false, hosted: false, personal: false })
  }
})

test('PayPal source contract rejects wrong modes, crossed guards, missing approvals and fake paid state', () => {
  const cart = file('components/commerce/personal-cart.tsx')
  const page = file('app/[locale]/cart/page.tsx')
  cartPayPalGuards(cart, page)
  const mutations = [
    ['cart', 'method === "paypal" && (paypalUrl', 'method === "square" && (paypalUrl'],
    ['cart', 'method === "paypal" && (paypalUrl', 'method === "paypal" || (paypalUrl'],
    ['cart', '{verifiedPayPalEnabled ? <Link', '{true ? <Link'],
    ['cart', '{verifiedPayPalEnabled ? <Link', '{hostedPayPalUrl ? <Link'],
    ['cart', '</Link> : hostedPayPalUrl ? <a', '</Link> : true ? <a'],
    ['cart', '{paypalUrl ? <a', '{verifiedPayPalEnabled ? <a'],
    ['cart', '{paypalUrl ? <a', '{hostedPayPalUrl ? <a'],
    ['cart', '{paypalUrl ? <a', '{true ? <a'],
    ['cart', 'href={paypalUrl} target="_blank"', 'href={hostedPayPalUrl} target="_blank"'],
    ['cart', 'const paypalUrl = paypalEnabled ?', 'const paypalUrl = true ?'],
    ['page', 'commerce.provider === "paypal" && commerce.enabled', 'true'],
    ['page', 'hostedPayPalLinks={configuredPayPalHostedLinks()}', 'hostedPayPalLinks={unapprovedLinks}'],
    ['cart', 'data-cart-paypal-personal>', 'data-cart-paypal-personal>orderStatus = "paid"'],
  ]
  for (const [target, before, after] of mutations) {
    const original = target === 'cart' ? cart : page
    const mutant = original.replace(before, after)
    assert.notEqual(mutant, original, 'mutation must change ' + before)
    assert.throws(() => cartPayPalGuards(target === 'cart' ? mutant : cart, target === 'page' ? mutant : page),
      { code: 'ERR_ASSERTION' }, 'must reject ' + before + ' -> ' + after)
  }
})
