import test from 'node:test'
import assert from 'node:assert/strict'
import {coachingGroqConfig,verifiedGroqCoachingReply,GROQ_COACH_MODEL} from '../lib/coaching/groq-coach-provider.mjs'
const key='gsk_'+('x'.repeat(38))
const enabled={HH_COACHING_GROQ_ENABLED:'true',HH_COACHING_GROQ_ZDR_CONFIRMED:'true',
  HH_COACHING_GROQ_FREE_TIER_CONFIRMED:'true',HH_FIRST_VIDEO_GROQ_API_KEY:key}
const messages=[{role:'system',content:'Reply in JSON.'},{role:'user',content:'Hello'}]
const answer=JSON.stringify({message:'What would you like to focus on today?'})
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
    assert.deepEqual(request.response_format,{type:'json_object'})
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
