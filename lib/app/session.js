import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { AppError, requireUUID } from '../assessments/contracts.js'
const COOKIE_PREFIX = 'hh-app-auth'
// Request-scoped SDK, server-only tokens. Never create a shared user-auth client.
export function createRequestAuth(request, config) {
  const jar = new Map(request.cookies.getAll().map(({ name, value }) => [name, value])),
    changes = new Map()
  const client = createServerClient(config.supabaseUrl, config.publishableKey, {
    // Let the SDK correlate callbacks with their own verifier, including two tabs.
    auth: { experimental: { appendPkceFlowIdToRedirects: true } },
    cookieOptions: {
      name: COOKIE_PREFIX,
      httpOnly: true,
      secure: !config.test,
      sameSite: 'lax',
      path: '/',
    },
    cookies: {
      encode: 'tokens-only',
      getAll() {
        return [...jar].map(([name, value]) => ({ name, value }))
      },
      setAll(items) {
        for (const item of items) {
          jar.set(item.name, item.value)
          changes.set(item.name, item)
        }
      },
    },
  })
  function apply(response) {
    for (const { name, value, options } of changes.values())
      response.cookies.set(name, value, {
        ...options,
        httpOnly: true,
        secure: !config.test,
        sameSite: 'lax',
        path: '/',
      })
    return response
  }
  function clear(response) {
    for (const name of new Set([...jar.keys(), ...changes.keys()]))
      if (name.startsWith(COOKIE_PREFIX))
        response.cookies.set(name, '', {
          httpOnly: true,
          secure: !config.test,
          sameSite: 'lax',
          path: '/',
          maxAge: 0,
        })
    return response
  }
  async function verified() {
    const { data: userData, error: userError } = await client.auth.getUser()
    if (userError || !userData.user) throw new AppError('SIGN_IN_REQUIRED', 401)
    // Only inspect session data after server authentication through getUser.
    const { data, error } = await client.auth.getSession()
    if (error || !data.session) throw new AppError('SIGN_IN_REQUIRED', 401)
    let claims
    try {
      claims = JSON.parse(
        Buffer.from(data.session.access_token.split('.')[1], 'base64url').toString('utf8'),
      )
    } catch {
      throw new AppError('SIGN_IN_REQUIRED', 401)
    }
    requireUUID(claims.sub)
    requireUUID(claims.session_id)
    if (
      claims.sub !== userData.user.id ||
      !Number.isSafeInteger(claims.exp) ||
      claims.exp <= Date.now() / 1000
    )
      throw new AppError('SIGN_IN_REQUIRED', 401)
    // The repository also verifies auth.sessions existence and active account state.
    return {
      id: userData.user.id,
      claims: {
        sub: claims.sub,
        session_id: claims.session_id,
        exp: claims.exp,
        role: 'authenticated',
      },
      email: userData.user.email || '',
      displayName: String(userData.user.user_metadata?.full_name || '').slice(0, 120),
      signedInAt: userData.user.last_sign_in_at || null,
      accessToken: data.session.access_token,
    }
  }
  return { client, apply, clear, verified }
}
