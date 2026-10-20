import 'server-only'
import {randomUUID} from 'node:crypto'
import {transaction} from '../app/database.js'
import {getTorontoCompletedPeriod} from './daily-digest.mjs'
import {practiceTelegramConfigured} from './daily-telegram-transport.mjs'
import {sendOwnerDocument} from './telegram-hub.mjs'
import {fetchPublicCouncilReports} from './council-telegram-archive.mjs'

async function claim(config,item){
  const id=randomUUID()
  return transaction(config,null,async db=>{
    const saved=await db.query(
      "insert into app_private.council_telegram_deliveries "+
      "(report_day,archive_comment_id,status,claim_token,attempts,claimed_at) "+
      "values($1::date,$2,'sending',$3,1,now()) "+
      "on conflict (report_day) do update set "+
      "status='sending', archive_comment_id=excluded.archive_comment_id, "+
      "claim_token=excluded.claim_token, "+
      "attempts=app_private.council_telegram_deliveries.attempts+1, claimed_at=now() "+
      "where app_private.council_telegram_deliveries.status='failed' "+
      "or (app_private.council_telegram_deliveries.status='sending' "+
      "and app_private.council_telegram_deliveries.claimed_at<now()-interval '15 minutes') "+
      "returning claim_token",
      [item.date,item.id,id])
    return saved.rowCount?id:null
  },{server:true})
}
async function finish(config,date,claimToken,ok){
  return transaction(config,null,async db=>{
    const result=await db.query(
      "update app_private.council_telegram_deliveries "+
      "set status=$3,completed_at=case when $3='accepted' then now() else null end "+
      "where report_day=$1::date and claim_token=$2 and status='sending' "+
      "returning claim_token",[date,claimToken,ok?'accepted':'failed'])
    return result.rowCount===1
  },{server:true})
}
export async function deliverArchivedCouncilReports(config,{
  env=process.env,now=new Date(),fetcher=fetch
}={}){
  if(!practiceTelegramConfigured(env))return {status:'disabled'}
  const dates=getTorontoCompletedPeriod(now)
  const reports=await fetchPublicCouncilReports({
    today:dates.today,earliest:dates.weekStart
  },fetcher)
  if(!reports.length)return {status:'no_archived_reports',date:dates.today}
  let accepted=0,previouslySent=0
  // Process at most 2 messages per invocation, preserving Vercel Hobby execution time.
  for(const report of reports.slice(-2)){
    const claimToken=await claim(config,report)
    if(!claimToken){previouslySent++;continue}
    try{
      await sendOwnerDocument({
        mode:'report',
        title:'AI Council '+report.date,
        markdown:report.markdown,
        sources:['GitHub public archive #242','Gemini/Mistral/Muse attribution in report'],
      },env,fetcher)
      const successful=await finish(config,report.date,claimToken,true)
      if(!successful)throw Error('COUNCIL_DELIVERY_RECEIPT_FAILED')
    }catch(e){
      await finish(config,report.date,claimToken,false).catch(()=>{})
      throw e
    }
    accepted++
  }
  return {status:accepted?'accepted':'already_claimed',accepted,previouslySent,date:dates.today}
}
