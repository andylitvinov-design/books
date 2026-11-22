import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8')
test('Daybook cron only runs behind its own explicit production send approval',()=>{
 const cron=read('app/api/internal/direct-message-push/route.js')
 const dispatcher=read('lib/app/daybook-daily-dispatch.js')
 assert.match(cron,/HH_DAYBOOK_DAILY_SEND_APPROVED==='true'/)
 assert.match(dispatcher,/VERCEL_ENV==='production'/)
 assert.match(dispatcher,/telegramClientSendReady/)
 assert.match(dispatcher,/daybook_daily_claim/)
 assert.match(dispatcher,/daybook_daily_ready/)
})
test('API requires verified account and same-origin write; no WhatsApp sends',()=>{
 const api=read('app/api/app/daybook-daily/route.js')
 assert.match(api,/auth\.verified\(\)/)
 assert.match(api,/requireSameOrigin/)
 assert.match(api,/ACCOUNT_CHANGED/)
 assert.doesNotMatch(read('lib/app/daybook-daily-dispatch.js'),/sendWhatsApp|wa\.me/)
})
test('private schema prevents double sends and public grants',()=>{
 const ddl=read('supabase/migrations/20261122185000_hh_daybook_daily_telegram_optin.sql')
 assert.match(ddl,/primary key\(account_id,local_day\)/)
 assert.match(ddl,/force row level security/)
 assert.match(ddl,/revoke all on app_private.daybook_daily_preferences/)
 assert.match(ddl,/for update of p,l,g/)
 assert.match(ddl,/consent_version='daybook-goal-to-messenger-v1'/)
})
