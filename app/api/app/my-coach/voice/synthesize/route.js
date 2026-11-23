import {NextResponse} from 'next/server'
import {getAppConfig,requireSameOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {consumeRate} from '@/lib/app/database'
import {PRIVATE_HEADERS,readBody,safeError} from '@/lib/app/http'
import {AppError} from '@/lib/assessments/contracts'
import {myCoachFishConfig,myCoachFishVoice,normalizeMyCoachFishRequest} from '@/lib/coaching/my-coach-fish-voice.mjs'
import {geminiCoachTtsConfig,normalizeGeminiCoachTtsInput,synthesizeGeminiCoachTts} from '@/lib/coaching/gemini-coach-tts.mjs'
import {GOOGLE_PROVIDER,GOOGLE_TTS_GLOBAL_DAILY_LIMIT,googleChirpConfig,
  normalizeGoogleChirpInput,synthesizeGoogleChirp} from '@/lib/coaching/my-coach-google-chirp.mjs'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export const preferredRegion='yul1'
export const maxDuration=25

// Google Chirp 3 HD takes priority; Fish remains a *separately disclosed*
// free-only alternative when Google is not configured. No silent provider switch.
const currentProvider=()=>{
  if(googleChirpConfig())return GOOGLE_PROVIDER
  if(myCoachFishConfig())return 'fish_free'
  return null
}

export async function GET(request){
  let auth
  try{
    const config=getAppConfig()
    auth=createRequestAuth(request,config)
    await auth.verified()
    const provider=currentProvider()
    return auth.apply(NextResponse.json({available:Boolean(provider),
      provider,model:provider===GOOGLE_PROVIDER?'Chirp3-HD':provider==='fish_free'?'s2.1-pro-free':null,
      requiresSeparateConsent:true,
      geminiTtsFreeAvailable:Boolean(geminiCoachTtsConfig(process.env,'gemini_tts_free')),
      geminiTtsPaidAvailable:Boolean(geminiCoachTtsConfig(process.env,'gemini_tts_paid'))
    }, {headers:PRIVATE_HEADERS}))
  }catch(error){
    const safe=safeError(error)
    const response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
    return auth?auth.apply(response):response
  }
}

export async function POST(request){
  let auth
  try{
    const config=getAppConfig()
    requireSameOrigin(request,config)
    auth=createRequestAuth(request,config)
    const actor=await auth.verified()
    const raw=await readBody(request,4096)
    if(['gemini_tts_free','gemini_tts_paid'].includes(raw.provider)){
      const vendor=geminiCoachTtsConfig(process.env,raw.provider)
      if(!vendor)throw new AppError('MY_COACH_GEMINI_TTS_DISABLED',503)
      let input
      try{input=normalizeGeminiCoachTtsInput(raw)}
      catch{throw new AppError('MY_COACH_GEMINI_TTS_INVALID',400)}
      await consumeRate(config,{op:'my-coach-'+raw.provider+'-actor-day',actor:actor.id},
        raw.provider==='gemini_tts_paid'?6:12,86400)
      await consumeRate(config,{op:'my-coach-'+raw.provider+'-global-day'},
        raw.provider==='gemini_tts_paid'?12:24,86400)
      let audio
      try{audio=await synthesizeGeminiCoachTts({config:vendor,input,
        signal:AbortSignal.any([request.signal,AbortSignal.timeout(19000)])})}
      catch{throw new AppError('MY_COACH_GEMINI_TTS_UNAVAILABLE',503)}
      return auth.apply(new NextResponse(audio,{status:200,headers:{
        ...PRIVATE_HEADERS,'Content-Type':'audio/wav','Content-Length':String(audio.length)}}))
    }
    const provider=currentProvider()
    if(!provider||raw.provider!==provider)throw new AppError('MY_COACH_TTS_DISABLED',503)

    if(provider===GOOGLE_PROVIDER){
      let input
      try{input=normalizeGoogleChirpInput(raw)}
      catch{throw new AppError('MY_COACH_GOOGLE_CHIRP_INVALID',400)}
      // DB-backed atomic rate budget, shared across serverless instances.
      // 40 requests/day * 500 characters * 31 days = 620k max/month on THIS route.
      // Other Google Cloud project calls are outside this cap: dedicated project required.
      await consumeRate(config,{op:'my-coach-google-minute',actor:actor.id},4,60)
      await consumeRate(config,{op:'my-coach-google-day',actor:actor.id},18,86400)
      await consumeRate(config,{op:'my-coach-google-global'},GOOGLE_TTS_GLOBAL_DAILY_LIMIT,86400)
      let audio
      try{audio=await synthesizeGoogleChirp({config:googleChirpConfig(),input,
        signal:AbortSignal.any([request.signal,AbortSignal.timeout(19000)])})}
      catch{throw new AppError('MY_COACH_GOOGLE_CHIRP_UNAVAILABLE',503)}
      return auth.apply(new NextResponse(audio,{status:200,headers:{
        ...PRIVATE_HEADERS,'Content-Type':'audio/mpeg','Content-Length':String(audio.length)}}))
    }

    // The old Fish pilot is not silently used as a fallback after Google errors.
    // Its independent opt-in, training consent and expiry still apply.
    const {provider:_,...fishRaw}=raw
    let input
    try{input=normalizeMyCoachFishRequest(fishRaw)}
    catch{throw new AppError('MY_COACH_FISH_TTS_INVALID',400)}
    const vendor=myCoachFishConfig()
    if(!vendor)throw new AppError('MY_COACH_FISH_TTS_DISABLED',503)
    // Never allow client-chosen voice IDs; bind the voice to the approved
    // fictional persona on the server. No generic male default for Mira.
    const referenceId=myCoachFishVoice(fishRaw.personaId,input.locale)
    if(!referenceId)throw new AppError('MY_COACH_FISH_TTS_INVALID',400)
    await consumeRate(config,{op:'my-coach-fish-minute',actor:actor.id},5,60)
    await consumeRate(config,{op:'my-coach-fish-day',actor:actor.id},35,86400)
    const upstream=await fetch('https://api.fish.audio/v1/tts',{
      method:'POST',cache:'no-store',
      // Bound free-tier vendor latency so the iPhone is never stuck waiting
      // until Vercel kills the function. One attempt only: no duplicate quota.
      signal:AbortSignal.any([request.signal,AbortSignal.timeout(15000)]),
      headers:{Authorization:`Bearer ${vendor.key}`,'Content-Type':'application/json',
        Accept:'audio/mpeg',model:vendor.model},
      body:JSON.stringify({text:input.text,format:'mp3',reference_id:referenceId,
        // Fish's low-latency mode starts synthesizing smaller speech segments.
        // One free-only request; never retry or silently upgrade to paid.
        latency:'low',chunk_length:100}),
    })
    const kind=upstream.headers.get('content-type')||''
    if(!upstream.ok||!upstream.body||
       (!kind.startsWith('audio/')&&!kind.startsWith('application/octet-stream')))
      throw new AppError('MY_COACH_FISH_TTS_UNAVAILABLE',502)
    return auth.apply(new NextResponse(upstream.body,{
      status:200,headers:{...PRIVATE_HEADERS,'Content-Type':'audio/mpeg'},
    }))
  }catch(error){
    const safe=safeError(error)
    const response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
    return auth?auth.apply(response):response
  }
}
