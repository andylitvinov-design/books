import {NextResponse} from 'next/server'
import {getAppConfig} from '@/lib/app/config'
import {consumeRate} from '@/lib/app/database'
import {safeError} from '@/lib/app/http'
import {AppError} from '@/lib/assessments/contracts'
import {getCoachPresentation} from '@/lib/coaching/persona-presentations.mjs'
import {myCoachFishConfig} from '@/lib/coaching/my-coach-fish-voice.mjs'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export const preferredRegion='yul1'
export const maxDuration=25

// Public, editorial-only MP3 on /api/coaching/intro. Never accepts client text, role, prompt, voice ID,
// uploads or conversation content. The same 24 fixed scripts (8 coaches x 3
// languages) can be cached at the edge instead of charging per guest Play.
const CACHE_HEADERS={
  'Content-Type':'audio/mpeg',
  'Cache-Control':'public, max-age=300, s-maxage=86400, stale-while-revalidate=86400',
  'X-Content-Type-Options':'nosniff',
  'X-Robots-Tag':'noindex, nofollow',
}

export async function GET(request){
  try{
    if(request.headers.get('sec-fetch-site')==='cross-site')
      throw new AppError('MY_COACH_INTRO_CROSS_SITE',403)
    const url=new URL(request.url)
    if([...url.searchParams.keys()].some(key=>!['coach','locale'].includes(key)))
      throw new AppError('MY_COACH_INTRO_INVALID',400)
    const personaId=url.searchParams.get('coach')
    const locale=url.searchParams.get('locale')
    if(!['en','ru','es'].includes(locale))
      throw new AppError('MY_COACH_INTRO_INVALID',400)
    const intro=getCoachPresentation(personaId,locale)
    if(!intro?.text||intro.text.length>900)
      throw new AppError('MY_COACH_INTRO_INVALID',400)

    // The owner's existing, explicitly approved *free* Fish pilot only. No
    // paid fallback or Google Cloud billing. Its expiry is enforced by config.
    const vendor=myCoachFishConfig()
    if(!vendor)throw new AppError('MY_COACH_NATURAL_VOICE_UNAVAILABLE',503)
    const config=getAppConfig()
    // Atomic shared DB rate budgets on upstream cache misses, including bots.
    await consumeRate(config,{op:'my-coach-public-intro-minute'},12,60)
    await consumeRate(config,{op:'my-coach-public-intro-global-day'},40,86400)
    let upstream
    try{
      upstream=await fetch('https://api.fish.audio/v1/tts',{
        method:'POST',cache:'no-store',
        signal:AbortSignal.any([request.signal,AbortSignal.timeout(15000)]),
        headers:{Authorization:`Bearer ${vendor.key}`,
          'Content-Type':'application/json',Accept:'audio/mpeg',model:vendor.model},
        body:JSON.stringify({text:intro.text,format:'mp3'}),
      })
    }catch{throw new AppError('MY_COACH_INTRO_TTS_UNAVAILABLE',503)}
    const type=upstream.headers.get('content-type')||''
    if(!upstream.ok||!upstream.body||
      (!type.startsWith('audio/')&&!type.startsWith('application/octet-stream')))
      throw new AppError('MY_COACH_INTRO_TTS_UNAVAILABLE',503)
    return new NextResponse(upstream.body,{status:200,headers:CACHE_HEADERS})
  }catch(error){
    const safe=safeError(error)
    return NextResponse.json({error:safe.code},{status:safe.status,headers:{
      'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'
    }})
  }
}
