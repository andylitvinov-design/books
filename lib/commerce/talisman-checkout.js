import { TAOIST_TALISMANS } from '../practitioners/taoist-talismans.js'
import { normalizeSquarePaymentLink } from './square-payment-links.js'
import { PERSONAL_PAYPAL_ME_BASE, personalPayPalEnabled } from './paypal-personal.js'
import { configuredWisePaymentMethod, wisePaymentsEnabled } from './wise-payments.js'

// This is NOT a price list. No Fu illustration is purchasable until its
// owner-approved fixed EUR amount and fulfilment terms are supplied server-side.
// PayPal.Me and Square links are merely checkout entrypoints: receipt and
// delivery must be confirmed against the real provider/owner separately.
const PRICES = Object.freeze({
  'fu-prosperity': 'HH_TALISMAN_FU_PROSPERITY_EUR_MINOR',
  'fu-harmony': 'HH_TALISMAN_FU_HARMONY_EUR_MINOR',
  'fu-balance': 'HH_TALISMAN_FU_BALANCE_EUR_MINOR',
})

const canonical = items => TAOIST_TALISMANS.filter(row => items.includes(row.id))

export function normalizeTalismanCheckoutItems(items) {
  if (!Array.isArray(items) || !items.length || items.length > TAOIST_TALISMANS.length ||
      items.some(id => typeof id !== 'string' || !Object.hasOwn(PRICES, id)) ||
      new Set(items).size !== items.length) return null
  return canonical(items).map(row => row.id)
}

const positiveMinor = raw => {
  if (typeof raw !== 'string' || !/^[1-9][0-9]{1,6}$/.test(raw)) return null
  const value = Number(raw)
  return Number.isSafeInteger(value) && value >= 100 && value <= 10_000_000 ? value : null
}
const priceString = minor => (minor / 100).toFixed(2).replace(/\.00$/, '')

// Exactly the approved first-party PayPal.Me recipient already used for
// published consultation payments. A separate talisman-specific owner
// approval is mandatory; never reuse another service's Square/CAD link.
const PAYPAL_PAYEE = PERSONAL_PAYPAL_ME_BASE + '/'
export function configuredTalismanBasket(items, locale = 'en', env = process.env) {
  const ids = normalizeTalismanCheckoutItems(items)
  if (!ids || env.VERCEL_ENV !== 'production' ||
      env.HH_TALISMAN_PRODUCT_PRICES_APPROVED !== 'true' ||
      env.HH_TALISMAN_DELIVERY_TERMS_APPROVED !== 'true') return null

  const entries = canonical(ids).map(item => {
    const minor = positiveMinor(env[PRICES[item.id]])
    return minor ? { id: item.id, title: item[locale]?.title || item.en.title, amountMinor: minor } : null
  })
  if (entries.some(entry => !entry)) return null
  const amountMinor = entries.reduce((sum, item) => sum + item.amountMinor, 0)
  if (!Number.isSafeInteger(amountMinor) || amountMinor > 10_000_000) return null

  const methods = {}
  if (env.HH_TALISMAN_PAYPAL_PERSONAL_APPROVED === 'true' &&
      personalPayPalEnabled(env)) {
    methods.paypal = {
      currency: 'EUR', amountMinor,
      url: PAYPAL_PAYEE + priceString(amountMinor) + 'EUR',
    }
  }

  // Square's Canadian amount must be a separately verified fixed CAD price
  // for the *exact* combination of public Fu designs. Never do FX in JS.
  if (env.HH_TALISMAN_SQUARE_LINKS_APPROVED === 'true') {
    const key = ids.map(id => id.replaceAll('-', '_').toUpperCase()).sort().join('_AND_')
    const url = normalizeSquarePaymentLink(env['HH_TALISMAN_SQUARE_' + key + '_URL'])
    const cadMinor = positiveMinor(env['HH_TALISMAN_SQUARE_' + key + '_CAD_MINOR'])
    if (url && cadMinor) methods.square = { currency: 'CAD', amountMinor: cadMinor, url }
  }
  // Wise is a direct hosted EUR checkout ONLY for an owner-verified
  // Business OPEN payment link. A personal WiseTag cannot prefill amounts,
  // prove a business merchant or issue a receipt, so it remains inquiry-only.
  if (env.HH_TALISMAN_WISE_BUSINESS_APPROVED === 'true' && wisePaymentsEnabled(env)) {
    const wise = configuredWisePaymentMethod(env)
    if (wise?.kind === 'business-open') {
      const link = new URL(wise.link)
      link.searchParams.set('amount', (amountMinor / 100).toFixed(2))
      link.searchParams.set('currency', 'EUR')
      link.searchParams.set('description', 'Holistic House - Fu: ' + ids.join(','))
      methods.wise = { currency: 'EUR', amountMinor, url: link.toString() }
    }
  }
  return Object.freeze({
    ids, items: entries, currency: 'EUR', amountMinor,
    methods: Object.freeze(methods),
  })
}

export function publicTalismanBasketView(basket) {
  if (!basket) return { available: false, reason: 'PRICE_NOT_APPROVED' }
  return {
    available: true, currency: basket.currency, amountMinor: basket.amountMinor,
    items: basket.items,
    methods: Object.fromEntries(Object.entries(basket.methods).map(([name, payment]) =>
      [name, { currency: payment.currency, amountMinor: payment.amountMinor }])),
  }
}
