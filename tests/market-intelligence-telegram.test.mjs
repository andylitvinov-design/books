import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {
  pickPublicMarketIntelligenceReports,
  fetchPublicMarketIntelligenceReports
} from '../lib/practitioners/council-telegram-archive.mjs'
import {torontoReportDue} from '../lib/practitioners/owner-telegram-report-hours.mjs'

const date='2026-10-28'
const period={today:date,earliest:date}
const url='https://github.com/andylitvinov-design/ai-projects-brain/issues/242#issuecomment-12345'
const ideas=Array.from({length:5},(_,i)=>
  (i+1)+'. Проверить понятность бесплатного входа и измерить подтверждённые заявки. '+
  'Изменение существующего CTA, контрольная метрика, риски и публичное доказательство. '+
  'Не запускать рекламу или сбор чувствительных данных.').join('\n')
const markdown='# Holistic House | Market Intelligence | '+date+'\n'+
  'Сайт: https://holistichouse.vercel.app\n'+
  '## Рынок и тренды\nОдин VERIFIED источник и дата, без приписанных оплат.\n'+
  '## Конкуренты\nНаблюдение https://practicebetter.io/features/client-portal\n'+
  '## Пять приоритетов\n'+ideas+'\n'+
  '## ТЗ для Codex\nRepo books; использовать существующую CRM и тесты.\n'+
  '## Источники\nhttps://holistichouse.vercel.app/en/services\n'+
  '## Обновление стратегии\nGoogle Doc master; DOC_UPDATED.\n'+
  '## Ограничения\nЭто гипотезы, не реальные E2E-платежи. '.repeat(5)
const body='<!-- HH-MARKET-INTEL:'+date+' -->\n'+markdown+
  '\n<!-- HH-MARKET-INTEL-END -->'
const good={id:12345,html_url:url,user:{login:'andylitvinov-design'},body}

test('Market archive has exact owner identity, date, five ideas and final marker',()=>{
  assert.equal(pickPublicMarketIntelligenceReports([good],period).length,1)
  assert.equal(pickPublicMarketIntelligenceReports(
    [good,{...good,id:12346,html_url:url.replace('12345','12346')}],period).length,1)
  for(const item of [
    {...good,user:{login:'someone-else'}},
    {...good,html_url:'https://example.com/forged'},
    {...good,body:body+' malicious footer'},
    {...good,body:body.replace('## Источники','## Unverified')},
    {...good,body:body.replace('4. Проверить','6. Проверить')},
    {...good,body:body.replace('HH-MARKET-INTEL:'+date,'HH-MARKET-INTEL:2026-10-27')},
    {...good,body:body.replace('<!-- HH-MARKET-INTEL-END -->','')},
    {...good,body:body.replace('Holistic House | Market Intelligence','Another project')},
  ])assert.equal(pickPublicMarketIntelligenceReports([item],period).length,0)
})

test('Market source fetch reuses bounded GitHub issue source and cannot claim failed delivery',async()=>{
  const reports=await fetchPublicMarketIntelligenceReports(period,async(url,options)=>{
    assert.equal(options.method,'GET')
    assert.match(url,/since=2026-10-28/)
    return Response.json([good])
  })
  assert.equal(reports.length,1)
  assert.equal(reports[0].date,date)
  assert.equal(reports[0].url,url)
  await assert.rejects(
    fetchPublicMarketIntelligenceReports(period,async()=>Response.json({error:true},{status:429})),
    /HTTP_429/
  )
})

test('14:00 Toronto cron accepts only DST-correct UTC hours',()=>{
  assert.equal(torontoReportDue('market',new Date('2026-10-28T18:00:00Z')),true)
  assert.equal(torontoReportDue('market',new Date('2026-11-02T19:00:00Z')),true)
  assert.equal(torontoReportDue('market',new Date('2026-10-28T19:00:00Z')),false)
  assert.equal(torontoReportDue('market',new Date('2026-11-02T18:00:00Z')),false)
})

test('market report daily idempotency never auto-resends after a lost Telegram receipt',()=>{
  const sender=readFileSync(new URL('../lib/practitioners/market-intelligence-telegram-delivery.js',import.meta.url),'utf8')
  assert.match(sender,/on conflict\(report_day\) do nothing/)
  assert.doesNotMatch(sender,/on conflict\(report_day\) do update/)
  assert.doesNotMatch(sender,/claimed_at<now\(\)-interval '15 minutes'/)
  assert.match(sender,/if\(!token\)return \{status:'already_claimed'/)
  assert.match(sender,/await finish\(config,today,token,false\)/)
})

test('14:00 sender has private separate FORCE RLS and existing verified owner transport',()=>{
  const migration=readFileSync(new URL('../supabase/migrations/20261028165619_hh_owner_market_intel_telegram_receipt_20261028.sql',import.meta.url),'utf8')
  assert.match(migration,/owner_daily_market_intelligence_sends/)
  assert.match(migration,/force row level security/)
  assert.match(migration,/revoke all on table/)
  assert.match(migration,/public,anon,authenticated,service_role/)
  assert.match(migration,/to hh_app_backend/)
  const sender=readFileSync(new URL('../lib/practitioners/market-intelligence-telegram-delivery.js',import.meta.url),'utf8')
  assert.match(sender,/owner_daily_market_intelligence_sends/)
  assert.match(sender,/fetchPublicMarketIntelligenceReports/)
  assert.match(sender,/sendOwnerDocument/)
  assert.match(sender,/already_claimed/)
  assert.match(sender,/archive_comment_id/)
  const route=readFileSync(new URL('../app/api/internal/market-intel-telegram/route.js',import.meta.url),'utf8')
  assert.match(route,/cronAuthorized\(request,process\.env\)/)
  assert.match(route,/VERCEL_ENV==='preview'/)
  assert.match(route,/torontoReportDue\('market'\)/)
  assert.match(route,/ensureOwnerTelegramPairing\(config\)/)
  assert.match(route,/practiceTelegramConfigured\(env\)/)
})
