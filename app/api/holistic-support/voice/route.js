import { NextResponse } from 'next/server'
import { AppError } from '@/lib/assessments/contracts'
import { getAppConfig, requireSameOrigin } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { consumeRate } from '@/lib/app/database'
import { readBody, PRIVATE_HEADERS, safeError } from '@/lib/app/http'
import { VOICE_STUDIO_MODEL, voiceStudioReady, validateStudioRequest, buildStudioPayload } from '@/lib/mandala/voice-studio.mjs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const preferredRegion = 'yul1'

const GOOGLE_TTS_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/' + VOICE_STUDIO_MODEL + ':generateContent'
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024
const fail = (error, auth) => {
  const safe = safeError(error)
  const response = NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
  return auth ? auth.apply(response) : response
}
export async function GET() {
  return NextResponse.json({
    enabled:voiceStudioReady(process.env),
    model:VOICE_STUDIO_MODEL,
    mode:'free-tier-only',
    customRequiresSignIn:true,
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
    // In particular, NEVER fall back to the unrelated HH_COUNCIL_GEMINI_API_KEY.
    // Billing must be absent from this dedicated API key's Google AI Studio project.
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
      // Preview samples contain only server-selected first-party text, never PII.
      // Count by both coarse IP and a global durable budget bucket.
      const ip = (request.headers.get('x-vercel-forwarded-for') ||
        request.headers.get('x-real-ip') || 'shared').split(',')[0].trim().slice(0,64)
      await consumeRate(config,{op:'voice-studio-sample',ip},12,3600)
    }
    await consumeRate(config,{op:'voice-studio-free-global'},120,3600)
    const signal = AbortSignal.timeout(45000)
    let provider
    try {
      provider = await fetch(GOOGLE_TTS_ENDPOINT,{
        method:'POST',signal,
        headers:{
          'Content-Type':'application/json',
          'x-goog-api-key':process.env.HH_VOICE_STUDIO_GEMINI_API_KEY,
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
    const encoded = data?.candidates?.[0]?.content?.parts?.find(part=>part?.inlineData?.data)?.inlineData?.data
    if(typeof encoded!=='string' || encoded.length>MAX_RESPONSE_BYTES*1.4)
      throw new AppError('TTS_PROVIDER_INVALID_RESPONSE',502)
    const wav = Buffer.from(encoded,'base64')
    if(wav.byteLength<48 || wav.byteLength>MAX_RESPONSE_BYTES ||
      wav.toString('ascii',0,4)!=='RIFF' || wav.toString('ascii',8,12)!=='WAVE')
      throw new AppError('TTS_PROVIDER_INVALID_RESPONSE',502)
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
