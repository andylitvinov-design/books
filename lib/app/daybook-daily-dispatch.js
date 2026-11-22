import 'server-only'
import {transaction} from './database.js'
import {openSealed} from './crypto.js'
import {telegramClientSendReady} from './client-telegram-policy.js'
import {sendDaybookDailyTelegramMessage} from './client-telegram-transport.js'
import {daybookMessage} from './daybook-daily-copy.mjs'

// Reuses the already-scheduled /api/internal/direct-message-push cron.
// The separate production gate remains OFF unless explicitly approved.
export const daybookDailyDeliveryReady=(env=process.env)=>
 env.VERCEL_ENV==='production'&&env.HH_DAYBOOK_DAILY_SEND_APPROVED==='true'&&telegramClientSendReady(env)

const readCandidates=(config,limit)=>transaction(config,null,async db=>
 (await db.query('select account_id,local_day from app_private.daybook_due_candidates($1)',[limit])).rows,
 {server:true})
const claim=(config,id,day)=>transaction(config,null,async db=>
 (await db.query('select app_private.daybook_daily_claim($1,$2::date) as claimed',[id,day])).rows[0]?.claimed===true,
 {server:true})
const safeGoal=goal=>String(goal||'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,180)
async function trySend(config,accountId,localDay,env){
 // A durable claim has ALREADY committed. Never repeat on provider timeout or
 // process termination. Lock preference+verified link throughout the send:
 // an opt-out committed before this transaction prevents transport.
 return transaction(config,null,async db=>{
  const rows=(await db.query('select * from app_private.daybook_daily_ready($1,$2::date)',[accountId,localDay])).rows
  const row=rows[0]
  if(!row){
   await db.query('select app_private.daybook_daily_finish($1,$2::date,$3,$4)',
    [accountId,localDay,'suppressed',null])
   return 'suppressed'
  }
  let status='unknown',receipt=null
  try{
   const chat=openSealed(row.chat_ciphertext,{
    accountId,recordId:accountId,field:'notification.telegram.chat'},config)
   const title=openSealed(row.title_ciphertext,{
    accountId,recordId:row.goal_id,field:'coaching.life_plan.goal.title'},config)
   if(!/^[1-9][0-9]{4,19}$/.test(String(chat?.chatId||''))||!safeGoal(title))
    throw new Error('DAYBOOK_RECIPIENT_INVALID')
   const lang=['ru','en','es'].includes(row.locale)?row.locale:'en'
   const pathLang=lang==='es'?'en':lang
   const url='https://holistichouse.vercel.app/'+pathLang+'/app/my-coaching-plan?goal='+
      encodeURIComponent(row.goal_id)+'#goal-'+encodeURIComponent(row.goal_id)
   const formatted=daybookMessage({axis:row.focus_axis,locale:lang,
    localDay,accountId,goal:safeGoal(title),profileUrl:url})
   const sent=await sendDaybookDailyTelegramMessage({
    chatId:String(chat.chatId),message:formatted.message,button:formatted.button,profileUrl:url},env)
   if(sent?.accepted===true){
    status='accepted'
    receipt=sent.providerMessageId
   }
  }catch{/* Unknown provider result is final for this day: never retry blindly. */}
  await db.query('select app_private.daybook_daily_finish($1,$2::date,$3,$4)',
   [accountId,localDay,status,receipt])
  return status
 },{server:true})
}
export async function dispatchDaybookDaily(config,env=process.env,{
 clock=()=>Date.now(),maxRuntimeMs=11500,maxBatch=3,
}={}){
 const summary={enabled:daybookDailyDeliveryReady(env),candidates:0,claimed:0,
  accepted:0,unknown:0,suppressed:0}
 if(!summary.enabled)return summary
 const started=clock()
 const candidates=await readCandidates(config,Math.min(12,Math.max(1,maxBatch)))
 summary.candidates=candidates.length
 // Three small independent accounts in parallel, never more than the existing
 // database pool. This keeps the shared cron below its 45-second budget.
 const results=await Promise.all(candidates.map(async candidate=>{
  if(clock()-started>maxRuntimeMs)return {claimed:false,status:'suppressed'}
  try{
   if(!(await claim(config,candidate.account_id,candidate.local_day)))
    return {claimed:false,status:'suppressed'}
   const status=await trySend(config,candidate.account_id,candidate.local_day,env)
   return {claimed:true,status}
  }catch{
   // A durable claim blocks duplicates even when the provider outcome is unknown.
   return {claimed:true,status:'unknown'}
  }
 }))
 for(const result of results){
  if(!result.claimed)continue
  summary.claimed++
  summary[result.status in summary?result.status:'unknown']++
 }
 return summary
}
