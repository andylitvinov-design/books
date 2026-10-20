import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { SERVICE_PRODUCTS } from '../lib/commerce/catalog.js'
import {
  buildSquarePaymentForServices, configuredSquarePaymentLinks,
  formatSquareCadAmount, normalizeSquarePaymentLink,
} from '../lib/commerce/square-payment-links.js'

const ids=SERVICE_PRODUCTS.map(p=>p.id)
const approved={
  VERCEL_ENV:'production',
  HH_SQUARE_CAD_LINKS_ENABLED:'true',
  HH_SQUARE_INDIVIDUAL_PAYEE_APPROVED:'true',
  HH_SQUARE_CAD_AMOUNTS_APPROVED:'true',
  HH_SQUARE_CAD_50_LINK:'https://square.link/u/ABCDExyz9',
  HH_SQUARE_CAD_100_LINK:'https://square.link/u/FGHIJabc9',
  HH_SQUARE_CAD_150_LINK:'https://checkout.square.site/KLMNOabc9',
  HH_SQUARE_CAD_50_MINOR:'7500',
  HH_SQUARE_CAD_100_MINOR:'15000',
  HH_SQUARE_CAD_150_MINOR:'22500',
}
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')

test('Square card checkout fails closed without verified Canadian payee and CAD prices',()=>{
  assert.deepEqual(configuredSquarePaymentLinks({}),{})
  for(const key of ['VERCEL_ENV','HH_SQUARE_CAD_LINKS_ENABLED',
    'HH_SQUARE_INDIVIDUAL_PAYEE_APPROVED','HH_SQUARE_CAD_AMOUNTS_APPROVED',
    'HH_SQUARE_CAD_50_LINK','HH_SQUARE_CAD_100_MINOR']){
    const env={...approved};delete env[key];assert.deepEqual(configuredSquarePaymentLinks(env),{})
  }
  assert.deepEqual(configuredSquarePaymentLinks({...approved,VERCEL_ENV:'preview'}),{})
  assert.deepEqual(configuredSquarePaymentLinks({...approved,VERCEL_ENV:'development'}),{})
})

test('Square requires three distinct verified Square links, no custom destination, no invented FX',()=>{
  const links=configuredSquarePaymentLinks(approved)
  assert.ok(Object.isFrozen(links))
  assert.equal(buildSquarePaymentForServices([ids[0]],links).amountMinor,7500)
  assert.equal(buildSquarePaymentForServices([ids[1]],links).amountMinor,15000)
  assert.deepEqual(buildSquarePaymentForServices(ids,links),{
    url:approved.HH_SQUARE_CAD_150_LINK,amountMinor:22500,currency:'CAD'
  })
  assert.equal(buildSquarePaymentForServices(ids,{}),null)
  assert.equal(buildSquarePaymentForServices(['fake'],links),null)
  assert.equal(buildSquarePaymentForServices([ids[0],ids[0]],links),null)
  assert.equal(buildSquarePaymentForServices([{id:ids[0],amountMinor:1}],links),null)
  assert.match(formatSquareCadAmount(22500,'en'),/225/)
  for(const [key,value] of [
    ['HH_SQUARE_CAD_50_LINK',approved.HH_SQUARE_CAD_100_LINK],
    ['HH_SQUARE_CAD_50_MINOR','-300'],
    ['HH_SQUARE_CAD_50_MINOR','0'],
    ['HH_SQUARE_CAD_50_MINOR','7500.5'],
    ['HH_SQUARE_CAD_50_MINOR','99999999'],
    ['HH_SQUARE_CAD_50_MINOR','20000'],
  ]) assert.deepEqual(configuredSquarePaymentLinks({...approved,[key]:value}),{})
  for(const invalid of [
    'http://square.link/u/ABCDExyz9',
    'https://square.link.evil.test/u/ABCDExyz9',
    'https://evil.test@square.link/u/ABCDExyz9',
    'https://square.link/u/ABCDExyz9?amount=1',
    'https://square.link/u/ABCDExyz9#paid',
    'https://square.link/u/../../fake',
    'https://paypal.me/psitrends',
    'https://buy.stripe.com/test_abcDEFGHIJK12',
  ]) assert.equal(normalizeSquarePaymentLink(invalid),null)
})

test('public cart defaults to personal PayPal and never advertises unconfigured card checkout',()=>{
  const cart=read('components/commerce/personal-cart.tsx')
  const page=read('app/[locale]/cart/page.tsx')
  assert.match(cart,/paypalEnabled \|\| verifiedPayPalEnabled \? "paypal"/)
  assert.match(page,/configuredSquarePaymentLinks/)
  assert.match(cart,/buildSquarePaymentForServices/)
  assert.match(cart,/data-cart-square-payment-link/)
  assert.match(cart,/data-card-unavailable/)
  assert.match(cart,/data-cart-paypal-personal/)
  assert.match(cart,/data-interac-transfer-inquiry="cart"/)
  assert.doesNotMatch(cart,/Hosted by Stripe|Оплата на сайте Stripe|Pago alojado en Stripe/)
  assert.doesNotMatch(cart,/data-cart-card-link-inquiry|orderStatus\s*=\s*["']paid/)
})

test('PayPal.Me discloses required PayPal sign-in and no guest card checkout in all locales',()=>{
  const cart=read('components/commerce/personal-cart.tsx')
  const payments=read('app/[locale]/payments/page.tsx')
  assert.match(cart,/PayPal\.Me requires a PayPal account/)
  assert.match(cart,/нужен аккаунт PayPal/)
  assert.match(cart,/requiere una cuenta PayPal/)
  assert.match(payments,/not guest card checkout/)
  assert.match(payments,/не гостевая оплата картой/)
  assert.match(payments,/pago con tarjeta como invitado/)
  assert.doesNotMatch(cart,/PayPal\.Me.*pay by card without/i)
})
