import { NextResponse } from 'next/server'
import { getAppConfig, requireSameOrigin } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { consumeRate } from '@/lib/app/database'
import { practitionerEmailAllowed } from '@/lib/app/practitioner-access'
import { AppError } from '@/lib/assessments/contracts'
import { PRIVATE_HEADERS, safeError } from '@/lib/app/http'
import { endLiveAudio, liveAudioProvider } from '@/lib/live-audio/server'

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
    if ((request.headers.get('content-length') || '0') !== '0')
      throw new AppError('INVALID_BODY', 400)
    auth = createRequestAuth(request, config)
    const actor = await auth.verified()
    const expectedAccount = request.headers.get('x-hh-account-id')
    if (expectedAccount && expectedAccount !== actor.id) throw new AppError('ACCOUNT_CHANGED', 409)
    if (!practitionerEmailAllowed(actor)) throw new AppError('ACCESS_DENIED', 403)
    await consumeRate(config, {op: 'live-audio-end', actor: actor.id}, 15, 3600)
    const response = NextResponse.json(await endLiveAudio(liveAudioProvider()), {headers: PRIVATE_HEADERS})
    return auth.apply(response)
  } catch (error) {
    const safe = safeError(error)
    const response = NextResponse.json({error: safe.code}, {status: safe.status, headers: PRIVATE_HEADERS})
    return auth ? auth.apply(response) : response
  }
}
