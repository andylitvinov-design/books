// Test-only: never connect unless the dedicated synthetic CI database is explicit.
export function isSquareIsolatedTestEnvironment(env) {
  if (env.CI !== 'true' || env.NODE_ENV !== 'test' ||
      env.HH_APP_TEST_RUNTIME !== 'isolated' ||
      env.HH_BILLING_TEST_APPLY_PROPOSALS !== 'synthetic-only' ||
      env.VERCEL || typeof env.HH_TEST_ADMIN_DATABASE_URL !== 'string') return false
  const value = env.HH_TEST_ADMIN_DATABASE_URL
  if (!value || value !== value.trim() || /[\u0000-\u0020\u007f]/.test(value)) return false
  try {
    const url = new URL(value)
    return ['postgres:', 'postgresql:'].includes(url.protocol) &&
      ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) &&
      url.pathname === '/hh_app_test' &&
      !value.includes('?') && !value.includes('#') &&
      !url.search && !url.hash
  } catch {
    // Never include the supplied connection string or credentials in errors.
    return false
  }
}
