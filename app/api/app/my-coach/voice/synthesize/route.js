import {NextResponse} from 'next/server'
import {getAppConfig,requireSameOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {consumeRate} from '@/lib/app/database'
import {PRIVATE_HEADERS,readBody,safeError} from '@/lib/app/http'
import {AppError} from '@/lib/assessments/contracts'
import {myCoachFishConfig,normalizeMyCoachFishRequest} from '@/lib/coaching/my-coach-fish-voice.mjs'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export const preferredRegion='yul1'
export const maxDuration=25

// Capability does NOT expose keys, voice IDs, cost authorization or any user text.
export async function GET(request){
  let auth
  try{
    const config=getAppConfig()
    auth=createRequestAuth(request,config)
    await auth.verified()
    return auth.apply(NextResponse.json({available:Boolean(myCoachFishConfig()),
      model:'s2.1-pro-free',requiresSeparateConsent:true}, {headers:PRIVATE_HEADERS}))
  }catch(error){
    const safe=safeError(error)
    const result=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
    return auth?auth.apply(result):result
  }
}

// Opt-in MP3 only. No celebrity voice reference, storage, telemetry, recording,
// provider fallback to paid models, or client control of Fish headers/model.
export async function POST(request){
  let auth
  try{
    const config=getAppConfig()
    requireSameOrigin(request,config)
    auth=createRequestAuth(request,config)
    const actor=await auth.verified()
    const vendor=myCoachFishConfig()
    if(!vendor)throw new AppError('MY_COACH_FISH_TTS_DISABLED',503)
    const raw=await readBody(request,4096)
    let input
    try{input=normalizeMyCoachFishRequest(raw)}
    catch{throw new AppError('MY_COACH_FISH_TTS_INVALID',400)}

    // Free model only. Fair-use and site abuse bounded per signed-in account.
    await consumeRate(config,{op:'my-coach-fish-minute',actor:actor.id},5,60)
    await consumeRate(config,{op:'my-coach-fish-day',actor:actor.id},35,86400)

    const upstream=await fetch('https://api.fish.audio/v1/tts',{
      method:'POST',cache:'no-store',signal:request.signal,
      headers:{Authorization:`Bearer ${vendor.key}`,'Content-Type':'application/json',
        Accept:'audio/mpeg',model:vendor.model},
      // No reference_id on purpose: generic Fish default, NOT community clones.
      body:JSON.stringify({text:input.text,format:'mp3'}),
    })
    const contentType=upstream.headers.get('content-type')||''
    if(!upstream.ok||!upstream.body||
       (!contentType.startsWith('audio/')&&!contentType.startsWith('application/octet-stream')))
      throw new AppError('MY_COACH_FISH_TTS_UNAVAILABLE',502)

    return auth.apply(new NextResponse(upstream.body,{
      status:200,headers:{...PRIVATE_HEADERS,'Content-Type':'audio/mpeg'},
    }))
  }catch(error){
    const safe=safeError(error)
    const result=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
    return auth?auth.apply(result):result
  }
}
