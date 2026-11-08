import { AppError, onlyKeys, requireUUID } from '../assessments/contracts.js'
import { SERVICE_PRODUCTS } from './catalog.js'

export const SERVICE_CART_STORAGE_KEY = 'hh-service-cart-v1'
export const SERVICE_CART_UPDATED_EVENT = 'hh-service-cart-updated'

export function restoreServiceCart(value) {
  try {
    const ids = JSON.parse(value || '[]')
    if (!Array.isArray(ids)) return []
    return SERVICE_PRODUCTS.filter((product) => ids.includes(product.id)).map((product) => product.id)
  } catch { return [] }
}

export function selectServiceCart(ids) {
  return SERVICE_PRODUCTS.filter((product) => ids.includes(product.id))
}

export function validateServiceCheckout(body) {
  onlyKeys(body, ['operationId', 'locale', 'items', 'repeatOrderId'])
  requireUUID(body.operationId)
  if (body.repeatOrderId !== undefined) requireUUID(body.repeatOrderId)
  if (!['en', 'ru', 'es'].includes(body.locale)) throw new AppError('INVALID_LOCALE', 400)
  if (!Array.isArray(body.items) || !body.items.length || body.items.length > SERVICE_PRODUCTS.length)
    throw new AppError('INVALID_CART', 400)
  const seen = new Set()
  const items = body.items.map((item) => {
    onlyKeys(item, ['serviceId', 'quantity'])
    const product = SERVICE_PRODUCTS.find((entry) => entry.id === item.serviceId)
    if (!product || product.kind !== 'one_time') throw new AppError('SERVICE_NOT_AVAILABLE', 400)
    // One booking per selected format. Repeated clicks never multiply charges.
    if (item.quantity !== 1 || seen.has(product.id)) throw new AppError('INVALID_CART', 400)
    seen.add(product.id)
    return { serviceId: product.id, quantity: 1, amountMinor: product.amountMinor, currency: product.currency }
  }).sort((a, b) => a.serviceId.localeCompare(b.serviceId))
  const currencies = new Set(items.map((item) => item.currency))
  if (currencies.size !== 1) throw new AppError('MIXED_CURRENCIES', 400)
  return {
    operationId: body.operationId,
    repeatOrderId: body.repeatOrderId || null,
    locale: body.locale,
    items,
    currency: items[0].currency,
    totalMinor: items.reduce((total, item) => total + item.amountMinor * item.quantity, 0),
  }
}


// Video Studio uses the SAME storefront cart and cart-change event, but its
// two video SKUs are deliberately not consultation service/appointment SKUs.
export const VIDEO_CART_STORAGE_KEY = 'hh-video-cart-v1'
export const VIDEO_CART_PRODUCTS = Object.freeze([
  Object.freeze({ id:'video-extra', amountMinor:300, currency:'EUR',
    title:Object.freeze({ en:'Extra · animated photo and character',ru:'Extra · анимированное фото и персонаж',es:'Extra · foto y personaje animados' }) }),
  Object.freeze({ id:'video-pro', amountMinor:500, currency:'EUR',
    title:Object.freeze({ en:'PRO · personal video montage',ru:'PRO · индивидуальный видеомонтаж',es:'PRO · montaje personalizado' }) }),
])
export function videoCartProduct(id) {
  return typeof id === 'string' ? VIDEO_CART_PRODUCTS.find(item=>item.id===id)||null : null
}
export function createVideoCartSelection(id, brief='') {
  const product=videoCartProduct(id)
  if(!product)return null
  return { id:product.id, brief:typeof brief==='string'?brief.slice(0,800):'' }
}
export function restoreVideoCart(value) {
  try {
    const selection=JSON.parse(value||'null')
    if(!selection||typeof selection!=='object'||Array.isArray(selection))return null
    if(!Object.prototype.hasOwnProperty.call(selection,'id')||
      !Object.prototype.hasOwnProperty.call(selection,'brief'))return null
    return createVideoCartSelection(selection.id,selection.brief)
  }catch{return null}
}
