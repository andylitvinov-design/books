import {NextResponse} from 'next/server'
import {getAppConfig,requestOrigin,requireSameOrigin} from '@/lib/app/config'
import {PRIVATE_HEADERS,readBody,safeError} from '@/lib/app/http'
import {telegramClientLinkReady,telegramClientBotUsername} from '@/lib/app/client-telegram-policy'
import {guestTelegramIpBucket} from '@/lib/app/telegram-guest-news-policy'
import {createGuestNewsLink,guestNewsStatus} from '@/lib/app/telegram-guest-news'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export const preferredRegion='yul1'

const COOKIE='hh_tg_guest_news_v1'
const reply=(value,status=200)=>NextResponse.json(value,{status,headers:PRIVATE_HEADERS})

/** Returns only one of five non-identifying subscription statuses. The raw
 * token lives in a 15-minute HttpOnly same-site cookie and is never logged.
 */
export async function GET(request){
 try{
  const config=getAppConfig()
  requestOrigin(request,config)
  const token=request.cookies.get(COOKIE)?.value
  const status=token?await guestNewsStatus(config,token):'not_requested'
  return reply({status,available:telegramClientLinkReady(),
    botUsername:telegramClientLinkReady()?telegramClientBotUsername():null})
 }catch(error){
  const safe=safeError(error)
  return reply({error:safe.code,available:false},safe.status)
 }
}
export async function POST(request){
 try{
  const config=getAppConfig()
  requireSameOrigin(request,config)
  const input=await readBody(request,512)
  const ip=guestTelegramIpBucket(
    request.headers.get('x-vercel-forwarded-for')||
    request.headers.get('x-forwarded-for'))
  const result=await createGuestNewsLink(config,input,ip)
  const response=reply({status:'pending',linkUrl:result.linkUrl,expiresInMinutes:15})
  response.cookies.set(COOKIE,result.token,{
   path:'/api/public/telegram-subscribe',httpOnly:true,
   secure:process.env.NODE_ENV!=='development',sameSite:'lax',maxAge:900,
  })
  return response
 }catch(error){
  const safe=safeError(error)
  return reply({error:safe.code},safe.status)
 }
}
