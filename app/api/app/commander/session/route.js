import { NextResponse } from 'next/server'
import { getAppConfig, requireSameOrigin } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { PRIVATE_HEADERS, safeError } from '@/lib/app/http'
import { AppError } from '@/lib/assessments/contracts'

export const runtime = 'nodejs'
export const preferredRegion = 'yul1'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const EDGE_FUNCTION = 'agent-commander-private-store-v1'

export async function POST(request) {
  let auth
  try {
    const config = getAppConfig()
    requireSameOrigin(request, config)
    auth = createRequestAuth(request, config)
    const actor = await auth.verified()
    const { data: currentSession, error: sessionError } = await auth.client.auth.getSession()
    const refreshToken = currentSession?.session?.refresh_token
    // Supabase legacy refresh tokens can be 12 characters; validate owner against Edge below.
    if (sessionError || typeof refreshToken !== 'string' || refreshToken.length < 12 || refreshToken.length > 4096)
      throw new AppError('OWNER_SESSION_INVALID', 401)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 7000)
    let edge
    try {
      const response = await fetch(config.supabaseUrl + '/functions/v1/' + EDGE_FUNCTION, {
        method: 'POST',
        cache: 'no-store',
        redirect: 'error',
        signal: controller.signal,
        headers: {
          apikey: config.publishableKey,
          Authorization: 'Bearer ' + actor.accessToken,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ action: 'status' }),
      })
      let data
      try { data = await response.json() } catch { throw new AppError('OWNER_CHECK_UNAVAILABLE', 503) }
      if (!response.ok || data?.ok !== true || data?.owner !== true ||
          data?.privateStoreConfigured !== true ||
          data?.service !== 'AGENT_COMMANDER_PRIVATE_STORE_V1') {
        throw new AppError(response.status === 401 ? 'OWNER_SIGN_IN_REQUIRED' :
          response.status === 403 ? 'OWNER_ACCESS_DENIED' : 'OWNER_CHECK_UNAVAILABLE', response.status || 503)
      }
      edge = data
    } finally {
      clearTimeout(timer)
    }
    let claims
    try {
      claims = JSON.parse(Buffer.from(actor.accessToken.split('.')[1], 'base64url').toString('utf8'))
    } catch {
      throw new AppError('OWNER_SESSION_INVALID', 401)
    }
    if (claims.sub !== actor.id || !Number.isSafeInteger(claims.exp) ||
        claims.exp <= Math.floor(Date.now() / 1000)) throw new AppError('OWNER_SESSION_INVALID', 401)

    return auth.apply(NextResponse.json({
      authenticated: true,
      owner: true,
      privateStoreConfigured: true,
      accessToken: actor.accessToken,
      refreshToken,
      expiresAt: claims.exp,
      service: edge.service,
    }, { headers: PRIVATE_HEADERS }))
  } catch (error) {
    const safe = safeError(error)
    const response = NextResponse.json({ error: safe.code }, {
      status: safe.status,
      headers: PRIVATE_HEADERS,
    })
    return auth ? auth.apply(response) : response
  }
}
