import {NextResponse} from 'next/server'
import {getAppConfig,requestOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {createAppRepository} from '@/lib/app/repository'
import {practitionerEmailAllowed} from '@/lib/app/practitioner-access'
import {consumeRate} from '@/lib/app/database'
import {PRIVATE_HEADERS,readBody} from '@/lib/app/http'
import {resolveLukasVideoAccess} from '@/lib/coaching/lukas-video-auth.mjs'
import {lukasOwnerCheckActor,parseLukasOwnerCheck} from '@/lib/coaching/lukas-owner-check.mjs'
import {ownerLukasVideoCheckReady,LUKAS_VIDEO_CHECK_TEXT,pilotConfig} from '@/lib/coaching/live-avatar-pilot.mjs'
import {startOwnerAvatarPilot} from '@/lib/coaching/live-avatar-pilot-server.mjs'
import {readSimliChannel} from '@/lib/coaching/lukas-simli-readiness.mjs'
import {geminiCoachTtsConfig,normalizeGeminiCoachTtsInput,synthesizeGeminiCoachTts} from '@/lib/coaching/gemini-coach-tts.mjs'
import {aliGeminiGreetingVoice} from '@/lib/holistic-support/ali-gemini-free-tts.mjs'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const maxDuration=60
// Narrow owner-only test via the ordinary Google account. The admin API and
// arbitrary dialogue gates remain unchanged. No provider requests on GET.
async function handle(request,method){
  let auth
  const respond=response=>auth?auth.apply(response):response
  const json=(body,status=200)=>respond(NextResponse.json(body,{status,headers:PRIVATE_HEADERS}))
  try{
    const config=getAppConfig(),origin=requestOrigin(request,config)
    if(origin!=='https://holistichouse.vercel.app'||request.headers.get('sec-fetch-site')==='cross-site'||(method==='POST'?request.headers.get('origin')!==origin:request.headers.has('origin')&&request.headers.get('origin')!==origin))return json({error:'ACCESS_DENIED'},403)
    const vendor=geminiCoachTtsConfig(process.env,'gemini_tts_free')
    if(!ownerLukasVideoCheckReady()||!vendor)return json({error:'FREE_PILOT_DISABLED'},409)
    auth=createRequestAuth(request,config)
    const repository=createAppRepository(config)
    const actor=lukasOwnerCheckActor(await resolveLukasVideoAccess(auth,{ownerEmailAllowed:practitionerEmailAllowed,ownerPractitionerActive:a=>repository.isPractitioner(a)}))
    if(!actor)return json({error:'ACCESS_DENIED'},403)
    if(method==='GET')return json({coach:false,chatbot:false,videoCheck:true})
    const body=await readBody(request,4096),action=parseLukasOwnerCheck(body)
    if(!action)return json({error:'INVALID_PILOT_REQUEST'},400)
    if(action.action==='start'){
      // Share the already existing lab/coach caps. Never allocate while the
      // provider reports an active session; the vendor hard stop still applies.
      await consumeRate(config,{op:'owner-simli-start-minute'},1,60)
      await consumeRate(config,{op:'owner-simli-start-day'},2,86400)
      const channel=await readSimliChannel({apiKey:pilotConfig().simli.key})
      if(channel.busy)return json({error:'LUKAS_VIDEO_BUSY'},409)
      return json(await startOwnerAvatarPilot(body))
    }
    const locale=action.locale,personaId='alex',voiceName=aliGeminiGreetingVoice(personaId,locale)
    const input=normalizeGeminiCoachTtsInput({provider:'gemini_tts_free',locale,personaId,text:LUKAS_VIDEO_CHECK_TEXT[locale],voiceName,voiceConsent:true,cloudVoiceConsent:true,trainingUseConsent:true})
    await consumeRate(config,{op:'my-coach-gemini_tts_free-actor-day',actor:actor.id},12,86400)
    await consumeRate(config,{op:'my-coach-gemini_tts_free-global-day'},24,86400)
    const audio=await synthesizeGeminiCoachTts({config:vendor,input,signal:AbortSignal.any([request.signal,AbortSignal.timeout(19000)])})
    return respond(new NextResponse(audio,{headers:{...PRIVATE_HEADERS,'Content-Type':'audio/wav','Content-Length':String(audio.length)}}))
  }catch(error){
    if(error?.code==='RATE_LIMITED'||error?.message==='RATE_LIMITED')return json({error:'RATE_LIMITED'},429)
    return json({error:'AVATAR_UNAVAILABLE'},503)
  }
}
export async function GET(request){return handle(request,'GET')}
export async function POST(request){return handle(request,'POST')}
