import {NextResponse} from 'next/server'
import {getAppConfig,requireSameOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {readPersonalCoaching} from '@/lib/app/personal-coaching'
import {consumeRate} from '@/lib/app/database'
import {PRIVATE_HEADERS,readBody,safeError} from '@/lib/app/http'
import {AppError} from '@/lib/assessments/contracts'
import {coachingVoiceEnabled} from '@/lib/personal-coaching/live-voice-contract.mjs'
import {fishTtsConfig,normalizeFishTtsInput} from '@/lib/personal-coaching/fish-tts-contract.mjs'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export const preferredRegion='yul1'
export const maxDuration=25

// This POST is the OPTIONAL, paid-capable TTS layer, not a second AI or session.
// It streams Fish's MP3 bytes through our own authenticated Next route; no
// vendor credential, customer text or voice reference is exposed in a URL.
// Neither audio nor text is stored, cached, logged, or appended to a report.
export async function POST(request){
  let auth
  try{
    const config=getAppConfig()
    requireSameOrigin(request,config)
    auth=createRequestAuth(request,config)
    const actor=await auth.verified()
    if(request.headers.get('x-hh-account-id')!==actor.id)
      throw new AppError('ACCOUNT_CHANGED',409)
    if(!coachingVoiceEnabled())
      throw new AppError('COACHING_VOICE_DISABLED',503)
    const raw=await readBody(request,4096)
    let input
    try{input=normalizeFishTtsInput(raw)}
    catch{throw new AppError('COACHING_FISH_TTS_INVALID',400)}
    const vendor=fishTtsConfig(process.env,input.locale)
    if(!vendor)throw new AppError('COACHING_FISH_TTS_DISABLED',503)

    // Authenticated actor must own this exact, still-active coaching session.
    const current=(await readPersonalCoaching(config,actor))?.course?.current
    if(!current||current.id!==input.sessionId)
      throw new AppError('PERSONAL_COACH_NOT_STARTED',404)
    if(current.status!=='active')
      throw new AppError('PERSONAL_COACH_INCOMPLETE',409)

    // At 3,000 bytes/request and 40 requests/day, the worst-case Pro TTS
    // charge is capped to US $1.80/account/day (vendor $15/M UTF-8 bytes).
    await consumeRate(config,{op:'coaching-fish-tts-minute',actor:actor.id},6,60)
    await consumeRate(config,{op:'coaching-fish-tts-day',actor:actor.id},40,86400)

    const upstream=await fetch('https://api.fish.audio/v1/tts',{
      method:'POST',signal:request.signal,cache:'no-store',
      headers:{
        'Authorization':`Bearer ${vendor.key}`,
        'Content-Type':'application/json','Accept':'audio/mpeg',
        'model':vendor.model,
      },
      body:JSON.stringify({text:input.text,reference_id:vendor.referenceId,format:'mp3'}),
    })
    if(!upstream.ok||!upstream.body)
      throw new AppError('COACHING_FISH_TTS_UNAVAILABLE',502)

    return auth.apply(new NextResponse(upstream.body,{
      status:200,headers:{...PRIVATE_HEADERS,'Content-Type':'audio/mpeg'},
    }))
  }catch(error){
    const safe=safeError(error)
    const response=NextResponse.json({error:safe.code},{
      status:safe.status,headers:PRIVATE_HEADERS,
    })
    return auth?auth.apply(response):response
  }
}
