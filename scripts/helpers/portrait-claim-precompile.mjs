import { assertIsolatedDatabaseEnvironment } from '../../tests/helpers/app-db-fixture-policy.mjs'

const ORIGIN = 'http://127.0.0.1:3100'
const TARGET = ORIGIN + '/api/free-express/claim'
const FAIL = 'Isolated portrait claim precompile requires one unauthenticated 401 response'

// CI fixture readiness, not an application/WebKit fix: compile the observed
// static route before any browser/HMR client exists. Never retry or sign in.
export async function precompilePortraitClaim({ origin, env = process.env, fetchImpl = globalThis.fetch } = {}) {
  assertIsolatedDatabaseEnvironment(env)
  if (env.NODE_ENV !== 'development' || origin !== ORIGIN ||
      env.HH_TEST_APP_ORIGIN !== ORIGIN || env.HH_APP_ALLOWED_ORIGINS !== ORIGIN ||
      env.HH_APP_SUPABASE_URL !== 'http://127.0.0.1:54329' ||
      env.HH_APP_SUPABASE_PUBLISHABLE_KEY !== 'synthetic-publishable-key')
    throw new Error(FAIL)

  const controller = new AbortController()
  let timer
  const deadline = new Promise((_, reject) => {
    // Upper bound only; success returns as soon as the real response arrives.
    timer = setTimeout(() => { controller.abort(); reject(new Error(FAIL)) }, 90000)
  })
  try {
    await Promise.race([deadline, (async () => {
      const response = await fetchImpl(TARGET, {
        method: 'GET', redirect: 'error', credentials: 'omit',
        headers: {}, signal: controller.signal,
      })
      try {
        if (response.status !== 401 || response.redirected || response.url !== TARGET)
          throw new Error(FAIL)
      } finally {
        // Do not parse, retain, log or forward response data/cookies.
        await response.body?.cancel()
      }
    })()])
  } catch {
    throw new Error(FAIL)
  } finally {
    clearTimeout(timer)
    controller.abort()
  }
}
