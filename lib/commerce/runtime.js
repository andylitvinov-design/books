import 'server-only'
import { getCommerceConfig } from './config.js'
import { createCommerceRepository } from './repository.js'
import { createStripeCommerceProvider } from './stripe-provider.js'
import { createZenCommerceProvider } from './zen-provider.js'
import { createCommerceService } from './service.js'

export function serviceCommerceRuntime(appConfig, config = getCommerceConfig()) {
  const provider = config.provider === 'zen'
    ? createZenCommerceProvider(config)
    : createStripeCommerceProvider(config)
  return createCommerceService({ config, repository: createCommerceRepository(appConfig, config), provider })
}

// This is called only after the Stripe signature has been verified by its own route.
export async function handleServiceStripeEvent(event, { appConfig }) {
  const config = getCommerceConfig()
  if (config.provider !== 'stripe' || !config.configured) return { handled: false }
  try { return await serviceCommerceRuntime(appConfig, config).handleVerifiedEvent(event) }
  catch (error) {
    if (error?.code === 'BILLING_CUSTOMER_UNKNOWN') return { handled: false }
    throw error
  }
}

// Only the ZEN IPN endpoint, after validating its hash, may call this function.
export async function handleServiceZenEvent(event, { appConfig }) {
  const config = getCommerceConfig()
  if (config.provider !== 'zen' || !config.configured) return { handled: false }
  try { return await serviceCommerceRuntime(appConfig, config).handleVerifiedEvent(event) }
  catch (error) {
    if (error?.code === 'BILLING_CUSTOMER_UNKNOWN') return { handled: false }
    throw error
  }
}
