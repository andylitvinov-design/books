import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ARGON_GATEWAY_MODEL,argonGatewayGate,argonQuestionAllowed,reviewArgonSynthesis
} from '../lib/practitioners/council-argon-gateway.mjs'
import {aggregateOwnerCouncil} from '../lib/practitioners/owner-ai-ensemble.mjs'

const env=Object.freeze({
  VERCEL_ENV:'production',
  VERCEL_OIDC_TOKEN:'synthetic-token-never-log',
  HH_COUNCIL_ARGON_GATEWAY_ENABLED:'true',
  HH_COUNCIL_ARGON_FREE_CREDITS_CONFIRMED:'true',
  HH_COUNCIL_ARGON_PROJECT_BUDGET_CONFIRMED:'true',
  HH_COUNCIL_ARGON_NO_TOPUP_CONFIRMED:'true',
  HH_COUNCIL_ARGON_PUBLIC_ONLY_CONFIRMED:'true'
})
const question='Как устранить сбой регистрации в публичной форме сайта?'
const prompt='Выполни синтез ответов двух настоящих моделей по опубликованному техническому отчёту.'
const synthesis={
  answer:'Сначала нужно зафиксировать серверное подтверждение отправки заявки в существующую CRM.',
  shared:[{point:'Два источника рекомендуют проверять серверную запись после отправки',
    from:['gemini','free']}],
  differences:[],
  actions:[{step:'Открыть форму и проверить серверный журнал при отправке',
    why:'Установить точную точку потери заявки',
    check:'Есть ровно одна запись заявки с успешным серверным receipt'}],
  unknowns:['Текущий результат реального E2E']
}
const reviews={
  gemini:{status:'ok',model:'gemini-3.8-flash',
    text:'Нужно проверить формы после отправки, дождаться подтверждения API.'},
  free:{status:'ok',model:'google/gemma-4-31b-it:free',
    text:'Нужно проверить одну CRM запись и idempotency в API на реальных запросах.'}
}
function harness({balance='2.00',responseModel=ARGON_GATEWAY_MODEL,finish='stop',
  http=200,body=JSON.stringify(synthesis),usage={total_tokens:1000},
  creditsStatus=200}={}){
  const requests=[]
  const fetcher=async(url,options)=>{
    const address=String(url)
    requests.push({url:address,method:options.method,options})
    if(address.endsWith('/credits'))
      return Response.json({balance},{status:creditsStatus})
    assert.equal(address,'https://ai-gateway.vercel.sh/v1/chat/completions')
    assert.equal(options.method,'POST')
    const input=JSON.parse(options.body)
    assert.equal(input.model,ARGON_GATEWAY_MODEL)
    assert.equal(input.stream,false)
    assert.equal(input.max_tokens,1536)
    assert.deepEqual(input.reasoning,{effort:'low'})
    assert.equal(input.messages[1].content,prompt)
    assert.equal(input.messages.length,2)
    assert.deepEqual(input.providerOptions,{gateway:{only:['google']}})
    return Response.json({
      model:responseModel,choices:[{finish_reason:finish,message:{content:body}}],
      usage
    },{status:http})
  }
  return {fetcher,requests}
}
test('four independent budget/privacy attestations and production gate fail closed',()=>{
  assert.deepEqual(argonGatewayGate({}),{ready:false,reason:'ARGON_DISABLED'})
  for(const key of [
    'HH_COUNCIL_ARGON_FREE_CREDITS_CONFIRMED',
    'HH_COUNCIL_ARGON_PROJECT_BUDGET_CONFIRMED',
    'HH_COUNCIL_ARGON_NO_TOPUP_CONFIRMED',
    'HH_COUNCIL_ARGON_PUBLIC_ONLY_CONFIRMED'
  ]){
    assert.equal(argonGatewayGate({...env,[key]:'false'}).ready,false,key)
  }
  assert.equal(argonGatewayGate({...env,VERCEL_ENV:'preview'}).ready,false)
  assert.equal(argonGatewayGate({...env,VERCEL_OIDC_TOKEN:''}).ready,false)
  assert.deepEqual(argonGatewayGate(env),{ready:true,auth:'oidc'})
  assert.equal(argonGatewayGate({...env,VERCEL_OIDC_TOKEN:'',
    AI_GATEWAY_API_KEY:'synthetic'}).ready,false)
  assert.deepEqual(argonGatewayGate({...env,VERCEL_OIDC_TOKEN:'',
    AI_GATEWAY_API_KEY:'synthetic',HH_COUNCIL_ARGON_API_KEY_BUDGET_CONFIRMED:'true'}),
  {ready:true,auth:'key'})
})
test('privacy hold catches personal emails, contacts, secrets, medical/clinical prompts',()=>{
  assert.equal(argonQuestionAllowed(question),true)
  for(const value of [
    'Секрет sk-'+'a'.repeat(32), 'Email personal@example.org',
    'телефон +1 647 555 0199', 'Пациент рассказал про симптомы',
    'Here are my blood pressure records','Какие у меня планы?', '', 'x'.repeat(2001)
  ])assert.equal(argonQuestionAllowed(value),false,value.slice(0,30))
})
test('disabled settings, preview or private question produce ZERO HTTP requests',async()=>{
  const h=harness()
  for(const [e,q]of [[{},question],[{...env,VERCEL_ENV:'preview'},question],
    [env,'Пациент: результаты анализов']] ){
    const r=await reviewArgonSynthesis(prompt,q,e,h.fetcher)
    assert.equal(r.status,'disabled')
  }
  assert.equal(h.requests.length,0)
  const leak=await reviewArgonSynthesis(
    prompt+' Содержимое ответа другой модели: secret@example.org',
    question,env,h.fetcher)
  assert.equal(leak.status,'disabled')
  assert.equal(h.requests.length,0)
})
test('missing/too-small/nonfree-looking balance stops before inference',async()=>{
  for(const balance of [null,0,0.01,0.099,-1,5.6,999,'5.5 USD','1e3','0x1','5..0',' 5','5,00',NaN]){
    const h=harness({balance})
    const r=await reviewArgonSynthesis(prompt,question,env,h.fetcher)
    assert.equal(r.status,'unavailable',String(balance))
    assert.equal(h.requests.length,1)
    assert.equal(h.requests[0].method,'GET')
  }
  const h=harness({creditsStatus:403})
  assert.match((await reviewArgonSynthesis(prompt,question,env,h.fetcher)).reason,
    /CREDITS_HTTP_403/)
  assert.equal(h.requests.length,1)
})
test('only an exact Argon STOP response with usage is accepted; never retries',async()=>{
  // Official Vercel API returns decimal strings, not numbers.
  const success=harness({balance:'5.00'})
  const r=await reviewArgonSynthesis(prompt,question,env,success.fetcher)
  assert.equal(r.status,'ok')
  assert.equal(r.model,ARGON_GATEWAY_MODEL)
  assert.equal(success.requests.length,2)
  assert.equal(success.requests[0].method,'GET')
  assert.equal(success.requests[1].method,'POST')
  for(const failure of [
    {http:402},{http:429},{http:503},{finish:'length'},
    {responseModel:'google/gemini-3.8-flash'},{body:'no'},{usage:{}}
  ]){
    const h=harness(failure)
    const result=await reviewArgonSynthesis(prompt,question,env,h.fetcher)
    assert.equal(result.status,'error',JSON.stringify(failure))
    assert.equal(h.requests.length,2,'No fallback and no retry')
    assert.equal(result.text,'')
    assert.doesNotMatch(JSON.stringify(result),/synthetic-token/)
  }
})
test('manual /all uses Argon only with two genuine free replies; valid JSON is attributed',async()=>{
  const h=harness()
  const nothing=await aggregateOwnerCouncil(question,
    {gemini:reviews.gemini},env,h.fetcher)
  assert.equal(nothing.status,'unavailable')
  assert.equal(h.requests.length,0)
  // This higher-level prompt is constructed by the existing validated Council,
  // so check what it sends rather than using the constant harness prompt.
  const fetcher=async(url,options)=>{
    if(String(url).endsWith('/credits'))
      return Response.json({balance:'2.00'})
    const body=JSON.parse(options.body)
    assert.match(body.messages[1].content,/НЕДОВЕРЕННЫЕ ДАННЫЕ|недоверенные данные/i)
    assert.match(body.messages[1].content,/gemma/)
    return Response.json({model:ARGON_GATEWAY_MODEL,
      choices:[{finish_reason:'stop',message:{content:JSON.stringify(synthesis)}}],
      usage:{total_tokens:720}})
  }
  const r=await aggregateOwnerCouncil(question,reviews,env,fetcher)
  assert.equal(r.status,'ok')
  assert.equal(r.model,ARGON_GATEWAY_MODEL)
  assert.match(r.text,/Синтез: google\/gemini-4-argon/)
  assert.match(r.text,/Почему: Установить/)
  assert.match(r.text,/Gemini \+ Free AI 1/)
})
test('bad Argon synthesis is rejected without a chargeable retry or fake consensus',async()=>{
  let posts=0
  const fetcher=async (url)=>{
    if(String(url).endsWith('/credits'))return Response.json({balance:'3.00'})
    posts++
    return Response.json({model:ARGON_GATEWAY_MODEL,usage:{total_tokens:900},
      choices:[{finish_reason:'stop',message:{content:'Этот достаточно длинный ответ не является корректным JSON документом.'}}]})
  }
  const result=await aggregateOwnerCouncil(question,reviews,env,fetcher)
  assert.equal(result.status,'error')
  assert.equal(result.reason,'INVALID_SYNTHESIS_FORMAT')
  assert.equal(posts,1)
})
