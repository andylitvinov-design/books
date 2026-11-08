import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {
 COUNCIL_FOUR,COUNCIL_CHAIR,COUNCIL_FIVE,availableCouncilFive,
 inspectCouncilFive,reviewerPrompt,chairPrompt,runOwnerCouncilFive,
 formatOwnerCouncilFive
} from '../lib/practitioners/owner-ai-five.mjs'

const env={HH_COUNCIL_OPENROUTER_API_KEY:'test-only-not-real-key'}
const argonEnv={...env,VERCEL_ENV:'production',VERCEL_OIDC_TOKEN:'synthetic-oidc-not-a-secret',
 HH_COUNCIL_ARGON_GATEWAY_ENABLED:'true',
 HH_COUNCIL_ARGON_FREE_CREDITS_CONFIRMED:'true',
 HH_COUNCIL_ARGON_PROJECT_BUDGET_CONFIRMED:'true',
 HH_COUNCIL_ARGON_NO_TOPUP_CONFIRMED:'true',
 HH_COUNCIL_ARGON_PUBLIC_ONLY_CONFIRMED:'true'}
const ARGON_ID='google/gemini-4-argon'
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
 assert.equal(COUNCIL_FIVE.some(x=>x.id.startsWith('nvidia/')),false,'privacy-logged NVIDIA free offers are excluded')
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
// Mocked BOTH providers; there is no live provider billing in CI.
function argonHarness({balance='2.00',creditStatus=200,postStatus=200,
  replyModel=ARGON_ID,replyText=JSON.stringify(synthesis),
  replies=undefined}={}){
 const free=harness(replies||{}),gateway=[]
 const fetcher=async(url,opts)=>{
  const u=String(url)
  if(!u.startsWith('https://ai-gateway.vercel.sh/'))
   return free.fetcher(url,opts)
  gateway.push({url:u,method:opts.method,options:opts})
  assert.match(opts.headers.authorization,/synthetic-oidc-not-a-secret/)
  if(u.endsWith('/credits'))return ok({balance},creditStatus)
  assert.equal(u,'https://ai-gateway.vercel.sh/v1/chat/completions')
  const b=JSON.parse(opts.body)
  assert.equal(b.model,ARGON_ID)
  assert.equal(b.max_tokens,1536)
  assert.equal(b.reasoning.effort,'low')
  assert.deepEqual(b.providerOptions,{gateway:{only:['google']}})
  assert.ok(b.messages[1].content.length<10000)
  assert.equal(b.messages.length,2)
  return ok({model:replyModel,usage:{total_tokens:645},
    choices:[{finish_reason:'stop',message:{content:replyText}}]},postStatus)
 }
 return {...free,gateway,fetcher}
}
test('Argon is the FIFTH model only with approved free Gateway credits; receipts name Argon',async()=>{
 const h=argonHarness()
 const run=await runOwnerCouncilFive(question,argonEnv,h.fetcher)
 assert.equal(run.status,'complete')
 assert.equal(run.count,4)
 assert.equal(run.synthesis.status,'ok')
 assert.equal(run.synthesis.model,ARGON_ID)
 assert.equal(h.calls.length,4,'only FOUR free reviewers; no sixth Gemma call')
 assert.deepEqual(h.gateway.map(x=>x.method),['GET','POST'])
 const report=formatOwnerCouncilFive(question,run)
 assert.match(report.short,/Главный аналитик: 1\/1 · google\/gemini-4-argon/)
 assert.match(report.markdown,/5th model · google\/gemini-4-argon/)
 assert.equal(report.sources.at(-1),ARGON_ID)
 assert.equal(report.sources.length,5)
 const service=readFileSync(new URL('../lib/practitioners/owner-ai-telegram-service.js',import.meta.url),'utf8')
 assert.match(service,/model:result\.synthesis\?\.model\|\|COUNCIL_CHAIR\.id/)
})
test('disallowed or disabled Argon makes no Gateway requests; free Gemma remains fifth',async()=>{
 for(const e of [{...env}, {...argonEnv,VERCEL_ENV:'preview'},
   {...argonEnv,HH_COUNCIL_ARGON_NO_TOPUP_CONFIRMED:'false'}]){
  const h=argonHarness()
  const run=await runOwnerCouncilFive(question,e,h.fetcher)
  assert.equal(run.synthesis.model,COUNCIL_CHAIR.id)
  assert.equal(run.synthesis.status,'ok')
  assert.equal(h.calls.length,5)
  assert.equal(h.gateway.length,0)
 }
 const generalQuestion='Как выразить творческую идею через метафору без личных данных?'
 const h=argonHarness()
 const r=await runOwnerCouncilFive(generalQuestion,argonEnv,h.fetcher)
 assert.equal(r.synthesis.model,COUNCIL_CHAIR.id)
 assert.equal(h.gateway.length,0)
})
test('no proven credit balance: zero paid inference, just one read-only preflight and free chair',async()=>{
 for(const config of [
  {balance:'not-free'}, {balance:'0.01'}, {balance:'50.00'}, {creditStatus:403}
 ]){
  const h=argonHarness(config)
  const run=await runOwnerCouncilFive(question,argonEnv,h.fetcher)
  assert.equal(run.status,'complete')
  assert.equal(run.synthesis.status,'ok')
  assert.equal(run.synthesis.model,COUNCIL_CHAIR.id)
  assert.match(run.synthesis.argonHold,/FREE_CREDIT_BALANCE_UNVERIFIED|CREDITS_HTTP_403/)
  assert.equal(h.gateway.length,1)
  assert.equal(h.gateway[0].method,'GET')
  assert.equal(h.calls.length,5,'fallback is only a catalog-verified $0 Gemma call')
  assert.match(formatOwnerCouncilFive(question,run).short,/Argon не запускался/)
 }
})
test('Argon request failure never retries or silently pays another model',async()=>{
 for(const config of [
  {postStatus:402},{postStatus:429},{postStatus:503},
  {replyModel:'google/gemini-3.1-pro'},
  {replyText:'invalid-json-source-return-without-proven-attribution'}
 ]){
  const h=argonHarness(config)
  const run=await runOwnerCouncilFive(question,argonEnv,h.fetcher)
  assert.equal(run.synthesis.status,'error')
  assert.equal(run.synthesis.model,ARGON_ID)
  assert.equal(run.status,'partial')
  assert.equal(h.calls.length,4)
  assert.deepEqual(h.gateway.map(x=>x.method),['GET','POST'])
  const report=formatOwnerCouncilFive(question,run)
  assert.equal(report.complete,false)
  assert.equal(report.sources.includes(ARGON_ID),false)
  assert.match(report.markdown,/NO VERIFIED SYNTHESIS/)
 }
})
test('Argon never called before two real independently accepted free reviews',async()=>{
 const h=argonHarness({replies:{fail:COUNCIL_FOUR.slice(1).map(r=>r.id)}})
 const run=await runOwnerCouncilFive(question,argonEnv,h.fetcher)
 assert.equal(run.count,1)
 assert.equal(run.synthesis.status,'unavailable')
 assert.equal(h.gateway.length,0)
 assert.equal(h.calls.length,4)
})
test('Argon prompt remains capped with all four long independent opinions',async()=>{
 const h=argonHarness()
 const long=(review+' ').repeat(37)
 const fetcher=async(url,options)=>{
  const u=String(url)
  if(u==='https://openrouter.ai/api/v1/chat/completions'){
   const b=JSON.parse(options.body)
   return ok({model:b.model,usage:{cost:0},choices:[{finish_reason:'stop',message:{content:long}}]})
  }
  return h.fetcher(url,options)
 }
 const r=await runOwnerCouncilFive(question,argonEnv,fetcher)
 assert.equal(r.synthesis.status,'ok')
 assert.equal(h.gateway.length,2)
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


test('missing pinned Qwen automatically selects verified Recursive Flint without inventing a sixth provider',async()=>{
 const alt='recursive/flint-v1.0:free'
 const models=[...catalog.filter(m=>m.id!==COUNCIL_FOUR[0].id),{
  id:alt,pricing:{prompt:'0',completion:'0',request:'0'},
  architecture:{input_modalities:['text'],output_modalities:['text']}}]
 const sent=[]
 const fetcher=async(url,options={})=>{
  const u=String(url)
  if(u.endsWith('/key'))return ok({data:{key_id:'test-owner'}})
  if(u.endsWith('/models'))return ok({data:models})
  const body=JSON.parse(options.body)
  sent.push(body)
  assert.equal(body.provider.data_collection,'deny')
  assert.equal(body.provider.allow_fallbacks,false)
  assert.equal(body.provider.max_price.prompt,0)
  const text=body.model===COUNCIL_CHAIR.id?JSON.stringify(synthesis):review
  return ok({model:body.model,usage:{cost:0},
   choices:[{finish_reason:'stop',message:{content:text}}]})
 }
 const run=await runOwnerCouncilFive(question,env,fetcher)
 assert.equal(run.status,'complete')
 assert.equal(run.count,4)
 assert.equal(run.reviews.ux.model,alt)
 assert.equal(run.synthesis.model,COUNCIL_CHAIR.id)
 assert.equal(run.check.status,'adapted')
 assert.equal(run.check.replacements[0].to,alt)
 assert.equal(sent.length,5)
 assert.equal(new Set(sent.map(x=>x.model.split('/')[0])).size,5)
 const rendered=formatOwnerCouncilFive(question,run)
 assert.match(rendered.markdown,/recursive\/flint-v1\.0:free/)
 assert.match(rendered.short,/Проверенные бесплатные замены/)
})
test('only strict-zero-priced approved backups are eligible; missing pinned chair can use Gemma 26B',async()=>{
 const alt='google/gemma-4-26b-a4b-it:free'
 const extras=[{id:alt,pricing:{prompt:'0',completion:'0',request:'0'},
  architecture:{input_modalities:['text'],output_modalities:['text']}}]
 const models=[...catalog.filter(m=>m.id!==COUNCIL_CHAIR.id),...extras]
 const sent=[]
 const fetcher=async(url,options={})=>{
  const u=String(url)
  if(u.endsWith('/key'))return ok({data:{key_id:'test-owner'}})
  if(u.endsWith('/models'))return ok({data:models})
  const b=JSON.parse(options.body);sent.push(b.model)
  return ok({model:b.model,usage:{cost:0},
   choices:[{finish_reason:'stop',message:{content:b.model===alt?JSON.stringify(synthesis):review}}]})
 }
 const run=await runOwnerCouncilFive(question,env,fetcher)
 assert.equal(run.status,'complete')
 assert.equal(run.synthesis.model,alt)
 assert.equal(sent.length,5)
 assert.equal(sent[4],alt)
 assert.equal(formatOwnerCouncilFive(question,run).sources.at(-1),alt)
 const priced=models.map(m=>m.id===alt?{...m,pricing:{prompt:'0.02',completion:'0'}}:m)
 const check=await inspectCouncilFive(env,async (url)=>{
  return String(url).endsWith('/key')?ok({data:{key_id:'test'}}):ok({data:priced})
 })
 assert.equal(check.enough,false)
 assert.deepEqual(check.missing,['chair'])
})
test('one unavailable or 429 free reviewer produces honest partial synthesis; no retry or paid routing',async()=>{
 const calls=[],alt='recursive/flint-v1.0:free'
 const models=[...catalog.filter(m=>m.id!==COUNCIL_FOUR[0].id),{
  id:alt,pricing:{prompt:'0',completion:'0'}}]
 const fetcher=async (url,options={})=>{
  const u=String(url)
  if(u.endsWith('/key'))return ok({data:{key_id:'synthetic'}})
  if(u.endsWith('/models'))return ok({data:models})
  const b=JSON.parse(options.body);calls.push(b.model)
  if(b.model===COUNCIL_FOUR[3].id)return ok({},429)
  return ok({model:b.model,usage:{cost:0},
   choices:[{finish_reason:'stop',
    message:{content:b.model===COUNCIL_CHAIR.id?JSON.stringify(synthesis):review}}]})
 }
 const run=await runOwnerCouncilFive(question,env,fetcher)
 assert.equal(run.status,'partial')
 assert.equal(run.count,3)
 assert.equal(run.reviews.critic.reason,'HTTP 429')
 assert.equal(run.synthesis.status,'ok')
 assert.equal(calls.length,5)
 assert.equal(calls.filter(x=>x===COUNCIL_FOUR[3].id).length,1)
 assert.match(formatOwnerCouncilFive(question,run).markdown,/NO VERIFIED REPLY/)
})

test('live 2/4 with fifth 429 shows genuine independent excerpts in Telegram',()=>{
 const run={status:'partial',check:{replacements:[]},count:2,
  reviews:{
   ux:{status:'error',model:COUNCIL_FOUR[0].id,reason:'truncated',text:''},
   product:{status:'ok',model:COUNCIL_FOUR[1].id,text:review+' Позиция продукта: тестируйте заявки.'},
   engineering:{status:'error',model:COUNCIL_FOUR[2].id,reason:'truncated',text:''},
   critic:{status:'ok',model:COUNCIL_FOUR[3].id,text:review+' Критик: проверяйте гипотезы.'}},
  synthesis:{status:'error',model:COUNCIL_CHAIR.id,reason:'HTTP 429'}}
 const r=formatOwnerCouncilFive(question,run)
 assert.equal(r.complete,false)
 assert.deepEqual(r.sources,[COUNCIL_FOUR[1].id,COUNCIL_FOUR[3].id])
 assert.match(r.short,/Реальные независимые заключения \(НЕ общий синтез\)/)
 assert.match(r.short,/Позиция продукта/)
 assert.match(r.short,/Критик: проверяйте/)
 assert.match(r.short,/HTTP 429/)
 assert.doesNotMatch(r.short,/🎯 Главный вывод/)
 assert.ok(r.short.length<=3850)
 assert.match(r.markdown,/NO VERIFIED SYNTHESIS: HTTP 429/)
})
test('no successful reviewers never invents independent opinions',()=>{
 const run={status:'partial',check:{},count:0,
  reviews:Object.fromEntries(COUNCIL_FOUR.map(r=>[r.slot,{status:'error',model:r.id,reason:'HTTP 429',text:''}])),
  synthesis:{status:'unavailable',model:COUNCIL_CHAIR.id,reason:'NEED_TWO_REAL_RESPONSES'}}
 const r=formatOwnerCouncilFive(question,run)
 assert.equal(r.sources.length,0)
 assert.doesNotMatch(r.short,/Реальные независимые заключения/)
 assert.match(r.short,/Реальные ответы: 0\/4/)
})
test('accepted zero-cost fallback keeps the true model identity in every source',()=>{
 const alt='recursive/flint-v1.0:free'
 const reviews={ux:{status:'ok',model:alt,text:review},
   product:{status:'ok',model:COUNCIL_FOUR[1].id,text:review}}
 const r=formatOwnerCouncilFive(question,{status:'partial',count:2,check:{replacements:[{slot:'ux',to:alt}]},
  reviews,synthesis:{status:'error',model:COUNCIL_CHAIR.id,reason:'HTTP 429'}})
 assert.equal(r.sources[0],alt)
 assert.ok(!r.sources.includes(COUNCIL_FOUR[0].id))
 assert.match(r.short,/recursive\/flint-v1\.0:free/)
 assert.match(chairPrompt(question,reviews),/recursive\/flint-v1\.0:free/)
 assert.doesNotMatch(chairPrompt(question,reviews),/qwen\/qwen3\.8-27b:free/)
})
test('truncated response is distinguished without repeat inference or paid fallback',async()=>{
 const calls=[],failed=COUNCIL_FOUR[0].id
 const f=async(url,opts={})=>{
  if(String(url).endsWith('/key'))return ok({data:{key_id:'fake'}})
  if(String(url).endsWith('/models'))return ok({data:catalog})
  const b=JSON.parse(opts.body);calls.push(b)
  assert.equal(b.provider.allow_fallbacks,false)
  assert.equal(b.provider.max_price.prompt,0)
  return ok({model:b.model,usage:{cost:0},choices:[{finish_reason:b.model===failed?'length':'stop',
   message:{content:b.model===COUNCIL_CHAIR.id?JSON.stringify(synthesis):review}}]})
 }
 const res=await runOwnerCouncilFive(question,env,f)
 assert.equal(res.count,3)
 assert.equal(res.reviews.ux.reason,'truncated')
 assert.equal(res.synthesis.status,'ok')
 assert.equal(calls.filter(x=>x.model===failed).length,1)
 assert.match(reviewerPrompt(question,COUNCIL_FOUR[0]),/up to 250 words/)
})
