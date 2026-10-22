import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { test } from 'node:test'
import { SERVICE_PRODUCTS } from '../lib/commerce/catalog.js'
import { buildSquarePaymentForServices, configuredSquarePaymentLinks, formatSquareCadAmount } from '../lib/commerce/square-payment-links.js'

const page = readFileSync(new URL('../app/[locale]/payments/page.tsx', import.meta.url), 'utf8')
const cart = readFileSync(new URL('../components/commerce/personal-cart.tsx', import.meta.url), 'utf8')
function helper(name) {
  const start = page.indexOf(`function ${name}(`)
  assert.notEqual(start, -1)
  const end = page.indexOf('\n}', start) + 2
  const source = page.slice(start, end).replace(/: ServiceLocale|: string|: number/g, '')
  return vm.runInNewContext(`(${source})`, { encodeURIComponent })
}
const squareReceipt = helper('squareReceiptUrl')
const paypalReceipt = helper('receiptUrl')
const approved = {
  VERCEL_ENV: 'production', HH_SQUARE_CAD_LINKS_ENABLED: 'true',
  HH_SQUARE_INDIVIDUAL_PAYEE_APPROVED: 'true', HH_SQUARE_CAD_AMOUNTS_APPROVED: 'true',
  HH_SQUARE_CAD_50_LINK: 'https://square.link/u/aaaaa', HH_SQUARE_CAD_50_MINOR: '7300',
  HH_SQUARE_CAD_100_LINK: 'https://square.link/u/bbbbb', HH_SQUARE_CAD_100_MINOR: '14700',
  HH_SQUARE_CAD_150_LINK: 'https://square.link/u/ccccc', HH_SQUARE_CAD_150_MINOR: '22000',
}
const links = configuredSquarePaymentLinks(approved)
for (const locale of ['en', 'ru', 'es']) {
  test(`${locale}: Square receipt keeps separately approved CAD price and provider for each catalog combination`, () => {
    for (const ids of [[SERVICE_PRODUCTS[0].id], [SERVICE_PRODUCTS[1].id], SERVICE_PRODUCTS.map(p => p.id)]) {
      const payment = buildSquarePaymentForServices(ids, links)
      const amount = formatSquareCadAmount(payment.amountMinor, locale)
      const title = 'Consultation & session / <fictional>'
      const url = new URL(squareReceipt(locale, title, amount))
      assert.equal(url.origin + url.pathname, 'https://wa.me/14376066502')
      assert.equal([...url.searchParams].length, 1)
      const message = url.searchParams.get('text')
      assert.ok(message.includes(amount))
      assert.ok(message.includes(title))
      assert.match(message, /Square/)
      assert.doesNotMatch(message, /PayPal|EUR|€|payment succeeded|оплата подтверждена/i)
    }
  })
  test(`${locale}: PayPal retains separate EUR receipt`, () => {
    const text = new URL(paypalReceipt(locale, 'Fictional session', 50)).searchParams.get('text')
    assert.match(text, /PayPal.Me/)
    assert.match(text, /€50/)
    assert.doesNotMatch(text, /Square|CAD/)
  })
}
test('both Square actions and manual/no-booking copy stay inside configured-payment gate', () => {
  const block = page.match(/\{squarePayment \? <div data-square-payment-options=[\s\S]*?<\/div> : null\}/)?.[0]
  assert.ok(block)
  assert.match(block, /href=\{squarePayment.url\}/)
  assert.match(block, /squareReceiptUrl\(locale, product.title, formatSquareCadAmount\(squarePayment.amountMinor, locale\)!\)/)
  assert.match(block, /data-square-manual-confirmation/)
  assert.match(block, /t.squareNote/)
  assert.match(block, /t.squareAfter/)
  assert.equal((page.match(/squareAfter:/g) || []).length, 3)
  assert.equal((page.match(/squareNote:/g) || []).length, 3)
  assert.match(page, /verify receipt manually; payment does not book an appointment/)
  assert.match(page, /Поступление проверяем вручную; оплата не бронирует/)
  assert.match(page, /manualmente; el pago no reserva una cita/)
  assert.match(page, /\{t.after\} · PayPal/)
  assert.deepEqual(configuredSquarePaymentLinks({}), {})
  assert.equal(buildSquarePaymentForServices(SERVICE_PRODUCTS.map(p => p.id), {}), null)
})
test('combined cart preserves provider-specific amount and no automatic paid state', () => {
  assert.match(cart, /method === "square" && squarePayment \? formatSquareCadAmount\(squarePayment.amountMinor, locale\)/)
  assert.match(cart, /square: "Square card"/)
  assert.match(cart, /receiptMessage/)
  assert.doesNotMatch(page, /orderStatus\s*=\s*["']paid|markAsPaid/)
})
