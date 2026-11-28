import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {compare,score,normalize,speechBenchmarkAcceptance} from '../scripts/coach-speech-benchmark.mjs'
const fixtures=JSON.parse(readFileSync(new URL('./fixtures/coach-speech-benchmark-v1.json',import.meta.url),'utf8')).fixtures
test('108 authored RU/EN/ES utterances; balanced and unique',()=>{
 assert.equal(fixtures.length,108)
 assert.equal(new Set(fixtures.map(f=>f.id)).size,108)
 for(const locale of ['ru','en','es'])assert.equal(fixtures.filter(f=>f.locale===locale).length,36)
 assert.equal(fixtures.filter(f=>f.critical).length,36)
})
test('missing transcripts are deletions, not an apparent accuracy gain',()=>{
 const f=[{id:'1',locale:'ru',category:'negation',critical:true,reference:'Я не хочу'}]
 const out=score(f,{name:'x',results:[{id:'1',audioId:'clip-1',text:null}]}).overall
 assert.equal(out.wer,1);assert.equal(out.coverage,0);assert.equal(out.criticalExactMismatch,1)
 assert.equal(score(f,{name:'x',results:[{id:'1',audioId:'clip-1',text:'Я хочу',latencyMs:500}]}).overall.wer,1/3)
})
test('comparison requires identical clips and explicit failures',()=>{
 const f=[{id:'1',locale:'ru',category:'short',reference:'Уставшим'}]
 const a={name:'a',results:[{id:'1',audioId:'same',text:'postawszym'}]},b={name:'b',results:[{id:'1',audioId:'same',text:'Уставшим'}]}
 assert.equal(compare(f,[a,b]).reports[1].overall.wer,0)
 assert.throws(()=>compare(f,[a,{...b,results:[]}]),/EXPLICIT_RESULTS_REQUIRED/)
 assert.throws(()=>compare(f,[a,{...b,results:[{...b.results[0],audioId:'other'}]}]),/AUDIO_MISMATCH/)
 assert.equal(normalize('Sí, de acuerdo.'),'sí de acuerdo')
})

function acceptanceFixture(){
 const fixture=Array.from({length:108},(_,i)=>({id:String(i),locale:['ru','en','es'][Math.floor(i/36)],category:'test',critical:i%36===0,reference:'yes'}))
 const model=(name,wrong,latency=1000)=>({name,results:fixture.map((f,i)=>({id:f.id,audioId:i.toString(16).padStart(64,'0'),text:wrong(f,i)?'other':'yes',latencyMs:latency}))})
 const baseline=model('baseline',(f,i)=>f.locale==='ru'&&i%2===1)
 const candidate=model('candidate',(f,i)=>f.locale==='ru'&&i%4===1)
 return {fixture,model,baseline,candidate}
}
test('acceptance screens actual paired metrics but never authorizes rollout',()=>{
 const {fixture,baseline,candidate}=acceptanceFixture()
 const result=speechBenchmarkAcceptance(fixture,baseline,candidate,{latencyKind:'hosted_background'})
 assert.equal(result.numericScreen,'pass')
 assert.equal(result.checks.find(x=>x.id==='ru_relative_wer_reduction_30pct').relativeReduction,.5)
 assert.equal(result.backgroundLatencyTarget.status,'pass')
 assert.equal(result.rolloutApproved,false)
 assert.equal(result.cleanSpeechWordAccuracyTarget.status,'not_measured')
 assert.equal(speechBenchmarkAcceptance(fixture,baseline,candidate,{latencyKind:'local_cpu'}).backgroundLatencyTarget.status,'not_measured')
})
test('screen rejects regressions, missing coverage and zero baseline denominator',()=>{
 const {fixture,model,baseline,candidate}=acceptanceFixture()
 const worse=model('worse',(f,i)=>f.locale==='en'&&i%2===1)
 assert.equal(speechBenchmarkAcceptance(fixture,baseline,worse).numericScreen,'fail')
 const missing={...candidate,results:candidate.results.map((row,i)=>i===0?{...row,text:null}:row)}
 const result=speechBenchmarkAcceptance(fixture,baseline,missing)
 assert.equal(result.checks.find(x=>x.id==='coverage_ru').status,'fail')
 assert.equal(result.checks.find(x=>x.id==='critical_exact_mismatch_no_regression_ru').status,'fail')
 const perfect=model('perfect',()=>false)
 const zero=speechBenchmarkAcceptance(fixture,perfect,{...perfect,name:'second'})
 assert.equal(zero.numericScreen,'not_measured')
 assert.equal(zero.rolloutApproved,false)
 assert.throws(()=>speechBenchmarkAcceptance(fixture,baseline,{...candidate,results:candidate.results.map((row,i)=>i===0?{...row,audioId:'invalid'}:row)}),/AUDIO_SHA256_REQUIRED/)
 assert.throws(()=>speechBenchmarkAcceptance(fixture,baseline,{...candidate,name:baseline.name}),/DISTINCT_MODEL_LABELS_REQUIRED/)
})
