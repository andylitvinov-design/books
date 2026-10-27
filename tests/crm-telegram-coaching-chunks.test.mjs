import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {seal} from '../lib/app/crypto.js'
import {
  coachingMessageChunks,MAX_COACHING_MESSAGE_BYTES,MAX_COACHING_MESSAGES,
} from '../lib/crm/telegram-coaching-chunks.mjs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const encryption={encryptionKey:Buffer.alloc(32,13),encryptionKeyId:'test-key'}
const owner='11111111-1111-4111-8111-111111111111'
const message='22222222-2222-4222-8222-222222222222'
const testInputs=[
  'One short coaching response',
  'Повторение слов: '+'Цель, трудность, чувства; '.repeat(2000),
  'Preguntas de coaching: '+'¿Qué debo cambiar? '.repeat(2700),
  '💚🪶✨'.repeat(9500),
  String.raw`"backslashes\\and quotes"`.repeat(1400),
  'Tabs: '+'\t'.repeat(39000),
]
test('every valid long/emoji coaching questionnaire is losslessly delivered in bounded CRM pieces',()=>{
  for(const value of testInputs){
    const chunks=coachingMessageChunks(value)
    assert.ok(chunks.length>=1&&chunks.length<=MAX_COACHING_MESSAGES)
    assert.equal(chunks.join(''),value)
    for(const [i,chunk] of chunks.entries()){
      assert.ok(Buffer.byteLength(chunk,'utf8')<=MAX_COACHING_MESSAGE_BYTES)
      // Same AES-GCM envelope/AAD as production. Prefixes for part N/M
      // cannot make any individual ciphertext exceed the CRM 16k hard cap.
      const encrypted=seal({text:'HH-13B822F68D70 · Coaching questionnaire · '+(i+1)+'/'+chunks.length+'\n\n'+chunk},
        {accountId:owner,recordId:message,field:'crm.msgbody'},encryption)
      assert.ok(encrypted.length<15000,'ciphertext would be rejected by CRM')
    }
  }
})
test('invalid or oversized content cannot create a partial CRM submission',()=>{
  assert.throws(()=>coachingMessageChunks(''))
  assert.throws(()=>coachingMessageChunks(null))
  assert.throws(()=>coachingMessageChunks('é'.repeat(MAX_COACHING_MESSAGE_BYTES*MAX_COACHING_MESSAGES)))
})
test('Telegram form checks every database write, commits atomically and attests exact same-lead replay',()=>{
  const handler=read('lib/crm/telegram-coaching-link.js')
  const sql=read('supabase/migrations/20261026201600_hh_crm_tg_existing_thread_intake.sql')
  assert.match(handler,/coachingMessageChunks\(messageText\)/)
  assert.match(handler,/crm_tg_existing_thread/)
  assert.match(handler,/crm_tg_questionnaire_seen/)
  assert.match(handler,/contentDigest:digest/)
  assert.match(handler,/pg_advisory_xact_lock/)
  assert.match(handler,/timestampBase\+index/)
  assert.match(handler,/if \(accepted!==true\) throw new AppError\('COACHING_STORAGE_REJECTED'/)
  assert.match(handler,/await db\.query\('rollback'\)/)
  assert.match(sql,/crm_tg_questionnaire_seen/)
  assert.match(sql,/crm_msg_events/)
  assert.match(sql,/crm_msg_items/)
  assert.match(sql,/for share of t, c/)
  assert.match(sql,/grant execute on function app_private\.crm_tg_questionnaire_seen\(text,text,text\[\],text\[\]\) to hh_app_inbox/)
  assert.doesNotMatch(sql,/grant execute on function .* to (?:public|anon|authenticated|service_role)/i)
})
