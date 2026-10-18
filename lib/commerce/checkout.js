import { getCommerceConfig } from './config.js'

export function serviceCheckoutStatus(config = getCommerceConfig()) {
  return Object.freeze({ available: Boolean(config.enabled), provider: config.configured ? config.provider : null, reason: config.enabled ? null : 'SERVICE_CHECKOUT_UNAVAILABLE' })
}
