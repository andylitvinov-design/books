import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHmac } from 'node:crypto'
import { verifyTelegramWebAppInitData } from '../lib/crm/telegram-webapp-auth.mjs'
import { buildTelegramCoachingSummary } from '../lib/coaching/diagnostic-enquiry.mjs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const TOKEN='123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567'
const NOW=Date.parse('2026-10-26T20:00:00Z')
const AUTH=Math.floor(NOW/1000)
const sign=(params,token=TOKEN)=>{
  const pairs=Object.entries(params)
  const checked=pairs.sort(([a],[b])=>a.localeCompare(b,'en'))
    .map(([key,value])=>key+'='+value).join('\n')
  const key=createHmac('sha256','WebAppData').update(token).digest()
  const hash=createHmac('sha256',key).update(checked).digest('hex')
  return new URLSearchParams([...pairs,['hash',hash]]).toString()
}
const payload=(overrides={})=>({auth_date:String(AUTH),
  user:JSON.stringify({id:123123123,first_name:'Client',language_code:'ru'}),...overrides})

test('only fresh signed Telegram Mini App data establishes a CRM identity',()=>{
  const valid=sign(payload())
  assert.deepEqual(verifyTelegramWebAppInitData(valid,TOKEN,NOW),
    {userId:'123123123',language:'ru',authDate:AUTH})
  assert.equal(verifyTelegramWebAppInitData(valid,TOKEN+'tampered',NOW),null)
  assert.equal(verifyTelegramWebAppInitData(valid,TOKEN,NOW+3*60*60*1000),null)
  assert.equal(verifyTelegramWebAppInitData(valid,TOKEN,NOW-3*60*1000),null)
  assert.equal(verifyTelegramWebAppInitData(sign(payload({auth_date:String(AUTH-9000)})),TOKEN,NOW),null)
  assert.equal(verifyTelegramWebAppInitData(sign(payload({user:JSON.stringify({id:123123123,is_bot:true})})),TOKEN,NOW),null)
  assert.equal(verifyTelegramWebAppInitData(valid+'&hash=0'.repeat(64),TOKEN,NOW),null)
  assert.equal(verifyTelegramWebAppInitData(valid+'&user='+encodeURIComponent('{}'),TOKEN,NOW),null)
  assert.equal(verifyTelegramWebAppInitData('topic=business',TOKEN,NOW),null)
})

test('Telegram questionnaire validates essential answers without contact fields',()=>{
  const input={operationId:'13b822f6-8d70-4b1c-b44e-d0c31ad1d82f',locale:'ru',offer:'free',topic:'business',
    name:'',city:'',answers:{request:'Нужна ясность',idealOutcome:'Принять решение',priorityQuestion:'С чего начать?'},
    questions:['Первый дополнительный вопрос'],confirmed:true}
  const result=buildTelegramCoachingSummary(input)
  assert.equal(result.referenceCode,'HH-13B822F68D70')
  assert.equal(result.topic,'business')
  assert.match(result.text,/Нужна ясность/)
  assert.match(result.text,/Первый дополнительный вопрос/)
  for(const bad of [
    {...input,confirmed:false},{...input,offer:'invalid'},
    {...input,answers:{request:'Нужна ясность'}},
    {...input,contact:{email:'guest@example.test'}},
    {...input,telegramUserId:'123123123'},
  ])assert.throws(()=>buildTelegramCoachingSummary(bad))
})

test('Mini App appends to the active encrypted Telegram thread, never creates a public lead',()=>{
  const backend=read('lib/crm/telegram-coaching-link.js')
  const api=read('app/api/coaching-diagnostic/telegram/route.js')
  const sql=read('supabase/migrations/20261026201600_hh_crm_tg_existing_thread_intake.sql')
  const provider=read('lib/crm/messenger-provider.js')
  const hook=read('lib/crm/messenger-webhook.js')
  const form=read('components/coaching-intake-form.tsx')
  assert.match(backend,/verifyTelegramWebAppInitData/)
  assert.match(backend,/session\.stage !== 'done'/)
  assert.match(backend,/session\.consent_at/)
  assert.match(backend,/crm_tg_existing_thread/)
  assert.match(backend,/crm_msg_ingest/)
  assert.match(backend,/seal\(\{/)
  assert.doesNotMatch(backend,/createPublicServiceEnquiry|insert into app\.crm_contacts|insert into app\.public_service_enquiries/)
  assert.match(api,/requireSameOrigin/)
  assert.match(api,/consumeRate/)
  assert.match(sql,/for share of t/)
  assert.match(sql,/grant execute on function app_private\.crm_tg_existing_thread\(text,text\) to hh_app_inbox/)
  assert.doesNotMatch(sql,/grant .* to (?:anon|authenticated)|disable row level security|drop table/i)
  assert.match(provider,/web_app:\{url:webAppUrl\}/)
  assert.match(provider,/holistichouse\\\.vercel\\\.app/)
  assert.match(hook,/webAppUrl:reply/)
  assert.match(form,/URLSearchParams\(window\.location\.hash\.slice\(1\)\)/)
  assert.match(form,/telegramStatus === "linked"/)
  assert.match(form,/telegramStatus !== "linked"/)
  assert.match(form,/contactConsent: true/)
})
