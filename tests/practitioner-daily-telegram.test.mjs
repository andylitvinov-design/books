import test from 'node:test'
import assert from 'node:assert/strict'
// Include 09/12/15 slot and owner-revenue tests in the existing focused Telegram CI.
import './owner-telegram-daily-schedule.test.mjs'
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
    {path:'/api/internal/revenue-ideas-telegram',schedule:'0 13,14 * * *'},
    {path:'/api/internal/practice-telegram-digest',schedule:'0 13,14,19,20 * * *'},
    {path:'/api/internal/council-archive-telegram',schedule:'0 16,17 * * *'},
    {path:'/api/internal/market-intel-telegram',schedule:'0 18,19 * * *'},
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
  assert.match(source,/ensureOwnerTelegramPairing\(config\)/)
  assert.match(source,/practiceTelegramConfigured\(env\)/)
  assert.match(source,/resolvedOwnerTelegramEnv\(config\)/)
  assert.ok(source.includes("from '@/lib/practitioners/daily-telegram-transport.mjs'"))
  assert.ok(source.includes("from '@/lib/practitioners/daily-telegram-digest'"))
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
  assert.match(calls[0].url,/api[.]telegram[.]org[/]bot/)
  assert.equal(JSON.parse(calls[0].options.body).chat_id,'999888777')
  assert.doesNotMatch(calls[0].options.body,/clientEmail|diagnosis/)
  await assert.rejects(telegramSendMessage('test',env,async()=>Response.json({ok:true,result:{chat:{id:111}}})),/TELEGRAM_NOT_ACCEPTED/)
  await assert.rejects(telegramSendMessage('test',env,async()=>Response.json({ok:false},{status:429})),/TELEGRAM_HTTP_429/)
  await assert.rejects(telegramSendMessage('x'.repeat(4000),env,accepted),/DIGEST_INVALID/)
  assert.equal(calls.length,1)
})

test('owner digest counts tracked site CTA clicks without inventing visitors or traffic sources',()=>{
  const report=makePracticeDigest({dates,services:[one,two],daily:[
    {serviceId:'s1',day:dates.yesterday,impressions:14,orders:3,whatsapp:2,telegram:1,
      referrer:'https://untrusted.example/private',source:'fake_campaign'},
    {serviceId:'s2',day:dates.weekStart,impressions:4,orders:1,whatsapp:0,telegram:2},
    {serviceId:'foreign',day:dates.yesterday,orders:500,whatsapp:500,telegram:500}
  ],counts:{newApp:0,newPublic:0}})
  assert.match(report.text,/Вчера: 6 \(Заказать 3 · WhatsApp 2 · Telegram 1\)/)
  assert.match(report.text,/За 7 дней: 9 учтённых кликов/)
  assert.match(report.text,/пока нет данных по добровольным посещениям/)
  assert.match(report.text,/История до включения нового счётчика не восстановлена/)
  assert.match(report.text,/Учтены только кнопки услуг, не все клики на сайте/)
  assert.doesNotMatch(report.text,/untrusted\.example|fake_campaign|503|500/)
  assert.equal(report.totals.yesterday.orders,3)
  assert.equal(report.totals.week.whatsapp,2)
  assert.ok(report.text.length<=3900)
})
test('zero counted CTA clicks are not misreported as zero visits or zero Google traffic',()=>{
  const report=makePracticeDigest({dates,services:[one],daily:[]})
  assert.match(report.text,/Вчера: 0 \(Заказать 0 · WhatsApp 0 · Telegram 0\)/)
  assert.match(report.text,/посадочные страницы и источники: пока нет данных/i)
  assert.doesNotMatch(report.text,/Google: 0|посещений: 0/)
})

test('owner digest shows ranked public landing pages and coarse sources, never private URLs',()=>{
 const report=makePracticeDigest({dates,services:[one],daily:[],pageDaily:[
  {day:dates.yesterday,pagePath:'/en/services/alchemy-of-soul',source:'google-organic',landings:3,views:4,clicks:2},
  {day:dates.yesterday,pagePath:'/en/services/alchemy-of-soul',source:'telegram',landings:1,views:2,clicks:1},
  {day:dates.weekStart,pagePath:'/ru/academy',source:'direct',landings:7,views:11,clicks:4},
  {day:dates.yesterday,pagePath:'/en/app/private',source:'unknown',landings:999,views:999,clicks:999}
 ]})
 assert.match(report.text,/Вчера: просмотры 6 · входы 4 · клики 3/)
 assert.match(report.text,/За 7 дней: просмотры 17 · входы 11 · клики 7/)
 assert.match(report.text,/\/en\/services\/alchemy-of-soul/)
 assert.match(report.text,/Google поиск 3 · Telegram 1/)
 assert.doesNotMatch(report.text,/\/en\/app\/private|999|\/\?/)
 assert.ok(report.text.length<=3900)
})
