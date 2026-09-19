// Serverless instances cannot share the development memory store.
export function consultationSavingAvailable(environment = process.env) {
  if (environment.VERCEL_ENV !== 'preview') return true
  return Boolean(environment.PRESCRIPTIONS_KV_REST_API_URL && environment.PRESCRIPTIONS_KV_REST_API_TOKEN && environment.PRESCRIPTIONS_DATA_ENCRYPTION_KEY)
}
