import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {
 COUNCIL_FOUR,COUNCIL_CHAIR,COUNCIL_FIVE,availableCouncilFive,
 inspectCouncilFive,reviewerPrompt,chairPrompt,runOwnerCouncilFive,
 formatOwnerCouncilFive
} from '../lib/practitioners/owner-ai-five.mjs'

const env={HH_COUNCIL_OPENROUTER_API_KEY:'test-only-not-real-key'}
const catalog=COUNCIL_FIVE.map(x=>({id:x.id,
 pricing:{prompt:'0',completion:'0',request:'0'},
 architecture:{input_modalities:['text'],output_modalities:['text']}}))
const question='Как улучшить главную страницу и конверсию бесплатного разбора Holistic House?'
const review='Предлагаю провести проверку реальной заявки через API до любых обещаний конверсии; измерить качество пути и состояние подтверждения, не выдумывая факты.'
const synthesis={
 answer:'Начните с подтверждаемого завершения бесплатной заявки и видимого статуса, прежде чем менять тексты или рекламу.',
 shared:[{point:'Обе модели предлагают проверять фактическое создание заявки',from:['product','engineering']}],
 differences:[{point:'UX предлагает компактный экран, критик требует прежде подтвердить данные',from:['ux','critic']}],
 actions:[{step:'Пройти гостевую форму и отправить тестовую заявку',
   why:'Проверить всю цепочку',
   check:'В CRM появляется ровно одна подтверждённая заявка по тестовому ID'}],
 unknowns:['Реальный отклик пользователей не измерялся']
}
const ok=(body,status=200)=>Response.json(body,{status})
function harness({models=catalog,fail=[],cost=0,wrongModel='',incomplete=false}={}){
 const requests=[],calls=[]
 const fetcher=async(url,opts)=>{
  const u=String(url),method=opts.method||'GET'
  requests.push({url:u,method})
  if(u.endsWith('/key'))return ok({data:{key_id:'synthetic-owner'}})
  if(u.endsWith('/models'))return ok({data:models})
  assert.equal(u,'https://openrouter.ai/api/v1/chat/completions')
  assert.equal(method,'POST')
  const b=JSON.parse(opts.body)
  assert.equal(b.provider.allow_fallbacks,false)
  assert.equal(b.provider.data_collection,'deny')
  assert.deepEqual(b.provider.max_price,{prompt:0,completion:0,request:0,image:0})
  assert.deepEqual(b.usage,{include:true})
  assert.equal(b.stream,false)
  assert.ok(COUNCIL_FIVE.some(x=>x.id===b.model),'no unknown/paid model')
  calls.push(b)
  if(fail.includes(b.model))return ok({},429)
  const content=b.model===COUNCIL_CHAIR.id?JSON.stringify(synthesis):review
  return ok({model:wrongModel||b.model,usage:{cost},choices:[{
   finish_reason:incomplete?'length':'stop',message:{content}}]})
 }
 return {fetcher,requests,calls}
}
test('four independent providers, five exact free model IDs and separate fifth chair',()=>{
 assert.equal(COUNCIL_FOUR.length,4)
 assert.equal(new Set(COUNCIL_FOUR.map(x=>x.id.split('/')[0])).size,4)
 assert.equal(new Set(COUNCIL_FIVE.map(x=>x.id)).size,5)
 assert.notEqual(COUNCIL_CHAIR.id,COUNCIL_FOUR[0].id)
 assert.ok(COUNCIL_FIVE.every(x=>x.id.endsWith(':free')))
 assert.deepEqual(availableCouncilFive(catalog).filter(x=>x.available).map(x=>x.id),
  COUNCIL_FIVE.map(x=>x.id))
})
test('GET preflight rejects paid/zero-unverified models without an inference request',async()=>{
 const altered=catalog.map((m,i)=>i===0?{...m,pricing:{prompt:'0',completion:'0.01'}}:m)
 const h=harness({models:altered})
 const check=await inspectCouncilFive(env,h.fetcher)
 assert.equal(check.status,'degraded');assert.deepEqual(check.missing,['ux'])
 assert.equal(check.enough,true)
 assert.equal(h.calls.length,0)
 const absent=harness()
 const nothing=await inspectCouncilFive({},absent.fetcher)
 assert.equal(nothing.status,'unavailable')
 assert.equal(absent.requests.length,0)
})
test('question is treated as data, role attribution is explicit and source consensus requires real replies',()=>{
 assert.match(reviewerPrompt(question,COUNCIL_FOUR[0]),/NOT_TESTED/)
 assert.match(reviewerPrompt(question,COUNCIL_FOUR[1]),/conversion/)
 assert.throws(()=>reviewerPrompt(question,{slot:'evil',id:'paid/model'}))
 assert.throws(()=>chairPrompt(question,{}),/NEED_TWO/)
 const two={ux:{status:'ok',model:COUNCIL_FOUR[0].id,text:review},
  product:{status:'ok',model:COUNCIL_FOUR[1].id,text:review}}
 const s=chairPrompt(question,two)
 assert.match(s,/FIFTH/)
 assert.match(s,/ux,product/)
 assert.doesNotMatch(s,/engineering","model"/)
})
test('one owner request returns FOUR genuine independent $0 answers then a FIFTH unique real $0 synthesis',async()=>{
 const h=harness()
 const result=await runOwnerCouncilFive(question,env,h.fetcher)
 assert.equal(result.status,'complete')
 assert.equal(result.count,4)
 assert.equal(result.synthesis.status,'ok')
 assert.equal(h.calls.length,5)
 assert.deepEqual(h.calls.slice(0,4).map(x=>x.model).sort(),COUNCIL_FOUR.map(x=>x.id).sort())
 assert.equal(h.calls[4].model,COUNCIL_CHAIR.id)
 const report=formatOwnerCouncilFive(question,result)
 assert.equal(report.complete,true)
 assert.match(report.short,/Реальные ответы: 4\/4/)
 assert.match(report.short,/Совпадения/)
 assert.match(report.short,/не проверялись|не измерялся|Не проверено/)
 assert.match(report.markdown,/North Mini Code/)
 assert.match(report.markdown,/Xing4/)
 assert.equal(report.sources.length,5)
 assert.ok(report.markdown.length<80000)
})
test('failed reviewer emits truthful 3/4 partial analysis; retries and paid fallback stay forbidden',async()=>{
 const h=harness({fail:[COUNCIL_FOUR[0].id]})
 const result=await runOwnerCouncilFive(question,env,h.fetcher)
 assert.equal(result.status,'partial')
 assert.equal(result.count,3)
 assert.equal(result.reviews.ux.status,'error')
 assert.equal(result.reviews.ux.reason,'HTTP 429')
 assert.equal(result.synthesis.status,'ok')
 assert.equal(h.calls.length,5,'exactly four attempted reviewers + one distinct synthesizer')
 const text=formatOwnerCouncilFive(question,result)
 assert.equal(text.complete,false)
 assert.match(text.markdown,/NO VERIFIED REPLY/)
 assert.match(text.short,/Нет ответа: ux/)
})
test('missing fifth model prevents all inference and never silently calls a different model',async()=>{
 const h=harness({models:catalog.filter(m=>m.id!==COUNCIL_CHAIR.id)})
 const result=await runOwnerCouncilFive(question,env,h.fetcher)
 assert.equal(result.status,'unavailable')
 assert.equal(h.calls.length,0)
 assert.match(result.check.missing.join(','),/chair/)
})
test('nonzero or unverified price, substituted model and truncated result never count as genuine replies',async()=>{
 for(const setup of [{cost:.01},{wrongModel:'nvidia/paid-mock'},{incomplete:true}]){
  const h=harness(setup)
  const result=await runOwnerCouncilFive(question,env,h.fetcher)
  assert.equal(result.count,0)
  assert.equal(result.synthesis.status,'unavailable')
  assert.equal(h.calls.length,4,'no fifth model after invalid reviewer replies')
  assert.equal(Object.values(result.reviews).every(v=>v.status==='error'),true)
 }
})
test('owner-only telegram route remains signed, idempotent, and never repoints existing webhook',()=>{
 const load=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
 const route=load('app/api/app/notification-channels/telegram/webhook/route.js')
 const service=load('lib/practitioners/owner-ai-telegram-service.js')
 const transport=load('lib/app/client-telegram-transport.js')
 assert.match(route,/verifyClientTelegramSecret/)
 assert.ok(route.indexOf('receiveOwnerTelegramAudioWebhook')<route.indexOf('parseOwnerAiUpdate(update)'))
 assert.match(service,/event.chatId!==credentials.chat\|\|event.userId!==credentials.chat/)
 assert.match(service,/claimUpdate\(config,event\)/)
 assert.match(service,/runOwnerCouncilFive\(event.question,aiEnv,fetcher\)/)
 assert.match(service,/sendOwnerDocument/)
 assert.match(transport,/TELEGRAM_WEBHOOK_ALREADY_IN_USE/)
})
