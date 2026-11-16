import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {
 telegramDirectChatReady,telegramDirectChatStartLocale,telegramDirectChatPublicUrl,
 telegramDirectChatAgree,telegramDirectChatPrompt,
} from '../lib/crm/telegram-direct-chat.mjs'

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const env={
 VERCEL_ENV:'production',
 HH_CRM_TG_DIAGNOSTIC_PUBLIC_ENABLED:'true',
 HH_CRM_TG_DIAGNOSTIC_ENABLED:'true',
 HH_CRM_TG_DIRECT_CHAT_ENABLED:'true',
 HH_CRM_MSG_TELEGRAM_ENABLED:'true',
 HH_CRM_MSG_TELEGRAM_TOKEN:'123456789:'+ 'x'.repeat(35),
 HH_CRM_MSG_TELEGRAM_WEBHOOK_SECRET:'abc123_TEST_existing',
 HH_CRM_MSG_TELEGRAM_USERNAME:'HolisticHouseBot',
}
test('direct contact deep links are authorized and distinct from existing free review',()=>{
 for(const locale of ['en','ru','es']){
  assert.equal(telegramDirectChatStartLocale('/start hhtalk_'+locale),locale)
  assert.equal(telegramDirectChatPublicUrl(locale,env),
   'https://t.me/HolisticHouseBot?start=hhtalk_'+locale)
  assert.match(telegramDirectChatPrompt(locale,'consent'),/\/agree/)
  for(const kind of ['consent','ready','resume','needs','stopped','text'])
    assert.ok(telegramDirectChatPrompt(locale,kind)?.length<=1200,locale+':'+kind)
 }
 for(const raw of ['/start hhreview_en','/start hhtalk_fr','/start hhtalk_en bad',
  'hello','/start','/start hhtalk_en?token=abc'])
  assert.equal(telegramDirectChatStartLocale(raw),null)
 assert.equal(telegramDirectChatReady(env),true)
 assert.equal(telegramDirectChatReady({...env,HH_CRM_TG_DIRECT_CHAT_ENABLED:undefined}),false)
 assert.equal(telegramDirectChatReady({...env,HH_CRM_MSG_TELEGRAM_ENABLED:'false'}),false)
 assert.equal(telegramDirectChatPublicUrl('en',{...env,HH_CRM_TG_DIRECT_CHAT_ENABLED:'false'}),null)
})
test('only explicit verified Telegram consent, not a click, changes the chat',()=>{
 assert.equal(telegramDirectChatAgree({rawText:'/agree'}),true)
 assert.equal(telegramDirectChatAgree({inlineAction:'direct:agree'}),true)
 assert.equal(telegramDirectChatAgree({inlineAction:'v1:agree'}),false)
 for(const raw of ['yes','agree','/skip','/stop','No, thanks','','/agree nope'])
  assert.equal(telegramDirectChatAgree({rawText:raw}),false)
 assert.equal(telegramDirectChatAgree({inlineAction:'v2:yes'}),false)
})
test('new schema is an additive private mode on existing signed Telegram diagnostic sessions',()=>{
 const sql=read('supabase/migrations/20261106172000_hh_crm_telegram_direct_contact_mode_v1.sql')
 assert.match(sql,/ALTER TABLE app_private\.crm_tg_diagnostic_sessions/)
 assert.match(sql,/ADD COLUMN chat_mode text NOT NULL DEFAULT 'diagnostic'/)
 assert.match(sql,/CHECK\(chat_mode IN \('diagnostic','direct'\)\)/)
 assert.match(sql,/CREATE FUNCTION app_private.hh_crm_direct_contact_suppressed/)
 assert.match(sql,/REVOKE ALL ON FUNCTION app_private.hh_crm_direct_contact_suppressed/)
 assert.match(sql,/TO hh_app_inbox/)
 assert.doesNotMatch(sql,/DROP TABLE|DISABLE ROW LEVEL SECURITY|GRANT .* TO (?:anon|authenticated|public)/i)
})
test('new direct webhook flow reuses signed connected bot, explicit consent, existing CRM and STOP',()=>{
 const hook=read('lib/crm/messenger-webhook.js')
 const idx=hook.indexOf('if(publicIntake&&directStart)')
 const diagnostic=hook.indexOf('const next=transitionTelegramDiagnostic(')
 assert.ok(idx>0&&diagnostic>idx)
 assert.ok(hook.indexOf('telegramMarketingIntent(event.rawText)')<idx)
 assert.ok(hook.indexOf('if(previous&&Number(previous.last_update_id)>=updateId)')<idx)
 assert.match(hook,/coalesce\(to_jsonb\(s\)->>'chat_mode','diagnostic'\)/)
 assert.match(hook,/telegramDirectChatReady\(env\)\?telegramDirectChatStartLocale\(rawStop\):null/)
 assert.match(hook,/if\(publicIntake&&directStart\)/)
 assert.match(hook,/if\(previous\?\.chat_mode==='direct'&&!telegramPublicStartRequested\(rawStop\)\)/)
 assert.match(hook,/telegramDirectChatAgree\(event\)/)
 assert.match(hook,/hh_crm_direct_contact_suppressed\(\$1,\$2\)/)
 assert.match(hook,/previous\?\.chat_mode==='direct'&&previous\?\.stage==='done'/)
 assert.match(hook,/event.inlineAction!=='direct:agree'/)
 assert.match(hook,/ingestMessengerEventInTransaction\(db,'telegram'/)
 assert.match(hook,/crm_tg_suppress_existing\(\$1,\$2\)/)
 assert.match(hook,/stage='stopped',last_update_id/)
 assert.match(hook,/service_handoff=false,service_offering_id=null/)
 assert.match(hook,/!telegramDirectChatReady\(env\)\|\|previous.stage==='stopped'/)
 assert.match(hook,/last_update_id=\$3,updated_at=now\(\)/)
 assert.doesNotMatch(hook,/marketing_opt_in_at=now\(\)/)
})
test('public route preserves direct preference and safe existing diagnostic fallback',()=>{
 const api=read('app/api/public/telegram-diagnostic/route.js')
 const ui=read('components/app/messenger-sign-in.jsx')
 const entry=read('lib/app/telegram-entry-url.mjs')
 assert.match(api,/directAvailable/)
 assert.match(api,/telegramDirectChatPublicUrl/)
 assert.match(api,/telegramDiagnosticPublicUrl/)
 assert.match(ui,/resolveTelegramFirstEntry\(data,locale\)/)
 assert.ok(entry.includes('payload.directAvailable===true'))
 assert.ok(entry.includes('payload.directUrls?.[locale]:payload.urls?.[locale]'))
 assert.ok(entry.includes("'hhtalk_':'hhreview_'"))
 assert.ok(entry.includes("url.searchParams.get('start')!==expected"))
 assert.match(ui,/data-hh-messenger-telegram-first/)
 assert.match(ui,/recipientSlug==='andy-litvinov'/)
 assert.match(ui,/data-hh-messenger-google-login/)
 assert.ok(entry.includes('canonical.pathname!==url.pathname'))
 assert.match(ui,/telegramRoute==='review'\?c.telegramReview:c.telegram/)
 const markup=read('lib/crm/telegram-inline-buttons.mjs')
 const provider=read('lib/crm/messenger-provider.js')
 assert.match(markup,/hhchat:/)
 assert.match(markup,/callback_data:'hhchat:'\+lang\+':agree'/)
 assert.ok(provider.includes("'/agree_direct'"))
 assert.doesNotMatch(ui,/HH_CRM_MSG_TELEGRAM_TOKEN|wa\.me/)
})
