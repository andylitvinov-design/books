import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { IPIP_TEAMWORK_EN_V1 as d, IPIP_TEAMWORK_CATALOG } from '../data/assessments/ipip-via-r-teamwork-2026.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { canonicalJSON } from '../lib/assessments/contracts.js'
const answer = values => Object.fromEntries(d.questions.map((q,i)=>[q.id,values[i]]))
const score = values => scoreAssessment(d,answer(values)).dimensions[0].value
test('source-keyed four-item identity, hash, and non-startable release gate',()=>{
 assert.equal(getAssessmentDefinition(d.key,'v1','en'),d)
 assert.equal(d.instrumentLocale,'en')
 assert.deepEqual(d.questions.map(q=>q.text),['Am an extremely loyal person.','Support my teammates or fellow group members.','Am not good at working with a group.','Prefer to do everything alone.'])
 assert.deepEqual(d.scoring.dimensions[0].reverseItems,d.questions.slice(2).map(q=>q.id))
 const {contentHash,...payload}=d
 assert.equal(contentHash,'sha256:'+createHash('sha256').update(canonicalJSON(payload)).digest('hex'))
 assert.equal(IPIP_TEAMWORK_CATALOG[0].startable,false)
 assert.equal(IPIP_TEAMWORK_CATALOG[0].rightsStatus,'cleared')
 assert.throws(()=>getAssessmentDefinition(d.key,'v1','ru'),/UNKNOWN_INSTRUMENT/)
})
test('all 625 combinations match independent source-derived lookup oracle',()=>{
 // Explicit lookup comes from official IPIP scoring instructions, not scorer internals.
 const reverse={1:5,2:4,3:3,4:2,5:1};let n=0
 for(let a=1;a<=5;a++)for(let b=1;b<=5;b++)for(let c=1;c<=5;c++)for(let e=1;e<=5;e++){
  assert.equal(score([a,b,c,e]),a+b+reverse[c]+reverse[e]);n++
 }
 assert.equal(n,625)
})
test('minimum maximum midpoint and reversal sensitivity',()=>{
 assert.equal(score([1,1,5,5]),4)
 assert.equal(score([5,5,1,1]),20)
 assert.equal(score([3,3,3,3]),12)
 assert.equal(score([1,1,1,1]),12)
 assert.equal(score([5,5,5,5]),12)
 assert.equal(score([2,1,5,5]),5)
 assert.equal(score([1,1,4,5]),5)
})
test('every missing or null item is rejected without prorating',()=>{
 for(const q of d.questions){const values=answer([3,3,3,3]);delete values[q.id];assert.throws(()=>scoreAssessment(d,values),/REQUIRED_ANSWER/);values[q.id]=null;assert.throws(()=>scoreAssessment(d,values),/REQUIRED_ANSWER/)}
})
test('zero, range, fractional, string, boolean and unknown fields rejected',()=>{
 for(const invalid of [0,6,-1,2.5,'3',true,NaN,Infinity])for(const q of d.questions){const values=answer([3,3,3,3]);values[q.id]=invalid;assert.throws(()=>scoreAssessment(d,values),/INVALID_ANSWER/)}
 assert.throws(()=>scoreAssessment(d,{...answer([3,3,3,3]),extra:2}),/UNKNOWN_FIELD/)
})
test('forged source version/provenance cannot be scored',()=>{
 assert.throws(()=>scoreAssessment({...d,scoringVersion:'v2'},answer([3,3,3,3])),/INVALID_PROVENANCE/)
 const result=scoreAssessment(d,answer([1,1,5,5]));assert.equal(result.contentHash,d.contentHash);assert.equal(result.instrumentLocale,'en');assert.equal(result.dimensions[0].direction,'non-normative')
})
