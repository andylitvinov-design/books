import {timingSafeEqual} from 'node:crypto'
import {NextResponse} from 'next/server'
import {getAppConfig} from '@/lib/app/config'
import {closeDatabase} from '@/lib/app/database'
import {PRIVATE_HEADERS} from '@/lib/app/http'
import {dispatchCourseReminders} from '@/lib/app/notification-dispatch'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export const maxDuration=60
function authorized(request,env) {
  if(!env.CRON_SECRET)return false
  const supplied=Buffer.from(request.headers.get('authorization')||'')
  const expected=Buffer.from('Bearer '+env.CRON_SECRET)
  return supplied.length===expected.length&&timingSafeEqual(supplied,expected)
}
export async function GET(request) {
  if(!authorized(request,process.env))
    return NextResponse.json({error:'UNAUTHORIZED'},{status:401,headers:PRIVATE_HEADERS})
  try{
    const config=getAppConfig()
    const summary=await dispatchCourseReminders(config)
    return NextResponse.json({status:'completed',...summary},{headers:PRIVATE_HEADERS})
  }catch{
    return NextResponse.json({error:'PUSH_DISPATCH_UNAVAILABLE'},{status:503,headers:PRIVATE_HEADERS})
  }finally{
    await closeDatabase()
  }
}
