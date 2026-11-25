import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {telegramPromptFailureEvidence} from '../lib/crm/telegram-prompt-diagnostics.mjs'
const route=readFileSync(new URL('../app/api/app/crm/messenger/webhook/[provider]/route.js',import.meta.url),'utf8')
const digest=()=> 'ab'.repeat(32)
test('a refused Telegram prompt exposes only an HMAC event tag and an allowlisted status',()=>{
  const error={code:'PROVIDER_REJECTED',message:'secret response',to:'987654321',token:'secret'}
  const result=telegramPromptFailureEvidence('tg:123456',error,digest)
  assert.deepEqual(result,{status:'failed',reasonCode:'PROVIDER_REJECTED',eventHash:'abababababababab'})
  assert.doesNotMatch(JSON.stringify(result),/secret|987654321|123456/)
})
test('uncertain provider results never trigger a silent automatic resend',()=>{
  const result=telegramPromptFailureEvidence('tg:23',{code:'PROVIDER_STATUS_UNKNOWN'},digest)
  assert.equal(result.status,'unknown')
  assert.equal(result.reasonCode,'PROVIDER_STATUS_UNKNOWN')
  assert.match(route,/HH_CRM_TG_PROMPT_SEND_FAILED/)
  assert.match(route,/telegramPromptFailureEvidence\(event.eventId,error,/)
  assert.doesNotMatch(route,/retryTelegramDiagnosticPrompt|sendTelegramDiagnosticPrompt\(.+\)\s*\.\s*catch/)
})
test('policy blocks and malicious provider details are not passed to logging',()=>{
  assert.equal(telegramPromptFailureEvidence('tg:8',{code:'CONSENT_REQUIRED'},digest).status,'blocked')
  assert.deepEqual(
    telegramPromptFailureEvidence('tg:9',{code:'My token: SECRET\n123',message:'customer phone'},digest),
    {status:'unknown',reasonCode:'PROVIDER_STATUS_UNKNOWN',eventHash:'abababababababab'}
  )
  assert.match(route,/console\.error\('HH_CRM_TG_PROMPT_SEND_FAILED',evidence\)/)
  assert.doesNotMatch(route,/console\.error\([^)]*(event\.userId|intake\.to|intake\.reply)/)
})
test('invalid event IDs and internal digest failures expose no raw contact details',()=>{
  assert.equal(telegramPromptFailureEvidence('tg:BAD',{code:'PROVIDER_REJECTED'},digest).eventHash,null)
  assert.equal(telegramPromptFailureEvidence('tg:8',{code:'PROVIDER_REJECTED'},()=>{throw new Error('private')}).eventHash,null)
})
