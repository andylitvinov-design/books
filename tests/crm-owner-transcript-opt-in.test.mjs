import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
test('client opts into and can stop future CRM sharing; STOP always wins',()=>{
 const bot=src('lib/crm/telegram-companion-service.js')
 const policy=src('lib/crm/telegram-chat-policy.js')
 assert.match(bot,/\/share_chat/)
 assert.match(bot,/\/stop_share/)
 assert.match(bot,/const chat=stop\?/)
 assert.match(bot,/ingestMessengerUpdate\('telegram'/)
 assert.match(bot,/!event\.isTelegramVoice/)
 assert.match(policy,/app_private\.crm_msg_bot_chat_mode_v1/)
 assert.match(policy,/action='peek'/)
})
test('assistant messages are archived only after provider acceptance',()=>{
 const provider=src('lib/crm/messenger-provider.js')
 const store=src('lib/crm/messenger-store.js')
 assert.match(provider,/archiveTelegramBotAcceptedReply/)
 assert.match(provider,/guardTelegramBotAutoReply/)
 assert.match(store,/sender:.*content\?\.sender==='bot'/s)
 assert.match(store,/historyShared:r\.transcript_shared_at!==null/)
})
test('DB role/consent rechecked and no public archive grants',()=>{
 const sql=src('supabase/migrations/20261119025000_hh_crm_consented_chat_archive_v1.sql')
 assert.match(sql,/transcript_shared_at IS NOT NULL AND t\.human_takeover_at IS NULL/)
 assert.match(sql,/ON CONFLICT \(thread_id,provider_hash\) DO NOTHING/)
 assert.match(sql,/GRANT EXECUTE ON FUNCTION app_private\.crm_msg_bot_archive_reply_v1/)
 assert.match(sql,/TO hh_app_inbox/)
 assert.doesNotMatch(sql,/GRANT EXECUTE ON FUNCTION .*\s+TO authenticated/s)
})
