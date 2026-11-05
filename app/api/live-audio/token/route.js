import { NextResponse } from 'next/server'
import { getAppConfig, requireSameOrigin } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { consumeRate } from '@/lib/app/database'
import { practitionerEmailAllowed } from '@/lib/app/practitioner-access'
import { AppError, onlyKeys } from '@/lib/assessments/contracts'
import { readBody, PRIVATE_HEADERS, safeError } from '@/lib/app/http'
import { liveAudioProvider, issueLiveAudioToken } from '@/lib/live-audio/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const preferredRegion = 'yul1'

export async function POST(request) {
  let auth
  try {
    if (process.env.HH_LIVE_AUDIO_ENABLED !== 'true') throw new AppError('LIVE_AUDIO_DISABLED', 503)
    const config = getAppConfig()
    requireSameOrigin(request, config)
    const body = await readBody(request, 512)
    onlyKeys(body, ['role'])
    if (!['host', 'listener'].includes(body.role)) throw new AppError('INVALID_ACTION', 400)
    if (body.role === 'host') {
      auth = createRequestAuth(request, config)
      const actor = await auth.verified()
      const expectedAccount = request.headers.get('x-hh-account-id')
      if (expectedAccount && expectedAccount !== actor.id) throw new AppError('ACCOUNT_CHANGED', 409)
      if (!practitionerEmailAllowed(actor)) throw new AppError('ACCESS_DENIED', 403)
      await consumeRate(config, {op: 'live-audio-host', actor: actor.id}, 10, 3600)
    } else {
      // A request IP is only used as a coarse, hashed rate key by consumeRate.
      // It is never placed in a token, response, room name, CRM or analytics.
      const ip = (request.headers.get('x-vercel-forwarded-for') ||
        request.headers.get('x-real-ip') || 'shared').split(',')[0].trim().slice(0, 64)
      await consumeRate(config, {op: 'live-audio-listener', ip}, 24, 3600)
    }
    const result = await issueLiveAudioToken(liveAudioProvider(), body.role)
    const response = NextResponse.json(result, {headers: PRIVATE_HEADERS})
    return auth ? auth.apply(response) : response
  } catch (error) {
    const safe = safeError(error)
    const response = NextResponse.json({error: safe.code}, {status: safe.status, headers: PRIVATE_HEADERS})
    return auth ? auth.apply(response) : response
  }
}
