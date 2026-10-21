import 'server-only'
import {randomUUID} from 'node:crypto'
import {transaction} from '../app/database.js'
import {getTorontoCompletedPeriod} from './daily-digest.mjs'
import {practiceTelegramConfigured} from './daily-telegram-transport.mjs'
import {sendOwnerDocument} from './telegram-hub.mjs'
import {fetchPublicDailyArchives} from './council-telegram-archive.mjs'
import {composeChatgptTelegramReport} from './chatgpt-telegram-report.mjs'
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
// One existing 21:00 UTC cron handles the 12:00 Toronto ChatGPT report
// AND (only if verified free provider credentials exist) Council reviews.
// The private per-date receipt prevents two Telegram files on the same day.
export async function deliverArchivedCouncilReports(config,{
  env=process.env,now=new Date(),fetcher=fetch
}={}){
  if(!practiceTelegramConfigured(env))return {status:'disabled'}
  const dates=getTorontoCompletedPeriod(now)
  const archives=await fetchPublicDailyArchives({
    today:dates.today,earliest:dates.weekStart
  },fetcher)
  const settings=modelSettings(env)
  const modelsReady=settings.geminiKeyPresent&&
    settings.geminiFreeConfirmed&&settings.mistralKeyPresent
  const byDay=new Map()
  for(const item of archives.council){
    const prior=byDay.get(item.date)||{date:item.date}
    prior.council=item
    byDay.set(item.date,prior)
  }
  for(const item of archives.chatgpt){
    const prior=byDay.get(item.date)||{date:item.date}
    prior.chatgpt=item
    byDay.set(item.date,prior)
  }
  const reports=[...byDay.values()]
    .sort((a,b)=>b.date.localeCompare(a.date))
    .filter(entry=>entry.chatgpt||modelsReady&&entry.council)
  // A lone old HTML archive is not a model response, and must not become
  // a misleading Telegram attachment when provider checks are not ready.
  if(!reports.length&&!modelsReady)
    return {status:'model_setup_required',date:dates.today,
      chatgpt:'not_yet_archived',
      gemini:settings.geminiKeyPresent&&settings.geminiFreeConfirmed?'ready':'not_configured',
      mistral:settings.mistralKeyPresent?'ready':'not_configured'}
  if(!reports.length)return {status:'no_archived_reports',date:dates.today}
  let previouslySent=0
  // One delivery per invocation; owner ChatGPT report always wins over a
  // separate HTML-only source. Retry reuses the saved Markdown, not API calls.
  for(const entry of reports){
    const report=entry.council||entry.chatgpt
    const claimed=await claim(config,{date:entry.date,id:report.id})
    if(!claimed){previouslySent++;continue}
    try{
      let markdown=claimed.markdown
      let outcomes=claimed.outcomes||{}
      let sources=['GitHub public HTML/HTTP archive #242']
      if(!markdown){
        let councilReview=null
        if(entry.council&&modelsReady){
          const reviews=await reviewDailyCouncil(report,env,fetcher)
          if(reviews.gemini.status==='ok'||reviews.mistral.status==='ok')
            councilReview=composeDailyCouncilTelegram(report,reviews)
          else if(!entry.chatgpt){
            await finish(config,entry.date,claimed.id,false)
            return {status:'model_responses_unavailable',date:entry.date,
              gemini:reviews.gemini.status,mistral:reviews.mistral.status}
          }
        }
        const composed=entry.chatgpt
          ?composeChatgptTelegramReport(entry.chatgpt,{councilReview})
          :councilReview
        if(!composed)throw Error('NO_VERIFIED_DAILY_REPORT')
        markdown=composed.markdown
        outcomes=composed.outcomes
        sources=composed.sources
        if(!await saveModelReport(config,entry.date,claimed.id,composed))
          throw Error('COUNCIL_REVIEW_CACHE_FAILED')
      }else{
        sources=outcomes.chatgpt==='ok'
          ?['ChatGPT daily audit Issue #242']
          :['GitHub public HTML/HTTP archive #242']
        sources.push(...Object.entries(outcomes)
          .filter(([name,status])=>['gemini','mistral'].includes(name)&&status==='ok')
          .map(([name])=>'real:'+name))
      }
      await sendOwnerDocument({
        mode:'report',
        title:(outcomes.chatgpt==='ok'?'Ежедневный аудит ChatGPT ':'Публичный аудит сайта ')+entry.date,
        markdown,sources
      },env,fetcher)
      const accepted=await finish(config,entry.date,claimed.id,true)
      if(!accepted)throw Error('COUNCIL_DELIVERY_RECEIPT_FAILED')
      return {status:'accepted',accepted:1,previouslySent,
        chatgpt:outcomes.chatgpt||'not_included',
        gemini:outcomes.gemini||'unavailable',
        mistral:outcomes.mistral||'unavailable',date:entry.date}
    }catch(e){
      await finish(config,entry.date,claimed.id,false).catch(()=>{})
      throw e
    }
  }
  return {status:'already_claimed',accepted:0,previouslySent,date:dates.today}
}
