import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {chooseTopFreeOpenRouterModels,askCouncilTelegram,
  inspectOpenRouterFreeAccess,reviewOpenRouterFree} from '../lib/practitioners/council-free-models.mjs'
import {aggregateOwnerCouncil,ownerEnsembleSynthesisPrompt,
  formatOwnerEnsembleSynthesis} from '../lib/practitioners/owner-ai-ensemble.mjs'

const reply=(data,status=200)=>Response.json(data,{status})
const models=[
  {id:'qwen/qwen3.8-27b:free',pricing:{prompt:'0',completion:'0'},
    architecture:{input_modalities:['text'],output_modalities:['text']}},
  {id:'thinkingmachines/inkling-small:free',pricing:{prompt:'0',completion:'0'},
    architecture:{input_modalities:['text'],output_modalities:['text']}},
  {id:'nvidia/nemotron-3-ultra-550b-a55b:free',pricing:{prompt:'0',completion:'0'},
    architecture:{input_modalities:['text'],output_modalities:['text']}},
  {id:'google/gemma-4-31b-it:free',pricing:{prompt:'0',completion:'0'},
    architecture:{input_modalities:['text'],output_modalities:['text']}},
  {id:'nvidia/nemotron-3.5-lightning:free',pricing:{prompt:'0',completion:'0'}},
  {id:'thinkingmachines/inkling:free',pricing:{prompt:'0',completion:'0.01'}},
  {id:'mistralai/mistral-nemo:free',pricing:{prompt:'0',completion:'0'}}
]
const sample=(id,text='Проверьте регистрацию на услугу: после отправки формы должна появиться подтверждённая заявка в CRM.')=>({
  status:'ok',model:id,text
})
const synth={
  answer:'Начните с исправления передачи заявки в CRM после бесплатной диагностики.',
  shared:[{point:'Проверять успешное создание заявки только по серверному receipt',
    from:['gemini','free']}],
  differences:[{point:'Первая модель предлагает упростить форму, вторая — протестировать серверную запись',
    from:['gemini','free']}],
  actions:[
    {step:'Открыть форму бесплатной диагностики и отправить тестовый запрос',
      why:'Выявить фактический разрыв между UI и CRM',
      check:'В CRM появляется одна запись с правильным статусом и временем'},
    {step:'Добавить сообщение о подтверждённой отправке после ответа сервера',
      why:'Исключить ошибочный призыв повторно отправить форму',
      check:'Клиент видит подтверждение только после успешного ответа API'}
  ],
  options:[
    {approach:'Упростить первый экран',advantage:'Меньше действий до отправки',
      limit:'Не гарантирует запись заявки в CRM'},
    {approach:'Сначала проверить серверный путь',advantage:'Выявляет коренную причину потери лидов',
      limit:'Не заменяет UX-проверку на телефоне'}
  ],
  risks:[{risk:'Показать успех без записанной заявки',
    mitigation:'Отображать подтверждение только после серверного receipt'}],
  unknowns:['Есть ли текущие серверные delivery receipts']
}
const results={
  gemini:sample('gemini-3.8-flash'),
  free:sample('qwen/qwen3.8-27b:free')
}
test('synthetic catalog ranks distinct $0 models and excludes banned provider logging terms',()=>{
  const top=chooseTopFreeOpenRouterModels(models)
  assert.deepEqual(top.map(m=>m.id),[
    'qwen/qwen3.8-27b:free',
    'google/gemma-4-31b-it:free'
  ])
  assert.ok(top.every(m=>!m.id.includes('mistralai')&&!m.id.includes('inkling')&&!m.id.includes('nemotron')))
  assert.equal(new Set(top.map(m=>m.id.split('/')[0])).size,2)
  assert.throws(()=>chooseTopFreeOpenRouterModels(models,0))
})
test('two independent OpenRouter completions are exactly $0 and actually name their own models',async()=>{
  const seen=[]
  const env={HH_COUNCIL_OPENROUTER_API_KEY:'synthetic'}
  const fetcher=async(url,opt)=>{
    const path=String(url)
    if(path.endsWith('/key'))return reply({data:{key_id:'synthetic-test'}})
    if(path.endsWith('/models'))return reply({data:models})
    const body=JSON.parse(opt.body)
    assert.deepEqual(body.provider.max_price,{prompt:0,completion:0,request:0,image:0})
    assert.equal(body.provider.allow_fallbacks,false)
    assert.equal(body.provider.data_collection,'deny')
    assert.equal(body.usage.include,true)
    seen.push(body.model)
    return reply({model:body.model,usage:{cost:0},choices:[{finish_reason:'stop',
      message:{content:'Совет: открывать форму и проверять CRM receipt после отправки.'}}]})
  }
  const check=await inspectOpenRouterFreeAccess(env,fetcher)
  assert.equal(check.status,'ready')
  assert.equal(check.secondModel,'google/gemma-4-31b-it:free')
  const r=await askCouncilTelegram('Проверь заявку','all',env,fetcher,{
    allowed:['free','free2']
  })
  assert.deepEqual(Object.keys(r).sort(),['free','free2'])
  assert.equal(r.free.status,'ok')
  assert.equal(r.free2.status,'ok')
  assert.notEqual(r.free.model,r.free2.model)
  assert.deepEqual(seen.sort(),[r.free.model,r.free2.model].sort())
})
test('one verified responder never triggers synthesis or invents a consensus',async()=>{
  let inference=0
  const r=await aggregateOwnerCouncil('Как проверить форму?',{
    gemini:results.gemini,free:{status:'error',reason:'HTTP 429'}
  },{},async()=>{inference++;throw Error('MUST NOT EXECUTE')})
  assert.equal(r.status,'unavailable')
  assert.equal(inference,0)
})
test('synthesis prefers proven zero-priced free model, not a second flaky Gemini request',async()=>{
  const prompt=ownerEnsembleSynthesisPrompt('Как улучшить вход?',results)
  assert.match(prompt,/НЕДОВЕРЕННЫЕ ДАННЫЕ/i)
  let completions=0
  const r=await aggregateOwnerCouncil('Как улучшить вход?',results,{
    HH_COUNCIL_GEMINI_API_KEY:'synthetic-google',
    HH_COUNCIL_GEMINI_FREE_TIER_CONFIRMED:'true',
    HH_COUNCIL_OPENROUTER_API_KEY:'synthetic-router'
  },async(url,opt)=>{
    const target=String(url)
    assert.doesNotMatch(target,/generativelanguage.googleapis.com/)
    if(target.endsWith('/key'))return reply({data:{key_id:'synthetic-test'}})
    if(target.endsWith('/models'))return reply({data:models})
    completions++
    const req=JSON.parse(opt.body)
    assert.equal(req.model,'qwen/qwen3.8-27b:free')
    assert.equal(req.provider.allow_fallbacks,false)
    assert.equal(req.provider.data_collection,'deny')
    assert.equal(req.provider.max_price.prompt,0)
    assert.match(req.messages[1].content,/crm/i)
    return reply({model:req.model,usage:{cost:0},choices:[{
      finish_reason:'stop',message:{content:JSON.stringify(synth)}
    }]})
  })
  assert.equal(completions,1)
  assert.equal(r.status,'ok')
  assert.equal(r.model,'qwen/qwen3.8-27b:free')
  assert.match(r.text,/🛠 Что конкретно сделать/)
  assert.match(r.text,/Проверить: В CRM появляется/)
  assert.match(r.text,/Альтернативы и ограничения/)
  assert.match(r.text,/Риски и защита/)
  assert.match(r.text,/Отображать подтверждение только после серверного receipt/)
  assert.match(r.text,/Gemini \+ Free AI 1/)
  assert.doesNotMatch(r.text,/Mistral/)
})
test('malformed, vague or fake attributed synthesis is rejected without invented model answer',()=>{
  for(const output of ['not json',
    JSON.stringify({...synth,actions:[]}),
    JSON.stringify({...synth,shared:[{point:'Fictional consensus',from:['gemini','mistral']}],
      actions:[{step:'не ясно',check:'нет'}]})]){
    assert.equal(formatOwnerEnsembleSynthesis(sample('gemini-3.8-flash',output),results),null)
  }
  const improper=JSON.stringify({...synth,shared:[
    {point:'Artificial agreement across imaginary models',from:['gemini','mistral']}
  ]})
  const text=formatOwnerEnsembleSynthesis(sample('gemini-3.8-flash',improper),results)
  assert.ok(text)
  assert.doesNotMatch(text,/Artificial agreement/)
  assert.match(text,/Проверить: В CRM появляется/)
})
test('webhook still exclusively validates signed Telegram, preserves audio and client flows',()=>{
  const code=readFileSync(new URL('../app/api/app/notification-channels/telegram/webhook/route.js',import.meta.url),'utf8')
  assert.match(code,/verifyClientTelegramSecret/)
  assert.match(code,/receiveOwnerTelegramAudioWebhook/)
  assert.match(code,/receiveOwnerAiTelegramWebhook/)
  assert.match(code,/receiveClientTelegramWebhook/)
  assert.match(code,/maxDuration=120/)
  assert.match(code,/NextResponse,after/)
  assert.match(code,/after\(async\(\)=>/)
  assert.ok(code.indexOf('verifyClientTelegramSecret')<code.indexOf('parseOwnerAiUpdate(update)'))
  assert.ok(code.indexOf('receiveOwnerTelegramAudioWebhook(config,update)')<
    code.indexOf('parseOwnerAiUpdate(update)'))
})
