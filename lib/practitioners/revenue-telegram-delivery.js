import 'server-only'
import {randomUUID} from 'node:crypto'
import {transaction} from '../app/database.js'
import {getTorontoCompletedPeriod} from './daily-digest.mjs'
import {practiceTelegramConfigured} from './daily-telegram-transport.mjs'
import {fetchPublicRevenueReports} from './council-telegram-archive.mjs'
import {sendOwnerDocument} from './telegram-hub.mjs'

// Private, single-owner per-day ledger. No Telegram token, private user data or
// client records are stored in this table or in public GitHub.
async function claim(config,report){
  const id=randomUUID()
  const claimed=await transaction(config,null,async db=>(await db.query(
    `insert into app_private.owner_daily_revenue_sends
       (report_day,archive_comment_id,status,claim_token,attempts,claimed_at)
     values($1::date,$2,'sending',$3,1,now())
     on conflict(report_day) do update
       set status='sending',archive_comment_id=excluded.archive_comment_id,
           claim_token=excluded.claim_token,
           attempts=app_private.owner_daily_revenue_sends.attempts+1,
           claimed_at=now()
       where app_private.owner_daily_revenue_sends.status='failed'
         or (app_private.owner_daily_revenue_sends.status='sending'
           and app_private.owner_daily_revenue_sends.claimed_at<now()-interval '15 minutes')
     returning claim_token`,
    [report.date,report.id,id])).rowCount===1,{server:true})
  return claimed?id:null
}
async function finish(config,date,claimToken,ok){
  return transaction(config,null,async db=>(await db.query(
    `update app_private.owner_daily_revenue_sends
       set status=$3,completed_at=case when $3='accepted' then now() else null end
       where report_day=$1::date and claim_token=$2 and status='sending'
       returning claim_token`,[date,claimToken,ok?'accepted':'failed']
  )).rowCount===1,{server:true})
}
export async function deliverDailyRevenueIdeas(config,{env=process.env,now=new Date(),fetcher=fetch}={}){
  if(!practiceTelegramConfigured(env))return {status:'disabled'}
  const dates=getTorontoCompletedPeriod(now)
  const reports=await fetchPublicRevenueReports({today:dates.today,earliest:dates.today},fetcher)
  const report=reports.find(x=>x.date===dates.today)
  if(!report)return {status:'not_yet_archived',date:dates.today}
  const token=await claim(config,report)
  if(!token)return {status:'already_claimed',date:dates.today}
  try{
    await sendOwnerDocument({
      mode:'report',title:'09:00 · 5 идей для роста выручки · '+dates.today,
      markdown:report.markdown,
      sources:['GitHub #242 / verified owner archive']
    },env,fetcher)
    if(!await finish(config,dates.today,token,true))
      throw Error('REVENUE_TELEGRAM_RECEIPT_FAILED')
    return {status:'accepted',date:dates.today}
  }catch(error){
    await finish(config,dates.today,token,false).catch(()=>{})
    throw error
  }
}
