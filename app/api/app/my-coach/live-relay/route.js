import {NextResponse} from 'next/server'
import {experimental_upgradeWebSocket} from '@vercel/functions'
import WebSocket from 'ws'
import {getAppConfig} from '@/lib/app/config'
import {PRIVATE_HEADERS} from '@/lib/app/http'
import {AppError} from '@/lib/assessments/contracts'
import {prepareClarityLiveUpgrade} from '@/lib/app/clarity-live-upgrade.js'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export const preferredRegion='yul1'
// Conservative compatible segment limit, not the logical 20-minute limit.
// A later connection must resume the same persisted run after explicit consent.
export const maxDuration=300

export async function GET(request){
 // Reserve 30 seconds before the platform's hard limit for closing sockets
 // and durably stopping the segment. The logical course clock never resets.
 const segmentDeadlineMs=Date.now()+270000
 try{
  // Verify origin, deployment veto and the signed-in owner before upgrading.
  const prepared=await prepareClarityLiveUpgrade(request,getAppConfig(),{
   segmentDeadlineMs,
   createProviderSocket:url=>new WebSocket(url,{handshakeTimeout:12000,maxPayload:400000,perMessageDeflate:false,followRedirects:false})
  })
  return experimental_upgradeWebSocket(client=>{
   // Install the first-frame listener synchronously inside the upgrade callback.
   try{prepared.attach(client)}catch{try{client.close(1008,'entry rejected')}catch{}}
  })
 }catch(error){
  // Never log a socket URL, token, cookie, provider reply or raw exception.
  const safe=error instanceof AppError?{code:error.code,status:error.status}:{code:'CLARITY_COURSE_UNAVAILABLE',status:503}
  return NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
 }
}
