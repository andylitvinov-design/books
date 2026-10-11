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
