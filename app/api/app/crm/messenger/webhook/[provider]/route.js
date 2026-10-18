import { NextResponse } from 'next/server'
import { getAppConfig } from '@/lib/app/config'
import { PRIVATE_HEADERS, safeError } from '@/lib/app/http'
import { MESSENGER_CHANNELS } from '@/lib/crm/messenger-policy'
import { verifyMessengerWebhook,verifyMessengerChallenge,normalizeMessengerUpdates,ingestMessengerUpdate } from '@/lib/crm/messenger-webhook'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
const rejected=()=>new NextResponse('Unauthorized',{status:401,headers:PRIVATE_HEADERS})
export async function GET(request,{params}){
  const {provider}=await params
  if(!MESSENGER_CHANNELS.includes(provider))return new NextResponse('Not Found',{status:404})
  const challenge=verifyMessengerChallenge(provider,request.url)
  return challenge===null?rejected():new NextResponse(challenge,{status:200,headers:{'Cache-Control':'no-store','Content-Type':'text/plain; charset=utf-8'}})
}
export async function POST(request,{params}){
  const {provider}=await params
  if(!MESSENGER_CHANNELS.includes(provider))return new NextResponse('Not Found',{status:404})
  let raw
  try{
    const length=Number(request.headers.get('content-length')||0)
    if(length>65536)return new NextResponse('Payload too large',{status:413})
    const data=await request.arrayBuffer()
    if(data.byteLength>65536)return new NextResponse('Payload too large',{status:413})
    raw=Buffer.from(data)
  }catch{return new NextResponse('Invalid body',{status:400})}
  if(!verifyMessengerWebhook(provider,raw,request.headers))return rejected()
  try{
    const config=getAppConfig()
    const body=JSON.parse(raw.toString('utf8'))
    const updates=normalizeMessengerUpdates(provider,body)
    for(const event of updates)await ingestMessengerUpdate(provider,event,config)
    return NextResponse.json({ok:true},{headers:PRIVATE_HEADERS})
  }catch(error){
    const safe=safeError(error)
    return NextResponse.json({ok:false},{status:safe.status>=500?503:400,headers:PRIVATE_HEADERS})
  }
}
