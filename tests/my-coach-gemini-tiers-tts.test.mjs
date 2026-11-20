import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {geminiCoachTextConfig,verifiedGeminiCoachingReply} from '../lib/coaching/gemini-coach-text.mjs'
import {geminiCoachTtsConfig,normalizeGeminiCoachTtsInput,synthesizeGeminiCoachTts} from '../lib/coaching/gemini-coach-tts.mjs'
import {GEMINI_COACH_VOICE_OPTIONS,coachGeminiVoiceOptions,allowedGeminiCoachVoice} from '../lib/coaching/gemini-voice-catalog.mjs'
const key='AIza'+('A'.repeat(35))
const free={HH_GEMINI_FREE_API_KEY:key,HH_MY_COACH_GEMINI_FREE_ENABLED:'true',
  HH_MY_COACH_GEMINI_FREE_TIER_CONFIRMED:'true',HH_MY_COACH_GEMINI_FREE_DATA_APPROVED:'true',
  HH_MY_COACH_GEMINI_TTS_FREE_ENABLED:'true'}
const paid={HH_GEMINI_PAID_API_KEY:key,HH_MY_COACH_GEMINI_PAID_ENABLED:'true',
  HH_MY_COACH_GEMINI_PAID_PRIVACY_APPROVED:'true',HH_MY_COACH_GEMINI_SPEND_APPROVED:'true',
  HH_MY_COACH_GEMINI_TTS_PAID_ENABLED:'true'}
const messages=[
  {role:'system',content:'Mira is a grounded coach.'},
  {role:'system',content:'SERVER DIRECTOR: remain in current step.'},
  {role:'user',content:'Хочу лучше понимать свою цель.'},
]
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
test('Gemini Free and Paid are isolated, OFF by default, and owner-gated',()=>{
  assert.equal(geminiCoachTextConfig({},'gemini_free'),null)
  assert.equal(geminiCoachTextConfig(free,'gemini_paid'),null)
  assert.equal(geminiCoachTextConfig(paid,'gemini_free'),null)
  assert.equal(geminiCoachTextConfig({...free,...paid,HH_GEMINI_PAID_API_KEY:key},'gemini_free'),null)
  assert.equal(geminiCoachTextConfig({...free,...paid,HH_GEMINI_PAID_API_KEY:key},'gemini_paid'),null)
  for(const name of Object.keys(free)){
    const env={...free};delete env[name]
    if(name!=='HH_MY_COACH_GEMINI_TTS_FREE_ENABLED')
      assert.equal(geminiCoachTextConfig(env,'gemini_free'),null,name)
  }
  for(const name of Object.keys(paid)){
    const env={...paid};delete env[name]
    if(name!=='HH_MY_COACH_GEMINI_TTS_PAID_ENABLED')
      assert.equal(geminiCoachTextConfig(env,'gemini_paid'),null,name)
  }
  assert.equal(geminiCoachTextConfig(free,'gemini_free').model,'gemini-3.1-flash-lite')
  assert.equal(geminiCoachTextConfig(paid,'gemini_paid').model,'gemini-3.8-flash')
  assert.equal(geminiCoachTextConfig({...free,HH_GEMINI_FREE_API_KEY:'bad'},'gemini_free'),null)
})
test('single model call retains persona/Director and produces JSON for original validator',async()=>{
  let calls=0
  const resultText=JSON.stringify({message:'Я вас слышу. Что вы сами считаете важным?',
    planSuggestion:'',evidenceQuote:'',clientEvidence:{kind:'none',quote:''}})
  const result=await verifiedGeminiCoachingReply(geminiCoachTextConfig(free,'gemini_free'),
    {messages},async(url,request)=>{
      calls++
      assert.equal(url,'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent')
      assert.equal(request.headers['x-goog-api-key'],key)
      const b=JSON.parse(request.body)
      assert.match(b.systemInstruction.parts[0].text,/SERVER DIRECTOR/)
      assert.match(b.systemInstruction.parts[0].text,/Mira/)
      assert.equal(b.contents.at(-1).parts[0].text,messages.at(-1).content)
      assert.equal(b.generationConfig.responseMimeType,'application/json')
      return {ok:true,status:200,json:async()=>({candidates:[{
        finishReason:'STOP',content:{parts:[{text:resultText}]}}]})}
    })
  assert.equal(calls,1)
  assert.equal(result.text,resultText)
  assert.equal(result.provider,'gemini_free')
})
test('failed or overlong Gemini output fails closed without a retry',async()=>{
  let calls=0
  await assert.rejects(verifiedGeminiCoachingReply(geminiCoachTextConfig(paid,'gemini_paid'),
    {messages},async()=>{calls++;return {ok:true,status:200,json:async()=>({
      candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{text:'{}'}]}}]})}}),
    {message:'GEMINI_COACH_RESPONSE_INVALID'})
  assert.equal(calls,1)
  await assert.rejects(verifiedGeminiCoachingReply(geminiCoachTextConfig(free,'gemini_free'),
    {messages},async()=>({status:429,ok:false})),{message:'GEMINI_COACH_RATE_LIMIT'})
})
test('ten personas have four server-allowlisted voice candidates for RU and EN',()=>{
  const ids=['mira','max','sofia','alex','merlin','harry','lea','noah','iris','ray']
  assert.deepEqual(Object.keys(GEMINI_COACH_VOICE_OPTIONS).sort(),[...ids].sort())
  for(const id of ids){
    const opts=coachGeminiVoiceOptions(id)
    assert.equal(opts.length,4)
    assert.equal(new Set(opts).size,4)
    assert.ok(opts.every(name=>allowedGeminiCoachVoice(id,name)))
    assert.equal(allowedGeminiCoachVoice(id,'malicious-id'),false)
  }
})
test('free Gemini TTS requires distinct feature consent and uses a fixed public preview',()=>{
  assert.equal(geminiCoachTtsConfig(free,'gemini_tts_paid'),null)
  assert.equal(geminiCoachTtsConfig(paid,'gemini_tts_free'),null)
  assert.equal(geminiCoachTtsConfig({...free,...paid},'gemini_tts_free'),null)
  assert.equal(geminiCoachTtsConfig({...free,...paid},'gemini_tts_paid'),null)
  assert.equal(geminiCoachTtsConfig(free,'gemini_tts_free').model,'gemini-3.8-flash-lite-tts')
  const common={provider:'gemini_tts_free',locale:'ru',personaId:'mira',
    voiceName:'Sulafat',preview:true,voiceConsent:true,cloudVoiceConsent:true}
  assert.throws(()=>normalizeGeminiCoachTtsInput(common),{message:'GEMINI_COACH_TTS_INVALID'})
  const valid=normalizeGeminiCoachTtsInput({...common,trainingUseConsent:true})
  assert.match(valid.text,/Столько/)
  assert.throws(()=>normalizeGeminiCoachTtsInput({...common,trainingUseConsent:true,
    text:'An injected text'}),{message:'GEMINI_COACH_TTS_INVALID'})
})
test('one Gemini TTS request selects exact approved voice and returns real-format WAV bytes',async()=>{
  const wav=Buffer.alloc(128)
  wav.write('RIFF',0,'ascii');wav.write('WAVE',8,'ascii')
  const input=normalizeGeminiCoachTtsInput({provider:'gemini_tts_free',
    locale:'en',personaId:'mira',voiceName:'Sulafat',preview:true,
    voiceConsent:true,cloudVoiceConsent:true,trainingUseConsent:true})
  let calls=0
  const audio=await synthesizeGeminiCoachTts({config:geminiCoachTtsConfig(free,'gemini_tts_free'),
    input,fetcher:async(url,options)=>{
      calls++
      assert.equal(url,'https://generativelanguage.googleapis.com/v1beta/interactions')
      const body=JSON.parse(options.body)
      assert.equal(body.model,'gemini-3.8-flash-lite-tts')
      assert.equal(body.store,false,'no Google interaction storage for private coach speech')
      assert.equal(body.generation_config.speech_config[0].voice,'Sulafat')
      assert.match(body.input[0].content[0].text,/There is a lot/)
      return {ok:true,status:200,json:async()=>({
        steps:[{type:'model_output',content:[{type:'audio',data:wav.toString('base64')}]}]})}
    }})
  assert.equal(calls,1)
  assert.equal(audio.toString('ascii',0,4),'RIFF')
  assert.equal(audio.length,128)
})
test('runtime wiring keeps server Director, quotas, WAV player and Gemini Live off',()=>{
  const brain=source('lib/app/coaching-brain.js')
  const route=source('app/api/app/[...path]/route.js')
  const tts=source('app/api/app/my-coach/voice/synthesize/route.js')
  const ui=source('components/my-coach-live-dialogue.jsx')
  const player=source('lib/personal-coaching/streamed-mp3-playback.mjs')
  assert.match(brain,/enforceCoachSessionDirective/)
  assert.match(brain,/parseConversationalCoachReply/)
  assert.match(brain,/geminiCoachTextConfig/)
  assert.match(route,/my-coach\/engines/)
  assert.match(route,/reserveGeminiCall/)
  assert.match(tts,/requireSameOrigin\(request,config\)/)
  assert.match(tts,/consumeRate\(config/)
  assert.match(tts,/audio\/wav/)
  assert.match(ui,/geminiVoiceByLocale/)
  assert.match(ui,/geminiTextPrivacyDetails/)
  assert.match(ui,/geminiVoicePrivacyDetails/)
  assert.match(ui,/data-gemini-voice-consent/)
  assert.match(ui,/previewGeminiCoachVoice/)
  assert.match(ui,/value="gemini" disabled/)
  assert.match(player,/startsWith\('audio\/mpeg'\)/)
})
