import 'server-only'
import {randomUUID} from 'node:crypto'
import {transaction} from '../app/database.js'
import {getTorontoCompletedPeriod} from './daily-digest.mjs'
import {practiceTelegramConfigured} from './daily-telegram-transport.mjs'
import {sendOwnerDocument} from './telegram-hub.mjs'
import {fetchPublicCouncilReports} from './council-telegram-archive.mjs'
import {reviewDailyCouncil,composeDailyCouncilTelegram,modelSettings} from './council-free-models.mjs'

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
      "returning claim_token,report_markdown,model_outcomes",
      [item.date,item.id,id])
    return saved.rowCount?{
      id,markdown:saved.rows[0].report_markdown,
      outcomes:saved.rows[0].model_outcomes
    }:null
  },{server:true})
}
// Save one complete analysis BEFORE delivery. Failed Telegram retries reuse it
// rather than consuming free model quotas for a second time.
async function saveModelReport(config,date,claimToken,report){
  return transaction(config,null,async db=>{
    const saved=await db.query(
      'update app_private.council_telegram_deliveries '+
      'set report_markdown=$3,model_outcomes=$4::jsonb '+
      "where report_day=$1::date and claim_token=$2 and status='sending' "+
      'and report_markdown is null returning claim_token',
      [date,claimToken,report.markdown,JSON.stringify(report.outcomes)]
    )
    return saved.rowCount===1
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
  // A daily "Gemini + Mistral" digest is NOT a real model report unless
  // both provider credentials exist and Google's Free Tier was explicitly
  // confirmed. Do not claim/mark the date accepted for a bare HTML summary.
  const settings=modelSettings(env)
  if(!settings.geminiKeyPresent||!settings.geminiFreeConfirmed||
      !settings.mistralKeyPresent)
    return {status:'model_setup_required',date:dates.today,
      gemini:settings.geminiKeyPresent&&settings.geminiFreeConfirmed?'ready':'not_configured',
      mistral:settings.mistralKeyPresent?'ready':'not_configured'}
  const reports=await fetchPublicCouncilReports({
    today:dates.today,earliest:dates.weekStart
  },fetcher)
  if(!reports.length)return {status:'no_archived_reports',date:dates.today}
  let previouslySent=0
  // Newest public report first. One delivery per invocation so Gemini and
  // Mistral can run concurrently within one bounded serverless window.
  for(const report of [...reports].reverse()){
    const claimed=await claim(config,report)
    if(!claimed){previouslySent++;continue}
    try{
      let markdown=claimed.markdown
      let outcomes=claimed.outcomes||{}
      let sources=['GitHub public HTML/HTTP archive #242']
      if(!markdown){
        const reviews=await reviewDailyCouncil(report,env,fetcher)
        // Provider outages, 401/429, or no current $0 Mistral models must
        // never result in another empty NOT_AVAILABLE Telegram report.
        // Leave today's claim retryable, with no false "accepted" receipt.
        if(reviews.gemini.status!=='ok'&&reviews.mistral.status!=='ok'){
          await finish(config,report.date,claimed.id,false)
          return {status:'model_responses_unavailable',date:report.date,
            gemini:reviews.gemini.status,mistral:reviews.mistral.status}
        }
        const composed=composeDailyCouncilTelegram(report,reviews)
        markdown=composed.markdown
        outcomes=composed.outcomes
        sources=composed.sources
        if(!await saveModelReport(config,report.date,claimed.id,composed))
          throw Error('COUNCIL_REVIEW_CACHE_FAILED')
      }else{
        // The exact cached analysis is re-sent. Never call models on retry.
        sources.push(...Object.entries(outcomes)
          .filter(([,status])=>status==='ok').map(([name])=>'real:'+name))
      }
      await sendOwnerDocument({
        mode:'report',title:'Публичный аудит сайта '+report.date,
        markdown,sources
      },env,fetcher)
      const accepted=await finish(config,report.date,claimed.id,true)
      if(!accepted)throw Error('COUNCIL_DELIVERY_RECEIPT_FAILED')
      return {status:'accepted',accepted:1,previouslySent,
        gemini:outcomes.gemini||'unavailable',
        mistral:outcomes.mistral||'unavailable',date:report.date}
    }catch(e){
      await finish(config,report.date,claimed.id,false).catch(()=>{})
      throw e
    }
  }
  return {status:'already_claimed',accepted:0,previouslySent,date:dates.today}
}
