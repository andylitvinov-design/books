import {requireAdminActor} from '@/lib/prescriptions/admin'
import {getAppConfig} from '@/lib/app/config'
import {consumeRateBatch} from '@/lib/app/database'
import {PRIVATE_HEADERS,readBody} from '@/lib/app/http'
import {captureReady,mintCaesarCapture} from '@/lib/coaching/caesar-webrtc-capture.mjs'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export const maxDuration=30
const origin='https://holistichouse.vercel.app'
const json=(body,status=200)=>Response.json(body,{status,headers:PRIVATE_HEADERS})
export async function POST(request){
 if(request.headers.get('origin')!==origin||request.headers.get('sec-fetch-site')==='cross-site'||!(await requireAdminActor())?.id)return json({error:'ACCESS_DENIED'},403)
 if(!captureReady())return json({error:'CAPTURE_NOT_APPROVED'},409)
 try{
  const body=await readBody(request,512)
  const result=await mintCaesarCapture(body,{reserve:()=>consumeRateBatch(getAppConfig(),[
   {bucket:{op:'owner-caesar-static-video-day'},limit:1,seconds:86400},
   {bucket:{op:'owner-simli-start-minute'},limit:1,seconds:60},
   {bucket:{op:'owner-simli-start-day'},limit:2,seconds:86400},
  ])})
  return json(result)
 }catch(e){return json({error:e?.code==='RATE_LIMITED'?'RATE_LIMITED':e?.message==='CAPTURE_NOT_APPROVED'?'CAPTURE_NOT_APPROVED':'CAPTURE_ATTEMPT_LOCKED'},e?.code==='RATE_LIMITED'?429:409)}
}
