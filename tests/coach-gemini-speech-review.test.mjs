import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {geminiSpeechReviewEnabled,geminiSpeechReviewPayload,geminiSpeechReviewText} from '../lib/coaching/gemini-speech-review-provider.mjs'
import {speechReviewWav} from '../lib/coaching/coach-speech-review.mjs'
const wav=Buffer.from(speechReviewWav([new Uint8Array(3200)]))
test('requires all server gates, validates clip and requests verbatim without context',()=>{
 const env={HH_MY_COACH_GEMINI_TRANSCRIBE_ENABLED:'true',HH_MY_COACH_GEMINI_TRANSCRIBE_FREE_CONFIRMED:'true',HH_MY_COACH_GEMINI_TRANSCRIBE_PRIVACY_APPROVED:'true',HH_MY_COACH_GEMINI_TRANSCRIBE_API_KEY:'mock'}
 assert.equal(geminiSpeechReviewEnabled(env),true)
 for(const key of Object.keys(env))assert.equal(geminiSpeechReviewEnabled({...env,[key]:''}),false)
 const p=geminiSpeechReviewPayload(wav,'ru')
 assert.equal(p.model,'models/gemini-3.5-transcribe');assert.equal(p.store,false)
 assert.deepEqual(p.generation_config.transcription_config,{mode:{type:'verbatim'},language_codes:['ru-RU']})
 assert.throws(()=>geminiSpeechReviewPayload(wav,'xx'))
 assert.throws(()=>geminiSpeechReviewPayload(Buffer.alloc(3244),'ru'))
 assert.equal(geminiSpeechReviewText({status:'completed',steps:[{type:'model_output',content:[{type:'text',text:'Уставшим'}]}]}),'Уставшим')
 assert.equal(geminiSpeechReviewText({status:'in_progress',steps:[]}),'')
})
test('separate consent, same quota and cancellation; no runtime fallback',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
 const route=read('app/api/coaching/speech-review-gemini/route.js')
 assert.ok(route.includes("form.get('geminiConsent')!=='yes'"))
 assert.ok(route.includes('createRequestAuth(request,config).verified()'))
 assert.ok(route.includes("op:'my-coach-stt-free-global-day'},240,86400"))
 assert.ok(route.includes('AbortSignal.timeout(10000)'))
 const live=read('components/my-coach-gemini-live.jsx')
 assert.ok(live.includes('provider:reviewProvider'))
 assert.ok(live.includes('[speechReviewConsent,speechReviewProvider]'))
 const review=read('lib/coaching/coach-speech-review.mjs')
 assert.ok(review.includes("if(gemini)form.set('geminiConsent','yes')"))
 const ui=read('components/my-coach-live-dialogue.jsx')
 assert.ok(ui.includes('data-gemini-transcribe-consent'))
})
