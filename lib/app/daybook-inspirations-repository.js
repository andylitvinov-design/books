import 'server-only'
import { transaction } from './database.js'
import { AppError } from '../assessments/contracts.js'
import { createMessengerNotificationRepository } from './messenger-notification-repository.js'
import { DEFAULT_MESSENGER_TOPICS, MESSENGER_CONTACT_NOTICE_VERSION } from './messenger-notification-policy.js'
import { telegramClientLinkReady, telegramClientSendReady } from './client-telegram-policy.js'
import { DAYBOOK_INSPIRATIONS_CONSENT, daybookSendEnabled, validateDaybookPreferences } from '../daybook/inspirations-policy.mjs'

const cleanInput = input => {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
    Object.keys(input).some(k => !['action','locale','timeZone','dailyAt','permissionAccepted','noticeVersion'].includes(k)))
    throw new AppError('INVALID_DAYBOOK_REQUEST',400)
  return input
}
export function createDaybookInspirationsRepository(config, env = process.env) {
  async function view(actor) {
    return transaction(config, actor, async db => {
      const account = (await db.query('select ui_locale,timezone,status,onboarding_state from app.accounts where id=$1', [actor.id])).rows[0]
      if (account?.status !== 'active' || account.onboarding_state !== 'active')
        throw new AppError('ACCOUNT_UNAVAILABLE',403)
      const saved = (await db.query('select enabled,locale,time_zone,daily_at,consent_at from app_private.daybook_inspiration_preferences where account_id=$1', [actor.id])).rows[0]
      const linked = (await db.query('select 1 from app_private.notification_telegram_links where account_id=$1', [actor.id])).rowCount === 1
      return {enabled:saved?.enabled === true,channel:'telegram',telegramConnected:linked,
        linkingAvailable:telegramClientLinkReady(env),
        sendingAvailable:daybookSendEnabled(env, telegramClientSendReady(env)),
        locale:saved?.locale || (['ru','en','es'].includes(account.ui_locale)?account.ui_locale:'en'),
        timeZone:saved?.time_zone || account.timezone || 'UTC',
        dailyAt:saved?.daily_at ? String(saved.daily_at).slice(0,5) : '09:00',
        consentedAt:saved?.consent_at || null,repeatWindowDays:30,
        whatsAppAvailable:false}
    })
  }
  async function mutate(actor,raw) {
    const input = cleanInput(raw)
    if (input.action === 'beginTelegram') {
      if (input.permissionAccepted !== true) throw new AppError('CONSENT_REQUIRED',403)
      const state = await view(actor)
      const linked = await createMessengerNotificationRepository(config).mutate(actor, {
        action:'begin_telegram',channel:'telegram',locale:state.locale,
        topics:{...DEFAULT_MESSENGER_TOPICS},
        noticeVersion:MESSENGER_CONTACT_NOTICE_VERSION,permissionAccepted:true,
      })
      return {...state,linkUrl:linked.linkUrl || null}
    }
    if (!['enable','pause','preferences'].includes(input.action))
      throw new AppError('INVALID_DAYBOOK_REQUEST',400)
    const settings = validateOrReject(input)
    if (input.action === 'enable' && (input.noticeVersion !== DAYBOOK_INSPIRATIONS_CONSENT ||
      input.permissionAccepted !== true))
      throw new AppError('DAYBOOK_CONSENT_REQUIRED',403)
    await transaction(config,actor,async db => {
      const account = (await db.query('select status,onboarding_state from app.accounts where id=$1 for update',[actor.id])).rows[0]
      if (account?.status !== 'active'||account.onboarding_state !== 'active')
        throw new AppError('ACCOUNT_UNAVAILABLE',403)
      if(input.action === 'enable'){
        if(!daybookSendEnabled(env,telegramClientSendReady(env)))
          throw new AppError('DAYBOOK_DELIVERY_NOT_READY',503)
        if(!(await db.query('select 1 from app_private.notification_telegram_links where account_id=$1',[actor.id])).rowCount)
          throw new AppError('TELEGRAM_NOT_VERIFIED',409)
        await db.query('insert into app_private.daybook_inspiration_preferences (account_id,enabled,channel,locale,time_zone,daily_at,consent_version,consent_at,revoked_at) values ($1,true,$2,$3,$4,$5,$6,now(),null) on conflict(account_id) do update set enabled=true,locale=excluded.locale,time_zone=excluded.time_zone,daily_at=excluded.daily_at,consent_version=excluded.consent_version,consent_at=now(),revoked_at=null,updated_at=now()',
          [actor.id,'telegram',settings.locale,settings.timeZone,settings.dailyAt,DAYBOOK_INSPIRATIONS_CONSENT])
        await db.query('insert into app_private.daybook_inspiration_consents(account_id,accepted,channel,consent_version) values($1,true,$2,$3)',
          [actor.id,'telegram',DAYBOOK_INSPIRATIONS_CONSENT])
      } else if (input.action === 'pause') {
        const changed = await db.query('update app_private.daybook_inspiration_preferences set enabled=false,revoked_at=now(),updated_at=now() where account_id=$1 and enabled=true',[actor.id])
        if (changed.rowCount) await db.query('insert into app_private.daybook_inspiration_consents(account_id,accepted,channel,consent_version) values($1,false,$2,$3)',
          [actor.id,'telegram',DAYBOOK_INSPIRATIONS_CONSENT])
      } else {
        const updated = await db.query('update app_private.daybook_inspiration_preferences set locale=$2,time_zone=$3,daily_at=$4,updated_at=now() where account_id=$1',
          [actor.id,settings.locale,settings.timeZone,settings.dailyAt])
        if (!updated.rowCount) throw new AppError('SUBSCRIPTION_NOT_FOUND',404)
      }
    })
    return view(actor)
  }
  return Object.freeze({view,mutate})
}
function validateOrReject(input) {
  if (input.action === 'pause') return null
  try { return validateDaybookPreferences(input) }
  catch { throw new AppError('INVALID_DAYBOOK_PREFERENCES',400) }
}
