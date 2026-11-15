import {NextResponse} from 'next/server'
import {getAppConfig} from '@/lib/app/config'
import {consumeRate} from '@/lib/app/database'
import {safeError} from '@/lib/app/http'
import {AppError} from '@/lib/assessments/contracts'
import {getCoachPresentation} from '@/lib/coaching/persona-presentations.mjs'
import {myCoachFishConfig,myCoachFishVoice} from '@/lib/coaching/my-coach-fish-voice.mjs'

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
    const match=/^\/api\/coaching\/intro\/(en|ru|es)\/(mira|max|sofia|alex|lea|noah|iris|ray)\/?$/.exec(url.pathname)
    if(!match||url.search)throw new AppError('MY_COACH_INTRO_INVALID',400)
    const [,locale,personaId]=match
    const intro=getCoachPresentation(personaId,locale)
    const referenceId=myCoachFishVoice(personaId)
    if(!intro?.text||intro.text.length>900||!referenceId)
      throw new AppError('MY_COACH_INTRO_INVALID',400)
    const vendor=myCoachFishConfig()
    if(!vendor)throw new AppError('MY_COACH_NATURAL_VOICE_UNAVAILABLE',503)
    const config=getAppConfig()
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
        body:JSON.stringify({text:intro.text,format:'mp3',reference_id:referenceId}),
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
