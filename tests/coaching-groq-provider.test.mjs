import test from 'node:test'
import assert from 'node:assert/strict'
import {coachingGroqConfig,verifiedGroqCoachingReply,GROQ_COACH_MODEL} from '../lib/coaching/groq-coach-provider.mjs'
import {normalizeGenerativeCoachInput} from '../lib/coaching/generative-persona.mjs'
import {parseConversationalCoachReply,conversationalCoachMessages} from '../lib/coaching/conversational-persona.mjs'
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
    assert.equal(request.reasoning_effort,'medium')
    assert.equal(request.response_format.type,'json_schema')
    assert.equal(request.response_format.json_schema.strict,true)
    const schema=request.response_format.json_schema.schema
    assert.equal(schema.type,'object')
    assert.equal(schema.additionalProperties,false)
    assert.deepEqual(schema.required,['message','planSuggestion','evidenceQuote'])
    assert.deepEqual(Object.keys(schema.properties),schema.required)
    assert.ok(Object.values(schema.properties).every(row=>row.type==='string'))
    assert.equal(request.stream,false)
    assert.deepEqual(request.messages,messages)
    return mock()(url,options)
  })
  assert.equal(calls,1)
  assert.equal(result.text,answer)
  assert.equal(result.provider,'groq')
})

test('preflight is synthetic and does not require a JSON answer',async()=>{
  const provider=coachingGroqConfig(enabled)
  const result=await verifiedGroqCoachingReply(provider,{messages:[{role:'user',content:'Reply OK.'}],probe:true},
    async (_url,options)=>{
      const payload=JSON.parse(options.body)
      assert.equal(payload.response_format,undefined)
      assert.equal(payload.reasoning_effort,'low')
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
