import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {PROFESSIONAL_BATTERY_2026_B_DEFINITIONS as definitions} from '../data/assessments/professional-battery-2026-b.js'
import {MONITORING_CATALOG} from '../data/assessments/catalog.js'
import {canonicalJSON} from '../lib/assessments/contracts.js'
import {getAssessmentDefinition} from '../lib/assessments/definitions.js'
import {scoreAssessment} from '../lib/assessments/scoring.js'

test('six new source-backed measures have intact definitions',()=>{
 assert.equal(definitions.length,6)
 assert.equal(MONITORING_CATALOG.filter(item=>item.startable).length,78)
 for(const d of definitions){
  const {contentHash,...body}=d
  assert.equal(contentHash,'sha256:'+createHash('sha256').update(canonicalJSON(body)).digest('hex'))
  assert.ok(d.source.url.startsWith('https://'))
  assert.equal(d.questions.length,d.scoring.dimensions[0].items.length)
 }
})
test('registered instruments compute raw scores in declared ranges',()=>{
 for(const d of definitions){
  const found=getAssessmentDefinition(d.key,d.version,d.instrumentLocale)
  const answers=Object.fromEntries(d.questions.map(q=>[q.id,q.min??d.answerScale.min]))
  const score=scoreAssessment(found,answers).dimensions[0]
  assert.ok(score.value>=score.min&&score.value<=score.max)
 }
})

test('positive and negative reversed items produce the expected range endpoints',()=>{
 for(const [key,reverseSet,maximum] of [
  ['rses-10',[3,5,8,9,10],30],
  ['ces-d-20',[4,8,12,16],60],
 ]){
  const d=getAssessmentDefinition(key,'v1','en')
  const negative=new Set(reverseSet)
  const answers=(invert)=>Object.fromEntries(d.questions.map((q,index)=>[
   q.id,negative.has(index+1)?(invert?0:d.answerScale.max):(invert?d.answerScale.max:0),
  ]))
  assert.deepEqual(d.scoring.dimensions[0].reverseItems,reverseSet.map(index=>d.questions[index-1].id))
  assert.equal(scoreAssessment(d,answers(false)).dimensions[0].value,0)
  assert.equal(scoreAssessment(d,answers(true)).dimensions[0].value,maximum)
 }
})
test('brief and somatic forms have original item counts and upper scores',()=>{
 for(const [key,items,max] of [['phq-2',2,6],['gad-2',2,6],['k10',10,40],['phq-15',15,30]]){
  const d=getAssessmentDefinition(key,'v1','en')
  assert.equal(d.questions.length,items)
  assert.equal(scoreAssessment(d,Object.fromEntries(d.questions.map(q=>[q.id,d.answerScale.max]))).dimensions[0].value,max)
 }
})
