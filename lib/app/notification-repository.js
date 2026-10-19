import 'server-only'
import {createHash} from 'node:crypto'
import {transaction} from './database.js'
import {pushConfig,sendWebPush} from './web-push.js'
import {apnsConfig} from './native-live-activity.js'
import {coursePushPayload,validPushTimezone,validatePushSubscription} from './notification-contract.js'
import {AppError,onlyKeys} from '../assessments/contracts.js'
const sha=s=>createHash('sha256').update(s).digest('hex')
function invalid(){throw new AppError('INVALID_NOTIFICATION_SETTINGS',400)}
function view(prefs,count,env,account) {
  const cfg=pushConfig(env)
  return {ready:cfg.supported,publicKey:cfg.publicKey,deviceCount:count,
    enabled:Boolean(prefs?.enabled && count>0),
    courseReminders:prefs?.course_reminders??true,messageAlerts:prefs?.message_alerts??false,reminderHour:prefs?.reminder_hour??19,
    timeZone:prefs?.time_zone||account.timezone||'UTC',
    locale:prefs?.locale==='ru'?'ru':prefs?.locale==='en'?'en':account.ui_locale==='ru'?'ru':'en',
    liveActivitiesAvailable:apnsConfig(env).ready}
}
export function createNotificationRepository(config,env=process.env) {
  async function state(actor) {
    return transaction(config,actor,async db=>{
      const account=(await db.query('select status,onboarding_state,ui_locale,timezone from app.accounts where id=$1',[actor.id])).rows[0]
      if(account?.status!=='active'||account.onboarding_state!=='active')
        throw new AppError('ACCOUNT_UNAVAILABLE',403)
      const prefs=(await db.query('select * from app_private.notification_preferences where account_id=$1',[actor.id])).rows[0]
      const count=Number((await db.query('select count(*)::int as n from app_private.push_subscriptions where account_id=$1',[actor.id])).rows[0]?.n||0)
      return view(prefs,count,env,account)
    })
  }
  return {state,
    async subscribe(actor,body) {
      onlyKeys(body,['subscription','locale','timeZone','messageAlerts'])
      if(!pushConfig(env).supported)throw new AppError('PUSH_NOT_CONFIGURED',503)
      let s;try{s=validatePushSubscription(body.subscription)}catch{invalid()}
      if(!['en','ru'].includes(body.locale)||!validPushTimezone(body.timeZone)||typeof body.messageAlerts!=='boolean')invalid()
      await transaction(config,actor,async db=>{
        const a=(await db.query('select status,onboarding_state from app.accounts where id=$1 for update',[actor.id])).rows[0]
        if(a?.status!=='active'||a.onboarding_state!=='active')throw new AppError('ACCOUNT_UNAVAILABLE',403)
        const existing=(await db.query('select id from app_private.push_subscriptions where account_id=$1 and endpoint_hash=$2',
          [actor.id,sha(s.endpoint)])).rows[0]
        const count=Number((await db.query('select count(*)::int as n from app_private.push_subscriptions where account_id=$1',[actor.id])).rows[0]?.n||0)
        if(count>=5&&!existing)throw new AppError('DEVICE_LIMIT',409)
        const result=await db.query(`insert into app_private.push_subscriptions
          (account_id,endpoint_hash,endpoint,p256dh,auth_secret)
          values($1,$2,$3,$4,$5)
          on conflict(endpoint_hash) do update set p256dh=excluded.p256dh,
          auth_secret=excluded.auth_secret,updated_at=now()
          where app_private.push_subscriptions.account_id=excluded.account_id returning id`,
          [actor.id,sha(s.endpoint),s.endpoint,s.p256dh,s.auth])
        if(!result.rowCount)throw new AppError('DEVICE_ALREADY_REGISTERED',409)
        await db.query(`insert into app_private.notification_preferences(account_id,enabled,locale,time_zone,message_alerts)
          values($1,true,$2,$3,$4) on conflict(account_id) do update
          set enabled=true,locale=excluded.locale,time_zone=excluded.time_zone,
          message_alerts=excluded.message_alerts,updated_at=now()`,
          [actor.id,body.locale,body.timeZone,body.messageAlerts])
      })
      return state(actor)
    },
    async unsubscribe(actor,body) {
      onlyKeys(body,['endpoint'])
      if(body.endpoint!==null&&typeof body.endpoint!=='string')invalid()
      await transaction(config,actor,async db=>{
        if(body.endpoint===null)
          await db.query('delete from app_private.push_subscriptions where account_id=$1',[actor.id])
        else await db.query('delete from app_private.push_subscriptions where account_id=$1 and endpoint_hash=$2',
          [actor.id,sha(body.endpoint)])
        await db.query(`update app_private.notification_preferences set enabled=false,updated_at=now()
          where account_id=$1 and not exists(select 1 from app_private.push_subscriptions where account_id=$1)`,[actor.id])
      })
      return state(actor)
    },
    async preferences(actor,body) {
      onlyKeys(body,['enabled','courseReminders','messageAlerts','reminderHour','timeZone','locale'])
      if(typeof body.enabled!=='boolean'||typeof body.courseReminders!=='boolean'||typeof body.messageAlerts!=='boolean'||
         !Number.isInteger(body.reminderHour)||body.reminderHour<8||body.reminderHour>21||
         !validPushTimezone(body.timeZone)||!['en','ru'].includes(body.locale))invalid()
      await transaction(config,actor,async db=>{
        const count=Number((await db.query('select count(*)::int as n from app_private.push_subscriptions where account_id=$1',[actor.id])).rows[0]?.n||0)
        if(body.enabled&&(!count||!pushConfig(env).supported))throw new AppError('PUSH_NOT_CONFIGURED',503)
        await db.query(`insert into app_private.notification_preferences
          (account_id,enabled,course_reminders,message_alerts,reminder_hour,time_zone,locale)
          values($1,$2,$3,$4,$5,$6,$7) on conflict(account_id) do update
          set enabled=excluded.enabled,course_reminders=excluded.course_reminders,
          message_alerts=excluded.message_alerts,reminder_hour=excluded.reminder_hour,time_zone=excluded.time_zone,
          locale=excluded.locale,updated_at=now()`,
          [actor.id,body.enabled,body.courseReminders,body.messageAlerts,body.reminderHour,body.timeZone,body.locale])
      })
      return state(actor)
    },
    async sendTest(actor) {
      if(!pushConfig(env).supported)throw new AppError('PUSH_NOT_CONFIGURED',503)
      const current=await state(actor)
      if(!current.enabled)throw new AppError('PUSH_NOT_ENABLED',409)
      const subs=await transaction(config,actor,async db=>(await db.query(
        'select endpoint,p256dh,auth_secret from app_private.push_subscriptions where account_id=$1',
        [actor.id])).rows)
      const results=await Promise.allSettled(subs.map(async s=>{
        const reply=await sendWebPush({endpoint:s.endpoint,p256dh:s.p256dh,auth:s.auth_secret},
          coursePushPayload(current.locale),env)
        if(reply.expired)await transaction(config,actor,db=>db.query(
          'delete from app_private.push_subscriptions where account_id=$1 and endpoint_hash=$2',[actor.id,sha(s.endpoint)]))
        return reply.accepted
      }))
      const accepted=results.filter(x=>x.status==='fulfilled'&&x.value).length
      if(!accepted)throw new AppError('PUSH_DELIVERY_UNAVAILABLE',503)
      return {accepted}
    },
  }
}
