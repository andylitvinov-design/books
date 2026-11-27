import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
// Source-backed owner-memory privacy tests run within the existing release suite.
import './coach-personal-memory.test.mjs'
import './coach-memory-selection.test.mjs'
import './coach-memory-selection-adapter.test.mjs'
import './coach-memory-stage-plan.test.mjs'
import {coachLooksLikeProtocolText,coachReviewableStreamReply} from '../lib/coaching/coach-stream-format.mjs'
import {readCoachTurnStream} from '../lib/coaching/coach-stream-client.mjs'
const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const model={message:'Could you share a bit more about what you are asking?',
 planSuggestion:'',evidenceQuote:'',clientEvidence:{kind:'none',quote:''}}
test('legacy Groq JSON envelope resolves to natural speech, without a second inference',()=>{
 const json=JSON.stringify(model,null,2)
 assert.equal(coachLooksLikeProtocolText('  {\n  "message":'),true)
 assert.equal(JSON.parse(coachReviewableStreamReply(json)).message,model.message)
 assert.equal(JSON.parse(coachReviewableStreamReply('\x60\x60\x60json\n'+json+'\n\x60\x60\x60')).message,
   model.message)
 assert.equal(JSON.parse(coachReviewableStreamReply('I am here to listen.')).message,
   'I am here to listen.')
 const nested=JSON.stringify({message:json,planSuggestion:'do it',evidenceQuote:'fake'})
 const normalized=JSON.parse(coachReviewableStreamReply(nested))
 assert.equal(normalized.message,model.message)
 assert.equal(normalized.planSuggestion,'')
 assert.equal(normalized.evidenceQuote,'')
 assert.deepEqual(normalized.clientEvidence,{kind:'none',quote:''})
})
test('malformed JSON and invalid nested protocol responses fail closed',()=>{
 for(const bad of [
  '{ "message": "half"',
  '{"message":"{\\"message\\":{\\"oops\\":true}}"}',
  '{"mode":"ai","message":"Internal policy dump"}',
  '\x60\x60\x60json\n{"message": "unfinished"}',
  '{"choices":[{"delta":{"content":"unsafe"}}]}',
  '{"message":3}'
 ])assert.throws(()=>coachReviewableStreamReply(bad),/COACHING_BRAIN_RESPONSE_INVALID/)
})
const sse=frames=>new Response(new TextEncoder().encode(frames.map(
 f=>'data: '+JSON.stringify(f)+'\n\n').join('')),{
 headers:{'Content-Type':'text/event-stream; charset=utf-8'}
})
test('browser hides raw JSON tokens and rejects protocol payload in final transcript',async()=>{
 const displayed=[]
 const raw=JSON.stringify(model)
 const result=await readCoachTurnStream(sse([
  {type:'delta',value:'{'},
  {type:'delta',value:raw.slice(1,30)},
  {type:'delta',value:raw.slice(30)},
  {type:'result',result:{mode:'ai',message:model.message,approvedSpokenPrefix:''}}
 ]),{onPreview:v=>displayed.push(v)})
 assert.equal(result.message,model.message)
 assert.ok(displayed.every(v=>!v.includes('message')&&!v.includes('planSuggestion')))
 await assert.rejects(readCoachTurnStream(sse([
  {type:'result',result:{mode:'ai',message:raw}}
 ])),{message:'COACH_STREAM_INVALID'})
})
test('server does not emit JSON preview, and mic monitor cannot fail silently',()=>{
 const brain=src('lib/app/coaching-brain.js')
 const voice=src('components/my-coach-speech-loop.jsx')
 const recorder=src('lib/personal-coaching/coach-recorded-turn.mjs')
 assert.match(brain,/streamPreviewMode==='pending'/)
 assert.match(brain,/coachReviewableStreamReply\(reply.text\)/)
 assert.match(voice,/bargeRecoveryRef\.current/)
 assert.match(voice,/setNotice\(t.bargeManual\)/)
 assert.match(recorder,/iosMicrophone\?\{threshold:0\.019/)
 assert.match(recorder,/track\?\.muted===true/)
})
