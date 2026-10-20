import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {TG_GUEST_NEWS_CONSENT,validGuestTelegramToken,
 validateGuestNewsOptIn,guestTelegramIpBucket} from '../lib/app/telegram-guest-news-policy.js'
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')

test('public opt-in requires a separate, affirmative and versioned news consent',()=>{
 const input={locale:'ru',noticeVersion:TG_GUEST_NEWS_CONSENT,permissionAccepted:true}
 assert.deepEqual(validateGuestNewsOptIn(input),{
  locale:'ru',noticeVersion:'hh-tg-guest-news-v1',
 })
 for(const bad of [
  {...input,permissionAccepted:false},
  {...input,noticeVersion:'hh-tg-message-alerts-v1'},
  {...input,medicalData:'not accepted'},
  {...input,locale:'de'},
  {},[],null,
 ])assert.throws(()=>validateGuestNewsOptIn(bad))
})
test('guest token has explicit namespace and cannot impersonate existing client token',()=>{
 assert.equal(validGuestTelegramToken('g_'+'a'.repeat(30)),true)
 assert.equal(validGuestTelegramToken('a'.repeat(32)),false)
 assert.equal(validGuestTelegramToken('g_'+'a'.repeat(29)),false)
 assert.equal(validGuestTelegramToken('g_'+'a'.repeat(31)),false)
 assert.equal(guestTelegramIpBucket('203.0.113.4, 10.0.0.1'),'203.0.113.4')
 assert.equal(guestTelegramIpBucket('raw-location-value!'),'unknown')
})
test('database is limited to trusted backend role, with RLS and one-year retention',()=>{
 const schema=file('supabase/migrations/20261020214705_hh_telegram_guest_tables_20261020.sql')
 const roles=file('supabase/migrations/20261020215003_hh_telegram_guest_server_only_policy_20261020.sql')
 const ttl=file('supabase/migrations/20261020215212_hh_telegram_guest_consent_retention_20261020.sql')
 assert.match(schema,/force row level security/ig)
 assert.match(schema,/revoke all on app_private\.notification_telegram_guest_requests/ig)
 assert.match(roles,/to hh_app_backend/i)
 assert.doesNotMatch(roles,/to (anon|authenticated)/i)
 assert.match(ttl,/365 days/)
 assert.match(ttl,/consent_expires_at/)
})
test('guest API cannot receive arbitrary chat IDs, requires same-origin and HttpOnly proof',()=>{
 const api=file('app/api/public/telegram-subscribe/route.js')
 const service=file('lib/app/telegram-guest-news.js')
 assert.match(api,/requireSameOrigin\(request,config\)/)
 assert.match(api,/readBody\(request,512\)/)
 assert.match(api,/httpOnly:true/)
 assert.match(api,/sameSite:'lax'/)
 assert.match(api,/maxAge:172800/)
 assert.match(api,/path:'\/api\/public\/telegram-subscribe'/)
 assert.match(api,/PRIVATE_HEADERS/)
 assert.match(api,/reply\(\{status:'pending',linkUrl:result\.linkUrl/)
 assert.match(service,/validateGuestNewsOptIn/)
 assert.match(service,/randomBytes\(22\)/)
 assert.match(service,/verifyClientBot\(env,\{requireWebhook:true\}\)/)
 assert.match(service,/consumeRate\(config,\{scope:'hh-tg-guest-news-global'\},100,3600\)/)
 assert.match(service,/consumeRate\(config,\{scope:'hh-tg-guest-news-ip',ipBucket\},4,900\)/)
 assert.match(service,/transaction\(config,null/)
 assert.match(service,/server:true/)
 assert.match(service,/consent_expires_at/)
 assert.match(service,/seal\(\{chatId\},guestContext\(row\.id\),config\)/)
 const maintenance=file('lib/app/maintenance.js')
 assert.match(maintenance,/notification_telegram_guest_requests/)
 assert.match(maintenance,/notification_telegram_guest_links/)
 assert.match(maintenance,/consent_expires_at<=now\(\)/)
 assert.match(maintenance,/for update skip locked/i)
 assert.doesNotMatch(service,/sendClientTelegramMessage|sendOwnerTelegramTestMessage|WHATSAPP_TOKEN/)
})
test('verified Start and STOP remain distinct from client private notifications',()=>{
 const webhook=file('lib/app/client-telegram-webhook.js')
 const service=file('lib/app/telegram-guest-news.js')
 assert.match(webhook,/validGuestTelegramToken\(event\.token\)/)
 assert.match(webhook,/confirmGuestNewsFromWebhook/)
 assert.match(webhook,/stopGuestNewsFromWebhook/)
 assert.match(webhook,/notification_tg_stop/)
 assert.match(webhook,/event\.type==='stop'\?30\*24\*60\*60\*1000/)
 assert.match(service,/verified_at is null and stopped_at is null/)
 assert.match(service,/for update/)
 assert.match(service,/delete from app_private\.notification_telegram_guest_links/)
 assert.match(service,/stopped_at=now\(\)/)
})
test('public subscription exists on real site EN/RU/ES with an unselected checkbox and STOP instructions',()=>{
 const contact=file('app/[locale]/contact/page.tsx')
 const page=file('app/[locale]/subscribe/telegram/page.tsx')
 const ui=file('components/public-telegram-news-optin.jsx')
 assert.match(contact,/PublicTelegramNewsOptIn/)
 assert.match(page,/publicLocales/)
 assert.match(page,/generateMetadata/)
 assert.match(page,/PublicTelegramNewsOptIn/)
 assert.match(ui,/useState\(false\)/)
 assert.match(ui,/permissionAccepted:true/)
 assert.match(ui,/TG_GUEST_NEWS_CONSENT/)
 assert.match(ui,/\/stop/)
 assert.match(ui,/en:\{/)
 assert.match(ui,/ru:\{/)
 assert.match(ui,/es:\{/)
 assert.match(ui,/get.*status|t\.check|refresh\(\)/)
})
