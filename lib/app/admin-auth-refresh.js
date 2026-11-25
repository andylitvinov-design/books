import { createServerClient } from '@supabase/ssr'

const cookieName = 'hh-app-auth'
const sessionCookie = name => /^hh-app-auth(?:\.\d+)?$/.test(name)

function authConfig(environment) {
  if (environment.HH_APP_ENABLED !== 'true' ||
    (environment.VERCEL_ENV === 'production' && environment.HH_APP_PRODUCTION_APPROVED !== 'true')) return undefined
  const key = environment.HH_APP_SUPABASE_PUBLISHABLE_KEY || ''
  let url
  try {
    url = new URL(environment.HH_APP_SUPABASE_URL)
    if (!/^sb_publishable_[A-Za-z0-9_-]{20,}$/.test(key)) {
      if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key) ||
        JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role !== 'anon') return undefined
    }
  } catch { return undefined }
  const test = environment.CI === 'true' && environment.HH_APP_TEST_RUNTIME === 'isolated' &&
    !environment.VERCEL && environment.NODE_ENV !== 'production'
  if ((url.protocol !== 'https:' && !(test && url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname))) ||
    url.username || url.password || url.pathname !== '/' || url.search || url.hash) return undefined
  return { url: url.origin, key, secure: !test }
}

// Edge-safe cookie refresh only. This never grants access: protected pages/APIs
// still verify the app actor, live account/session, owner and admin session record.
export async function refreshAdminAuth(request, { environment = process.env, createClient = createServerClient } = {}) {
  if (!/^\/(?:admin(?:\/|$)|api\/admin(?:\/|$))/.test(new URL(request.url).pathname) ||
    !request.cookies.getAll().some(cookie => sessionCookie(cookie.name))) return []
  const config = authConfig(environment)
  if (!config) return []
  const changes = new Map()
  try {
    const client = createClient(config.url, config.key, {
      auth: { experimental: { appendPkceFlowIdToRedirects: true } },
      cookieOptions: { name: cookieName, httpOnly: true, secure: config.secure, sameSite: 'lax', path: '/' },
      cookies: {
        encode: 'tokens-only',
        getAll: () => request.cookies.getAll(),
        setAll(items) {
          for (const { name, value, options } of items) {
            if (!sessionCookie(name)) continue
            const item = { name, value, options: { ...options, httpOnly: true, secure: config.secure, sameSite: 'lax', path: '/' } }
            // Mutate before middleware snapshots headers, so Server Components
            // see the rotated token rather than refreshing the old token again.
            request.cookies.set(name, value)
            changes.set(name, item)
          }
        },
      },
    })
    // Server-validated getUser refreshes expired tokens through the pinned SDK.
    // Do not trust getSession or infer admin authority from this result.
    await client.auth.getUser()
  } catch {
    // Preserve any SDK rotation/clear already performed. The protected gate
    // independently fails closed on provider/auth errors.
  }
  return [...changes.values()]
}
