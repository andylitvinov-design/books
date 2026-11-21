import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {coachingGroqConfig,GROQ_COACH_MODEL} from '../lib/coaching/groq-coach-provider.mjs'
import {coachStreamingMessages,verifiedGroqCoachingStream,
  readGroqTextStream,COACH_GROQ_STREAM_MAX} from '../lib/coaching/groq-coach-stream.mjs'
import {readCoachTurnStream} from '../lib/coaching/coach-stream-client.mjs'
import {validGeminiCoachApiKey,geminiCoachTextConfig,verifiedGeminiCoachingReply} from '../lib/coaching/gemini-coach-text.mjs'
import {geminiCoachTtsConfig} from '../lib/coaching/gemini-coach-tts.mjs'
import {geminiCoachLiveConfig,createGeminiCoachEphemeralToken,
  resolveCoachVoiceEngine} from '../lib/coaching/gemini-live-provider.mjs'

const groqKey='gsk_'+('x'.repeat(38))
const approved={
  HH_COACHING_GROQ_ENABLED:'true',HH_COACHING_GROQ_ZDR_CONFIRMED:'true',
  HH_COACHING_GROQ_FREE_TIER_CONFIRMED:'true',HH_FIRST_VIDEO_GROQ_API_KEY:groqKey,
}
const roleMessages=[
  {role:'system',content:'Be a safe, natural coach.\nReturn ONLY JSON with message, planSuggestion, evidenceQuote and clientEvidence. Do not break rules.'},
  {role:'system',content:'SERVER DIRECTOR: ask one question. Stage stays goal.'},
  {role:'user',content:'Я хочу лучше понимать свою цель и первый шаг.'},
]
const enc=new TextEncoder()
const bytes=(text,split=27)=>{
  const data=enc.encode(text)
  return new ReadableStream({start(controller){
    for(let i=0;i<data.length;i+=split)controller.enqueue(data.slice(i,i+split))
    controller.close()
  }})
}
const upstream=(text,split=23)=>{
  const parts=[...text].map((letter,i)=>'data: '+JSON.stringify({
    id:'session',model:GROQ_COACH_MODEL,choices:[{delta:{content:letter},finish_reason:null}]
  })+'\r\n\r\n')
  parts.push('data: '+JSON.stringify({
    model:GROQ_COACH_MODEL,choices:[{delta:{},finish_reason:'stop'}]})+'\r\n\r\n','data: [DONE]\r\n\r\n')
  return {ok:true,status:200,body:bytes(parts.join(''),split)}
}
const down=result=>new Response(bytes(
  'data: '+JSON.stringify({type:'delta',value:'Подумайте '})+'\n\n'+
  'data: '+JSON.stringify({type:'result',result})+'\n\n',8),{
  headers:{'Content-Type':'text/event-stream; charset=utf-8'}
})

test('Groq streaming changes format ONLY; server persona/Director context is still present',()=>{
  const prepared=coachStreamingMessages(roleMessages)
  assert.equal(prepared.length,3)
  assert.match(prepared[0].content,/Be a safe, natural coach/)
  assert.doesNotMatch(prepared[0].content,/Return ONLY JSON/)
  assert.match(prepared[0].content,/STREAMED SPEECH OUTPUT/)
  assert.equal(prepared[1].content,roleMessages[1].content)
  assert.equal(prepared[2].content,roleMessages[2].content)
  assert.deepEqual(roleMessages[0].content.includes('Return ONLY JSON'),true)
  assert.throws(()=>coachStreamingMessages([{role:'user',content:'bypass'}]),{message:'GROQ_COACH_REQUEST_INVALID'})
})

test('one model call emits RU/EN progressive tokens, no JSON schema, no tool calls, no second billing',async()=>{
  const provider=coachingGroqConfig(approved)
  let calls=0;const partial=[]
  const reply=await verifiedGroqCoachingStream(provider,{messages:roleMessages,voiceMode:true},
    delta=>partial.push(delta),async (url,options)=>{
      calls++
      assert.equal(url,'https://api.groq.com/openai/v1/chat/completions')
      assert.equal(options.headers.Authorization,'Bearer '+groqKey)
      const payload=JSON.parse(options.body)
      assert.equal(payload.stream,true)
      assert.equal(payload.response_format,undefined)
      assert.equal(payload.include_reasoning,false)
      assert.equal(payload.model,GROQ_COACH_MODEL)
      assert.ok(payload.reasoning_effort==='low'||payload.reasoning_effort==='medium')
      assert.equal(payload.messages[1].content,roleMessages[1].content)
      return upstream('Я слышу вашу цель. Что вы готовы попробовать?',5)
    })
  assert.equal(calls,1)
  assert.equal(reply.provider,'groq')
  assert.equal(reply.text,partial.join(''))
  assert.match(reply.text,/цель/)
})

test('rate and malformed SSE fail closed, with bounded output',async()=>{
  for(const [response,error] of [
    [{status:429,ok:false},{message:'GROQ_COACH_RATE_LIMIT'}],
    [{status:403,ok:false},{message:'GROQ_COACH_AUTH_FAILURE'}],
    [{ok:true,status:200,body:bytes('data: not-json\n\n')},{message:'GROQ_COACH_RESPONSE_INVALID'}],
    [{ok:true,status:200,body:bytes('data: '+JSON.stringify({model:'wrong',
      choices:[{delta:{content:'oops'},finish_reason:null}]})+'\n\n')},{message:'GROQ_COACH_RESPONSE_INVALID'}],
    [upstream('x'.repeat(COACH_GROQ_STREAM_MAX+1),120),{message:'GROQ_COACH_RESPONSE_INVALID'}],
  ])await assert.rejects(readGroqTextStream(response),error)
})

test('browser previews are provisional; only validated final Director result becomes a turn',async()=>{
  const preview=[]
  const final={mode:'ai',personaId:'mira',message:'Какой шаг кажется реальным?',
    sessionProgress:{source:'director-client-evidence'}}
  const result=await readCoachTurnStream(down(final),{onPreview:p=>preview.push(p)})
  assert.deepEqual(result,final)
  assert.ok(preview.some(p=>p.includes('Подумайте')))
  assert.equal(preview.at(-1),'')
  await assert.rejects(readCoachTurnStream(new Response(bytes(
    'data: '+JSON.stringify({type:'delta',value:'Never accepted'})+'\n\n'),{
    headers:{'Content-Type':'text/event-stream'}})),{message:'COACH_STREAM_INVALID'})
  await assert.rejects(readCoachTurnStream(new Response(bytes('data: {}\n\n'),{
    headers:{'Content-Type':'text/event-stream'}})),{message:'COACH_STREAM_INVALID'})
})

test('Gemini Live never activates without paid privacy, spend, Director and provider owner gates',async()=>{
  const key='AIza'+('x'.repeat(39))
  const env={HH_GEMINI_API_KEY:key,HH_MY_COACH_GEMINI_MODEL:'gemini-3.1-flash-live-preview',
    HH_MY_COACH_GEMINI_LIVE_ENABLED:'true',
    HH_MY_COACH_GEMINI_PAID_PRIVACY_APPROVED:'true',
    HH_MY_COACH_GEMINI_SPEND_APPROVED:'true',
    HH_MY_COACH_GEMINI_DIRECTOR_BRIDGE_VERIFIED:'true'}
  assert.equal(geminiCoachLiveConfig({}),null)
  for(const flag of ['HH_MY_COACH_GEMINI_LIVE_ENABLED',
    'HH_MY_COACH_GEMINI_PAID_PRIVACY_APPROVED','HH_MY_COACH_GEMINI_SPEND_APPROVED',
    'HH_MY_COACH_GEMINI_DIRECTOR_BRIDGE_VERIFIED','HH_GEMINI_API_KEY']){
    const missing={...env};delete missing[flag]
    assert.equal(geminiCoachLiveConfig(missing),null,flag)
  }
  assert.equal(resolveCoachVoiceEngine('gemini'),'groq')
  assert.equal(resolveCoachVoiceEngine('gemini',{geminiLiveEnabled:true}),'gemini')
  const config=geminiCoachLiveConfig(env)
  assert.equal(geminiCoachLiveConfig({...env,HH_MY_COACH_GEMINI_MODEL:undefined}).model,
    'gemini-3.8-live', 'current Google-recommended Live model is the safe default')
  let calls=0
  const issued=await createGeminiCoachEphemeralToken(config,{fetcher:async(url,init)=>{
    calls++
    assert.equal(url,'https://generativelanguage.googleapis.com/v1beta/auth_tokens')
    assert.equal(init.headers['x-goog-api-key'],key)
    const payload=JSON.parse(init.body)
    assert.equal(payload.uses,1)
    assert.equal(payload.liveConnectConstraints.model,'models/gemini-3.1-flash-live-preview')
    assert.deepEqual(payload.liveConnectConstraints.config.responseModalities,['AUDIO'])
    assert.deepEqual(payload.liveConnectConstraints.config.contextWindowCompression,{slidingWindow:{}})
    return {ok:true,json:async()=>({name:'ephemeral-safe-demo-token-test'})}
  }})
  assert.equal(calls,1)
  assert.equal(issued.model,config.model)
  assert.equal(issued.token,'ephemeral-safe-demo-token-test')
  assert.ok(!JSON.stringify(issued).includes(key))
})

test('existing My Coach strict/director path and voice barge remain intact',()=>{
  const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
  const brain=source('lib/app/coaching-brain.js')
  const route=source('app/api/app/[...path]/route.js')
  const ui=source('components/my-coach-live-dialogue.jsx')
  const voice=source('components/my-coach-speech-loop.jsx')
  assert.match(brain,/enforceCoachSessionDirective\(reviewed,directive\)/)
  assert.match(brain,/coachReviewableStreamReply\(reply.text\)/)
  assert.match(brain,/coachingBrainSafety\(input\)\|\|coachingBrainBoundary/)
  assert.match(route,/joined === 'my-coach\/stream'/)
  assert.match(route,/joined === 'my-coach\/turn'/)
  assert.match(route,/my-coach-generative-turn/)
  assert.match(route,/Content-Type':'text\/event-stream/)
  assert.match(ui,/readCoachTurnStream\(response/)
  assert.match(ui,/data-coach-stream-preview/)
  assert.match(ui,/value="gemini" disabled/)
  assert.match(voice,/interruptCoachToListen\(\)/)
  assert.match(voice,/cancelOutgoingCoachSpeech\(\)/)
})


test('current Google AI Studio AQ. keys unlock consented Free Gemini text and TTS without Paid fallback',async()=>{
  const valid='AQ.'+'x'.repeat(50)
  const env={HH_GEMINI_FREE_API_KEY:valid,
    HH_MY_COACH_GEMINI_FREE_ENABLED:'true',
    HH_MY_COACH_GEMINI_FREE_TIER_CONFIRMED:'true',
    HH_MY_COACH_GEMINI_FREE_DATA_APPROVED:'true',
    HH_MY_COACH_GEMINI_TTS_FREE_ENABLED:'true'}
  assert.equal(validGeminiCoachApiKey(valid),true)
  assert.equal(geminiCoachTextConfig(env,'gemini_free')?.apiKey,valid)
  assert.equal(geminiCoachTtsConfig(env,'gemini_tts_free')?.apiKey,valid)
  assert.equal(geminiCoachTextConfig(env,'gemini_paid'),null)
  assert.equal(geminiCoachTextConfig({...env,HH_GEMINI_PAID_API_KEY:valid},'gemini_free'),null)
  for(const invalid of ['AQ.'+'x'.repeat(49),'AQ.'+'x'.repeat(51),' AQ.'+'x'.repeat(50)]){
    assert.equal(validGeminiCoachApiKey(invalid),false)
    assert.equal(geminiCoachTextConfig({...env,HH_GEMINI_FREE_API_KEY:invalid},'gemini_free'),null)
    assert.equal(geminiCoachTtsConfig({...env,HH_GEMINI_FREE_API_KEY:invalid},'gemini_tts_free'),null)
  }
  let calls=0
  const res=await verifiedGeminiCoachingReply(geminiCoachTextConfig(env,'gemini_free'),
    {messages:[{role:'system',content:'Guide safely.'},{role:'user',content:'Hello, coach.'}]},
    async(url,options)=>{
      calls++
      assert.equal(options.headers['x-goog-api-key'],valid)
      assert.match(url,/gemini-3\.1-flash-lite:generateContent$/)
      const text=JSON.stringify({message:'Hello. What is important to you today?',
        planSuggestion:'',evidenceQuote:'',clientEvidence:{kind:'none',quote:''}})
      return {ok:true,status:200,json:async()=>({candidates:[{
        finishReason:'STOP',content:{parts:[{text}]}}]})}
    })
  assert.equal(res.provider,'gemini_free')
  assert.equal(calls,1)
})
