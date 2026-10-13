import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { IPIP_SELF_EFFICACY_EN_V1 as d, IPIP_SELF_EFFICACY_CATALOG as catalog } from '../data/assessments/ipip-neo-self-efficacy-2026.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { canonicalJSON } from '../lib/assessments/contracts.js'
const answers=xs=>Object.fromEntries(d.questions.map((q,i)=>[q.id,xs[i]]))
const score=xs=>scoreAssessment(d,answers(xs)).dimensions[0].value
const reverse={1:5,2:4,3:3,4:2,5:1}
const oracle=xs=>xs[0]+xs[1]+xs[2]+xs[3]+xs[4]+xs[5]+reverse[xs[6]]+reverse[xs[7]]+reverse[xs[8]]+reverse[xs[9]]
test('exact ten-item C1 form and immutable identity; no shorter form or translated item substitution',()=>{
 assert.equal(getAssessmentDefinition(d.key,'v1','en'),d)
 assert.equal(d.questions.length,10)
 assert.deepEqual(d.questions.map(q=>q.text),['Complete tasks successfully.','Excel in what I do.','Handle tasks smoothly.','Am sure of my ground.','Come up with good solutions.','Know how to get things done.','Misjudge situations.',"Don't understand things.",'Have little to contribute.',"Don't see the consequences of things."])
 assert.deepEqual(d.scoring.dimensions[0].reverseItems,d.questions.slice(6).map(q=>q.id))
 const {contentHash,...rest}=d;assert.equal(contentHash,'sha256:'+createHash('sha256').update(canonicalJSON(rest)).digest('hex'))
 assert.equal(catalog[0].startable,false)
 assert.throws(()=>getAssessmentDefinition(d.key,'v1','ru'),/UNKNOWN_INSTRUMENT/)
})
test('every one of 1024 extreme response patterns matches independent scoring key',()=>{
 for(let mask=0;mask<1024;mask++){const xs=Array.from({length:10},(_,i)=>(mask>>i)&1?5:1);assert.equal(score(xs),oracle(xs))}
})
test('2500 deterministic complete patterns cover intermediate response values',()=>{
 let seed=20261013;for(let k=0;k<2500;k++){const xs=Array.from({length:10},()=>{seed=(1664525*seed+1013904223)>>>0;return 1+seed%5});assert.equal(score(xs),oracle(xs))}
})
test('each item at all five response values confirms its individual direction',()=>{
 for(let i=0;i<10;i++)for(let v=1;v<=5;v++){const xs=Array(10).fill(3);xs[i]=v;assert.equal(score(xs),30+(i<6?v-3:3-v))}
 assert.equal(score([1,1,1,1,1,1,5,5,5,5]),10)
 assert.equal(score([5,5,5,5,5,5,1,1,1,1]),50)
 assert.equal(score(Array(10).fill(3)),30)
 assert.equal(score(Array(10).fill(1)),26)
 assert.equal(score(Array(10).fill(5)),34)
})
test('missing answers and null at all positions require completion; zero never means missing',()=>{
 for(const q of d.questions){const a=answers(Array(10).fill(3));delete a[q.id];assert.throws(()=>scoreAssessment(d,a),/REQUIRED_ANSWER/);a[q.id]=null;assert.throws(()=>scoreAssessment(d,a),/REQUIRED_ANSWER/);a[q.id]=0;assert.throws(()=>scoreAssessment(d,a),/INVALID_ANSWER/)}
})
test('invalid types/ranges, unknown keys and fabricated provenance are rejected',()=>{
 for(const q of d.questions)for(const v of [-1,6,2.5,'3',true,NaN,Infinity]){const a=answers(Array(10).fill(3));a[q.id]=v;assert.throws(()=>scoreAssessment(d,a),/INVALID_ANSWER/)}
 assert.throws(()=>scoreAssessment(d,{...answers(Array(10).fill(3)),extra:2}),/UNKNOWN_FIELD/)
 assert.throws(()=>scoreAssessment({...d,scoringVersion:'v2'},answers(Array(10).fill(3))),/INVALID_PROVENANCE/)
})
test('results retain source version/hash, raw sum and non-normative trait semantics',()=>{
 const r=scoreAssessment(d,answers(Array(10).fill(3)));assert.equal(r.contentHash,d.contentHash);assert.equal(r.instrumentLocale,'en');assert.equal(r.dimensions[0].min,10);assert.equal(r.dimensions[0].max,50);assert.equal(r.dimensions[0].value,30);assert.equal(r.dimensions[0].dimensionClass,'trait');assert.equal(r.dimensions[0].direction,'non-normative')
})
