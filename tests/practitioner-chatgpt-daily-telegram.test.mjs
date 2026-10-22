import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {
  pickPublicChatgptReports,fetchPublicDailyArchives
} from '../lib/practitioners/council-telegram-archive.mjs'
import {composeChatgptTelegramReport} from '../lib/practitioners/chatgpt-telegram-report.mjs'

const day='2026-10-21'
const url='https://github.com/andylitvinov-design/ai-projects-brain/issues/242#issuecomment-101'
const audit=[
  '# Holistic House | ежедневный аудит | '+day,
  'Сайт: https://holistichouse.vercel.app',
  '## Что проверено',
  'Только публичные EN/RU/ES страницы, время ответа, заголовки, функции.',
  '## Приоритеты',
  'P1: проверить доступность карточек услуг и полный путь заявки. '.repeat(8),
  '## Ограничения',
  'CRM, личные сообщения, платежи и Google OAuth не тестировались,',
  'клиентские результаты и чувствительные данные не экспортировались.'
].join('\n')
const comment=(overrides={})=>({
  id:101,html_url:url,user:{login:'andylitvinov-design'},
  body:'<!-- HH-CHATGPT-DAILY:'+day+' -->\n'+audit+
    '\n<!-- HH-CHATGPT-END -->',
  ...overrides
})
const period={today:day,earliest:'2026-10-14'}

test('only verified existing-task author+date+content+GitHub URL enters Telegram queue',()=>{
  const approved=pickPublicChatgptReports([comment()],period)
  assert.equal(approved.length,1)
  assert.equal(approved[0].date,day)
  assert.equal(approved[0].markdown,audit)
  assert.equal(approved[0].url,url)
  for(const bad of [
    {user:{login:'github-actions[bot]'}},
    {user:{login:'attacker'}},
    {html_url:'https://evil.example/issues/242#issuecomment-101'},
    {body:comment().body.replace('HH-CHATGPT-DAILY:2026-10-21','HH-CHATGPT-DAILY:2026-10-22')},
    {body:comment().body.replace('## Ограничения','## Неверные проверки')},
    {body:comment().body.replace('<!-- HH-CHATGPT-END -->','')},
    {body:comment().body+' any trailing text'},
    {body:comment().body+'\n<!-- HH-CHATGPT-END -->'},
    {body:comment().body.replace('https://holistichouse.vercel.app','https://fake.invalid')},
    {id:0}
  ])assert.equal(pickPublicChatgptReports([comment(bad)],period).length,0)
})
test('same owner/day cannot be scheduled twice from duplicate Issue comments',()=>{
  const report=pickPublicChatgptReports([
    comment({id:103,html_url:url.replace('101','103')}),
    comment(),comment({id:102,html_url:url.replace('101','102')})
  ],period)
  assert.equal(report.length,1)
  assert.equal(report[0].id,101)
})
test('public archive reader reuses single fetch for Council and ChatGPT',async()=>{
  let requests=0
  const result=await fetchPublicDailyArchives(period,async(uri,opts)=>{
    requests++
    assert.match(String(uri),/\/issues\/242\/comments/)
    assert.equal(opts.method,'GET')
    assert.equal(opts.headers.Authorization,undefined)
    return Response.json([comment()])
  })
  assert.equal(requests,1)
  assert.equal(result.chatgpt.length,1)
  assert.equal(result.council.length,0)
})
test('daily owner report sends WITHOUT Gemini/Mistral but never fabricates reviews',()=>{
  const validated=pickPublicChatgptReports([comment()],period)[0]
  const out=composeChatgptTelegramReport(validated)
  assert.match(out.markdown,/Отчёт ChatGPT/)
  assert.ok(out.markdown.includes(audit))
  assert.match(out.markdown,/Дополнительные Gemini\/Mistral ответы НЕ подтверждены/)
  assert.equal(out.outcomes.chatgpt,'ok')
  assert.equal(out.outcomes.gemini,'not_run')
  assert.equal(out.outcomes.mistral,'not_run')
  assert.ok(!out.sources.some(x=>x.startsWith('real:')))
  assert.equal(out.sources.length,1)
})
test('independent model source is attached only when provider response was genuine',()=>{
  const entry=pickPublicChatgptReports([comment()],period)[0]
  const independent={
    sources:['GitHub public HTML facts','real:gemini-3.8-flash'],
    outcomes:{gemini:'ok',mistral:'unavailable'},
    markdown:'Genuine independent report '.repeat(20)
  }
  const r=composeChatgptTelegramReport(entry,{councilReview:independent})
  assert.ok(r.markdown.includes(independent.markdown))
  assert.ok(r.sources.includes('real:gemini-3.8-flash'))
  assert.equal(r.outcomes.gemini,'ok')
  assert.equal(r.outcomes.mistral,'unavailable')
  const fake=composeChatgptTelegramReport(entry,{councilReview:{
    sources:['GitHub public HTML facts'],outcomes:{gemini:'unavailable',mistral:'unavailable'},
    markdown:'NO ACTUAL AI'
  }})
  assert.equal(fake.outcomes.gemini,'not_run')
  assert.ok(!fake.markdown.includes('NO ACTUAL AI'))
})
test('same existing private date receipt and cron handle ChatGPT, no new job or bot',()=>{
  const core=readFileSync(new URL('../lib/practitioners/council-telegram-delivery.js',import.meta.url),'utf8')
  const config=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'))
  assert.match(core,/fetchPublicDailyArchives\(/)
  assert.match(core,/composeChatgptTelegramReport\(entry.chatgpt/)
  assert.match(core,/model_setup_required/)
  assert.match(core,/return \{status:'accepted'/)
  assert.match(core,/on conflict \(report_day\)/)
  assert.match(core,/practiceTelegramConfigured\(env\)/)
  assert.match(core,/sendOwnerDocument\(/)
  assert.deepEqual(config.crons.filter(c=>c.path.includes('council-archive-telegram')),
    [{path:'/api/internal/council-archive-telegram',schedule:'0 21 * * *'}])
})
