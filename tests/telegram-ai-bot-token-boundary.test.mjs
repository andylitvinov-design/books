import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {sameTelegramBotToken} from '../lib/app/telegram-bot-token-boundary.mjs'
const token=n=>String(n)+':'+('a'.repeat(26))
test('same BotFather token, not just matching username or bot number',()=>{
 const a=token(1234567),b=token(7654321)
 assert.equal(sameTelegramBotToken(a,a),true)
 for(const v of [b,a.slice(0,-1)+'b','',null,undefined,'not-a-token'])
  assert.equal(sameTelegramBotToken(a,v),false)
 assert.equal(sameTelegramBotToken('not-a-token','not-a-token'),false)
})
test('every AI queue lane gates client bot identity, video has extra consent',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
 const queue=read('lib/app/telegram-ai-queue.js')
 const binding=read('lib/app/telegram-ai-account-boundary.js')
 const worker=read('lib/app/telegram-ai-worker.js')
 assert.match(queue,/aiQueueClientBotIdentityReady\(env\)/)
 assert.match(binding,/telegramClientLinkReady\(env\)/)
 assert.match(binding,/sameTelegramBotToken\(env\.HH_CRM_MSG_TELEGRAM_TOKEN,verified\)/)
 assert.match(binding,/telegramPersonalVideoSendReady\(env\)&&aiQueueClientBotIdentityReady\(env\)/)
 assert.match(worker,/if\(!aiQueueEnabled\(env\)\)return \{status:'disabled'\}/)
 assert.match(worker,/env\.HH_AI_TELEGRAM_RENDER_BUDGET_APPROVED==='true'/)
})
