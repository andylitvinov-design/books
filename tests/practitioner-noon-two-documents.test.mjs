import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {pickPublicChatgptReports} from '../lib/practitioners/council-telegram-archive.mjs'
import {splitNoonReports} from '../lib/practitioners/chatgpt-telegram-report.mjs'
import {sendOwnerDocumentPair} from '../lib/practitioners/telegram-hub.mjs'

const date='2026-10-28'
const url='https://github.com/andylitvinov-design/ai-projects-brain/issues/242#issuecomment-999'
const markdown=[
  '# Holistic House | ежедневный аудит | '+date,
  'Сайт: https://holistichouse.vercel.app',
  '## Что проверено',
  'Использованы только безопасные агрегированные данные, без персональных полей.',
  '## Маркетинг',
  'Проверенный маркетинговый приоритет — сделать путь согласованного обращения понятнее. '.repeat(7),
  '## SEO',
  'Аналитика не даёт подтверждённых посетителей, поэтому нельзя придумать источники или страницы. '.repeat(7),
  '## Приоритеты',
  'Сохранить две независимые части, не смешивать с техническим дневным дайджестом.',
  '## Ограничения',
  'Не отправлять данные клиентов; проверка доставки только после ответа Telegram API.'
].join('\n')
const comment={
  id:999,html_url:url,user:{login:'andylitvinov-design'},
  body:'<!-- HH-CHATGPT-DAILY:'+date+' -->\n'+markdown+'\n<!-- HH-CHATGPT-END -->'
}
const env={HH_PRACTICE_TG_ENABLED:'true',
  HH_PRACTICE_TG_BOT_TOKEN:'12345678:ABCDEFGHIJKLMNOPQRSTUVXYZ12345678',
  HH_PRACTICE_TG_CHAT_ID:'999888777'}

test('only a validated owner source splits into distinct marketing and SEO files',()=>{
  const owner=pickPublicChatgptReports([comment],{today:date,earliest:date})[0]
  assert.ok(owner)
  const pair=splitNoonReports(owner)
  assert.equal(pair.length,2)
  assert.match(pair[0].markdown,/Holistic House — Маркетинг/)
  assert.match(pair[0].markdown,/маркетинговый приоритет/)
  assert.doesNotMatch(pair[0].markdown,/Аналитика не даёт/)
  assert.match(pair[1].markdown,/Holistic House — SEO/)
  assert.match(pair[1].markdown,/Аналитика не даёт/)
  assert.doesNotMatch(pair[1].markdown,/маркетинговый приоритет/)
  assert.ok(pair.every(part=>part.markdown.includes(url)))
  assert.ok(pair.every(part=>!part.markdown.includes('## Ограничения')))
  assert.equal(splitNoonReports({...owner,markdown:markdown.replace('## SEO','## Seo missing')}),null)
  assert.equal(splitNoonReports({...owner,markdown:markdown.replace('## Приоритеты','## SEO\nAnother SEO entry\n## Приоритеты')}),null)
  assert.equal(splitNoonReports({...owner,url:'https://evil.example'}),null)
  assert.equal(splitNoonReports({...owner,markdown:'# Old combined report'.repeat(30)}),null)
})

function fakeTelegram({badRecipient=false,shortReply=false,badOwner=false}={}){
  const requests=[]
  const fetcher=async(url,init)=>{
    const u=String(url)
    requests.push({url:u,init})
    if(u.endsWith('/getMe'))return Response.json({ok:true,result:{is_bot:true,username:'Andydotbot'}})
    if(u.includes('/getChat?'))return Response.json({ok:true,result:{id:999888777,type:'private',username:badOwner?'wrong':'AndyTherapist'}})
    if(u.endsWith('/getWebhookInfo'))return Response.json({ok:true,result:{url:''}})
    if(u.endsWith('/sendMediaGroup'))return Response.json({ok:true,result:[
      {chat:{id:badRecipient?123:999888777},document:{file_name:'holistic-house-marketing-'+date+'.md'}},
      ...shortReply?[]:[{chat:{id:999888777},document:{file_name:'holistic-house-seo-'+date+'.md'}}]
    ]})
    throw Error('Unexpected Telegram request: '+u)
  }
  return {requests,fetcher}
}

test('Telegram sends one 2-document group after bot+owner identity verification',async()=>{
  const pair=splitNoonReports({date,url,markdown})
  const v=fakeTelegram()
  const outcome=await sendOwnerDocumentPair(pair,date,env,v.fetcher)
  assert.equal(outcome.accepted,true)
  assert.equal(outcome.documents,2)
  assert.equal(v.requests.length,4)
  const send=v.requests[3]
  assert.match(send.url,/\/sendMediaGroup$/)
  assert.equal(send.init.method,'POST')
  const form=send.init.body
  assert.equal(form.get('chat_id'),env.HH_PRACTICE_TG_CHAT_ID)
  const media=JSON.parse(form.get('media'))
  assert.deepEqual(media.map(item=>item.type),['document','document'])
  assert.deepEqual(media.map(item=>item.media),['attach://report_0','attach://report_1'])
  assert.equal(form.get('report_0').name,'holistic-house-marketing-'+date+'.md')
  assert.equal(form.get('report_1').name,'holistic-house-seo-'+date+'.md')
  assert.equal(await form.get('report_0').text(),pair[0].markdown)
  assert.equal(await form.get('report_1').text(),pair[1].markdown)
  assert.equal(v.requests.some(req=>req.url.includes('/sendDocument')),false)
})

test('no send without opt-in, two files and verified private recipient',async()=>{
  const pair=splitNoonReports({date,url,markdown})
  const notOpted=fakeTelegram()
  await assert.rejects(sendOwnerDocumentPair(pair,date,
    {...env,HH_PRACTICE_TG_ENABLED:'false'},notOpted.fetcher),/TELEGRAM_DISABLED/)
  assert.equal(notOpted.requests.length,0)
  await assert.rejects(sendOwnerDocumentPair([pair[0]],date,env,fakeTelegram().fetcher),/TELEGRAM_PAYLOAD_INVALID/)
  const wrong=fakeTelegram({badOwner:true})
  await assert.rejects(sendOwnerDocumentPair(pair,date,env,wrong.fetcher),/TELEGRAM_IDENTITY_MISMATCH/)
  assert.equal(wrong.requests.length,3)
  await assert.rejects(sendOwnerDocumentPair(pair,date,env,fakeTelegram({badRecipient:true}).fetcher),/TELEGRAM_WRONG_RECIPIENT/)
  await assert.rejects(sendOwnerDocumentPair(pair,date,env,fakeTelegram({shortReply:true}).fetcher),/TELEGRAM_WRONG_RECIPIENT/)
})

test('12:00 pairing reuses old receipt/cron; 15:00 remains a single technical file',()=>{
  const delivery=readFileSync(new URL('../lib/practitioners/council-telegram-delivery.js',import.meta.url),'utf8')
  const cfg=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'))
  assert.match(delivery,/on conflict \(report_day\)/)
  assert.match(delivery,/strategyOnly&&entry.chatgpt/)
  assert.match(delivery,/sendOwnerDocumentPair\(noonPair,entry.date,env,fetcher\)/)
  assert.match(delivery,/await sendOwnerDocument\(\{/)
  assert.deepEqual(cfg.crons.filter(item=>item.path.includes('council-archive-telegram')),
    [{path:'/api/internal/council-archive-telegram',schedule:'0 16,17 * * *'}])
})
