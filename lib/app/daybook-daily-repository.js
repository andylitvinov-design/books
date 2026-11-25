import 'server-only'
import {AppError} from '../assessments/contracts.js'
import {transaction} from './database.js'
import {telegramClientSendReady} from './client-telegram-policy.js'
import {DAYBOOK_CONSENT_VERSION,DAYBOOK_WEEKLY_CONSENT_VERSION,validateDaybookDaily,DAYBOOK_AXIS_KEYS,DAYBOOK_LOCALES} from './daybook-daily-copy.mjs'

const activeAccount=async(db,id)=>{
 const row=(await db.query("select timezone,ui_locale from app.accounts where id=$1 and status='active' and onboarding_state='active'",[id])).rows[0]
 if(!row)throw new AppError('ACCOUNT_UNAVAILABLE',403)
 return row
}
const mapped=row=>row?{
 enabled:row.enabled===true,goalId:row.goal_id,axis:row.focus_axis,
 timezone:row.timezone,locale:row.locale,dailyAt:row.daily_at,
 frequency:row.delivery_frequency||'daily',weekday:row.delivery_weekday??1,
 updatedAt:row.updated_at
}:null
export function createDaybookDailyRepository(config,env=process.env){
 async function state(actor){
  return transaction(config,actor,async db=>{
   const account=await activeAccount(db,actor.id)
   const row=(await db.query('select enabled,goal_id,focus_axis,timezone,locale,daily_at,delivery_frequency,delivery_weekday,updated_at from app_private.daybook_daily_preferences where account_id=$1',[actor.id])).rows[0]
   const verified=(await db.query("select 1 from app_private.notification_telegram_links l join app_private.notification_messenger_requests n on n.account_id=l.account_id and n.channel='telegram' and n.consent_version='hh-messenger-contact-v1' where l.account_id=$1 and l.consent_version='hh-tg-message-alerts-v1'",[actor.id])).rows.length>0
   const timezone=typeof account.timezone==='string'&&account.timezone?account.timezone:'UTC'
   return {preferences:mapped(row),defaultTimezone:timezone,
     defaultLocale:DAYBOOK_LOCALES.includes(account.ui_locale)?account.ui_locale:'en',
     telegramConnected:verified,
     telegramDeliveryReady:verified&&telegramClientSendReady(env)&&env.VERCEL_ENV==='production'&&
       (row?.delivery_frequency==='daily'?env.HH_DAYBOOK_DAILY_SEND_APPROVED==='true':env.HH_DAYBOOK_WEEKLY_SEND_APPROVED==='true'),
     whatsappAvailable:false,axes:DAYBOOK_AXIS_KEYS,
     consentVersion:row?.delivery_frequency==='weekly'?DAYBOOK_WEEKLY_CONSENT_VERSION:DAYBOOK_CONSENT_VERSION}
  })
 }
 async function mutate(actor,input){
  let patch
  try{patch=validateDaybookDaily(input)}catch(error){
   throw new AppError(error?.message?.startsWith('DAYBOOK_')?error.message:'DAYBOOK_INVALID',400)
  }
  await transaction(config,actor,async db=>{
   await activeAccount(db,actor.id)
   if(!patch.enabled){
    await db.query('update app_private.daybook_daily_preferences set enabled=false,updated_at=now() where account_id=$1',[actor.id])
    return
   }
   const goal=(await db.query("select 1 from app_private.coaching_goals where account_id=$1 and id=$2 and status='active'",[actor.id,patch.goalId])).rows[0]
   if(!goal)throw new AppError('DAYBOOK_ACTIVE_GOAL_REQUIRED',409)
   const linked=(await db.query("select 1 from app_private.notification_telegram_links l join app_private.notification_messenger_requests n on n.account_id=l.account_id and n.channel='telegram' and n.consent_version='hh-messenger-contact-v1' where l.account_id=$1 and l.consent_version='hh-tg-message-alerts-v1'",[actor.id])).rows.length>0
   // Store explicit weekly requests as pending while the client connects Telegram.
   // Dispatch itself still requires a verified account-bound destination.
   if(!linked&&patch.frequency!=='weekly')throw new AppError('DAYBOOK_TELEGRAM_VERIFICATION_REQUIRED',409)
   await db.query(`insert into app_private.daybook_daily_preferences(
     account_id,goal_id,focus_axis,daily_at,timezone,locale,enabled,consent_version,consented_at,delivery_frequency,delivery_weekday)
     values($1,$2,$3,$4,$5,$6,true,$7,now(),$8,$9)
     on conflict(account_id) do update set goal_id=excluded.goal_id,focus_axis=excluded.focus_axis,
       daily_at=excluded.daily_at,timezone=excluded.timezone,locale=excluded.locale,enabled=true,
       consent_version=excluded.consent_version,consented_at=now(),
       delivery_frequency=excluded.delivery_frequency,delivery_weekday=excluded.delivery_weekday,updated_at=now()`,
     [actor.id,patch.goalId,patch.axis,patch.dailyAt,patch.timezone,patch.locale,patch.consentVersion,patch.frequency,patch.weekday])
  })
  return state(actor)
 }
 return Object.freeze({state,mutate})
}
