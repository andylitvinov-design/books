import 'server-only'
import {randomUUID} from 'node:crypto'
import {transaction} from '../app/database.js'
import {getTorontoCompletedPeriod} from './daily-digest.mjs'
import {practiceTelegramConfigured} from './daily-telegram-transport.mjs'
import {fetchPublicMarketIntelligenceReports} from './council-telegram-archive.mjs'
import {sendOwnerDocument} from './telegram-hub.mjs'

// Same trusted owner-only transport as the existing 09/12/15 reports.
// Distinct private ledger prevents repeated Telegram sends and never stores
// bot tokens, customer data or the text of publicly archived reports.
// Fail closed: an ambiguous timeout is NOT permission to retry sending.
// Manual provider reconciliation is required before any operator recovery.
async function claim(config,report){
  const id=randomUUID()
  const claimed=await transaction(config,null,async db=>(await db.query(
    `insert into app_private.owner_daily_market_intelligence_sends
       (report_day,archive_comment_id,status,claim_token,attempts,claimed_at)
     values($1::date,$2,'sending',$3,1,now())
     -- Telegram send may have succeeded even if its HTTP reply was lost.
     -- Keep a durable once-per-day claim; never auto-retry uncertain sends.
     on conflict(report_day) do nothing
     returning claim_token`,
    [report.date,report.id,id])).rowCount===1,{server:true})
  return claimed?id:null
}
async function finish(config,date,claimToken,ok){
  return transaction(config,null,async db=>(await db.query(
    `update app_private.owner_daily_market_intelligence_sends
       set status=$3,completed_at=case when $3='accepted' then now() else null end
       where report_day=$1::date and claim_token=$2 and status='sending'
       returning claim_token`,
    [date,claimToken,ok?'accepted':'failed']
  )).rowCount===1,{server:true})
}
export async function deliverDailyMarketIntelligence(config,{
  env=process.env,now=new Date(),fetcher=fetch
}={}){
  if(!practiceTelegramConfigured(env))return {status:'disabled'}
  const {today}=getTorontoCompletedPeriod(now)
  const reports=await fetchPublicMarketIntelligenceReports({today,earliest:today},fetcher)
  const report=reports.find(entry=>entry.date===today)
  if(!report)return {status:'not_yet_archived',date:today}
  const token=await claim(config,report)
  if(!token)return {status:'already_claimed',date:today}
  try{
    await sendOwnerDocument({
      mode:'report',
      title:'14:00 · Анализ рынка и 5 приоритетов · '+today,
      markdown:report.markdown,
      sources:['GitHub #242 / owner-approved market archive']
    },env,fetcher)
    if(!await finish(config,today,token,true))
      throw Error('MARKET_INTELLIGENCE_TELEGRAM_RECEIPT_FAILED')
    return {status:'accepted',date:today}
  }catch(error){
    await finish(config,today,token,false).catch(()=>{})
    throw error
  }
}
