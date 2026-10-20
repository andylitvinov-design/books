import 'server-only'
import {randomUUID} from 'node:crypto'
import {transaction} from '../app/database.js'
import {PRACTITIONER_ID} from '../../data/app-services.js'
import {getTorontoCompletedPeriod,makePracticeDigest} from './daily-digest.mjs'
import {practiceTelegramConfigured,telegramSendMessage} from './daily-telegram-transport.mjs'

const SLUG='andy-litvinov'
export async function loadPracticeDigest(config,at=new Date()){
  const dates=getTorontoCompletedPeriod(at)
  return transaction(config,null,async db=>{
    const practitioner=(await db.query(
      "select id from app.practitioners where id=$1 and slug=$2 and status='approved' and active limit 1",
      [PRACTITIONER_ID,SLUG])).rows[0]
    if(!practitioner)throw Error('TARGET_PRACTITIONER_NOT_VERIFIED')
    const id=practitioner.id
    const services=(await db.query(
      'select id,slug,localized_copy,status,active from app.service_offerings where practitioner_id=$1 order by id',
      [id])).rows
    const daily=(await db.query(
      `select f.service_id as "serviceId", f.day::text as day,
        f.impressions, f.order_clicks as orders, f.whatsapp_clicks as whatsapp,
        f.telegram_clicks as telegram
        from app_private.service_funnel_daily f
        join app.service_offerings s on s.id=f.service_id
        where s.practitioner_id=$1 and f.day>=$2::date and f.day<=$3::date`,
      [id,dates.weekStart,dates.yesterday])).rows
    const leads=(await db.query(
      `select
        (select count(*)::int from app.consultation_requests r
          where r.recipient_practitioner_id=$1 and (r.created_at at time zone 'America/Toronto')::date=$2::date) as "newApp",
        (select count(*)::int from app.public_service_enquiries e
          where e.recipient_practitioner_id=$1 and (e.created_at at time zone 'America/Toronto')::date=$2::date) as "newPublic",
        (select count(*)::int from app.consultation_requests r
          where r.recipient_practitioner_id=$1 and r.status in ('requested','contacted')) as "openApp",
        (select count(*)::int from app.public_service_enquiries e
          where e.recipient_practitioner_id=$1 and e.status in ('requested','contacted')) as "openPublic"`,
      [id,dates.yesterday])).rows[0]||{}
    const counts={...leads,
      published:services.filter(s=>s.active&&s.status==='published').length,
      pending:services.filter(s=>s.status==='submitted').length}
    const publiclyNamedServices=services.map(s=>({
      id:s.id,slug:s.slug,copy:{title:
        s.localized_copy?.ru?.title||s.localized_copy?.en?.title||s.slug}
    }))
    return makePracticeDigest({dates,services:publiclyNamedServices,daily,counts})
  },{server:true})
}

// Single-master daily claim. A second concurrent cron/HTTP invocation cannot send
// the same date while the first claim is held. Crashes may be retried after lease expiry.
export async function claimDailyDelivery(config,reportDate){
  const claimId=randomUUID()
  return transaction(config,null,async db=>{
    const result=await db.query(
      `insert into app_private.practitioner_daily_digest_sends
        (practitioner_id,report_day,status,attempts,claim_token,claimed_at)
       values($1,$2::date,'sending',1,$3,now())
       on conflict (practitioner_id,report_day) do update
         set status='sending',
             attempts=app_private.practitioner_daily_digest_sends.attempts+1,
             claim_token=excluded.claim_token,claimed_at=now()
       where app_private.practitioner_daily_digest_sends.status='failed'
          or (app_private.practitioner_daily_digest_sends.status='sending'
              and app_private.practitioner_daily_digest_sends.claimed_at<now()-interval '15 minutes')
       returning claim_token`,
      [PRACTITIONER_ID,reportDate,claimId])
    return result.rowCount?claimId:null
  },{server:true})
}
export async function finishDailyDelivery(config,reportDate,claimId,success){
  return transaction(config,null,async db=>{
    const result=await db.query(
      `update app_private.practitioner_daily_digest_sends
        set status=$4,completed_at=case when $4='accepted' then now() else null end
       where practitioner_id=$1 and report_day=$2::date and claim_token=$3
       and status='sending' returning claim_token`,
      [PRACTITIONER_ID,reportDate,claimId,success?'accepted':'failed'])
    return result.rowCount===1
  },{server:true})
}
export async function deliverDailyPracticeDigest(config,{
  env=process.env,at=new Date(),fetcher=fetch
}={}){
  if(!practiceTelegramConfigured(env))return {status:'disabled'}
  const report=await loadPracticeDigest(config,at)
  const claim=await claimDailyDelivery(config,report.date)
  if(!claim)return {status:'already_claimed',date:report.date}
  let success=false
  try{
    await telegramSendMessage(report.text,env,fetcher)
    success=await finishDailyDelivery(config,report.date,claim,true)
    if(!success)throw Error('DELIVERY_RECEIPT_FAILED')
  }catch(error){
    await finishDailyDelivery(config,report.date,claim,false).catch(()=>{})
    throw error
  }
  return {status:'accepted',date:report.date}
}
