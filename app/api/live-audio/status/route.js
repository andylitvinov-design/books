import { NextResponse } from 'next/server'
import { getAppConfig, requestOrigin } from '@/lib/app/config'
import { safeError, PRIVATE_HEADERS } from '@/lib/app/http'
import { liveAudioSettings } from '@/lib/live-audio/policy.mjs'
import { getLiveAudioPresence, liveAudioProvider } from '@/lib/live-audio/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const preferredRegion = 'yul1'

export async function GET(request) {
  try {
    if (process.env.HH_LIVE_AUDIO_ENABLED !== 'true')
      return NextResponse.json({enabled: false, live: false, listeners: 0}, {headers: PRIVATE_HEADERS})
    // Reject unexpected hosts and fail closed when app/provider secrets are missing.
    requestOrigin(request, getAppConfig())
    liveAudioSettings()
    const presence = await getLiveAudioPresence(liveAudioProvider())
    return NextResponse.json(presence, {headers: PRIVATE_HEADERS})
  } catch (error) {
    const safe = safeError(error)
    return NextResponse.json({error: safe.code}, {status: safe.status, headers: PRIVATE_HEADERS})
  }
}
