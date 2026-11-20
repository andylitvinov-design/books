import {NextResponse} from 'next/server'
import {getAppConfig} from '@/lib/app/config'
import {consumeRate} from '@/lib/app/database'
import {safeError} from '@/lib/app/http'
import {AppError} from '@/lib/assessments/contracts'
import {aliPersonaGreeting,isAliPersonaId} from '@/lib/holistic-support/ali-personas.mjs'
import {myCoachFishConfig,myCoachFishVoice} from '@/lib/coaching/my-coach-fish-voice.mjs'
import {GOOGLE_PROVIDER,GOOGLE_TTS_GLOBAL_DAILY_LIMIT,googleChirpConfig,
 normalizeGoogleChirpInput,synthesizeGoogleChirp} from '@/lib/coaching/my-coach-google-chirp.mjs'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export const preferredRegion='yul1'
export const maxDuration=25

const AUDIO_HEADERS={'Content-Type':'audio/mpeg',
 'Cache-Control':'public, max-age=300, s-maxage=86400, stale-while-revalidate=86400',
 'X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow'}

// Public, fixed editorial text only. Never synthesize visitor data or accept
// arbitrary text, voice IDs or query arguments. Share EXISTING voice budgets.

const validRequest=(request,params)=>{
 if(request.headers.get('sec-fetch-site')==='cross-site')return null
 const url=new URL(request.url)
 const {locale,persona}=params
 if(!['en','ru','es'].includes(locale)||!isAliPersonaId(persona)||
  url.search||url.pathname!==`/api/ali/voice/${locale}/${persona}`)return null
 return {locale,persona}
}

// A cached readiness check prevents a delayed 503 from blocking iOS user-gesture
// fallback TTS. It never requests audio or spends a TTS character.
export async function HEAD(request,{params}){
 const selection=validRequest(request,await params)
 if(!selection)return new Response(null,{status:400,headers:{'Cache-Control':'no-store'}})
 const available=Boolean(googleChirpConfig()||myCoachFishConfig())
 return new Response(null,{status:available?204:503,headers:{
  'Cache-Control':'public,max-age=60,s-maxage=300',
  'X-Content-Type-Options':'nosniff'
 }})
}

export async function GET(request,{params}){
 try{
  const selection=validRequest(request,await params)
  if(!selection)throw new AppError('ALI_VOICE_INVALID',400)
  const {locale,persona}=selection
  const text=aliPersonaGreeting(persona,locale)
  const config=getAppConfig()
  const chirp=googleChirpConfig()
  if(chirp){
   const input=normalizeGoogleChirpInput({provider:GOOGLE_PROVIDER,locale,personaId:persona,
    text,voiceConsent:true,cloudVoiceConsent:true})
   await consumeRate(config,{op:'ali-voice-minute'},10,60)
   await consumeRate(config,{op:'ali-voice-day'},20,86400)
   await consumeRate(config,{op:'my-coach-google-global'},GOOGLE_TTS_GLOBAL_DAILY_LIMIT,86400)
   const audio=await synthesizeGoogleChirp({config:chirp,input,
    signal:AbortSignal.any([request.signal,AbortSignal.timeout(19000)])})
   return new NextResponse(audio,{status:200,headers:{...AUDIO_HEADERS,'Content-Length':String(audio.length)}})
  }
  const vendor=myCoachFishConfig()
  const referenceId=myCoachFishVoice(persona,locale)
  if(!vendor||!referenceId)throw new AppError('ALI_NATURAL_VOICE_UNAVAILABLE',503)
  await consumeRate(config,{op:'ali-voice-minute'},10,60)
  await consumeRate(config,{op:'ali-voice-day'},20,86400)
  await consumeRate(config,{op:'my-coach-public-intro-global-day'},40,86400)
  const upstream=await fetch('https://api.fish.audio/v1/tts',{
   method:'POST',cache:'no-store',
   signal:AbortSignal.any([request.signal,AbortSignal.timeout(15000)]),
   headers:{Authorization:`Bearer ${vendor.key}`,'Content-Type':'application/json',
    Accept:'audio/mpeg',model:vendor.model},
   body:JSON.stringify({text,format:'mp3',reference_id:referenceId,
    latency:'low',chunk_length:100}),
  })
  const kind=upstream.headers.get('content-type')||''
  if(!upstream.ok||!upstream.body||
   (!kind.startsWith('audio/')&&!kind.startsWith('application/octet-stream')))
   throw new AppError('ALI_NATURAL_VOICE_UNAVAILABLE',503)
  // WebKit is more reliable with a complete MP3 and Content-Length than with
  // a chunked streaming response from the voice vendor.
  const declaredSize=Number(upstream.headers.get('content-length')||0)
  if(declaredSize>2000000)throw new AppError('ALI_NATURAL_VOICE_UNAVAILABLE',503)
  const audio=Buffer.from(await upstream.arrayBuffer())
  if(audio.length<32||audio.length>2000000||
    !(audio.subarray(0,3).toString()==='ID3'||
      (audio[0]===255&&(audio[1]&224)===224)))
   throw new AppError('ALI_NATURAL_VOICE_UNAVAILABLE',503)
  return new NextResponse(audio,{status:200,headers:{
   ...AUDIO_HEADERS,'Content-Length':String(audio.length)}})
 }catch(error){
  const safe=safeError(error)
  // Public fixed-greeting error code only: no secrets or private messages.
  console.warn('[ali-greeting-audio] synthesis unavailable:',safe.code)
  return NextResponse.json({error:safe.code},{status:safe.status,headers:{
   'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}})
 }
}
