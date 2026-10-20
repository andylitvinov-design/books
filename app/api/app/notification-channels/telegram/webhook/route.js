import {NextResponse} from 'next/server'
import {getAppConfig} from '@/lib/app/config'
import {PRIVATE_HEADERS} from '@/lib/app/http'
import {verifyClientTelegramSecret} from '@/lib/app/client-telegram-policy'
import {receiveClientTelegramWebhook} from '@/lib/app/client-telegram-webhook'
import {receiveOwnerAiTelegramWebhook} from '@/lib/practitioners/owner-ai-telegram-service'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export const maxDuration=60

export async function POST(request){
 if(!verifyClientTelegramSecret(request.headers.get('x-telegram-bot-api-secret-token')))
  return new NextResponse('Unauthorized',{status:401,headers:PRIVATE_HEADERS})
 if(Number(request.headers.get('content-length')||0)>8192)
  return new NextResponse('Too large',{status:413,headers:PRIVATE_HEADERS})
 let update
 try{
  const payload=await request.arrayBuffer()
  if(payload.byteLength>8192)return new NextResponse('Too large',{status:413,headers:PRIVATE_HEADERS})
  update=JSON.parse(Buffer.from(payload).toString('utf8'))
 }catch{return new NextResponse('Invalid update',{status:400,headers:PRIVATE_HEADERS})}
 try{
  const config=getAppConfig()
  const owner=await receiveOwnerAiTelegramWebhook(config,update)
  if(!owner.handled)await receiveClientTelegramWebhook(config,update)
  // No account existence, token status, or chat ID is returned to Telegram.
  return NextResponse.json({ok:true},{headers:PRIVATE_HEADERS})
 }catch{
  // Telegram may retry only if the server couldn't commit; link token is one-use.
  return NextResponse.json({ok:false},{status:503,headers:PRIVATE_HEADERS})
 }
}
export async function GET(){
 return new NextResponse('Not Found',{status:404,headers:PRIVATE_HEADERS})
}
