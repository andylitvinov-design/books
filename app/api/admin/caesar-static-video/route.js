import {requireAdminActor} from '@/lib/prescriptions/admin'
import {getAppConfig} from '@/lib/app/config'
import {consumeRate} from '@/lib/app/database'
import {PRIVATE_HEADERS,readBody} from '@/lib/app/http'
import {readSavedCoachGreeting} from '@/lib/coaching/coach-greeting-mp3-store.mjs'
import {boundedBytes,generateCaesarStatic,staticApproval} from '@/lib/coaching/caesar-static-video.mjs'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const maxDuration=60
const origin='https://holistichouse.vercel.app'
const json=(value,status=200)=>Response.json(value,{status,headers:PRIVATE_HEADERS})
export async function GET(request){
  if(request.headers.get('sec-fetch-site')==='cross-site'||(request.headers.has('origin')&&request.headers.get('origin')!==origin)||!(await requireAdminActor())?.id)return json({error:'ACCESS_DENIED'},403)
  return json({approval:staticApproval()})
}
export async function POST(request){
  if(request.headers.get('origin')!==origin||request.headers.get('sec-fetch-site')==='cross-site'||!(await requireAdminActor())?.id)return json({error:'ACCESS_DENIED'},403)
  try{
    const body=await readBody(request,512),config=getAppConfig()
    const result=await generateCaesarStatic(body,{signal:request.signal,readGreeting:async locale=>{
      const response=await readSavedCoachGreeting(config,'caesar',locale,fetch,null,'v5')
      if(!response)throw Error('STATIC_AUDIO_MISSING')
      return boundedBytes(response,1024*1024)
    },reserve:async()=>{
      await consumeRate(config,{op:'owner-caesar-static-video-day'},1,86400)
      await consumeRate(config,{op:'owner-simli-start-day'},2,86400)
    }})
    return json(result)
  }catch(e){
    const code=e?.code==='RATE_LIMITED'?'RATE_LIMITED':(['STATIC_NOT_APPROVED','STATIC_INVALID_REQUEST','STATIC_AUDIO_MISSING','STATIC_AUDIO_INVALID','STATIC_AUDIO_TOO_LONG','STATIC_ATTEMPT_LOCKED'].includes(e?.message)?e.message:'STATIC_UNAVAILABLE')
    return json({error:code},code==='RATE_LIMITED'?429:code==='STATIC_INVALID_REQUEST'?400:409)
  }
}
