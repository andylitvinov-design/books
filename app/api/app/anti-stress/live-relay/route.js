import {NextResponse} from 'next/server'
import {experimental_upgradeWebSocket} from '@vercel/functions'
import WebSocket from 'ws'
import {getAppConfig} from '@/lib/app/config'
import {PRIVATE_HEADERS} from '@/lib/app/http'
import {AppError} from '@/lib/assessments/contracts'
import {prepareAntiStressLiveUpgrade} from '@/lib/app/anti-stress-live-upgrade.js'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export const preferredRegion='yul1'
// Same guarded hosting budget as Clarity; not a logical session limit.
export const maxDuration=800
export async function GET(request){
 try{
  const prepared=await prepareAntiStressLiveUpgrade(request,getAppConfig(),{
   segmentDeadlineMs:Date.now()+770000,
   createProviderSocket:url=>new WebSocket(url,{handshakeTimeout:12000,maxPayload:400000,perMessageDeflate:false,followRedirects:false})
  })
  return experimental_upgradeWebSocket(client=>{try{prepared.attach(client)}catch{try{client.close(1008,'entry rejected')}catch{}}})
 }catch(error){
  const safe=error instanceof AppError?{code:error.code,status:error.status}:{code:'ANTI_STRESS_UNAVAILABLE',status:503}
  return NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
 }
}
