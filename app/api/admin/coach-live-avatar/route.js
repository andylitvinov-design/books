import {requireAdminRequest,requireAdminActor} from '@/lib/prescriptions/admin'
import {getAppConfig} from '@/lib/app/config'
import {consumeRate} from '@/lib/app/database'
import {pilotConfig,pilotRequestAllowed,ownerSimliDialogueReady,ownerSimliDialogueRequestAllowed} from '@/lib/coaching/live-avatar-pilot.mjs'
import {geminiCoachTtsConfig,normalizeGeminiCoachTtsInput,synthesizeGeminiCoachTts} from '@/lib/coaching/gemini-coach-tts.mjs'
import {aliGeminiGreetingVoice} from '@/lib/holistic-support/ali-gemini-free-tts.mjs'
import {PRIVATE_HEADERS,readBody} from '@/lib/app/http'
import {startOwnerAvatarPilot,endOwnerSequencerPilot,startOwnerSimliDialogue} from '@/lib/coaching/live-avatar-pilot-server.mjs'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const maxDuration=60
function json(body,status=200){return Response.json(body,{status,headers:PRIVATE_HEADERS})}
export async function GET(request){
  if(request.headers.get('sec-fetch-site')==='cross-site'||(request.headers.has('origin')&&request.headers.get('origin')!=='https://holistichouse.vercel.app'))return json({error:'ACCESS_DENIED'},403)
  if(!ownerSimliDialogueReady()||!await requireAdminRequest())return json({error:'ACCESS_DENIED'},403)
  return json({coach:true,chatbot:Boolean(geminiCoachTtsConfig(process.env,'gemini_tts_free'))})
}
async function limitAvatarStart(){
  const config=getAppConfig()
  // Global owner test limits shared between both providers, roles and the lab.
  // An independently verified vendor hard billing stop remains mandatory.
  await consumeRate(config,{op:'owner-simli-start-minute'},1,60)
  await consumeRate(config,{op:'owner-simli-start-day'},2,86400)
}
async function aliAudio(request,body,actor){
  if(!ownerSimliDialogueReady())throw Error('FREE_PILOT_DISABLED')
  if(Object.keys(body).some(k=>!['action','target','text','locale','personaId','freeOnly','nonSensitiveTest','privacyConsent','trainingConsent'].includes(k))||
     body.target!=='chatbot'||body.freeOnly!==true||body.nonSensitiveTest!==true||body.privacyConsent!==true||body.trainingConsent!==true)throw Error('INVALID_PILOT_REQUEST')
  const vendor=geminiCoachTtsConfig(process.env,'gemini_tts_free')
  if(!vendor)throw Error('FREE_PILOT_DISABLED')
  const voiceName=aliGeminiGreetingVoice(body.personaId,body.locale)
  if(!voiceName)throw Error('INVALID_PILOT_REQUEST')
  let input
  try{input=normalizeGeminiCoachTtsInput({provider:'gemini_tts_free',locale:body.locale,personaId:body.personaId,text:body.text,voiceName,voiceConsent:true,cloudVoiceConsent:true,trainingUseConsent:true})}
  catch{throw Error('INVALID_PILOT_REQUEST')}
  const config=getAppConfig()
  await consumeRate(config,{op:'my-coach-gemini_tts_free-actor-day',actor:actor.id},12,86400)
  await consumeRate(config,{op:'my-coach-gemini_tts_free-global-day'},24,86400)
  const audio=await synthesizeGeminiCoachTts({config:vendor,input,signal:AbortSignal.any([request.signal,AbortSignal.timeout(19000)])})
  return new Response(audio,{headers:{...PRIVATE_HEADERS,'Content-Type':'audio/wav','Content-Length':String(audio.length)}})
}
export async function POST(request){
  // No cross-origin starts, public clients, payment calls or customer recordings.
  if(request.headers.get('origin')!=='https://holistichouse.vercel.app')return json({error:'ACCESS_DENIED'},403)
  const actor=await requireAdminActor()
  if(!actor?.id)return json({error:'ACCESS_DENIED'},403)
  try{
    const body=await readBody(request,4096)
    if(body.action==='end'){
      await endOwnerSequencerPilot(body.receipt);return json({ended:true})
    }
    if(body.action==='ali-audio')return await aliAudio(request,body,actor)
    if(body.action==='start-dialogue'){
      if(!ownerSimliDialogueRequestAllowed(body))throw Error('INVALID_PILOT_REQUEST')
      if(!ownerSimliDialogueReady())throw Error('FREE_PILOT_DISABLED')
      await limitAvatarStart()
      return json(await startOwnerSimliDialogue(body))
    }
    if(!pilotRequestAllowed(body))throw Error('INVALID_PILOT_REQUEST')
    if(!pilotConfig()[body.provider]?.allowed)throw Error('FREE_PILOT_DISABLED')
    await limitAvatarStart()
    return json(await startOwnerAvatarPilot(body))
  }catch(error){
    const code=['FREE_PILOT_DISABLED','INVALID_PILOT_REQUEST','INVALID_RECEIPT','AVATAR_NOT_PREPARED','AVATAR_READINESS_UNAVAILABLE','RATE_LIMITED'].includes(error?.message)?error.message:'AVATAR_UNAVAILABLE'
    return json({error:code},['FREE_PILOT_DISABLED','AVATAR_NOT_PREPARED'].includes(code)?409:code==='AVATAR_READINESS_UNAVAILABLE'?503:code==='RATE_LIMITED'?429:400)
  }
}
