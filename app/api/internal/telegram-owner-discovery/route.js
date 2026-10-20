import {NextResponse} from 'next/server'
import {cronAuthorized} from '@/lib/app/housekeeping-cron'
import {PRIVATE_HEADERS} from '@/lib/app/http'
import {discoverOwnerPrivateChat} from '@/lib/practitioners/telegram-owner-discovery.mjs'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export const maxDuration=30
const reply=(body,status=200)=>NextResponse.json(body,{status,headers:PRIVATE_HEADERS})

// One-time operator-only pairing check. Protected by existing Vercel CRON_SECRET.
// Does not acknowledge Telegram updates, modify any webhook, send a message or
// disclose token/update contents. Only authorized operator can see numeric chat ID.
export async function GET(request){
  if(!cronAuthorized(request,process.env))
    return reply({error:'UNAUTHORIZED'},401)
  if(process.env.VERCEL_ENV==='preview')
    return reply({error:'NOT_AVAILABLE'},404)
  const result=await discoverOwnerPrivateChat(process.env)
  if(result.status==='verified')
    return reply({status:'verified',chat_id:result.chatId})
  return reply({status:result.status})
}
