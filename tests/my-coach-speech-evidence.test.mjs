import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {speechEvidenceLanguage,isSuspectShortRussianSpeech,speechEvidenceCandidate,speechWordErrors} from '../lib/coaching/coach-speech-evidence.mjs'
test('reported short wrong-script token is review-only, not a guessed correction',()=>{
  assert.equal(isSuspectShortRussianSpeech('postawszym','ru'),true)
  for(const text of ['уставшим','Whisper','GPT','business','stop','нет','не хочу','Я использую Whisper','postawszym and other words'])assert.equal(isSuspectShortRussianSpeech(text,'ru'),false,text)
  assert.equal(isSuspectShortRussianSpeech('postawszym','en'),false)
  assert.equal(speechEvidenceLanguage('Я использую Whisper','ru'),'mixed')
})
test('machine agreement never labels a user confirmation; stale edits win',()=>{
  assert.deepEqual(speechEvidenceCandidate({raw:'Уставшим.',candidate:'уставшим',locale:'ru',revision:1,currentRevision:1}),{state:'machine_checked',text:'уставшим'})
  assert.equal(speechEvidenceCandidate({raw:'Я хочу',candidate:'Я не хочу',locale:'ru',revision:1,currentRevision:1}).state,'uncertain')
  assert.equal(speechEvidenceCandidate({raw:'postawszym',candidate:'уставшим',locale:'ru',revision:1,currentRevision:1}).state,'uncertain')
  assert.equal(speechEvidenceCandidate({raw:'нет',candidate:'да',revision:1,currentRevision:2}).state,'stale')
  assert.equal(speechEvidenceCandidate({raw:'нет',candidate:'да',revision:1,currentRevision:1,userEdited:true}).state,'stale')
})
test('word error counts substitutions, insertions and deletions',()=>{
  assert.deepEqual(speechWordErrors('Я не хочу','Я хочу'),{errors:1,words:3})
  assert.deepEqual(speechWordErrors('уставшим','postawszym'),{errors:1,words:1})
  assert.deepEqual(speechWordErrors('Hola','Hola mundo'),{errors:1,words:1})
})
test('live review uses speech only and never replays a candidate',()=>{
  const live=readFileSync(new URL('../components/my-coach-gemini-live.jsx',import.meta.url),'utf8')
  const parent=readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
  assert.ok(live.indexOf('if(decision?.transcriptReview)')<live.indexOf('void checkpoint(r,value,preceding)'))
  assert.match(parent,/details\?\.source==='speech'/)
  assert.match(live,/onInputFinal\?\.\(body,\{source:'typed'\}\)/)
})
