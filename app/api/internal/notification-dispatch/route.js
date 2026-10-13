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
  const supplied=Buffer.from(request.headers.get('authorization')||'')
  return [env.HH_PUSH_CRON_SECRET,env.CRON_SECRET].some(secret=>{
    if(typeof secret!=='string'||secret.length<32)return false
    const expected=Buffer.from('Bearer '+secret)
    return supplied.length===expected.length&&timingSafeEqual(supplied,expected)
  })
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
