import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {getTorontoCompletedPeriod,makePracticeDigest} from '../lib/practitioners/daily-digest.mjs'
import {cronAuthorized} from '../lib/app/housekeeping-cron.js'
import {practiceTelegramConfigured,telegramSendMessage} from '../lib/practitioners/daily-telegram-transport.mjs'

const one={id:'s1',slug:'test-service',copy:{title:'Публичная услуга'}}
const two={id:'s2',slug:'second-service',copy:{title:'Вторая услуга'}}
const dates={yesterday:'2026-10-18',weekStart:'2026-10-12',timeZone:'America/Toronto'}

test('Toronto dates are completed local calendar days across spring and fall DST',()=>{
  const spring=getTorontoCompletedPeriod(new Date('2026-03-09T13:00:00Z'))
  assert.deepEqual(spring,{timeZone:'America/Toronto',today:'2026-03-09',yesterday:'2026-03-08',weekStart:'2026-03-02'})
  const fall=getTorontoCompletedPeriod(new Date('2026-11-02T14:00:00Z'))
  assert.deepEqual(fall,{timeZone:'America/Toronto',today:'2026-11-02',yesterday:'2026-11-01',weekStart:'2026-10-26'})
  assert.throws(()=>getTorontoCompletedPeriod(new Date(NaN)),/INVALID_DATE/)
})
test('only owned services are included; week differs from yesterday, future rows excluded',()=>{
  const report=makePracticeDigest({dates,services:[one,two],daily:[
    {serviceId:'s1',day:'2026-10-18',impressions:7,orders:2,whatsapp:1,telegram:3},
    {serviceId:'s2',day:'2026-10-12',impressions:4,orders:1,whatsapp:0,telegram:2},
    {serviceId:'foreign',day:'2026-10-18',impressions:999,orders:999},
    {serviceId:'s1',day:'2026-10-19',impressions:999,orders:999}
  ],counts:{newApp:2,newPublic:3,openApp:5,openPublic:1,published:2,pending:0}})
  assert.deepEqual(report.totals.yesterday,{impressions:7,orders:2,whatsapp:1,telegram:3})
  assert.deepEqual(report.totals.week,{impressions:11,orders:3,whatsapp:1,telegram:5})
  assert.match(report.text,/Новые заявки: 5/)
  assert.match(report.text,/Открытые заявки сейчас: 6/)
  assert.match(report.text,/Публичная услуга/)
  assert.doesNotMatch(report.text,/999/)
  assert.match(report.text,/не подтверждают отправку сообщения, запись или оплату/)
})
test('zero tracking is caveated and no personal notes leak into digest',()=>{
  const report=makePracticeDigest({dates,services:[{...one,clientEmail:'private@x',notes:'secret'}],daily:[],counts:{
    newApp:-4,newPublic:'NaN',contact:'private client',pending:0
  }})
  assert.match(report.text,/нет зарегистрированных действий/)
  assert.match(report.text,/не доказательство отсутствия посещений/)
  assert.doesNotMatch(report.text,/private@x|secret|private client/)
  assert.match(report.text,/Новые заявки: 0/)
})
test('bot schedule is daily and independent of the existing housekeeping job',()=>{
  const config=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'))
  assert.deepEqual(config.crons,[
    {path:'/api/internal/housekeeping',schedule:'0 5 * * *'},
    {path:'/api/internal/practice-telegram-digest',schedule:'0 13 * * *'},
  ])
})
test('cron owner auth denies anonymous caller and allows only correct CRON_SECRET',()=>{
  const request=new Request('https://holistichouse.vercel.app/api/internal/practice-telegram-digest')
  assert.equal(cronAuthorized(request,{CRON_SECRET:'synthetic-value'}),false)
  assert.equal(cronAuthorized(new Request(request.url,{headers:{authorization:'Bearer wrong'}}),{CRON_SECRET:'synthetic-value'}),false)
  assert.equal(cronAuthorized(new Request(request.url,{headers:{authorization:'Bearer synthetic-value'}}),{CRON_SECRET:'synthetic-value'}),true)
  assert.equal(cronAuthorized(new Request(request.url,{headers:{authorization:'Bearer synthetic-value'}}),{}),false)
})
test('cron route is fail-closed, no client data and safe bounded receipts',()=>{
  const source=readFileSync(new URL('../app/api/internal/practice-telegram-digest/route.js',import.meta.url),'utf8')
  const backend=readFileSync(new URL('../lib/practitioners/daily-telegram-digest.js',import.meta.url),'utf8')
  assert.match(source,/cronAuthorized\(request,process\.env\)/)
  assert.match(source,/practiceTelegramConfigured\(process\.env\)/)
  assert.match(source,/PRIVATE_HEADERS/)
  assert.match(backend,/hh_app_backend|\{server:true\}/)
  assert.match(backend,/claim_token/)
  assert.match(backend,/status='failed'/)
  assert.match(backend,/status='sending'/)
  assert.match(backend,/status='approved'/)
  const transport=readFileSync(new URL('../lib/practitioners/daily-telegram-transport.mjs',import.meta.url),'utf8')
  assert.match(transport,/TELEGRAM_NOT_ACCEPTED/)
  assert.doesNotMatch(source,/contact_ciphertext|description_ciphertext|message_ciphertext/)
})

test('Telegram is completely disabled without every secret and exact opt-in',()=>{
  const env={HH_PRACTICE_TG_ENABLED:'false',HH_PRACTICE_TG_BOT_TOKEN:'123456:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghi',HH_PRACTICE_TG_CHAT_ID:'999888777'}
  assert.equal(practiceTelegramConfigured(env),false)
  assert.equal(practiceTelegramConfigured({...env,HH_PRACTICE_TG_ENABLED:'true'}),true)
  assert.equal(practiceTelegramConfigured({...env,HH_PRACTICE_TG_ENABLED:'true',HH_PRACTICE_TG_CHAT_ID:''}),false)
})
test('Telegram reply must confirm exact target chat; no provider errors become success',async()=>{
  const env={HH_PRACTICE_TG_ENABLED:'true',HH_PRACTICE_TG_BOT_TOKEN:'123456:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghi',HH_PRACTICE_TG_CHAT_ID:'999888777'}
  const calls=[]
  const accepted=async (url,options)=>{
    calls.push({url,options})
    return Response.json({ok:true,result:{chat:{id:999888777},message_id:1}})
  }
  assert.equal(await telegramSendMessage('Публичные агрегаты',env,accepted),true)
  assert.equal(calls.length,1)
  assert.match(calls[0].url,/api\\.telegram\\.org\\/bot/)
  assert.equal(JSON.parse(calls[0].options.body).chat_id,'999888777')
  assert.doesNotMatch(calls[0].options.body,/clientEmail|diagnosis/)
  await assert.rejects(telegramSendMessage('test',env,async()=>Response.json({ok:true,result:{chat:{id:111}}})),/TELEGRAM_NOT_ACCEPTED/)
  await assert.rejects(telegramSendMessage('test',env,async()=>Response.json({ok:false},{status:429})),/TELEGRAM_HTTP_429/)
  await assert.rejects(telegramSendMessage('x'.repeat(4000),env,accepted),/DIGEST_INVALID/)
  assert.equal(calls.length,1)
})
