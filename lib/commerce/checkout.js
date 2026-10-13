import { getCommerceConfig } from './config.js'

export function serviceCheckoutStatus(config = getCommerceConfig()) {
  return Object.freeze({ available: Boolean(config.enabled), reason: config.enabled ? null : 'SERVICE_CHECKOUT_UNAVAILABLE' })
}
