import 'server-only'
import { getCommerceConfig } from './config.js'
import { createCommerceRepository } from './repository.js'
import { createStripeCommerceProvider } from './stripe-provider.js'
import { createCommerceService } from './service.js'

export function serviceCommerceRuntime(appConfig, config = getCommerceConfig()) {
  return createCommerceService({ config, repository: createCommerceRepository(appConfig, config), provider: createStripeCommerceProvider(config) })
}

// Only call with the shared webhook route's signature-verified raw event.
export async function handleServiceStripeEvent(event, { appConfig }) {
  const config = getCommerceConfig()
  if (!config.configured) return { handled: false }
  try { return await serviceCommerceRuntime(appConfig, config).handleVerifiedEvent(event) }
  catch (error) {
    if (error?.code === 'BILLING_CUSTOMER_UNKNOWN') return { handled: false }
    throw error
  }
}
