import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {compare,score,normalize} from '../scripts/coach-speech-benchmark.mjs'
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
