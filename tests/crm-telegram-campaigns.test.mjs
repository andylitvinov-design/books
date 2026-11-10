import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {telegramMarketingIntent,telegramMarketingActive,telegramMarketingNotice} from '../lib/crm/telegram-marketing.mjs'
import {validateCampaignDraft,validateTelegramCampaignSender} from '../lib/crm/campaigns.js'
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const optIn='2026-10-26T14:00:00Z'
const optOut='2026-11-04T14:00:00Z'
const consented={stage:'done',consent_at:'2026-10-26T12:00:00Z',marketing_opt_in_at:optIn,marketing_opt_out_at:null}

test('existing customer reply-only consent NEVER implies a newsletter opt-in',()=>{
  assert.equal(telegramMarketingActive({...consented,marketing_opt_in_at:null}),false)
  assert.equal(telegramMarketingActive({...consented,consent_at:null}),false)
  assert.equal(telegramMarketingActive({...consented,stage:'stopped'}),false)
  assert.equal(telegramMarketingActive(consented),true)
})
test('marketing consent persists across weeks and questionnaire restarts until explicit withdrawal',()=>{
  assert.equal(telegramMarketingActive({...consented,stage:'consent'}),true)
  assert.equal(telegramMarketingActive({...consented,stage:'drawing'}),true)
  assert.equal(telegramMarketingActive({...consented,marketing_opt_out_at:optOut}),false)
  assert.equal(telegramMarketingActive({...consented,marketing_opt_out_at:optOut,
    marketing_opt_in_at:'2026-11-04T14:01:00Z'}),true)
})
test('only explicit news commands change marketing preferences; old stop remains global',()=>{
  assert.equal(telegramMarketingIntent('/subscribe'),'granted')
  assert.equal(telegramMarketingIntent('/subscribe@holistichouse_bot'),'granted')
  assert.equal(telegramMarketingIntent('Подписаться на новости'),'granted')
  assert.equal(telegramMarketingIntent('/unsubnews'),'withdrawn')
  assert.equal(telegramMarketingIntent('Отписаться от рассылки'),'withdrawn')
  for(const text of ['/start','/agree','/stop','/unsubscribe','yes','Привет','согласен','Подписка'])
    assert.equal(telegramMarketingIntent(text),null,text)
  for(const locale of ['en','ru','es']){
    assert.match(telegramMarketingNotice(locale,'granted'),/\/unsubnews/)
    assert.match(telegramMarketingNotice(locale,'withdrawn'),/\/stop/)
  }
})
test('newsletter signed webhook uses existing session locks, no automatic enrollment or reopened STOP',()=>{
  const webhook=source('lib/crm/messenger-webhook.js')
  const route=source('app/api/app/crm/messenger/webhook/[provider]/route.js')
  assert.match(route,/verifyMessengerWebhook\(provider,raw,request.headers\)/)
  assert.match(webhook,/const newsletter=telegramMarketingIntent\(event.rawText\)/)
  assert.match(webhook,/newsletter==='granted'&&!previous.consent_at/)
  assert.match(webhook,/previous.stage==='stopped'/)
  assert.match(webhook,/Number\(previous.last_update_id\)>=updateId/)
  assert.match(webhook,/crm_tg_marketing_events/)
  assert.match(webhook,/marketing_opt_out_at=now\(\)/)
  assert.match(webhook,/telegramReplyConsentTimestamp/)
})
test('campaigns use owner RLS encrypted outbox, one recipient per draft and send-time opt-in recheck',()=>{
  const store=source('lib/crm/messenger-campaign-store.js')
  const policy=source('lib/crm/telegram-marketing.mjs')
  const migration=source('supabase/migrations/20261104141404_crm_telegram_consent_campaigns_20261104.sql')
  assert.match(store,/requireUUID\(id\)/)
  assert.match(store,/campaign_id is not null/)
  assert.match(store,/not exists \(select 1 from app.crm_msg_items/)
  assert.match(store,/telegramMarketingActive\(row\)/)
  assert.match(store,/seal\(\{text:campaign.body\}/)
  assert.match(store,/owner_id=\$1/)
  assert.match(store,/MAX_MARKETING_PER_DAY=30/)
  assert.match(store,/skip locked/)
  assert.match(policy,/marketing_opt_out_at/)
  assert.match(migration,/crm_msg_one_campaign_per_thread/)
  assert.match(migration,/force row level security/)
  assert.match(migration,/for insert to hh_app_inbox/)
  assert.match(migration,/for select to hh_crm_backend/)
  assert.doesNotMatch(migration,/grant\s+(?:select|insert|update)\s+on\s+app_private.crm_tg_marketing_events\s+to\s+(?:anon|authenticated|public)/i)
})
test('marketing is owner-click only and provider cannot enter paid broadcast mode',()=>{
  const route=source('app/api/app/crm/messenger/campaign/route.js')
  const provider=source('lib/crm/messenger-provider.js')
  const ui=source('components/app/crm-telegram-campaigns.jsx')
  assert.match(route,/practitionerEmailAllowed\(actor\)/)
  assert.match(route,/requireSameOrigin\(request,config\)/)
  assert.match(route,/confirmed!==true/)
  assert.match(route,/for\(let i=0;i<3;i\+\+\)/)
  assert.match(route,/approvedMarketingSubscriber:true/)
  assert.match(provider,/approvedPublicDiagnostic!==true&&approvedMarketingSubscriber!==true/)
  assert.match(provider,/allow_paid_broadcast:false/)
  assert.match(ui,/confirmed\}/)
  assert.match(ui,/onClick=\{dispatch\}/)
  assert.doesNotMatch(route,/setInterval|setTimeout|sendBulk|allow_paid_broadcast:true/)
})

test('Telegram campaign sender identity is mandatory and publicly disclosed',()=>{
  const valid={name:'Holistic House',postalAddress:'123 Sample Street, Toronto, Ontario, Canada',
    addressConfirmed:true}
  const draft={templateId:'course_update',locale:'ru',channel:'telegram',
    segment:'all_opted_in'}
  assert.throws(()=>validateCampaignDraft(draft),/SENDER_IDENTIFICATION_REQUIRED/)
  assert.throws(()=>validateCampaignDraft({...draft,sender:{...valid,addressConfirmed:false}}),
    /SENDER_IDENTIFICATION_REQUIRED/)
  assert.deepEqual(validateTelegramCampaignSender(valid),valid)
  assert.equal(validateCampaignDraft({...draft,sender:valid}).sender.name,'Holistic House')
  const store=source('lib/crm/messenger-campaign-store.js')
  assert.match(store,/validateTelegramCampaignSender\(sender\)/)
  assert.match(store,/Почтовый адрес:/)
  assert.match(store,/https:\/\/holistichouse\.vercel\.app/)
  assert.match(store,/advisory_xact_lock/)
  assert.match(store,/SENDER_IDENTIFICATION_REQUIRED/)
  const route=source('app/api/app/crm/messenger/campaign/route.js')
  assert.match(route,/sender:body\.payload\.sender/)
  const ui=source('components/app/crm-telegram-campaigns.jsx')
  assert.match(ui,/addressConfirmed/)
  assert.match(ui,/postalAddress/)
})
