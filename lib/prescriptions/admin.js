import { cookies } from 'next/headers.js'
import { getAppConfig } from '../app/config.js'
import { createRequestAuth } from '../app/session.js'
import { createAppRepository } from '../app/repository.js'
import { getPrescriptionStore } from './store.js'
import {
  adminCookieName, adminApiCookieName, adminSessionOptions, adminApiSessionOptions,
  authorizeAdminSession, revokeAdminSessions,
} from './admin-session.js'

async function authorizedRequest() {
  try {
    const jar = await cookies()
    const tokens = [...new Set([jar.get(adminCookieName)?.value, jar.get(adminApiCookieName)?.value].filter(Boolean))]
    if (!tokens.length) return undefined
    const config = getAppConfig(), store = getPrescriptionStore()
    const auth = createRequestAuth({ cookies: { getAll: () => jar.getAll() } }, config)
    const repository = createAppRepository(config)
    for (const token of tokens) {
      const authorized = await authorizeAdminSession({ token, auth, repository, store })
      if (!authorized) continue
      auth.apply({ cookies: { set(name, value, options) {
        try { jar.set(name, value, options) } catch (error) {
          // Next Server Components cannot persist refreshes. API/actions do;
          // page refreshes remain subject to verified() and the original deadline.
          if (!String(error?.message).includes('Cookies can only be modified in a Server Action or Route Handler')) throw error
        }
      } } })
      return authorized
    }
  } catch {
    // Missing app configuration or unavailable identity/storage denies access.
  }
  return undefined
}

export async function requireAdminRequest() {
  return Boolean(await authorizedRequest())
}

// Verified owner actor for narrowly scoped server-side catalog reviews.
export async function requireAdminActor() {
  return (await authorizedRequest())?.actor ?? null
}

// The retired credential form must never bypass the verified Google bridge.
export async function establishAdminSession() {
  return false
}

export async function restoreAdminApiSession(response) {
  const authorized = await authorizedRequest()
  if (!authorized) return false
  const maxAge = Math.floor((authorized.session.expiresAt - Date.now()) / 1000)
  if (maxAge <= 0) return false
  // Recover the API cookie with the existing token and original server deadline.
  response.cookies.set(adminApiCookieName, authorized.token, { ...adminApiSessionOptions, maxAge })
  return true
}

export async function clearAdminSession() {
  const jar = await cookies()
  await revokeAdminSessions({
    tokens: [jar.get(adminCookieName)?.value, jar.get(adminApiCookieName)?.value],
    store: getPrescriptionStore(),
  })
  jar.set(adminCookieName, '', { ...adminSessionOptions, maxAge: 0 })
  jar.set(adminApiCookieName, '', { ...adminApiSessionOptions, maxAge: 0 })
}
