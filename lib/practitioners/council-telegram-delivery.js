import 'server-only'
import {randomUUID} from 'node:crypto'
import {transaction} from '../app/database.js'
import {getTorontoCompletedPeriod} from './daily-digest.mjs'
import {practiceTelegramConfigured} from './daily-telegram-transport.mjs'
import {sendOwnerDocument,sendOwnerDocumentPair} from './telegram-hub.mjs'
import {fetchPublicDailyArchives} from './council-telegram-archive.mjs'
import {composeChatgptTelegramReport,splitNoonReports} from './chatgpt-telegram-report.mjs'
import {reviewDailyCouncil,composeDailyCouncilTelegram,modelSettings} from './council-free-models.mjs'
import {resolvedOwnerAiEnvironment} from './owner-ai-provider-settings.js'

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
// AND optional free-only Council reviews; a model outage never drops the HTML facts.
// The private per-date receipt prevents two Telegram files on the same day.
export async function deliverArchivedCouncilReports(config,{
  env=process.env,now=new Date(),fetcher=fetch,strategyOnly=false
}={}){
  if(!practiceTelegramConfigured(env))return {status:'disabled'}
  const dates=getTorontoCompletedPeriod(now)
  const archives=await fetchPublicDailyArchives({
    today:dates.today,earliest:dates.weekStart
  },fetcher)
  // Load only private, owner-confirmed Free-mode settings server-side.
  const aiEnv=strategyOnly?{}:await resolvedOwnerAiEnvironment(config,env)
  const settings=modelSettings(aiEnv)
  // A verified free Gemini or a verified free Mistral should never be
  // suppressed merely because the other provider is temporarily unavailable.
  const modelsReady=(settings.geminiKeyPresent&&settings.geminiFreeConfirmed)||
    settings.mistralKeyPresent
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
  const reports=(strategyOnly
    ?archives.chatgpt.filter(item=>item.date===dates.today).map(item=>({date:item.date,chatgpt:item}))
    :[...byDay.values()])
    .sort((a,b)=>b.date.localeCompare(a.date))
    .filter(entry=>entry.chatgpt||entry.council)
  // A noon strategic briefing must never be replaced by old technical scans.
  if(strategyOnly&&!reports.length)
    return {status:'strategy_not_ready',date:dates.today}
  // Even if both providers fail, the verified public HTML scan is useful.
  // Label it as facts-only instead of skipping an entire daily owner report.
  if(!reports.length&&!modelsReady)
    return {status:'model_setup_required',date:dates.today,
      chatgpt:'not_yet_archived',
      gemini:settings.geminiKeyPresent&&settings.geminiFreeConfirmed?'ready':'not_configured',
      mistral:settings.mistralKeyPresent?'ready':'not_configured'}
  if(!reports.length)return {status:'no_archived_reports',date:dates.today}
  let previouslySent=0,acceptedCount=0
  const acceptedDates=[]
  let lastOutcome={}
  // Freshest report first; after an outage catch up ONE missed prior date
  // without duplicate days, extra paid API calls, or repeated model inference.
  // At most two documents per cron invocation (only on recovery days).
  for(const entry of reports){
    if(acceptedCount>=2)break
    const report=entry.council||entry.chatgpt
    const claimed=await claim(config,{date:entry.date,id:report.id})
    if(!claimed){previouslySent++;continue}
    try{
      let markdown=claimed.markdown
      let outcomes=claimed.outcomes||{}
      let sources=['GitHub public HTML/HTTP archive #242']
      if(!markdown){
        let councilReview=null
        if(entry.council){
          // Provider replies are independent and optional. If one or both API
          // calls fail or the workspace has no free access, send the real
          // scanner findings with explicit NOT_AVAILABLE model statuses.
          // Never invent an AI opinion or suppress the entire day's report.
          const reviews=entry.date===dates.today
            ?await reviewDailyCouncil(report,aiEnv,fetcher)
            :{
              gemini:{status:'skipped',model:'Gemini',reason:'HISTORICAL_BACKFILL_NO_INFERENCE'},
              mistral:{status:'skipped',model:'Mistral',reason:'HISTORICAL_BACKFILL_NO_INFERENCE'}
            }
          // Status-only telemetry: no prompts, responses, tokens or private IDs.
          // Distinguish an API attempt from an intentionally skipped backfill.
          if(entry.date===dates.today){
            console.info('HH_COUNCIL_PROVIDER_OUTCOMES',JSON.stringify({
              date:entry.date,
              gemini:{status:reviews.gemini.status,reason:reviews.gemini.reason},
              mistral:{status:reviews.mistral.status,reason:reviews.mistral.reason}
            }))
          }
          councilReview=composeDailyCouncilTelegram(report,reviews)
        }
        const composed=entry.chatgpt
          ?composeChatgptTelegramReport(entry.chatgpt,{councilReview,focus:strategyOnly?'strategy':'full'})
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
      // Only the noon owner-signed strategy archive may produce two attachments.
      // Older archives and the 15:00 technical report retain one document.
      const noonPair=strategyOnly&&entry.chatgpt
        ?splitNoonReports(entry.chatgpt):null
      if(noonPair){
        await sendOwnerDocumentPair(noonPair,entry.date,env,fetcher)
      }else{
        await sendOwnerDocument({
          mode:'report',
          title:strategyOnly?'12:00 · Большие изменения, маркетинг и SEO · '+entry.date:
            (outcomes.chatgpt==='ok'?'Ежедневный аудит ChatGPT ':'Публичный аудит сайта ')+entry.date,
          markdown,sources
        },env,fetcher)
      }
      const accepted=await finish(config,entry.date,claimed.id,true)
      if(!accepted)throw Error('COUNCIL_DELIVERY_RECEIPT_FAILED')
      acceptedCount++
      acceptedDates.push(entry.date)
      lastOutcome={
        chatgpt:outcomes.chatgpt||'not_included',
        gemini:outcomes.gemini||'unavailable',
        mistral:outcomes.mistral||'unavailable'
      }
    }catch(e){
      await finish(config,entry.date,claimed.id,false).catch(()=>{})
      if(acceptedCount>0)
        return {status:'partially_accepted',accepted:acceptedCount,
          acceptedDates,failedDate:entry.date,previouslySent}
      throw e
    }
  }
  return acceptedCount>0
    ?{status:'accepted',accepted:acceptedCount,acceptedDates,previouslySent,...lastOutcome,
      date:acceptedDates[0]}
    :{status:'already_claimed',accepted:0,previouslySent,date:dates.today}
}
