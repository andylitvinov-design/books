import 'server-only'
import {randomUUID} from 'node:crypto'
import {AppError} from '../assessments/contracts.js'
import {transaction} from '../app/database.js'
import {openSealed} from '../app/crypto.js'
import {telegramClientLinkReady} from '../app/client-telegram-policy.js'
import {sendMasterAnalyticsTelegram} from '../app/client-telegram-transport.js'
import {getTorontoCompletedPeriod} from './daily-digest.mjs'
import {
 MASTER_ANALYTICS_CONSENT,validateMasterAnalyticsInput,dueMasterAnalytics,makeMasterAnalyticsText
} from './analytics-subscription-policy.mjs'

export function masterAnalyticsTelegramReady(env=process.env){
 return env.HH_MASTER_ANALYTICS_TG_ENABLED==='true'&&telegramClientLinkReady(env)
}

// Private, signed-in account only. The matching practitioner is looked up
// server-side and the bot chat ID/number is never returned to the browser.
export async function readMasterAnalyticsState(config,actor,env=process.env){
 const row=await transaction(config,actor,async db=>(await db.query(
  "select p.id,p.status,p.active,s.channel,s.frequency,s.locale,s.consented_at,"+
  " exists(select 1 from app_private.notification_telegram_links l where l.account_id=$1) as telegram_verified,"+
  " exists(select 1 from app_private.notification_messenger_requests n where n.account_id=$1 and n.channel='whatsapp') as whatsapp_pending"+
  " from app.practitioners p join app.accounts a on a.id=p.trusted_auth_user_id"+
  " left join app_private.practitioner_analytics_subscriptions s on s.practitioner_id=p.id"+
  " where p.trusted_auth_user_id=$1 and a.status='active' and a.onboarding_state='active' limit 1",
  [actor.id])).rows[0])
 if(!row)throw new AppError('PRACTITIONER_REQUIRED',403)
 return {
  practitionerId:row.id,approved:row.active&&row.status==='approved',
  channel:row.channel||null,frequency:row.frequency||'off',locale:row.locale||'en',
  consentedAt:row.consented_at||null,telegramVerified:Boolean(row.telegram_verified),
  whatsappPending:Boolean(row.whatsapp_pending),
  telegramLinkAvailable:telegramClientLinkReady(env),
  telegramSendingEnabled:masterAnalyticsTelegramReady(env),
  whatsappSendingEnabled:false,
 }
}
export async function writeMasterAnalyticsState(config,actor,raw,env=process.env){
 let input
 try{input=validateMasterAnalyticsInput(raw)}
 catch{throw new AppError('INVALID_ANALYTICS_SUBSCRIPTION',400)}
 await transaction(config,actor,async db=>{
  const p=(await db.query(
   "select p.id from app.practitioners p join app.accounts a on a.id=p.trusted_auth_user_id"+
   " where p.trusted_auth_user_id=$1 and p.active and a.status='active' and a.onboarding_state='active' for update of p",
   [actor.id])).rows[0]
  if(!p)throw new AppError('PRACTITIONER_REQUIRED',403)
  if(input.action==='disable'){
   await db.query('delete from app_private.practitioner_analytics_subscriptions where practitioner_id=$1',[p.id])
   return
  }
  await db.query(
   "insert into app_private.practitioner_analytics_subscriptions"+
   " (practitioner_id,channel,frequency,locale,consent_version) values($1,$2,$3,$4,$5)"+
   " on conflict(practitioner_id) do update set channel=excluded.channel,"+
   " frequency=excluded.frequency,locale=excluded.locale,consent_version=excluded.consent_version,"+
   " consented_at=now(),updated_at=now()",
   [p.id,input.channel,input.frequency,input.locale,MASTER_ANALYTICS_CONSENT])
 })
 return readMasterAnalyticsState(config,actor,env)
}

// Read ONLY the current approved master's published services and anonymous
// counters. No consultations, CRM contents, health records or visitor IDs.
async function loadMasterAnalyticsReport(config,practitionerId,{locale='en',frequency='daily',at=new Date()}={}){
 const dates=getTorontoCompletedPeriod(at)
 const input=await transaction(config,null,async db=>{
  const approved=(await db.query(
   "select 1 from app.practitioners p join app.accounts a on a.id=p.trusted_auth_user_id"+
   " where p.id=$1 and p.status='approved' and p.active"+
   " and a.status='active' and a.onboarding_state='active'",[practitionerId])).rowCount===1
  if(!approved)throw new AppError('PRACTITIONER_NOT_APPROVED',403)
  const rows=(await db.query(
   "select id,slug,localized_copy from app.service_offerings"+
   " where practitioner_id=$1 and active and status='published' order by id",
   [practitionerId])).rows
  const services=rows.map(row=>({
   id:row.id,slug:row.slug,
   copy:{title:row.localized_copy?.[locale]?.title||row.localized_copy?.en?.title||row.slug}
  }))
  const daily=(await db.query(
   'select f.service_id as "serviceId",f.day::text as day,'+
   ' f.impressions,f.order_clicks as orders,f.whatsapp_clicks as whatsapp,'+
   ' f.telegram_clicks as telegram from app_private.service_funnel_daily f'+
   ' join app.service_offerings s on s.id=f.service_id'+
   " where s.practitioner_id=$1 and s.active and s.status='published'"+
   ' and f.day between $2::date and $3::date',
   [practitionerId,dates.weekStart,dates.yesterday])).rows
  return {services,daily}
 },{server:true})
 return makeMasterAnalyticsText({...input,locale,frequency,now:at})
}
export async function masterAnalyticsPreview(config,actor,{at=new Date()}={}){
 const state=await readMasterAnalyticsState(config,actor)
 const report=await loadMasterAnalyticsReport(config,state.practitionerId,{
  locale:state.locale,frequency:state.frequency==='weekly'?'weekly':'daily',at
 })
 return {text:report.text,day:report.day,frequency:report.frequency}
}

// All identities/consents are rechecked in private SQL SECURITY DEFINER
// functions. Unique claim is INSERT-ON-CONFLICT-NOTHING: never retry an
// uncertain Bot API attempt after a timeout. Accepted != delivered/read.
export async function sendMasterAnalyticsDigest(config,practitionerId,{
 env=process.env,kind='manual',at=new Date()
}={}){
 if(!masterAnalyticsTelegramReady(env))return {status:'disabled'}
 if(!['manual','daily','weekly'].includes(kind))throw new AppError('INVALID_REPORT_KIND',400)
 if(kind==='weekly'&&!dueMasterAnalytics('weekly',at))return {status:'not_due'}
 const date=getTorontoCompletedPeriod(at).yesterday
 const claimToken=randomUUID()
 const claim=await transaction(config,null,async db=>(await db.query(
  'select * from app_private.master_analytics_claim($1,$2::date,$3,$4::uuid)',
  [practitionerId,date,kind,claimToken])).rows[0],{server:true})
 if(!claim)return {status:'not_eligible_or_already_sent'}
 const finish=async(status,id=null)=>transaction(config,null,async db=>{
  const result=(await db.query(
   'select app_private.master_analytics_finish($1,$2::date,$3,$4::uuid,$5,$6) as ok',
   [practitionerId,date,kind,claimToken,status,id])).rows[0]
  return result?.ok===true
 },{server:true})
 try{
  const report=await loadMasterAnalyticsReport(config,practitionerId,{
   locale:claim.target_locale,
   frequency:kind==='weekly'?'weekly':kind==='daily'?'daily':claim.target_frequency,at
  })
  const permitted=await transaction(config,null,async db=>(await db.query(
   'select app_private.master_analytics_allowed($1,$2::date,$3,$4) as ok',
   [practitionerId,date,kind,claim.target_chat_hash])).rows[0]?.ok===true,{server:true})
  if(!permitted){
   await finish('suppressed')
   return {status:'suppressed'}
  }
  const decrypted=openSealed(claim.target_ciphertext,{
   accountId:claim.target_account_id,recordId:claim.target_account_id,
   field:'notification.telegram.chat'
  },config)
  if(!decrypted?.chatId||!/^[1-9][0-9]{4,19}$/.test(String(decrypted.chatId)))
    throw new AppError('TELEGRAM_CHAT_INVALID',503)
  const receipt=await sendMasterAnalyticsTelegram({
   chatId:String(decrypted.chatId),text:report.text
  },env)
  const accepted=await finish('accepted',receipt.providerMessageId)
  if(!accepted)throw Error('RECEIPT_NOT_SAVED')
  return {status:'accepted',day:date}
 }catch{
  await finish('failed').catch(()=>{})
  return {status:'failed',day:date}
 }
}
export async function scheduledMasterAnalyticsDigests(config,{
 env=process.env,at=new Date()
}={}){
 if(!masterAnalyticsTelegramReady(env))return {status:'disabled'}
 const weekly=dueMasterAnalytics('weekly',at)
 const people=await transaction(config,null,async db=>(await db.query(
  "select s.practitioner_id,s.frequency from app_private.practitioner_analytics_subscriptions s"+
  " join app.practitioners p on p.id=s.practitioner_id"+
  " join app.accounts a on a.id=p.trusted_auth_user_id"+
  " where s.channel='telegram' and s.consent_version=$1"+
  " and p.status='approved' and p.active and a.status='active' and a.onboarding_state='active'"+
  " and (s.frequency='daily' or (s.frequency='weekly' and $2::boolean))"+
  " order by s.updated_at,s.practitioner_id limit 12",
  [MASTER_ANALYTICS_CONSENT,weekly])).rows,{server:true})
 const results=[]
 for(let offset=0;offset<people.length;offset+=3){
  const batch=await Promise.all(people.slice(offset,offset+3).map(person=>
   sendMasterAnalyticsDigest(config,person.practitioner_id,{
    env,kind:person.frequency,at
   }).catch(()=>({status:'failed'}))))
  results.push(...batch)
 }
 return {status:'checked',attempted:results.filter(x=>x.status==='accepted'||x.status==='failed').length,
  accepted:results.filter(x=>x.status==='accepted').length,
  skipped:results.length-results.filter(x=>x.status==='accepted'||x.status==='failed').length}
}
