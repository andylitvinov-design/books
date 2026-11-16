import {NextResponse} from 'next/server'
import {getAppConfig,requireSameOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {personalCoachingBrainTurn} from '@/lib/app/coaching-brain'
import {consumeRate} from '@/lib/app/database'
import {PRIVATE_HEADERS,readBody,safeError} from '@/lib/app/http'
import {AppError} from '@/lib/assessments/contracts'
import {
  coachingVoiceEnabled,normalizeVoiceTurn,toCoachingBrainRequest,
  restrictVoiceOpenRouterPayload,voiceReplyFromBrain,
} from '@/lib/personal-coaching/live-voice-contract.mjs'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export const preferredRegion='yul1'
export const maxDuration=25

// Audio is processed only by the browser's speech APIs; this endpoint reuses
// the existing first-party Coaching Brain and its audited FREE OpenRouter path.
// No microphone bytes, raw audio, transcript history or report are persisted.
async function restrictedVoiceFetch(url, init) {
  if(init?.method !== 'POST')return fetch(url,init)
  if(String(url)!=='https://openrouter.ai/api/v1/chat/completions')
    throw Error('COACHING_VOICE_PROVIDER_POLICY_DENIED')
  const payload=restrictVoiceOpenRouterPayload(JSON.parse(init.body))
  return fetch(url,{...init,body:JSON.stringify(payload)})
}

export async function POST(request) {
  let auth
  try {
    const config=getAppConfig()
    requireSameOrigin(request,config)
    auth=createRequestAuth(request,config)
    const actor=await auth.verified()
    if(request.headers.get('x-hh-account-id')!==actor.id)
      throw new AppError('ACCOUNT_CHANGED',409)
    if(!coachingVoiceEnabled())
      throw new AppError('COACHING_VOICE_DISABLED',503)

    const raw=await readBody(request,12000)
    let input
    try {input=normalizeVoiceTurn(raw)}
    catch {throw new AppError('COACHING_VOICE_INVALID_INPUT',400)}

    await consumeRate(config,{op:'coaching-live-voice-minute',actor:actor.id},8,60)
    await consumeRate(config,{op:'coaching-live-voice-day',actor:actor.id},90,86400)

    // Coaching Brain verifies the active session's encrypted owner account,
    // chooses the reviewed method/stage, and applies the crisis gate before
    // an optional provider call. No parallel reasoning engine or paid model.
    const result=await personalCoachingBrainTurn(config,actor,toCoachingBrainRequest(input),{
      signal:request.signal,fetcher:restrictedVoiceFetch,
    })
    return auth.apply(NextResponse.json(voiceReplyFromBrain(result,input.locale),{
      headers:PRIVATE_HEADERS,
    }))
  }catch(error){
    const safe=safeError(error)
    const response=NextResponse.json({error:safe.code},{
      status:safe.status,headers:PRIVATE_HEADERS,
    })
    return auth?auth.apply(response):response
  }
}
