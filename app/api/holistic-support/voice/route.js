import { NextResponse } from 'next/server'
import { AppError } from '@/lib/assessments/contracts'
import { getAppConfig, requireSameOrigin } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { consumeRate } from '@/lib/app/database'
import { readBody, PRIVATE_HEADERS, safeError } from '@/lib/app/http'
import { VOICE_STUDIO_MODEL, voiceStudioReady, voiceStudioKey, validateStudioRequest, buildStudioPayload } from '@/lib/mandala/voice-studio.mjs'
import { requestStudioAudio } from '@/lib/mandala/voice-studio-provider.mjs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const preferredRegion = 'yul1'

const fail = (error, auth) => {
  const safe = safeError(error)
  const response = NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
  return auth ? auth.apply(response) : response
}
export async function GET() {
  const configured = voiceStudioReady(process.env)
  return NextResponse.json({
    enabled:configured,
    model:VOICE_STUDIO_MODEL,
    mode:'free-tier-only',
    customRequiresSignIn:true,
    publicAffirmationsEnabled:configured,
  },{headers:PRIVATE_HEADERS})
}
export async function POST(request) {
  let auth
  try {
    // Opt-in reuse of the existing server-side Google credential is permitted
    // ONLY after Free-tier attestation and enabling the explicit reuse flag.
    if(!voiceStudioReady(process.env))
      throw new AppError('VOICE_STUDIO_NOT_CONFIGURED',503)
    const config = getAppConfig()
    requireSameOrigin(request,config)
    const body = await readBody(request,3500)
    let validated
    try { validated = validateStudioRequest(body) }
    catch { throw new AppError('VOICE_STUDIO_INVALID_INPUT',400) }
    if(validated.mode==='custom') {
      auth = createRequestAuth(request,config)
      const actor = await auth.verified()
      await consumeRate(config,{op:'voice-studio-custom',actor:actor.id},8,3600)
    } else {
      const ip = (request.headers.get('x-vercel-forwarded-for') ||
        request.headers.get('x-real-ip') || 'shared').split(',')[0].trim().slice(0,64)
      if(validated.mode==='affirmations'||validated.mode==='short_text') {
        // Shared tiny free quota for guest affirmations and voluntarily entered text.
        // Both require explicit consent; never receive profile/test fields.
        await consumeRate(config,{op:'voice-studio-affirmations',ip},3,3600)
        await consumeRate(config,{op:'voice-studio-affirmations-daily'},60,86400)
      } else {
        // Public sample text is entirely server-owned, never a client profile.
        await consumeRate(config,{op:'voice-studio-sample',ip},12,3600)
      }
    }
    await consumeRate(config,{op:'voice-studio-free-global'},120,3600)
    const signal = AbortSignal.timeout(45000)
    let wav
    try {
      wav = await requestStudioAudio({key:voiceStudioKey(process.env),payload:buildStudioPayload(validated),signal})
    } catch(error) {
      throw new AppError(error.code || 'TTS_PROVIDER_UNAVAILABLE',error.status || 503)
    }
    const response = new NextResponse(wav,{
      headers:{
        ...PRIVATE_HEADERS,
        'Content-Type':'audio/wav',
        'Content-Disposition':'inline; filename="holistic-house-voice.wav"',
        'Content-Length':String(wav.length),
      }
    })
    return auth ? auth.apply(response) : response
  } catch(error) {
    return fail(error,auth)
  }
}
