import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {
 MASTER_ANALYTICS_CONSENT,validateMasterAnalyticsInput,dueMasterAnalytics,makeMasterAnalyticsText
} from '../lib/practitioners/analytics-subscription-policy.mjs'

const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const at=new Date('2026-10-26T14:00:00Z')
const service={id:'owned-1',slug:'public-service',copy:{title:'Public consultation'}}
const days=[
 {serviceId:'owned-1',day:'2026-10-25',impressions:13,orders:2,whatsapp:1,telegram:3},
 {serviceId:'owned-1',day:'2026-10-20',impressions:7,orders:1,whatsapp:2,telegram:0},
 {serviceId:'foreign',day:'2026-10-25',impressions:999999,orders:999},
 {serviceId:'owned-1',day:'2026-10-26',impressions:888,orders:888},
]
test('explicit opt-in, restricted schedule/locale/channel; disable is separate and immediate',()=>{
 assert.deepEqual(validateMasterAnalyticsInput({
  action:'save',channel:'telegram',frequency:'weekly',locale:'es',
  accepted:true,consentVersion:MASTER_ANALYTICS_CONSENT,
 }),{action:'save',channel:'telegram',frequency:'weekly',locale:'es'})
 assert.deepEqual(validateMasterAnalyticsInput({action:'disable'}),{action:'disable'})
 for(const bad of [
  {action:'save',channel:'telegram',frequency:'weekly',locale:'ru',accepted:false,consentVersion:MASTER_ANALYTICS_CONSENT},
  {action:'save',channel:'telegram',frequency:'every_minute',locale:'ru',accepted:true,consentVersion:MASTER_ANALYTICS_CONSENT},
  {action:'save',channel:'sms',frequency:'daily',locale:'ru',accepted:true,consentVersion:MASTER_ANALYTICS_CONSENT},
  {action:'disable',practitionerId:'foreign'},
  {action:'send_now',accepted:true},
  {action:'save',channel:'telegram',frequency:'daily',locale:'en',accepted:true,consentVersion:'old'},
  null,
 ])assert.throws(()=>validateMasterAnalyticsInput(bad),/INVALID_PREFERENCES/)
})
test('weekly only on Toronto Monday, including local-Sunday case; no DST drift',()=>{
 assert.equal(dueMasterAnalytics('weekly',at),true)
 assert.equal(dueMasterAnalytics('weekly',new Date('2026-10-26T03:00:00Z')),false)
 assert.equal(dueMasterAnalytics('weekly',new Date('2026-10-27T14:00:00Z')),false)
 assert.equal(dueMasterAnalytics('daily',at),true)
 assert.equal(dueMasterAnalytics('never',at),false)
})
test('only owned service counters, completed days, and public titles in daily summary',()=>{
 const r=makeMasterAnalyticsText({services:[service],daily:days,now:at,locale:'en',frequency:'daily',
  ignoredClient:'name@example.com'})
 assert.deepEqual(r.totals,{impressions:13,orders:2,whatsapp:1,telegram:3})
 assert.equal(r.day,'2026-10-25')
 assert.match(r.text,/2026-10-25/)
 assert.match(r.text,/Public consultation/)
 assert.doesNotMatch(r.text,/999,999|888|name@example.com|foreign|diagnos/)
 assert.match(r.text,/clicks are not/i)
})
test('weekly includes seven completed days only; Spanish copy and privacy',()=>{
 const r=makeMasterAnalyticsText({services:[service],daily:days,now:at,locale:'es',frequency:'weekly'})
 assert.deepEqual(r.totals,{impressions:20,orders:3,whatsapp:3,telegram:3})
 assert.match(r.text,/2026-10-19 — 2026-10-25/)
 assert.match(r.text,/Sin datos de clientes/)
})
test('empty reporting never claims absence of visitors, Russian localization',()=>{
 const r=makeMasterAnalyticsText({services:[],daily:[],now:at,locale:'ru',frequency:'daily'})
 assert.match(r.text,/не означает, что посещений не было/)
 assert.match(r.text,/Только цифры/)
})
test('private REST endpoint authenticates, binds account, blocks cross-origin and does not accept recipient identity',()=>{
 const api=file('app/api/app/practice-analytics-notifications/route.js')
 const backend=file('lib/practitioners/master-analytics-service.js')
 assert.match(api,/auth\.verified\(\)/)
 assert.match(api,/requireSameOrigin\(request,config\)/)
 assert.match(api,/x-hh-account-id/)
 assert.match(api,/actor\.id/)
 assert.match(api,/PRIVATE_HEADERS/)
 assert.match(api,/onlyKeys\(input,\['action'\]\)/)
 assert.doesNotMatch(api,/request\.headers\.get\('x-hh-practitioner-id'\)/)
 assert.match(backend,/p\.trusted_auth_user_id=\$1/)
 assert.match(backend,/join app\.accounts/)
 assert.match(backend,/p\.status='approved'/)
 assert.match(backend,/app_private\.master_analytics_claim/)
 assert.match(backend,/app_private\.master_analytics_allowed/)
 assert.match(backend,/app_private\.master_analytics_finish/)
 assert.match(backend,/notification\.telegram\.chat/)
 assert.doesNotMatch(backend,/message_ciphertext|patient|diagnos/i)
})
test('all outbound sends require existing verified /start and separate master opt-in gate',()=>{
 const backend=file('lib/practitioners/master-analytics-service.js')
 const transport=file('lib/app/client-telegram-transport.js')
 const sql=file('supabase/migrations/20261021160544_hh_master_analytics_subscriptions_20261021.sql')
 assert.match(backend,/HH_MASTER_ANALYTICS_TG_ENABLED==='true'/)
 assert.match(backend,/telegramClientLinkReady\(env\)/)
 assert.match(backend,/claim\.target_chat_hash/)
 assert.match(transport,/export async function sendMasterAnalyticsTelegram/)
 assert.match(transport,/HH_MASTER_ANALYTICS_TG_ENABLED!=='true'/)
 assert.match(transport,/result\?\.chat\?\.id/)
 assert.match(sql,/join app_private\.notification_telegram_links l/)
 assert.match(sql,/l\.consent_version='hh-tg-message-alerts-v1'/)
 assert.match(sql,/on conflict do nothing/)
 assert.match(sql,/force row level security/gi)
 assert.match(sql,/revoke all on function app_private\.master_analytics_claim/)
 assert.match(sql,/grant execute on function app_private\.master_analytics_claim/)
 assert.match(sql,/status='claimed'/)
 assert.doesNotMatch(sql,/grant .* on app_private\.practitioner_analytics_subscriptions to (anon|authenticated)/i)
})
test('existing daily cron is reused with separate feature flag; no extra Vercel cron/billing',()=>{
 const vercel=JSON.parse(file('vercel.json'))
 assert.equal(vercel.crons.length,3)
 assert.equal(vercel.crons.filter(x=>x.path==='/api/internal/practice-telegram-digest').length,1)
 const cron=file('app/api/internal/practice-telegram-digest/route.js')
 assert.match(cron,/cronAuthorized\(request,process\.env\)/)
 assert.match(cron,/masterAnalyticsTelegramReady\(process\.env\)/)
 assert.match(cron,/scheduledMasterAnalyticsDigests\(config/)
 assert.match(cron,/deliverDailyPracticeDigest\(config/)
})
test('cabinet controls show confirmation, disconnect, previews, EN/RU/ES without exposing private recipients',()=>{
 const ui=file('components/app/practice-analytics-subscriptions.jsx')
 const stats=file('components/app/practice-service-statistics.jsx')
 const dashboard=file('components/app/practice-workspace.jsx')
 assert.match(ui,/Confirm preferences/)
 assert.match(ui,/Подтвердить подписку/)
 assert.match(ui,/Confirmar suscripción/)
 assert.match(ui,/begin_telegram/)
 assert.match(ui,/notification-channels/)
 assert.match(ui,/practice-analytics-notifications/)
 assert.match(ui,/send_now/)
 assert.match(ui,/disable/)
 assert.match(ui,/consent/)
 assert.match(stats,/PracticeAnalyticsSubscriptions/)
 assert.match(dashboard,/accountId=\{accountId\}/)
})
