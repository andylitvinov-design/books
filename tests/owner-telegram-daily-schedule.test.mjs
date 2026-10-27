import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {torontoReportDue} from '../lib/practitioners/owner-telegram-report-hours.mjs'
import {pickPublicRevenueReports,fetchPublicRevenueReports} from '../lib/practitioners/council-telegram-archive.mjs'
import {composeChatgptTelegramReport} from '../lib/practitioners/chatgpt-telegram-report.mjs'

const date='2026-10-27'
const period={today:date,earliest:date}
const source='https://github.com/andylitvinov-design/ai-projects-brain/issues/242#issuecomment-12345'
const content='# Holistic House | 5 идей для роста выручки | '+date+
 '\n## Идеи\n'+Array.from({length:5},(_,i)=>`${i+1}. Идея: измеримая конверсия бесплатного входа в согласованную заявку; публичный источник и тест. `).join('\n')+
 '\n## Источники\nhttps://holistichouse.vercel.app/en/services'+
 '\n## Ограничения\nГипотеза, не реальные платежи.'
const body='<!-- HH-REVENUE-DAILY:'+date+' -->\n'+content+'\n<!-- HH-REVENUE-END -->'
const good={id:12345,html_url:source,user:{login:'andylitvinov-design'},body}

test('09/12/15 Toronto delivery slots stay constant through daylight saving change',()=>{
  for(const [slot,summer,winter] of [
    ['revenue','2026-10-27T13:00:00Z','2026-11-02T14:00:00Z'],
    ['strategy','2026-10-27T16:00:00Z','2026-11-02T17:00:00Z'],
    ['operations','2026-10-27T19:00:00Z','2026-11-02T20:00:00Z']]){
    assert.equal(torontoReportDue(slot,new Date(summer)),true)
    assert.equal(torontoReportDue(slot,new Date(winter)),true)
    assert.equal(torontoReportDue(slot,new Date(Date.parse(summer)+3600000)),false)
    assert.equal(torontoReportDue(slot,new Date(Date.parse(winter)-3600000)),false)
  }
  assert.throws(()=>torontoReportDue('unknown',new Date()),/INVALID_REPORT_SLOT/)
  assert.throws(()=>torontoReportDue('revenue',new Date(NaN)),/INVALID_DATE/)
})

test('only owner-signed, exact, bounded one-per-day public revenue comments can be sent',()=>{
  assert.equal(pickPublicRevenueReports([good],period).length,1)
  assert.equal(pickPublicRevenueReports([good,{...good,id:12346,html_url:source.replace('12345','12346')}],period).length,1)
  assert.equal(pickPublicRevenueReports([{...good,user:{login:'stranger'}}],period).length,0)
  assert.equal(pickPublicRevenueReports([{...good,body:body+' forged'}],period).length,0)
  assert.equal(pickPublicRevenueReports([{...good,body:body.replace('## Идеи','## Другие')}],period).length,0)
  assert.equal(pickPublicRevenueReports([{...good,html_url:'https://example.com/injected'}],period).length,0)
  assert.equal(pickPublicRevenueReports([{...good,body:body.replace(date,'2026-10-26')}],period).length,0)
})

test('public revenue fetch is bounded and never interprets HTTP failure as a delivered report',async()=>{
  let calls=0
  const result=await fetchPublicRevenueReports(period,async(url,opts)=>{
    calls++
    assert.match(url,/since=2026-10-27/)
    assert.equal(opts.method,'GET')
    return Response.json([good])
  })
  assert.equal(calls,1)
  assert.equal(result[0].url,source)
  await assert.rejects(fetchPublicRevenueReports(period,async()=>Response.json({error:'bad'},{status:429})),/HTTP_429/)
})

test('noon strategy content excludes technical scanner and unverifiable model output',()=>{
  const owner={date,markdown:'# Holistic House | ежедневный аудит | '+date+'\n'+
   '## Что проверено\n'+ 'Публичные маркетинг и SEO. '.repeat(25)+'\n'+
   '## Идея больших изменений\nЗадача и независимый тест.\n## Приоритеты\nИндекс.\n## Ограничения\nНет E2E.',
   url:source}
  const report=composeChatgptTelegramReport(owner,{focus:'strategy'})
  assert.match(report.markdown,/Большие изменения, маркетинг и SEO/)
  assert.match(report.markdown,/Идея больших изменений/)
  assert.equal(report.outcomes.gemini,'not_run')
  assert.doesNotMatch(report.markdown,/Итог отдельных этапов: ChatGPT/)
})

test('all cron paths authenticate and enforce Toronto slot, no anonymous or preview sends',()=>{
  const cron=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'))
  assert.deepEqual(cron.crons,[
    {path:'/api/internal/housekeeping',schedule:'0 5 * * *'},
    {path:'/api/internal/revenue-ideas-telegram',schedule:'0 13,14 * * *'},
    {path:'/api/internal/practice-telegram-digest',schedule:'0 13,14,19,20 * * *'},
    {path:'/api/internal/council-archive-telegram',schedule:'0 16,17 * * *'},
  ])
  for(const [route,slot] of [
    ['revenue-ideas-telegram','revenue'],
    ['practice-telegram-digest','operations'],
    ['council-archive-telegram','strategy']]){
    const source=readFileSync(new URL('../app/api/internal/'+route+'/route.js',import.meta.url),'utf8')
    assert.match(source,/cronAuthorized\(request,process\.env\)/)
    assert.ok(source.includes("torontoReportDue('"+slot+"')"))
    assert.match(source,/VERCEL_ENV==='preview'/)
    assert.match(source,/ensureOwnerTelegramPairing\(config\)/)
    assert.match(source,/practiceTelegramConfigured\(env\)/)
  }
})

test('the 09 receipt table is private FORCE RLS and independent from 12/15 delivery ledgers',()=>{
  const migration=readFileSync(new URL('../supabase/migrations/20261027083000_owner_daily_revenue_telegram_report.sql',import.meta.url),'utf8')
  assert.match(migration,/force row level security/)
  assert.match(migration,/to hh_app_backend/)
  assert.match(migration,/revoke all .*anon,authenticated,service_role/)
  const sender=readFileSync(new URL('../lib/practitioners/revenue-telegram-delivery.js',import.meta.url),'utf8')
  assert.match(sender,/owner_daily_revenue_sends/)
  assert.match(sender,/sendOwnerDocument/)
  assert.match(sender,/already_claimed/)
  assert.match(sender,/report\.date/)
})
