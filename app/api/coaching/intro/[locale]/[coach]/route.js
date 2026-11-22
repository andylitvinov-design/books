import {NextResponse} from 'next/server'
import {getAppConfig} from '@/lib/app/config'
import {consumeRate} from '@/lib/app/database'
import {safeError} from '@/lib/app/http'
import {AppError} from '@/lib/assessments/contracts'
import {getCoachPresentation} from '@/lib/coaching/persona-presentations.mjs'
import {coachOpeningIntro} from '@/lib/coaching/coach-opening-protocol.mjs'
import {myCoachFishConfig,myCoachFishVoice} from '@/lib/coaching/my-coach-fish-voice.mjs'
import {GOOGLE_PROVIDER,GOOGLE_TTS_GLOBAL_DAILY_LIMIT,googleChirpConfig,
  normalizeGoogleChirpInput,synthesizeGoogleChirp} from '@/lib/coaching/my-coach-google-chirp.mjs'
import {coachSpokenText} from '@/lib/coaching/coach-spoken-text.mjs'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export const preferredRegion='yul1'
export const maxDuration=25

const CACHE_HEADERS={
  'Content-Type':'audio/mpeg',
  'Cache-Control':'public, max-age=300, s-maxage=86400, stale-while-revalidate=86400',
  'X-Content-Type-Options':'nosniff',
  'X-Robots-Tag':'noindex, nofollow',
}

// Public, editorial-only natural voice. Path parameters survive browsers and
// proxies that strip query strings. Never accepts arbitrary user-supplied text,
// recorded microphone audio, voice IDs, or client session history.
export async function GET(request){
  try{
    if(request.headers.get('sec-fetch-site')==='cross-site')
      throw new AppError('MY_COACH_INTRO_CROSS_SITE',403)
    const url=new URL(request.url)
    const match=/^\/api\/coaching\/intro\/(en|ru|es)\/(mira|max|sofia|alex|merlin|harry|lea|noah|iris|ray)\/?$/.exec(url.pathname)
    if(!match||!['','?v=2'].includes(url.search))throw new AppError('MY_COACH_INTRO_INVALID',400)
    const [,locale,personaId]=match
    const intro=getCoachPresentation(personaId,locale)
    const introduction=url.search==='?v=2'?coachOpeningIntro(personaId,locale):intro?.text
    if(!introduction||introduction.length>900)
      throw new AppError('MY_COACH_INTRO_INVALID',400)
    const config=getAppConfig()

    // Google is the owner-approved long-term voice ONLY when every existing
    // GCP project, billing, consent and service-account flag is configured.
    // This serves a fixed authored introduction, never any visitor's words.
    // Public/unauthenticated Play shares the private route's atomic global
    // limit: 40 * 500 * 31 = 620k maximum monthly characters across BOTH.
    const chirp=googleChirpConfig()
    if(chirp){
      let input
      try{
        input=normalizeGoogleChirpInput({provider:GOOGLE_PROVIDER,locale,personaId,
          text:coachSpokenText(introduction).text,voiceConsent:true,cloudVoiceConsent:true})
      }catch{throw new AppError('MY_COACH_INTRO_INVALID',400)}
      // 24 fixed greetings can warm the CDN without exhausting the 40/day
      // shared Google budget. Never silently fall back to Fish on Google error.
      await consumeRate(config,{op:'my-coach-google-public-intro-minute'},12,60)
      await consumeRate(config,{op:'my-coach-google-public-intro-day'},24,86400)
      await consumeRate(config,{op:'my-coach-google-global'},GOOGLE_TTS_GLOBAL_DAILY_LIMIT,86400)
      let audio
      try{
        audio=await synthesizeGoogleChirp({config:chirp,input,
          signal:AbortSignal.any([request.signal,AbortSignal.timeout(19000)])})
      }catch{throw new AppError('MY_COACH_INTRO_TTS_UNAVAILABLE',503)}
      return new NextResponse(audio,{status:200,headers:{
        ...CACHE_HEADERS,'Content-Length':String(audio.length)}})
    }

    const referenceId=myCoachFishVoice(personaId,locale)
    if(!referenceId)throw new AppError('MY_COACH_INTRO_INVALID',400)
    const vendor=myCoachFishConfig()
    if(!vendor)throw new AppError('MY_COACH_NATURAL_VOICE_UNAVAILABLE',503)
    // Atomic DB limits on origin (uncached) requests, never per audio chunk.
    await consumeRate(config,{op:'my-coach-public-intro-minute'},12,60)
    await consumeRate(config,{op:'my-coach-public-intro-global-day'},40,86400)
    let upstream
    try{
      upstream=await fetch('https://api.fish.audio/v1/tts',{
        method:'POST',cache:'no-store',
        signal:AbortSignal.any([request.signal,AbortSignal.timeout(15000)]),
        headers:{Authorization:`Bearer ${vendor.key}`,
          'Content-Type':'application/json',Accept:'audio/mpeg',model:vendor.model},
        body:JSON.stringify({text:introduction,format:'mp3',reference_id:referenceId,
          latency:'low',chunk_length:100}),
      })
    }catch{throw new AppError('MY_COACH_INTRO_TTS_UNAVAILABLE',503)}
    const type=upstream.headers.get('content-type')||''
    if(!upstream.ok||!upstream.body||
      (!type.startsWith('audio/')&&!type.startsWith('application/octet-stream')))
      throw new AppError('MY_COACH_INTRO_TTS_UNAVAILABLE',503)
    // Stream MP3 immediately: do not buffer an entire generated introduction.
    return new NextResponse(upstream.body,{status:200,headers:CACHE_HEADERS})
  }catch(error){
    const safe=safeError(error)
    return NextResponse.json({error:safe.code},{status:safe.status,headers:{
      'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'
    }})
  }
}
