import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { filterStorefrontCards, SHOP_KINDS, SHOP_SORTS } from '../lib/commerce/storefront-filter.js'
import { SERVICE_PRODUCTS } from '../lib/commerce/catalog.js'
import { restoreServiceCart } from '../lib/commerce/cart.js'
const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8')

const cards = [
 {id:'express-consultation-30',kind:'session',title:'Express consultation',description:'30 minutes',label:'Session',amountMinor:5000},
 {id:'personal-session-60',kind:'session',title:'Personal session',description:'60 minutes',label:'Session',amountMinor:10000},
 {id:'alchemy',kind:'program',title:'Alchemy of Soul',description:'Symbolic work',label:'Price by agreement',amountMinor:null},
 {id:'free',kind:'free',title:'Free review',description:'Written review',label:'Free',amountMinor:0},
]
test('shop filters and search support sessions, programs and free entry points', () => {
 assert.deepEqual(SHOP_KINDS,['all','session','program','free'])
 assert.deepEqual(SHOP_SORTS,['featured','price-low','price-high','name'])
 assert.equal(filterStorefrontCards(cards).length,4)
 assert.deepEqual(filterStorefrontCards(cards,{kind:'session'}).map(x=>x.id),
  ['express-consultation-30','personal-session-60'])
 assert.deepEqual(filterStorefrontCards(cards,{kind:'program'}).map(x=>x.id),['alchemy'])
 assert.deepEqual(filterStorefrontCards(cards,{kind:'free'}).map(x=>x.id),['free'])
 assert.deepEqual(filterStorefrontCards(cards,{query:'alCheMY'}).map(x=>x.id),['alchemy'])
 assert.deepEqual(filterStorefrontCards(cards,{query:'Nothing'}),[])
})
test('price sort does not mistake individually quoted services for free or chargeable products', () => {
 assert.deepEqual(filterStorefrontCards(cards,{sort:'price-low'}).map(x=>x.id),
  ['free','express-consultation-30','personal-session-60','alchemy'])
 assert.deepEqual(filterStorefrontCards(cards,{sort:'price-high'}).map(x=>x.id),
  ['personal-session-60','express-consultation-30','free','alchemy'])
 assert.deepEqual(filterStorefrontCards(cards,{kind:'session',sort:'price-low'}).map(x=>x.amountMinor),[5000,10000])
 assert.deepEqual(filterStorefrontCards([{kind:'garbage'}]),[])
})
test('public shop has one localized catalogue, canonical cart and working product actions',()=>{
 const page = read('app/[locale]/shop/page.tsx')
 const shop = read('components/commerce/storefront-shop.tsx')
 const siteNav = read('components/site-navigation.tsx')
 const locales = read('lib/public-locales.ts')
 const sitemap = read('app/sitemap.ts')
 assert.match(page,/StorefrontShop/)
 assert.match(read('.github/workflows/hh-public-services-production.yml'),/verify-storefront-shop-browser.mjs/)
 assert.match(page,/locale === 'en' \|\| locale === 'ru' \|\| locale === 'es'/)
 assert.match(shop,/publicServiceCatalog\(locale\)/)
 assert.match(shop,/coreServiceOffers\(locale\)/)
 assert.match(shop,/SERVICE_CART_STORAGE_KEY/)
 assert.match(shop,/SERVICE_CART_UPDATED_EVENT/)
 assert.match(shop,/data-shop-product=/)
 assert.match(shop,/data-shop-add/)
 assert.match(shop,/data-shop-checkout/)
 assert.match(shop,/data-shop-filter/)
 assert.match(shop,/data-shop-search/)
 assert.match(shop,/data-shop-sort/)
 assert.match(shop,/restoreServiceCart/)
 assert.match(siteNav,/data-nav-item="shop"/)
 assert.match(locales,/shop\|/)
 assert.match(sitemap,/\/shop/)
})
test('only fixed-price approved catalog SKUs can be purchased; courses and free items cannot enter paid checkout',()=>{
 const shop = read('components/commerce/storefront-shop.tsx')
 assert.deepEqual(SERVICE_PRODUCTS.map(x=>x.amountMinor),[5000,10000])
 assert.ok(SERVICE_PRODUCTS.every(x=>x.currency==='EUR' && x.kind==='one_time'))
 assert.match(shop,/kind: [\"']session[\"']/)
 assert.match(shop,/kind: [\"']program[\"']/)
 assert.match(shop,/kind: [\"']free[\"']/)
 assert.match(shop,/if \(item\.kind !== 'session'\) return/)
 assert.match(shop,/kind === [\"']session[\"']/)
 assert.doesNotMatch(shop,/markPaid\(|grantAccess\(|paidStatus/)
 assert.deepEqual(restoreServiceCart(JSON.stringify(['express-consultation-30','malicious','express-consultation-30'])),['express-consultation-30'])
})
test('shop keeps EN/RU/ES labels and explains manual provider confirmation',()=>{
 const shop=read('components/commerce/storefront-shop.tsx')
 for(const v of ['Shop','Магазин','Tienda','By agreement','По согласованию','A convenir'])assert.ok(shop.includes(v),v)
 assert.match(shop,/payment is confirmed only after/)
 assert.match(shop,/оплата подтверждается только после/)
 assert.match(shop,/el pago se confirma solo después/)
})
