import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {interpretTelegramClientUpdate,telegramClientReplyRelayReady}
 from '../lib/app/client-telegram-policy.js'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const bot={message_id:17,from:{is_bot:true,username:'HolisticHouseNoticeBot'}}
const base={update_id:9184,message:{chat:{type:'private',id:12345678},
 from:{id:12345678},text:'Please confirm the agreed time.',date:1792778000,reply_to_message:bot}}

test('reply parser only accepts private user reply to platform bot message',()=>{
 const event=interpretTelegramClientUpdate(base)
 assert.equal(event?.type,'reply')
 assert.equal(event?.chatId,'12345678')
 assert.equal(event?.replyToMessageId,'17')
 assert.equal(event?.updateId,9184)
 assert.equal(event?.replyToBotUsername,'HolisticHouseNoticeBot')
 const reject=[
  {...base,update_id:'9184'},
  {...base,message:{...base.message,chat:{type:'group',id:12345678}}},
  {...base,message:{...base.message,from:{id:333}}},
  {...base,message:{...base.message,reply_to_message:{...bot,from:{is_bot:false,username:bot.from.username}}}},
  {...base,message:{...base.message,reply_to_message:{...bot,from:{is_bot:true}}}},
  {...base,message:{...base.message,reply_to_message:{...bot,message_id:0}}},
  {...base,message:{...base.message,text:'/command'}},
  {...base,message:{...base.message,text:'x'.repeat(1201)}},
  {...base,message:{...base.message,reply_to_message:undefined}},
 ]
 for(const update of reject) assert.equal(interpretTelegramClientUpdate(update),null)
})
test('relay stays OFF until both separate owner and regular Telegram gates pass',()=>{
 const baseEnv={HH_CLIENT_TG_BOT_TOKEN:'123456789:'+ 'a'.repeat(35),
   HH_CLIENT_TG_BOT_USERNAME:'HolisticHouseNoticeBot',
   HH_CLIENT_TG_LINK_ENABLED:'true',HH_CLIENT_TG_WEBHOOK_SECRET:'x'.repeat(40),
   HH_CLIENT_TG_SEND_APPROVED:'true',HH_CLIENT_TG_REPLY_RELAY_ENABLED:'true'}
 assert.equal(telegramClientReplyRelayReady(baseEnv),true)
 for(const change of [
  {HH_CLIENT_TG_REPLY_RELAY_ENABLED:'false'},
  {HH_CLIENT_TG_REPLY_RELAY_ENABLED:undefined},
  {HH_CLIENT_TG_SEND_APPROVED:'false'},
  {HH_CLIENT_TG_WEBHOOK_SECRET:''},
  {HH_CLIENT_TG_LINK_ENABLED:'false'},
 ]) assert.equal(telegramClientReplyRelayReady({...baseEnv,...change}),false)
})
test('new SQL is ciphertext-only, notification/chat-bound, consent gated and at-most-once',()=>{
 const sql=read('supabase/migrations/20261023181500_hh_customer_telegram_reply_relay.sql')
 assert.match(sql,/recipient_chat_hash/)
 assert.match(sql,/notification_tg_reply_target/)
 assert.match(sql,/notification_tg_reply_commit/)
 assert.match(sql,/SECURITY DEFINER/g)
 assert.match(sql,/SET search_path TO ''/g)
 assert.match(sql,/d.state='accepted'/)
 assert.match(sql,/d.provider_message_id=p_notice_message_id/)
 assert.match(sql,/l.chat_hash=p_chat_hash/)
 assert.match(sql,/r.account_id=d.account_id/)
 assert.match(sql,/m.author_role='practitioner'/)
 assert.match(sql,/m.author_account_id=p.trusted_auth_user_id/)
 assert.match(sql,/n.topics->>'messages'='true'/)
 assert.match(sql,/p.active=true/)
 assert.match(sql,/r.status in \('requested','contacted'\)/)
 assert.match(sql,/FOR UPDATE/)
 assert.match(sql,/on conflict do nothing/)
 assert.match(sql,/GRANT EXECUTE ON FUNCTION/)
 assert.match(sql,/TO hh_app_inbox/)
 assert.doesNotMatch(sql,/GRANT (SELECT|INSERT|UPDATE|DELETE) ON app\.practitioner_request_messages TO hh_app_inbox/i)
})
test('webhook persists only validated encrypted client text and protects provider status',()=>{
 const route=read('app/api/app/notification-channels/telegram/webhook/route.js')
 const store=read('lib/app/client-telegram-webhook.js')
 const dispatch=read('lib/app/client-telegram-dispatch.js')
 assert.match(route,/verifyClientTelegramSecret/)
 assert.match(route,/receiveOwnerAiTelegramWebhook/)
 assert.match(route,/dispatchPractitionerMessagePush/)
 assert.match(store,/telegramClientReplyRelayReady/)
 assert.match(store,/assertNoRelayContacts/)
 assert.match(store,/validateMessageText/)
 assert.match(store,/notification_tg_reply_target/)
 assert.match(store,/notification_tg_reply_commit/)
 assert.match(store,/operationHash/)
 assert.match(store,/seal\(\{text:body\}/)
 assert.match(dispatch,/notification_tg_dispatch_finish_bound/)
 assert.match(dispatch,/item.target_chat_hash/)
 assert.doesNotMatch(route,/request\.json\(\).*contact|sendMessage\([^)]*text:body/i)
})
