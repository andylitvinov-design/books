import { syntheticTraumaContext } from './helpers/trauma-context-fixtures.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {PROFESSIONAL_BATTERY_2026_B_DEFINITIONS as definitions} from '../data/assessments/professional-battery-2026-b.js'
import {MONITORING_CATALOG} from '../data/assessments/catalog.js'
import {canonicalJSON} from '../lib/assessments/contracts.js'
import {getAssessmentDefinition} from '../lib/assessments/definitions.js'
import {scoreAssessment} from '../lib/assessments/scoring.js'
import {buildExplorerEntries} from '../lib/assessments/test-explorer.js'
import {MIND_BODY_MONITOR_REGISTRY} from '../data/assessments/mind-body-monitor-registry.js'

test('six new source-backed measures have intact definitions',()=>{
 assert.equal(definitions.length,2)
 assert.equal(MONITORING_CATALOG.filter(item=>item.startable).length, 150)
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
  const score=scoreAssessment(found,answers, syntheticTraumaContext(found)).dimensions[0]
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
  assert.equal(scoreAssessment(d,answers(false), syntheticTraumaContext(d)).dimensions[0].value,0)
  assert.equal(scoreAssessment(d,answers(true), syntheticTraumaContext(d)).dimensions[0].value,maximum)
 }
})
test('brief and somatic forms have original item counts and upper scores',()=>{
 for(const [key,items,max] of [['phq-2',2,6],['gad-2',2,6],['k10',10,40],['phq-15',15,30]]){
  const d=getAssessmentDefinition(key,'v1','en')
  assert.equal(d.questions.length,items)
  assert.equal(scoreAssessment(d,Object.fromEntries(d.questions.map(q=>[q.id,d.answerScale.max])), syntheticTraumaContext(d)).dimensions[0].value,max)
 }
})

test('all six measures are runnable in owner account and visible as appropriate to guests',()=>{
 const allowed=new Set(['phq-2','gad-2','rses-10'])
 for(const locale of ['en','ru']){
  const account=buildExplorerEntries({locale,audience:'account'})
  const guest=buildExplorerEntries({locale,audience:'guest'})
  for(const d of definitions){
   const item=account.find(e=>e.key===d.key)
   assert.ok(item?.selectable)
   assert.equal(item.questionCount,d.questions.length)
   assert.equal(guest.find(e=>e.key===d.key).selectable,allowed.has(d.key))
  }
 }
})
test('protected professional references are metadata only, not publicly startable',()=>{
 const protectedKeys=['stai-40','bfi-2-60','ctq-sf-28','sf-36','ecr-r-36','srs-2']
 const guest=buildExplorerEntries({locale:'en',audience:'guest'})
 for(const key of protectedKeys){
  const item=MIND_BODY_MONITOR_REGISTRY.find(e=>e.key===key)
  assert.ok(item)
  assert.equal(item.enabled,false)
  const view=guest.find(e=>e.key===key)
  assert.equal(view.selectable,false)
  assert.equal(view.definition,null)
 }
})
