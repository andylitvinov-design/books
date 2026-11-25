import 'server-only'
import {AppError} from '../assessments/contracts.js'
import {transaction} from './database.js'
import {telegramClientLinkReady,telegramClientSendReady} from './client-telegram-policy.js'
import {REIKI_HINTS_CONSENT_VERSION,REIKI_HINTS_CATALOG_VERSION,validateReikiHintsRequest} from './reiki-hints-catalog.mjs'

export const reikiHintsDeliveryReady=(env=process.env)=>env.VERCEL_ENV==='production'&&env.HH_REIKI_HINTS_SEND_APPROVED==='true'&&telegramClientSendReady(env)
const readLink=async(db,id)=>(await db.query(
 "select l.chat_hash,l.verified_at from app_private.notification_telegram_links l join app_private.notification_messenger_requests n on n.account_id=l.account_id and n.channel='telegram' and n.consent_version='hh-messenger-contact-v1' where l.account_id=$1 and l.consent_version='hh-tg-message-alerts-v1'",[id])).rows[0]
const ensureAccount=async(db,id)=>{
 const row=(await db.query("select timezone,ui_locale from app.accounts where id=$1 and status='active' and onboarding_state='active'",[id])).rows[0]
 if(!row)throw new AppError('ACCOUNT_UNAVAILABLE',403)
 return row
}
export function createReikiHintsRepository(config,env=process.env){
 async function state(actor){
  return transaction(config,actor,async db=>{
   const account=await ensureAccount(db,actor.id)
   const link=await readLink(db,actor.id)
   const pref=(await db.query(`select p.daily_at,p.timezone,p.locale,p.stopped_at is not null as stopped,p.start_day::text as start_day,
     coalesce(greatest(0,least(30,((now() at time zone p.timezone)::date-p.start_day)+1)),0) as day,
     p.start_day is not null and (now() at time zone p.timezone)::date>=p.start_day+30 as completed,
     p.chat_hash is null or exists(select 1 from app_private.notification_telegram_links l where l.account_id=p.account_id and l.chat_hash=p.chat_hash and l.verified_at=p.link_verified_at) as binding_matches,
     (select count(*)::int from app_private.reiki_hints_attempts d where d.account_id=p.account_id and d.status='accepted') as accepted
     from app_private.reiki_hints_preferences p where p.account_id=$1`,[actor.id])).rows[0]
   return {preferences:pref?{dailyAt:pref.daily_at,timezone:pref.timezone,locale:pref.locale,
    startDay:pref.start_day,day:pref.start_day?pref.day:0,accepted:pref.accepted,status:pref.completed?'completed':pref.stopped?'stopped':
     !pref.binding_matches?'disconnected':!link?'pending_link':!pref.start_day?'pending_start':'active'}:null,
     defaultTimezone:account.timezone||'UTC',defaultLocale:['en','ru','es'].includes(account.ui_locale)?account.ui_locale:'en',
     telegramConnected:!!link,verificationAvailable:telegramClientLinkReady(env),deliveryReady:reikiHintsDeliveryReady(env),
     consentVersion:REIKI_HINTS_CONSENT_VERSION,total:30}
  })
 }
 async function mutate(actor,raw){
  let input
  try{input=validateReikiHintsRequest(raw)}catch{throw new AppError('REIKI_HINTS_INVALID',400)}
  await transaction(config,actor,async db=>{
   await ensureAccount(db,actor.id)
   if(!input.enabled){
    await db.query('update app_private.reiki_hints_preferences set stopped_at=coalesce(stopped_at,now()) where account_id=$1',[actor.id])
    return
   }
   const zone=(await db.query('select 1 from pg_catalog.pg_timezone_names where name=$1',[input.timezone])).rows[0]
   if(!zone)throw new AppError('REIKI_HINTS_INVALID_TIMEZONE',400)
   const link=await readLink(db,actor.id)
   // Immutable series: repeated clicks must never extend or restart the 30 days.
   await db.query(`insert into app_private.reiki_hints_preferences(account_id,locale,daily_at,timezone,consent_version,catalog_version,chat_hash,link_verified_at)
    values($1,$2,$3,$4,$5,$6,$7,$8) on conflict(account_id) do nothing`,
    [actor.id,input.locale,input.dailyAt,input.timezone,REIKI_HINTS_CONSENT_VERSION,REIKI_HINTS_CATALOG_VERSION,link?.chat_hash||null,link?.verified_at||null])
  })
  return state(actor)
 }
 return {state,mutate}
}
