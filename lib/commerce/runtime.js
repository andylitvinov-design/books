import 'server-only'
import { getCommerceConfig } from './config.js'
import { createCommerceRepository } from './repository.js'
import { createStripeCommerceProvider } from './stripe-provider.js'
import { createPayPalCommerceProvider } from './paypal-provider.js'
import { createCommerceService } from './service.js'

export function serviceCommerceRuntime(appConfig, config = getCommerceConfig()) {
  return createCommerceService({ config, repository: createCommerceRepository(appConfig, config), provider: config.provider === 'paypal' ? createPayPalCommerceProvider(config) : createStripeCommerceProvider(config) })
}

// Only call with the shared webhook route's signature-verified raw event.
export async function handleServiceStripeEvent(event, { appConfig }) {
  const config = getCommerceConfig()
  if (!config.configured || config.provider !== 'stripe') return { handled: false }
  try { return await serviceCommerceRuntime(appConfig, config).handleVerifiedEvent(event) }
  catch (error) {
    if (error?.code === 'BILLING_CUSTOMER_UNKNOWN') return { handled: false }
    throw error
  }
}


// Call only after PayPal's signature has been verified against our webhook ID.
export async function handleServicePayPalEvent(event, { appConfig }) {
  const config = getCommerceConfig()
  if (!config.configured || config.provider !== 'paypal') return { handled: false }
  try { return await serviceCommerceRuntime(appConfig, config).handleVerifiedEvent(event) }
  catch (error) {
    if (error?.code === 'BILLING_CUSTOMER_UNKNOWN') return { handled: false }
    throw error
  }
}
