import { NextResponse } from 'next/server'
import { AppError } from '@/lib/assessments/contracts'
import { getAppConfig, requireSameOrigin } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { consumeRate } from '@/lib/app/database'
import { readBody, PRIVATE_HEADERS, safeError } from '@/lib/app/http'
import { VOICE_STUDIO_MODEL, VOICE_STUDIO_OPENROUTER_MODEL, VOICE_STUDIO_OPENROUTER_FREE_MODEL, voiceStudioReady, voiceStudioKey, voiceStudioOpenRouterKey, voiceStudioOpenRouterFreeKey, voiceStudioProviders, validateStudioRequest, buildStudioPayload, buildOpenRouterStudioPayload, buildOpenRouterFreePayload } from '@/lib/mandala/voice-studio.mjs'
import { requestStudioAudio } from '@/lib/mandala/voice-studio-provider.mjs'
import { requestOpenRouterStudioAudio } from '@/lib/mandala/voice-studio-openrouter-provider.mjs'
import {fishConfig,fishLanguages,validateFishRequest,FISH_PUBLIC_VOICES} from '@/lib/mandala/voice-studio-fish.mjs'
import {requestFishWav,approvedFishReference} from '@/lib/mandala/voice-studio-fish-provider.mjs'

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
  const fishAvailable=fishLanguages(process.env)
  const providers={...voiceStudioProviders(process.env),fish:fishAvailable.length>0}
  const fishLicensedVoices=FISH_PUBLIC_VOICES.filter(v=>
    fishAvailable.includes(v.language)&&Boolean(approvedFishReference(v.id,process.env)))
    .map(v=>v.id)
  const configured = voiceStudioReady(process.env)||fishAvailable.length>0
  // Guest voices must reflect only provider routes that cannot bill.
  // The optional paid custom-voice provider never makes public samples ready.
  const publicFree=providers.gemini||providers.openrouterFree||providers.fish
  const languages=providers.gemini?['en','ru','es']:
    providers.openrouterFree?['en']:[]
  return NextResponse.json({
    enabled:configured,
    model:VOICE_STUDIO_MODEL,
    backupModel:VOICE_STUDIO_OPENROUTER_MODEL,
    freeBackupModel:VOICE_STUDIO_OPENROUTER_FREE_MODEL,
    providers,
    languages,
    fishLanguages:fishAvailable,
    fishLicensedVoices,
    fishLicenseHold:FISH_PUBLIC_VOICES.filter(v=>v.requiresProviderLicense&&!fishLicensedVoices.includes(v.id)).map(v=>v.id),
    mode:'gemini-free-openrouter-free-fish-free-optional-paid',
    customRequiresSignIn:true,
    publicAffirmationsEnabled:publicFree,
  },{headers:PRIVATE_HEADERS})
}
export async function POST(request) {
  let auth
  try {
    // Opt-in reuse of the existing server-side Google credential is permitted
    // ONLY after Free-tier attestation and enabling the explicit reuse flag.
    if(!voiceStudioReady(process.env)&&!fishLanguages(process.env).length)
      throw new AppError('VOICE_STUDIO_NOT_CONFIGURED',503)
    const config = getAppConfig()
    requireSameOrigin(request,config)
    const body = await readBody(request,3500)
    let validated
    try { validated = body?.provider==='fish'?validateFishRequest(body):validateStudioRequest(body) }
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
    if(validated.provider==='fish'){
      const configuredVendor=fishConfig(process.env,validated.language)
      if(!configuredVendor)throw new AppError('FISH_STUDIO_NOT_APPROVED',503)
      const referenceId=approvedFishReference(validated.voiceId,process.env)
      if(!referenceId)throw new AppError('FISH_VOICE_LICENSE_REQUIRED',403)
      const vendor={...configuredVendor,referenceId}
      await consumeRate(config,{op:'voice-studio-fish-global-hour'},12,3600)
      await consumeRate(config,{op:'voice-studio-fish-global-day'},30,86400)
      const wav=await requestFishWav({vendor,input:validated,env:process.env,
        signal:AbortSignal.any([request.signal,AbortSignal.timeout(20000)])})
      const response=new NextResponse(wav,{headers:{
        ...PRIVATE_HEADERS,'Content-Type':'audio/wav',
        'Content-Disposition':'inline; filename="holistic-house-fish.wav"',
        'Content-Length':String(wav.length),'X-HH-Voice-Provider':'fish',
      }})
      return auth?auth.apply(response):response
    }
    const primaryKey=voiceStudioKey(process.env)
    const freeKey=voiceStudioOpenRouterFreeKey(process.env)
    const backupKey=voiceStudioOpenRouterKey(process.env)
    let wav,provider,primaryFailure,freeFailure
    if(primaryKey) {
      try{
        wav=await requestStudioAudio({key:primaryKey,payload:buildStudioPayload(validated),
          signal:AbortSignal.timeout(20000)})
        provider='gemini'
      }catch(error){primaryFailure=error}
    }
    if(!wav && freeKey && validated.language==='en') {
      // Only the exact :free model is permitted, never `openrouter/free` or a paid model.
      // Keep under OpenRouter's typical 50/day account-wide free allocation.
      await consumeRate(config,{op:'voice-studio-openrouter-free-day'},30,86400)
      try{
        wav=await requestOpenRouterStudioAudio({
          key:freeKey,payload:buildOpenRouterFreePayload(validated),
          signal:AbortSignal.timeout(12000),
        })
        provider='openrouter-free'
      }catch(error){freeFailure=error}
    }
    // Public phrase/sample modes are FREE-ONLY even if an operator later
    // enables a paid custom-voice backup for authenticated sessions.
    // Never charge the owner implicitly for visitor narration attempts.
    if(!wav && backupKey && validated.mode==='custom') {
      // Hard daily cap: 20 requests x 650 chars x $15/M chars ~ $0.20/day.
      // No paid retry; visitors never pay, operator must set OpenRouter key spend limits.
      await consumeRate(config,{op:'voice-studio-openrouter-paid-day'},20,86400)
      try{
        wav=await requestOpenRouterStudioAudio({
          key:backupKey,payload:buildOpenRouterStudioPayload(validated),
          signal:AbortSignal.timeout(12000),
        })
        provider='openrouter'
      }catch(error){
        throw new AppError(error.code||'TTS_BACKUP_UNAVAILABLE',error.status||503)
      }
    }
    if(!wav) {
      const failure=freeFailure||primaryFailure
      throw new AppError(failure?.code||'TTS_PROVIDER_UNAVAILABLE',failure?.status||503)
    }
    const response = new NextResponse(wav,{
      headers:{
        ...PRIVATE_HEADERS,
        'Content-Type':'audio/wav',
        'Content-Disposition':'inline; filename="holistic-house-voice.wav"',
        'Content-Length':String(wav.length),
        'X-HH-Voice-Provider':provider,
      }
    })
    return auth ? auth.apply(response) : response
  } catch(error) {
    return fail(error,auth)
  }
}
