import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {ownerBotCredentials,matchGatewayKey,validateGatewayPayload,verifyOwnerTelegram,sendOwnerDocument} from '../lib/practitioners/telegram-hub.mjs'
import {pickPublicCouncilReports,fetchPublicCouncilReports} from '../lib/practitioners/council-telegram-archive.mjs'

const env={HH_PRACTICE_TG_ENABLED:'true',
  HH_PRACTICE_TG_BOT_TOKEN:'12345678:ABCDEFGHIJKLMNOPQRSTUVXYZ12345678',
  HH_PRACTICE_TG_CHAT_ID:'999888777'}
const payload={mode:'report',title:'Council report',markdown:'# Report\n'.repeat(50),sources:['Gemini','Mistral']}
const fakeApi=(flags={})=>{
  const calls=[]
  const fetcher=async(url,init)=>{
    const u=String(url);calls.push({url:u,init})
    if(u.endsWith('/getMe'))return Response.json({ok:true,result:{is_bot:true,username:flags.badBot?'WrongBot':'Andydotbot'}})
    if(u.includes('/getChat?'))return Response.json({ok:true,result:{id:999888777,type:'private',username:flags.badOwner?'WrongOwner':'AndyTherapist'}})
    if(u.endsWith('/getWebhookInfo'))return Response.json({ok:true,result:{url:'https://example.com/old-webhook'}})
    if(u.endsWith('/sendDocument'))return Response.json({ok:true,result:{chat:{id:flags.badReceipt?123:999888777},message_id:1}})
    throw Error('Unexpected HTTP call')
  }
  return {calls,fetcher}
}
test('central configuration requires real token, numeric ID and strong separate relay key',()=>{
  assert.equal(ownerBotCredentials(env).chat,'999888777')
  assert.equal(ownerBotCredentials({...env,HH_PRACTICE_TG_CHAT_ID:'@AndyTherapist'}),null)
  assert.equal(matchGatewayKey('a'.repeat(48),'a'.repeat(48)),true)
  assert.equal(matchGatewayKey('b'.repeat(48),'a'.repeat(48)),false)
  assert.equal(matchGatewayKey('','a'.repeat(48)),false)
  assert.equal(validateGatewayPayload(payload),null)
  assert.ok(validateGatewayPayload({...payload,chat_id:'wrong'}))
  assert.ok(validateGatewayPayload({...payload,markdown:'x'.repeat(85001)}))
})
test('read-only Bot API identity verification never touches webhook or sends',async()=>{
  const v=fakeApi()
  const verified=await verifyOwnerTelegram(env,v.fetcher)
  assert.equal(verified.verified,true)
  assert.equal(verified.hasWebhook,true)
  assert.equal(v.calls.length,3)
  assert.ok(!v.calls.some(x=>x.url.includes('sendDocument')))
  assert.equal((await verifyOwnerTelegram(env,fakeApi({badOwner:true}).fetcher)).verified,false)
})
test('document only goes to fixed private owner after explicit opt-in',async()=>{
  const v=fakeApi()
  await assert.rejects(sendOwnerDocument(payload,{...env,HH_PRACTICE_TG_ENABLED:'false'},v.fetcher),/TELEGRAM_DISABLED/)
  assert.equal(v.calls.length,0)
  assert.equal((await sendOwnerDocument(payload,env,v.fetcher)).accepted,true)
  assert.equal(v.calls.length,4)
  assert.equal(v.calls[3].init.body.get('chat_id'),'999888777')
  await assert.rejects(sendOwnerDocument(payload,env,fakeApi({badBot:true}).fetcher),/TELEGRAM_IDENTITY_MISMATCH/)
  await assert.rejects(sendOwnerDocument(payload,env,fakeApi({badReceipt:true}).fetcher),/TELEGRAM_WRONG_RECIPIENT/)
})
const marker='<!-- HH-COUNCIL-DAILY:2026-10-19 -->'
const report='# Holistic House audit\n## Статус рецензентов\n'+('public site fact '.repeat(15))+
  '\n## Приоритизированное ТЗ\nFix HTML\n<!-- HH-COUNCIL-EVIDENCE -->\nJSON'
const comment=(login='github-actions[bot]',url='https://github.com/andylitvinov-design/ai-projects-brain/issues/242#issuecomment-1')=>({
  id:1,html_url:url,body:marker+'\n\n'+report,user:{login}
})
test('only authentic bot-authored public GitHub evidence is forwarded',async()=>{
  const data=pickPublicCouncilReports([comment(),comment('attacker'),comment('github-actions[bot]','https://evil.example/a')],
    {today:'2026-10-20',earliest:'2026-10-14'})
  assert.equal(data.length,1)
  assert.equal(data[0].date,'2026-10-19')
  assert.doesNotMatch(data[0].markdown,/HH-COUNCIL-EVIDENCE/)
  const calls=[]
  const remote=await fetchPublicCouncilReports({today:'2026-10-20',earliest:'2026-10-14'},
    async(url,opts)=>{calls.push({url,opts});return Response.json([comment()])})
  assert.equal(remote.length,1)
  assert.equal(calls[0].opts.headers.Authorization,undefined)
})
test('scheduler and private read/write boundaries retain existing cron jobs',()=>{
  const cfg=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'))
  assert.deepEqual(cfg.crons,[
    {path:'/api/internal/housekeeping',schedule:'0 5 * * *'},
    {path:'/api/internal/practice-telegram-digest',schedule:'0 13 * * *'},
    {path:'/api/internal/council-archive-telegram',schedule:'0 15 * * *'},
  ])
  const route=readFileSync(new URL('../app/api/internal/council-archive-telegram/route.js',import.meta.url),'utf8')
  const hub=readFileSync(new URL('../app/api/internal/telegram-hub/route.js',import.meta.url),'utf8')
  const core=readFileSync(new URL('../lib/practitioners/council-telegram-delivery.js',import.meta.url),'utf8')
  assert.match(route,/cronAuthorized/)
  assert.match(route,/PRIVATE_HEADERS/)
  assert.match(hub,/matchGatewayKey/)
  assert.match(hub,/SERVER_ONLY/)
  assert.match(core,/on conflict \(report_day\)/)
  assert.match(core,/status='failed'/)
  assert.match(core,/\{server:true\}/)
})
