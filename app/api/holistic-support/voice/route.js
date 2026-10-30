import { NextResponse } from 'next/server'
import { AppError } from '@/lib/assessments/contracts'
import { getAppConfig, requireSameOrigin } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { consumeRate } from '@/lib/app/database'
import { readBody, PRIVATE_HEADERS, safeError } from '@/lib/app/http'
import { VOICE_STUDIO_MODEL, voiceStudioReady, voiceStudioKey, validateStudioRequest, buildStudioPayload, extractStudioAudio } from '@/lib/mandala/voice-studio.mjs'
import { readPcmWav } from '@/lib/mandala/wav-pcm-mixer.mjs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const preferredRegion = 'yul1'

const GOOGLE_TTS_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/interactions'
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024
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
async function limitedJson(response) {
  const reader = response.body?.getReader()
  if (!reader) throw new AppError('TTS_PROVIDER_UNAVAILABLE',503)
  const chunks = []
  let size = 0
  for (;;) {
    const {done,value} = await reader.read()
    if(done)break
    size += value.byteLength
    if(size>MAX_RESPONSE_BYTES) {
      await reader.cancel()
      throw new AppError('TTS_RESPONSE_TOO_LARGE',502)
    }
    chunks.push(Buffer.from(value))
  }
  try {return JSON.parse(Buffer.concat(chunks).toString('utf8'))}
  catch {throw new AppError('TTS_PROVIDER_INVALID_RESPONSE',502)}
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
      if(validated.mode==='affirmations') {
        // Limited guest text generation; explicit opt-in and exact-text TTS.
        await consumeRate(config,{op:'voice-studio-affirmations',ip},3,3600)
        await consumeRate(config,{op:'voice-studio-affirmations-daily'},60,86400)
      } else {
        // Public sample text is entirely server-owned, never a client profile.
        await consumeRate(config,{op:'voice-studio-sample',ip},12,3600)
      }
    }
    await consumeRate(config,{op:'voice-studio-free-global'},120,3600)
    const signal = AbortSignal.timeout(45000)
    let provider
    try {
      provider = await fetch(GOOGLE_TTS_ENDPOINT,{
        method:'POST',signal,
        headers:{
          'Content-Type':'application/json',
          'x-goog-api-key':voiceStudioKey(process.env),
        },
        body:JSON.stringify(buildStudioPayload(validated)),
        cache:'no-store',
      })
    } catch {
      throw new AppError('TTS_PROVIDER_UNAVAILABLE',503)
    }
    if(provider.status===429)throw new AppError('TTS_FREE_QUOTA_EXHAUSTED',429)
    if(!provider.ok)throw new AppError('TTS_PROVIDER_UNAVAILABLE',503)
    const data = await limitedJson(provider)
    const encoded = extractStudioAudio(data)
    if(typeof encoded!=='string' || encoded.length>MAX_RESPONSE_BYTES*1.4 ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded))
      throw new AppError('TTS_PROVIDER_INVALID_RESPONSE',502)
    const wav = Buffer.from(encoded,'base64')
    if(wav.byteLength<48 || wav.byteLength>MAX_RESPONSE_BYTES ||
      wav.toString('ascii',0,4)!=='RIFF' || wav.toString('ascii',8,12)!=='WAVE')
      throw new AppError('TTS_PROVIDER_INVALID_RESPONSE',502)
    try { readPcmWav(wav.buffer.slice(wav.byteOffset,wav.byteOffset+wav.byteLength)) }
    catch { throw new AppError('TTS_PROVIDER_INVALID_RESPONSE',502) }
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
