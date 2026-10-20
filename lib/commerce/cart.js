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
