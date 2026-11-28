import test from 'node:test'
import assert from 'node:assert/strict'
import {aggregateLiveComparison,PROVIDERS,SMOKE_IDS} from '../scripts/coach-speech-live-compare.mjs'
const fixture={id:'ru-short-1',locale:'ru',category:'short',critical:true,reference:'Уставшим'}
const make=(provider,over={})=>({fixtureId:fixture.id,locale:'ru',audioId:'a'.repeat(64),seconds:1,primaryModel:PROVIDERS[0],attemptedProvider:provider,hints:false,vocabulary:false,primary:provider===PROVIDERS[0]?{text:'Уставшим',latencyMs:500}:null,fallback:provider===PROVIDERS[0]?null:{provider,text:'Уставшим',latencyMs:100},reason:null,partial:true,...over})
test('all three explicit attempts on identical audio required before scoring',()=>{
  const rows=PROVIDERS.map(p=>make(p))
  assert.equal(aggregateLiveComparison([fixture],rows.slice(0,2)).complete,false)
  const result=aggregateLiveComparison([fixture],rows)
  assert.equal(result.complete,true);assert.equal(result.reports.length,3)
  assert.equal(result.reports[0].overall.wer,0)
  assert.equal(result.realClientAcceptance,false)
})
test('fallback is never attributed to Gemini; explicit failures remain in coverage',()=>{
  const rows=PROVIDERS.map(p=>make(p))
  rows[0]=make(PROVIDERS[0],{primary:null,fallback:{provider:PROVIDERS[1],text:'Уставшим',latencyMs:100},reason:'STT_PROVIDER_UNAVAILABLE'})
  const result=aggregateLiveComparison([fixture],rows)
  assert.equal(result.reports[0].overall.coverage,0)
  assert.equal(result.reports[0].overall.wer,1)
  assert.equal(result.failures.length,1)
})
test('reject mismatched audio, duplicate results, wrong model and ambiguous fallback chains',()=>{
  const rows=PROVIDERS.map(p=>make(p))
  assert.throws(()=>aggregateLiveComparison([fixture],[rows[0],make(PROVIDERS[1],{audioId:'b'.repeat(64)})]),/AUDIO_MISMATCH/)
  assert.throws(()=>aggregateLiveComparison([fixture],[rows[0],rows[0]]),/DUPLICATE_RESULT/)
  assert.throws(()=>aggregateLiveComparison([fixture],[make(PROVIDERS[1],{fallback:{provider:PROVIDERS[2],text:'x',latencyMs:10}})]),/WRONG_LOCAL_MODEL/)
  assert.throws(()=>aggregateLiveComparison([fixture],[make('whisper-local-fallback-chain')]),/UNEXPECTED_RESULT/)
})
test('balanced smoke plan is fixed before testing: 15 fixtures, 5 per language',()=>{
  assert.equal(SMOKE_IDS.length,15)
  for(const l of ['ru','en','es'])assert.equal(SMOKE_IDS.filter(id=>id.startsWith(l+'-')).length,5)
  assert.throws(()=>aggregateLiveComparison([fixture],[make(PROVIDERS[0])],{smoke:true}),/PLAN_FIXTURE_MISSING/)
})
