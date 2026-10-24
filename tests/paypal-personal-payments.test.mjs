import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import {
  PERSONAL_PAYPAL_ME_BASE, PERSONAL_PAYPAL_PAYEE,
  personalPayPalEnabled, buildPersonalPayPalServiceUrl,
} from '../lib/commerce/paypal-personal.js'

const file = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

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

test('fixed-price personal selectors remain guarded and Services moves payment choice into the cart', () => {
  const capture = file('components/consultation-choice-capture.tsx')
  const alchemy = file('components/alchemy-soul-lead-form.tsx')
  const main = file('app/[locale]/services/page.tsx')
  const spanish = file('app/es/services/page.tsx')
  const landing = file('components/alchemy-soul-landing.tsx')
  const cta = file('components/public-consultation-cta.tsx')
  assert.match(capture, /isPaidRequest && paypalPersonalEnabled/)
  assert.match(capture, /\/api\/payments\/paypal\//)
  assert.match(alchemy, /selected !== "month" && \(wiseEnabled \|\| paypalPersonalEnabled \|\| Boolean\(zenInquiryUrl\)\)/)
  assert.match(alchemy, /\{paypalPersonalEnabled \? \(/)
  assert.match(alchemy, /"express-consultation-30" : "personal-session-60"/)
  assert.match(landing, /paypalPersonalEnabled=\{personalPayPalEnabled\(\)\}/)
  // Merged #1167 replaces inline payment choice with the existing SKU basket.
  assert.match(cta, /if \(serviceBooking\) return <ConsultationCartEntry locale=\{locale\} id=\{id\} \/>/)
  const cartPage=file('app/[locale]/cart/page.tsx')
  const cart=file('components/commerce/personal-cart.tsx')
  assert.match(cartPage,/paypalEnabled=\{personalPayPalEnabled\(\)\}/)
  assert.match(cart,/const paypalUrl = paypalEnabled \? buildPersonalPayPalCartUrl\(chosen\.map\(product => product\.id\)\) : null/)
  assert.match(cart,/data-cart-paypal-personal/)
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

async function renderedCart(locale,disabled){
 const element=(type,props)=>{assert.ok(typeof type==='string','Unexpected component');return {type,props}}
 const imports={
  'react/jsx-runtime':{jsx:element,jsxs:element},
  'next/navigation':{notFound:()=>{throw Error('NOT_FOUND')}},
  '@/components/public-site-header':{PublicSiteHeader:'header'},
  '@/components/commerce/personal-cart':{PersonalCart:'cart'},
  '@/lib/commerce/config':{getCommerceConfig:()=>({provider:null,enabled:false})},
  '@/lib/commerce/paypal-personal':{personalPayPalEnabled:()=>personalPayPalEnabled({HH_PAYPAL_PERSONAL_DISABLED:String(disabled)})},
  '@/lib/commerce/wise-payments':{wisePaymentsEnabled:()=>false},
  '@/lib/commerce/square-payment-links':{configuredSquarePaymentLinks:()=>({})},
  '@/lib/commerce/square-gateway':{getSquareGatewayConfig:()=>({enabled:false,environment:'sandbox',prices:{}})},
  '@/lib/commerce/paypal-hosted-links':{configuredPayPalHostedLinks:()=>({})},
 }
 const moduleValue={exports:{}}
 vm.runInNewContext(ts.transpileModule(file('app/[locale]/cart/page.tsx'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
  module:moduleValue,exports:moduleValue.exports,require:id=>{assert.ok(Object.hasOwn(imports,id),'Unexpected cart page import: '+id);return imports[id]},
 })
 return moduleValue.exports.default({params:Promise.resolve({locale})})
}
for(const locale of ['en','ru','es'])for(const disabled of [false,true])test(`${locale} cart receives the real server PayPal gate (disabled=${disabled}) without enabling other providers`,async()=>{
 const tree=await renderedCart(locale,disabled)
 const carts=tree.props.children.filter(node=>node.type==='cart')
 assert.equal(carts.length,1)
 assert.equal(carts[0].props.locale,locale)
 assert.equal(carts[0].props.paypalEnabled,!disabled)
 assert.equal(carts[0].props.wiseEnabled,false)
 assert.equal(carts[0].props.verifiedPayPalEnabled,false)
 assert.equal(carts[0].props.squareApiEnabled,false)
})
test('cart rejects unsupported locale rather than creating an unscoped payment selection',async()=>{
 await assert.rejects(()=>renderedCart('xx',false),/NOT_FOUND/)
})
