import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { interpretationBandModel } from '../lib/assessments/interpretation-registry.js'
import { gaugeModel, gaugeChange } from '../lib/assessments/dashboard-gauges.js'
import { legacyMixedScoreAudit } from '../lib/assessments/legacy-mixed-score-audit.js'
import { visibleTestDynamicsBand } from '../lib/assessments/test-dynamics.js'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { hasReliableInterpretationDirection } from '../lib/assessments/interpretation-context.js'

const affected=['hh-money-pressure','hh-overthinking-loop','hh-screen-saturation']
function filled(def, answers = () => 2) {
  const record=Object.fromEntries(def.questions.map((q,i)=>[q.id,answers(i,q)]))
  return scoreAssessment(def,record)
}
const groupSizes={
  'hh-money-pressure':[3,3],
  'hh-overthinking-loop':[5,1],
  'hh-screen-saturation':[5,1],
}
for(const key of affected)for(const locale of ['en','ru'])test(key+' historical v1 '+locale+' has source-exact neutral interval and visible two-domain question map',()=>{
  const old=getAssessmentDefinition(key,'v1',locale)
  const updated=getAssessmentDefinition(key,'v2',locale)
  assert.equal(hasReliableInterpretationDirection(old),false)
  assert.equal(hasReliableInterpretationDirection(updated),true)
  assert.equal(MONITORING_CATALOG.find(item=>item.key===key)?.version,'v2','new starts choose corrected version')
  assert.equal(updated.scoring.dimensions.length,2)
  assert.deepEqual(updated.scoring.dimensions.map(d=>d.items.length),groupSizes[key])
  for(const option of [0,2,4]) {
    const original=filled(old,()=>option)
    const saved=JSON.stringify(original)
    const measure=original.dimensions[0]
    const interpretation=interpretationBandModel(original,measure,locale)
    assert.equal(interpretation.verified,true)
    assert.equal(interpretation.reliableDirection,false)
    const audit=legacyMixedScoreAudit({result:original,dimension:measure,interpretation,locale})
    assert.ok(audit,key+' '+locale+' '+option)
    assert.equal(audit.kind,'historical-mixed')
    assert.equal(audit.basis,'historical-mixed-mean-v1')
    assert.equal(audit.oldVersion,'v1')
    assert.equal(audit.newerVersion,'v2')
    assert.equal(audit.sourceQuestions.length,6)
    assert.deepEqual([...new Set(audit.sourceQuestions.map(q=>q.domain))].length,2)
    assert.deepEqual(audit.sourceQuestions.map(q=>q.id),old.questions.map(q=>q.id))
    assert.deepEqual(audit.sourceQuestions.map(q=>q.text),old.questions.map(q=>q.text))
    assert.ok(audit.sourceQuestions.every(q=>q.domain.length>5))
    assert.equal(audit.rows.length,5)
    assert.deepEqual(audit.rows.map(b=>[b.from,b.to]),[[0,.33],[.5,1.33],[1.5,2.33],[2.5,3.33],[3.5,4]])
    assert.equal(audit.rows.filter(b=>b.current).length,1)
    assert.equal(audit.current.current,true)
    assert.ok(audit.rows.every(b=>b.note.length>=80))
    assert.match(audit.caution,locale==='ru'?/невозможно восстановить отдельные ответы/:/cannot be reconstructed from a saved total/)
    const gauge=gaugeModel(measure,original,locale)
    assert.ok(gauge)
    assert.equal(gauge.orientation,'neutral')
    assert.deepEqual(gauge.bands,[])
    assert.equal(gauge.rangeReading.kind,'historical-mixed')
    assert.equal(gauge.rangeReading.clusterBasis,'historical-mixed-mean-v1')
    assert.equal(gauge.rangeReading.newerVersion,'v2')
    const dynamics=visibleTestDynamicsBand(measure,original,locale)
    assert.equal(dynamics.kind,'historical-mixed')
    assert.equal(dynamics.others.length,4)
    assert.equal(dynamics.current.code,audit.current.code)
    assert.equal(JSON.stringify(original),saved,'archived result must not be changed by its report')
    const latest=filled(updated,()=>option)
    assert.equal(latest.dimensions.length,2)
    assert.deepEqual(gaugeChange(latest,original,latest.dimensions[0].key),
      {state:'baseline',delta:null},'v1 and v2 must never become a fabricated trend')
  }
})
test('every attainable legacy six-item total selects exactly one historical response group',()=>{
  for(const key of affected){
    const old=getAssessmentDefinition(key,'v1','en')
    for(let total=0;total<=24;total++){
      let pending=total
      const result=filled(old,()=>{const answer=Math.min(4,pending);pending-=answer;return answer})
      assert.equal(pending,0)
      assert.equal(result.dimensions[0].value,Math.round(total/6*100)/100)
      const dim=result.dimensions[0]
      const model=gaugeModel(dim,result,'en')
      assert.equal(model.rangeReading.rows.filter(b=>b.current).length,1)
      assert.ok(model.rangeReading.current.from<=dim.value && model.rangeReading.current.to>=dim.value)
    }
  }
})
test('corrupted source identities and invented score values fail closed',()=>{
  const old=getAssessmentDefinition('hh-money-pressure','v1','en')
  const result=filled(old)
  const dimension=result.dimensions[0]
  const interpretation=interpretationBandModel(result,dimension,'en')
  assert.ok(legacyMixedScoreAudit({result,dimension,interpretation}))
  for(const mod of [
    {...result,contentHash:'sha256:wrong'},
    {...result,definitionVersion:'v2'},
    {...result,definitionId:'nonexistent'},
  ])assert.equal(legacyMixedScoreAudit({result:mod,dimension,interpretation}),null)
  assert.equal(legacyMixedScoreAudit({result,dimension:{...dimension,value:.21},interpretation}),null)
  assert.equal(legacyMixedScoreAudit({result,dimension,interpretation:{...interpretation,reliableDirection:true}}),null)
  assert.equal(legacyMixedScoreAudit({result,dimension,interpretation:{...interpretation,verified:false}}),null)
})
test('report discloses historical version, source group and the no-backfilled-subscale rule',()=>{
  const jsx=readFileSync(new URL('../components/app/compact-assessment-report.jsx',import.meta.url),'utf8')
  assert.match(jsx,/data-legacy-version-incompatible/)
  assert.match(jsx,/question.domain/)
  assert.match(jsx,/data-author-cluster-items/)
  const code=readFileSync(new URL('../lib/assessments/legacy-mixed-score-audit.js',import.meta.url),'utf8')
  assert.doesNotMatch(code,/scoreAssessment\(/)
  assert.match(code,/archived|Archived/)
  const guest=readFileSync(new URL('../components/app/guest-scale-interpretation.jsx',import.meta.url),'utf8')
  assert.match(guest,/data-score-only/,'guest result must remain score-only')
})
