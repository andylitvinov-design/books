import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('setup page requires owner session and only displays safe status',()=>{
 const s=read('app/admin/telegram-setup/page.js')
 assert.match(s,/requireAdminRequest\(\)/)
 assert.match(s,/redirect\('\/admin\/login'\)/)
 assert.match(s,/robots:\{index:false,follow:false\}/)
 assert.match(s,/ownerTelegramSetupStatus\(getAppConfig\(\)\)/)
 assert.match(s,/connectAndTestTelegramAction/)
 assert.doesNotMatch(s,/HH_PRACTICE_TG_BOT_TOKEN|\.chatId|chat_id\s*=/)
})
test('signed admin Server Actions are explicit, guarded, and preview-blocked',()=>{
 const s=read('app/admin/telegram-setup/actions.js')
 assert.match(s,/^'use server'/)
 assert.equal((s.match(/if\(!await requireAdminRequest\(\)\)/g)||[]).length,2)
 assert.match(s,/await ensureOwnerTelegramPairing\(config\)/)
 assert.match(s,/await sendOwnerTelegramTest\(config\)/)
 assert.match(s,/process\.env\.VERCEL_ENV==='preview'/)
 assert.doesNotMatch(s,/setWebhook|getUpdates|TELEGRAM_BOT_TOKEN|chat_id/)
})
test('neutral test is one-shot and verifies Bot API target before send',()=>{
 const s=read('lib/practitioners/telegram-owner-setup.js')
 assert.match(s,/verifyOwnerTelegram\(effective,fetcher\)/)
 assert.match(s,/ownerBotCredentials\(effective\)/)
 assert.match(s,/test_status is null/)
 assert.match(s,/status='paired'/)
 assert.match(s,/sendOwnerDocument\(/)
 assert.match(s,/uncertain_previously_attempted/)
 assert.match(s,/delivery_unconfirmed/)
 assert.doesNotMatch(s,/\bconsole\.|deleteWebhook\(|setWebhook\(/)
})
test('owner test database journal retains forced RLS and no personal content',()=>{
 const s=read('supabase/migrations/20261020172000_hh_owner_telegram_test_receipt_20261020.sql')
 assert.match(s,/test_status text/i)
 assert.match(s,/test_sent_at timestamptz/i)
 assert.match(s,/force row level security/i)
 assert.doesNotMatch(s,/TELEGRAM_BOT_TOKEN|chat_id|message_text|grant .* authenticated/i)
})
test('owner-friendly page is reachable from admin navigation and mobile friendly',()=>{
 assert.match(read('components/prescription-admin-header.jsx'),/href="\/admin\/telegram-setup"/)
 const css=read('app/admin/telegram-setup/telegram-setup.module.css')
 assert.match(css,/@media\(max-width:400px\)/)
 assert.match(css,/safe-area-inset-bottom/)
 assert.match(css,/:focus-visible/)
})
