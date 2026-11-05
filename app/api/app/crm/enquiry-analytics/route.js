import {NextResponse} from 'next/server'
import {getAppConfig,requestOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {transaction} from '@/lib/app/database'
import {practitionerEmailAllowed} from '@/lib/app/practitioner-access'
import {PRIVATE_HEADERS,safeError} from '@/lib/app/http'
import {AppError} from '@/lib/assessments/contracts'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0

const PERIODS=Object.freeze({day:1,week:7,month:30})
const sourceSql=`case when (e.attribution->>'trafficSource') ~ '^[a-z0-9_-]{1,32}$'
  then e.attribution->>'trafficSource' else 'unknown' end`
const serviceSql=`case when char_length(e.service_title) between 1 and 160
  then e.service_title else 'Unspecified service' end`
const ownerWhere=`from app.public_service_enquiries e
  join app.practitioners p on p.id=e.recipient_practitioner_id
  where p.trusted_auth_user_id=$1 and p.active
    and p.status in ('approved','submitted','changes_requested')
    and e.created_at >= now()-make_interval(days=>$2::int)`

export async function GET(request){
  let auth
  try{
    const config=getAppConfig()
    requestOrigin(request,config)
    auth=createRequestAuth(request,config)
    const actor=await auth.verified()
    if(request.headers.get('x-hh-account-id')!==actor.id)
      throw new AppError('ACCOUNT_CHANGED',409)
    if(!practitionerEmailAllowed(actor))
      throw new AppError('ACCESS_DENIED',403)
    const url=new URL(request.url)
    if([...url.searchParams.keys()].some(key=>key!=='period')||
       url.searchParams.getAll('period').length!==1)
      throw new AppError('INVALID_PERIOD',400)
    const period=url.searchParams.get('period')
    const days=PERIODS[period]
    if(!days)throw new AppError('INVALID_PERIOD',400)
    const result=await transaction(config,actor,async db=>{
      // Owner-signed session and ordinary owner RLS remain authoritative.
      // Return aggregate counters only; never select encrypted contact,
      // description, client identity, source query strings or IP address.
      const [totals,sources,services,pages]=await Promise.all([
        db.query(`select count(*)::int as total,
          count(*) filter(where e.status='requested')::int as awaiting,
          count(*) filter(where e.status='contacted')::int as contacted,
          count(*) filter(where e.status='booked')::int as booked,
          count(*) filter(where e.status='closed')::int as closed,
          count(*) filter(where e.contact_ciphertext is not null)::int as contact_supplied,
          count(*) filter(where e.telegram_thread_id is not null)::int as telegram_linked,
          count(*) filter(where e.contact_ciphertext is not null and e.telegram_thread_id is null)::int as contact_without_linked_telegram,
          count(*) filter(where e.attribution is null)::int as unattributed
          ${ownerWhere}`,[actor.id,days]),
        db.query(`select ${sourceSql} as name,count(*)::int as count
          ${ownerWhere} group by 1 order by count desc,name asc limit 12`,[actor.id,days]),
        db.query(`select ${serviceSql} as name,count(*)::int as count
          ${ownerWhere} group by 1 order by count desc,name asc limit 12`,[actor.id,days]),
        db.query(`select e.source_path as name,count(*)::int as count
          ${ownerWhere} group by 1 order by count desc,name asc limit 12`,[actor.id,days]),
      ])
      const sum=totals.rows[0]||{}
      const cleanCount=value=>Number.isInteger(Number(value))&&Number(value)>=0?Number(value):0
      const aggregate=rows=>rows.map(row=>({name:String(row.name||'unknown').slice(0,160),count:cleanCount(row.count)}))
      return {period,scope:'all_authorized_public_service_enquiries',
        total:cleanCount(sum.total),awaitingFirstAction:cleanCount(sum.awaiting),
        contacted:cleanCount(sum.contacted),booked:cleanCount(sum.booked),
        closed:cleanCount(sum.closed),contactSupplied:cleanCount(sum.contact_supplied),
        telegramLinked:cleanCount(sum.telegram_linked),
        contactWithoutLinkedTelegram:cleanCount(sum.contact_without_linked_telegram),
        unattributed:cleanCount(sum.unattributed),
        bySource:aggregate(sources.rows),byService:aggregate(services.rows),
        byPage:aggregate(pages.rows),firstResponseMinutes:null}
    })
    return auth.apply(NextResponse.json(result,{headers:PRIVATE_HEADERS}))
  }catch(error){
    const safe=safeError(error)
    const response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
    return auth?auth.apply(response):response
  }
}
