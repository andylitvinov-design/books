import test from 'node:test'
import './coach-semantic-evidence.test.mjs'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {coachingGroqConfig,verifiedGroqCoachingReply,coachGroqReasoningEffort,GROQ_COACH_MODEL} from '../lib/coaching/groq-coach-provider.mjs'
import {normalizeGenerativeCoachInput} from '../lib/coaching/generative-persona.mjs'
import {parseConversationalCoachReply,conversationalCoachMessages} from '../lib/coaching/conversational-persona.mjs'
import {coachDialoguePolicy} from '../lib/coaching/unified-coach-policy.mjs'
const key='gsk_'+('x'.repeat(38))
const enabled={HH_COACHING_GROQ_ENABLED:'true',HH_COACHING_GROQ_ZDR_CONFIRMED:'true',
  HH_COACHING_GROQ_FREE_TIER_CONFIRMED:'true',HH_FIRST_VIDEO_GROQ_API_KEY:key}
const messages=[{role:'system',content:'Reply in JSON.'},{role:'user',content:'Hello'}]
const answer=JSON.stringify({message:'What would you like to focus on today?',planSuggestion:'',evidenceQuote:''})
const valid={model:GROQ_COACH_MODEL,choices:[{finish_reason:'stop',message:{role:'assistant',content:answer}}]}
const mock=(status=200,content=valid)=>async (_url,init)=>({status,ok:status>=200&&status<300,
  text:async()=>JSON.stringify(content)})

test('the Groq model is locked; OFF without all three owner/privacy/cost gates and a server key',()=>{
  assert.equal(coachingGroqConfig({}),null)
  for(const flag of ['HH_COACHING_GROQ_ENABLED','HH_COACHING_GROQ_ZDR_CONFIRMED','HH_COACHING_GROQ_FREE_TIER_CONFIRMED']) {
    const env={...enabled}; delete env[flag]
    assert.equal(coachingGroqConfig(env),null,flag)
  }
  assert.equal(coachingGroqConfig({...enabled,HH_FIRST_VIDEO_GROQ_API_KEY:'bad'}),null)
  assert.equal(coachingGroqConfig(enabled).preferredModel,GROQ_COACH_MODEL)
})

test('only server-side Groq JSON completion, no reasoning transcript or automatic provider fallback',async()=>{
  const provider=coachingGroqConfig(enabled)
  let calls=0
  const result=await verifiedGroqCoachingReply(provider,{messages},async (url,options)=>{
    calls++
    assert.equal(url,'https://api.groq.com/openai/v1/chat/completions')
    assert.equal(options.method,'POST')
    assert.equal(options.headers.Authorization,'Bearer '+key)
    const request=JSON.parse(options.body)
    assert.equal(request.model,GROQ_COACH_MODEL)
    assert.equal(request.include_reasoning,false)
    assert.equal(request.reasoning_effort,'low')
    assert.equal(request.temperature,0.6)
    assert.equal(request.response_format.type,'json_schema')
    assert.equal(request.response_format.json_schema.strict,true)
    const schema=request.response_format.json_schema.schema
    assert.equal(schema.type,'object')
    assert.equal(schema.additionalProperties,false)
    assert.deepEqual(schema.required,['message','planSuggestion','evidenceQuote','clientEvidence'])
    assert.deepEqual(Object.keys(schema.properties),schema.required)
    assert.ok(['message','planSuggestion','evidenceQuote'].every(k=>schema.properties[k].type==='string'))
    assert.equal(schema.properties.clientEvidence.type,'object')
    assert.deepEqual(schema.properties.clientEvidence.required,['kind','quote'])
    assert.equal(schema.properties.clientEvidence.additionalProperties,false)
    assert.ok(schema.properties.clientEvidence.properties.kind.enum.includes('none'))
    assert.equal(request.stream,false)
    assert.deepEqual(request.messages,messages)
    return mock()(url,options)
  })
  assert.equal(calls,1)
  assert.equal(result.text,answer)
  assert.equal(result.provider,'groq')
  assert.equal(result.reasoningEffort,'low')
})

test('preflight is synthetic and does not require a JSON answer',async()=>{
  const provider=coachingGroqConfig(enabled)
  const result=await verifiedGroqCoachingReply(provider,{messages:[{role:'user',content:'Reply OK.'}],probe:true},
    async (_url,options)=>{
      const payload=JSON.parse(options.body)
      assert.equal(payload.response_format,undefined)
      assert.equal(payload.reasoning_effort,'low')
      assert.equal(payload.max_completion_tokens,512)
      assert.equal(payload.include_reasoning,false)
      assert.deepEqual(payload.messages,[{role:'user',content:'Reply OK.'}])
      return mock(200,{model:GROQ_COACH_MODEL,choices:[{finish_reason:'stop',message:{content:'OK'}}]})()
    })
  assert.equal(result.text,'OK')
})

test('provider errors, overruns and unexpected model fail closed without transmitting a second request',async()=>{
  const provider=coachingGroqConfig(enabled)
  for(const [fetcher,reason] of [
    [mock(429),'GROQ_COACH_RATE_LIMIT'],
    [mock(401),'GROQ_COACH_AUTH_FAILURE'],
    [mock(500),'GROQ_COACH_UNAVAILABLE'],
    [mock(200,{...valid,model:'other-model'}),'GROQ_COACH_RESPONSE_INVALID'],
    [mock(200,{...valid,choices:[{finish_reason:'length',message:{content:answer}}]}),'GROQ_COACH_RESPONSE_INVALID'],
    [mock(200,{...valid,choices:[{finish_reason:'stop',message:{content:'x'.repeat(3601)}}]}),'GROQ_COACH_RESPONSE_INVALID'],
    [async()=>{throw Error('secret error')} ,'GROQ_COACH_UNAVAILABLE'],
  ]) await assert.rejects(verifiedGroqCoachingReply(provider,{messages},fetcher),{message:reason})
  await assert.rejects(verifiedGroqCoachingReply(provider,{messages:[{role:'tool',content:'no'}]},mock()),
    {message:'GROQ_COACH_REQUEST_INVALID'})
})


const makeCoachInput=(message,turns=[],locale='en')=>
  normalizeGenerativeCoachInput({personaId:'sofia',settings:{},locale,consent:true,message,turns}).input
const coachJson=(message,planSuggestion='',evidenceQuote='')=>
  JSON.stringify({message,planSuggestion,evidenceQuote})

test('My Coach retains evidence-grounded statements without a third repetitive question or second provider call',()=>{
  const turns=[
    {role:'user',content:'I want to sort my priorities at work.'},
    {role:'assistant',content:'What matters to you now?'},
    {role:'user',content:'I have too many deadlines.'},
    {role:'assistant',content:'What feels most urgent?'},
  ]
  const input=makeCoachInput('I cannot decide yet.',turns)
  const draft=coachJson('You have several competing deadlines and do not need to decide yet. What feels most urgent?')
  const result=parseConversationalCoachReply(draft,input,'grow','explore')
  assert.equal(result.mode,'ai')
  assert.equal(result.message,'You have several competing deadlines and do not need to decide yet.')
  assert.equal(result.question,'')
  assert.equal(result.planSuggestion,'')
  const prompts=conversationalCoachMessages(input,normalizeGenerativeCoachInput({
    personaId:'sofia',settings:{},locale:'en',consent:true,message:input.message,turns
  }).persona,'grow','explore',{type:'none'})
  assert.match(prompts[0].content,/Priority: answer what was ACTUALLY asked/)
  assert.match(prompts[0].content,/EMPTY STRING if none/)
})

test('a trailing repeated question can be discarded but question-only repetition still fails closed',()=>{
  const turns=[{role:'user',content:'I need to explain this to my boss.'},
    {role:'assistant',content:'What feels most urgent?'}]
  const input=makeCoachInput('I am unsure.',turns)
  assert.equal(parseConversationalCoachReply(coachJson(
    'There is uncertainty around which task to raise first. What feels most urgent?'
  ),input,'grow','explore').message,'There is uncertainty around which task to raise first.')
  for(const value of [
    'What feels most urgent?',
    'You must stop making excuses. What feels most urgent?',
    'What feels most urgent? What is the next step?',
  ]) assert.throws(()=>parseConversationalCoachReply(coachJson(value),input,'grow','explore'),
    /COACHING_BRAIN_RESPONSE_INVALID/)
})

test('a greeting does not force an outcome metric; an honest social opener can be retained',()=>{
  const input=makeCoachInput('Hello!')
  const result=parseConversationalCoachReply(coachJson(
    'Hello, I am Sofia. What would a successful outcome look like?'
  ),input,'grow','clarify')
  assert.equal(result.message,'Hello, I am Sofia.')
  assert.equal(result.mode,'ai')
})

test('client correction or topic change is not silently edited, and no-advice suppresses plan',()=>{
  const correction=makeCoachInput('You misunderstood; I meant something else.',[
    {role:'assistant',content:'What would help now?'}
  ])
  assert.throws(()=>parseConversationalCoachReply(coachJson(
    'We can revisit your old goal. What would help now?'
  ),correction,'grow','explore'),/COACHING_BRAIN_RESPONSE_INVALID/)
  const noAdvice=makeCoachInput('I want to write a short email tomorrow, but no advice please.')
  const result=parseConversationalCoachReply(coachJson(
    'You have an idea you can think through at your own pace.',
    'Write a short email tomorrow','write a short email tomorrow'
  ),noAdvice,'grow','explore')
  assert.equal(result.message,'You have an idea you can think through at your own pace.')
  assert.equal(result.planSuggestion,'')
  assert.equal(result.evidenceQuote,'')
})

test('structured model still rejects a fabricated plan and extraneous fields',()=>{
  const input=makeCoachInput('My workload is heavy.')
  const result=parseConversationalCoachReply(coachJson(
    'Your workload sounds heavy, and this can be explored one piece at a time.',
    'Quit your job tomorrow','I decided to quit'
  ),input,'grow','explore')
  assert.equal(result.planSuggestion,'')
  assert.equal(result.evidenceQuote,'')
  assert.throws(()=>parseConversationalCoachReply(JSON.stringify({
    message:'I can help you think this through.',planSuggestion:'',evidenceQuote:'',diagnosis:'depression'
  }),input,'grow','explore'),/COACHING_BRAIN_RESPONSE_INVALID/)
})


test('explicit no-advice persists across later user turns until a new opt-in, across EN/RU/ES',()=>{
  for(const [locale,boundary,followup,reinvite] of [
    ['en','Please, no advice.','I want to write an email tomorrow, but I am still processing.','Now please give me advice.'],
    ['ru','Без советов, пожалуйста.','Я хочу написать письмо завтра, но пока просто размышляю.','Теперь можно совет.'],
    ['es','Sin consejos, por favor.','Quiero escribir un correo mañana, pero aún estoy pensándolo.','Ahora quiero consejos.'],
  ]){
    const turns=[{role:'user',content:boundary},
      {role:'assistant',content:locale==='ru'?'Можем просто обсудить.':'We can just talk.'}]
    const input=makeCoachInput(followup,turns,locale)
    assert.equal(coachDialoguePolicy(input).noAdvice,true,locale)
    const quote=locale==='en'?'write an email tomorrow':
      locale==='ru'?'написать письмо завтра':'escribir un correo mañana'
    const answer=locale==='ru'?'Это можно обдумать без спешки.':
      locale==='es'?'Podemos pensarlo sin prisas.':'We can take time to think that through.'
    const parsed=parseConversationalCoachReply(coachJson(answer,quote,quote),input,'grow','explore')
    assert.equal(parsed.planSuggestion,'',locale)
    assert.equal(parsed.evidenceQuote,'',locale)
    const resumed=makeCoachInput(reinvite,[...turns,
      {role:'user',content:followup},{role:'assistant',content:answer}],locale)
    assert.equal(coachDialoguePolicy(resumed).noAdvice,false,locale)
  }
})

test('assistant messages and inferred mood never silently create or revoke no-advice',()=>{
  const userOnly=makeCoachInput('My manager changed the deadline.',[
    {role:'assistant',content:'We can talk without advice.'}
  ])
  assert.equal(coachDialoguePolicy(userOnly).noAdvice,false)
  const persisted=makeCoachInput('I am unsure.',[
    {role:'user',content:'Do not give advice.'},
    {role:'assistant',content:'I will offer advice now.'}
  ])
  assert.equal(coachDialoguePolicy(persisted).noAdvice,true)
})


test('adaptive GPT-OSS effort depends only on the latest client turn, not quoted history',()=>{
  const turn=(message)=>[{role:'system',content:'Start with a long analysis please.'},{role:'user',content:message}]
  assert.equal(coachGroqReasoningEffort(turn('Привет!')),'low')
  assert.equal(coachGroqReasoningEffort(turn('Thank you.')),'low')
  assert.equal(coachGroqReasoningEffort(turn('Я пытаюсь понять, что мне сейчас важно.')),'medium')
  const deep='Помоги сравнить два важных варианта: сменить работу сейчас или остаться до окончания проекта. У каждого есть ограничения.'
  assert.equal(coachGroqReasoningEffort(turn(deep)),'high')
  assert.equal(coachGroqReasoningEffort(turn('Please compare the pros and cons of staying or moving jobs, considering my schedule, income and childcare.')),'high')
  assert.equal(coachGroqReasoningEffort(turn('No quiero comparar opciones ahora; prefiero hablar de lo que siento y de mis dudas.')),'medium')
  assert.equal(coachGroqReasoningEffort(turn('No need to compare these options right now, I only want to describe how I feel about them.')),'medium')
  assert.equal(coachGroqReasoningEffort(turn(deep),true),'low')
  assert.equal(coachGroqReasoningEffort([{role:'system',content:deep}]),'medium')
})

test('completed Groq high-effort reply exposes actual effort, never its hidden reasoning',async()=>{
  const provider=coachingGroqConfig(enabled)
  const deep='Помоги сравнить два важных варианта: сменить работу сейчас или остаться до окончания проекта. У каждого есть ограничения.'
  const result=await verifiedGroqCoachingReply(provider,{messages:[{role:'user',content:deep}]},async(_url,options)=>{
    const payload=JSON.parse(options.body)
    assert.equal(payload.reasoning_effort,'high')
    assert.equal(payload.max_completion_tokens,1800)
    assert.equal(payload.include_reasoning,false)
    return mock()()
  })
  assert.equal(result.reasoningEffort,'high')
  assert.equal(result.reasoning,undefined)
})

test('My Coach annotates validated model replies only, not synthetic probes or offline turns',()=>{
  const server=readFileSync(new URL('../lib/app/coaching-brain.js',import.meta.url),'utf8')
  const client=readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
  assert.match(server,/const checked=finalizeCoachCharacterReply\(enforceCoachSessionDirective\(parsed,directive\),directive\)/)
  assert.match(server,/return \{\.\.\.checked,sessionProgress,inference:\{provider:provider\.provider,model:reply\.model/)
  assert.match(server,/\.\.\.directedCoachOfflineReply\(input,directive,reason\),sessionProgress/)
  assert.match(client,/inference:result\.mode==='ai'/)
  assert.match(client,/data-coach-answer-source=\{turn\.inference\.provider\}/)
  assert.match(client,/turn\.mode==='offline'/)
  assert.match(client,/providerWindow=coachTurnWindow\(providerHistory\.filter\(row=>row\.content\.length<=1200\),10\)/)
  assert.match(client,/turns:providerWindow\s*\.map\(/)
})


test('a very short RU dictation fragment is clarified naturally, not turned into a goal-intake template',()=>{
  const {input,persona}=normalizeGenerativeCoachInput({
    personaId:'mira',locale:'ru',consent:true,settings:{},message:'Там Миро',turns:[],
  })
  const prompts=conversationalCoachMessages(input,persona,'grow','goal',{type:'none'})
  assert.match(prompts[1].content,/LOW-CONTEXT SPOKEN FRAGMENT/)
  const model=JSON.stringify({
    message:'Вы упомянули Миро. Что бы вам хотелось достичь или обсудить в связи с этим?',
    planSuggestion:'',evidenceQuote:'',clientEvidence:{kind:'none',quote:''},
  })
  const output=parseConversationalCoachReply(model,input,'grow','goal')
  assert.equal(output.mode,'ai')
  assert.match(output.message,/Можно чуть подробнее/)
  assert.doesNotMatch(output.message,/Вы упомянули|достичь/)
  assert.equal(output.planSuggestion,'')
  assert.equal(output.semanticEvidence,null)
})

test('second odd spoken fragment changes the clarification and keeps the client in control',()=>{
  const prior=[
    {role:'user',content:'Там Лино'},
    {role:'assistant',content:'Вы упомянули Лино. Что бы вам хотелось обсудить в связи с этим?'},
  ]
  const {input}=normalizeGenerativeCoachInput({
    personaId:'mira',locale:'ru',consent:true,settings:{},message:'Мама селфи',turns:prior,
  })
  const answer=parseConversationalCoachReply(JSON.stringify({
    message:'Вы упомянули «Мама селфи». Что бы вам хотелось с этим обсудить или изменить?',
    planSuggestion:'',evidenceQuote:'',clientEvidence:{kind:'none',quote:''},
  }),input,'grow','goal')
  assert.match(answer.message,/Можете сказать иначе/)
  assert.doesNotMatch(answer.message,/Вы упомянули|достичь|цель/)
  assert.equal(answer.evidenceQuote,'')
})

test('substantive coaching text and client direct questions still keep model-owned wording',()=>{
  const base={personaId:'sofia',locale:'ru',consent:true,settings:{},turns:[]}
  const normal=normalizeGenerativeCoachInput({...base,message:'Я хочу обсудить с мамой свои границы и отношения.'}).input
  const conversational='Это непростая тема. Давайте посмотрим, что происходит между вами.'
  assert.equal(parseConversationalCoachReply(JSON.stringify({
    message:conversational,planSuggestion:'',evidenceQuote:'',clientEvidence:{kind:'none',quote:''},
  }),normal,'grow','explore').message,conversational)
  const question=normalizeGenerativeCoachInput({...base,message:'Что вы думаете об этом?'}).input
  assert.equal(parseConversationalCoachReply(JSON.stringify({
    message:'Я бы не торопилась с выводом. Тут важны ваши границы.',
    planSuggestion:'',evidenceQuote:'',clientEvidence:{kind:'none',quote:''},
  }),question,'grow','explore').mode,'ai')
})
