import {NextResponse} from 'next/server'
import {getAppConfig} from '@/lib/app/config'
import {closeDatabase} from '@/lib/app/database'
import {cronAuthorized} from '@/lib/app/housekeeping-cron'
import {PRIVATE_HEADERS} from '@/lib/app/http'
import {ensureOwnerTelegramPairing} from '@/lib/practitioners/telegram-owner-pairing'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export const maxDuration=30
const reply=(body,status=200)=>NextResponse.json(body,{status,headers:PRIVATE_HEADERS})

// Authenticated read-only Telegram discovery; the only DB mutation is the
// encrypted owner-only verified chat pair. Never returns numeric IDs to callers.
export async function GET(request){
  if(!cronAuthorized(request,process.env))
    return reply({error:'UNAUTHORIZED'},401)
  if(process.env.VERCEL_ENV==='preview')
    return reply({error:'NOT_AVAILABLE'},404)
  if(!process.env.HH_PRACTICE_TG_BOT_TOKEN)
    return reply({status:'token_missing'})
  try{
    return reply(await ensureOwnerTelegramPairing(getAppConfig()))
  }catch{
    return reply({error:'PAIRING_UNAVAILABLE'},503)
  }finally{
    await closeDatabase()
  }
}
