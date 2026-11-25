import 'server-only'
import {transaction} from './database.js'
import {openSealed} from './crypto.js'
import {telegramClientSendReady} from './client-telegram-policy.js'
import {sendDaybookWeeklyTelegramMessage} from './client-telegram-transport.js'
import {daybookWeeklyMessage} from './daybook-daily-copy.mjs'
import {daybookWeeklyPhoto} from './daybook-weekly-photos.mjs'

// Reuse the existing protected five-minute cron, without paid third-party services.
export const daybookWeeklyDeliveryReady=(env=process.env)=>
 env.VERCEL_ENV==='production'&&env.HH_DAYBOOK_WEEKLY_SEND_APPROVED==='true'&&telegramClientSendReady(env)

const dueCandidates=(config,limit)=>transaction(config,null,async db=>
 (await db.query('select account_id,local_day from app_private.daybook_weekly_due_candidates($1)',[limit])).rows,
 {server:true})
const claimWeek=(config,id,day)=>transaction(config,null,async db=>
 (await db.query('select app_private.daybook_weekly_claim($1,$2::date) as claimed',[id,day])).rows[0]?.claimed===true,
 {server:true})
const safeGoal=goal=>String(goal||'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,180)
async function trySend(config,accountId,localDay,env){
 // This is called ONLY AFTER a durable per-account ISO-week claim commits.
 // A later pause/disconnect/inactive goal is checked under row locks.
 return transaction(config,null,async db=>{
  const row=(await db.query('select * from app_private.daybook_weekly_ready($1,$2::date)',[accountId,localDay])).rows[0]
  if(!row){
   await db.query('select app_private.daybook_weekly_finish($1,$2::date,$3,$4)',
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
    throw new Error('DAYBOOK_WEEKLY_RECIPIENT_INVALID')
   const locale=['ru','en','es'].includes(row.locale)?row.locale:'en'
   const linkLocale=locale==='es'?'en':locale
   const profileUrl='https://holistichouse.vercel.app/'+linkLocale+'/app/my-coaching-plan?goal='+
     encodeURIComponent(row.goal_id)+'#goal-'+encodeURIComponent(row.goal_id)
   const message=daybookWeeklyMessage({axis:row.focus_axis,locale,
     localDay,accountId,goal:safeGoal(title),profileUrl,phraseIndex:row.phrase_index})
   const photo=daybookWeeklyPhoto(row.focus_axis,row.photo_index)
   const sent=await sendDaybookWeeklyTelegramMessage({
     chatId:String(chat.chatId),caption:message.message,button:message.button,
     profileUrl,photoUrl:photo.imageUrl},env)
   if(sent?.accepted===true){status='accepted';receipt=sent.providerMessageId}
  }catch{/* Unknown provider outcome is final for the ISO week, never blindly retried. */}
  await db.query('select app_private.daybook_weekly_finish($1,$2::date,$3,$4)',
   [accountId,localDay,status,receipt])
  return status
 },{server:true})
}
export async function dispatchDaybookWeekly(config,env=process.env,{
 clock=()=>Date.now(),maxRuntimeMs=11000,maxBatch=3,
}={}){
 const summary={enabled:daybookWeeklyDeliveryReady(env),candidates:0,claimed:0,
   accepted:0,unknown:0,suppressed:0}
 if(!summary.enabled)return summary
 const started=clock()
 const candidates=await dueCandidates(config,Math.min(3,Math.max(1,maxBatch)))
 summary.candidates=candidates.length
 const results=await Promise.all(candidates.map(async row=>{
  if(clock()-started>maxRuntimeMs)return {claimed:false,status:'suppressed'}
  let claimed=false
  try{
   claimed=await claimWeek(config,row.account_id,row.local_day)
   if(!claimed)return {claimed:false,status:'suppressed'}
   return {claimed:true,status:await trySend(config,row.account_id,row.local_day,env)}
  }catch{
   // An ambiguous claim is still not automatically retried. The unique DB
   // key plus status provide bounded, operator-reviewable unknown outcomes.
   return {claimed,status:'unknown'}
  }
 }))
 for(const result of results){
  if(!result.claimed)continue
  summary.claimed++
  summary[result.status in summary?result.status:'unknown']++
 }
 return summary
}
