import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import { RELATIONSHIPS_INTIMACY_KEYS, RELATIONSHIPS_INTIMACY_DEFINITIONS, RELATIONSHIPS_INTIMACY_CATALOG, RELATIONSHIP_DIMENSION_ROWS } from '../data/assessments/relationships-intimacy-v1.js'
import { getAssessmentDefinition, validateAnswers } from '../lib/assessments/definitions.js'
import { canonicalJSON } from '../lib/assessments/contracts.js'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { buildAssessmentResultReport } from '../lib/assessments/result-report.js'
import { getTestScaleGuide } from '../lib/assessments/scale-guides.js'
import { interpretationPlan, interpretationRegistryCoverage, interpretationDimensionPlan } from '../lib/assessments/interpretation-registry.js'
import { buildExplorerEntries, filterExplorerEntries } from '../lib/assessments/test-explorer.js'
import { validTestKeys } from '../lib/app/test-selection-intent.js'

test('eight adult EN/RU questionnaires have stable provenance, six questions and two distinct scored resources',()=>{
  assert.equal(RELATIONSHIPS_INTIMACY_KEYS.length,8)
  assert.equal(RELATIONSHIPS_INTIMACY_DEFINITIONS.length,16)
  assert.equal(RELATIONSHIP_DIMENSION_ROWS.length,16)
  assert.equal(new Set(RELATIONSHIPS_INTIMACY_DEFINITIONS.map(d=>d.id)).size,16)
  for(const key of RELATIONSHIPS_INTIMACY_KEYS){
    const item=MONITORING_CATALOG.find(row=>row.key===key)
    assert.ok(item?.startable && item.guestEligible && item.rightsStatus==='cleared',key)
    assert.equal(item.questionCount,6)
    for(const language of ['en','ru']){
      const def=getAssessmentDefinition(key,'v1',language)
      const {contentHash,...rest}=def
      assert.equal(contentHash,'sha256:'+createHash('sha256').update(canonicalJSON(rest)).digest('hex'),key+'/'+language)
      assert.equal(def.questions.length,6)
      assert.equal(def.scoring.dimensions.length,2)
      assert.equal(def.source.status,'original-non-diagnostic-intimacy-reflection')
      const mid=Object.fromEntries(def.questions.map(q=>[q.id,2]))
      assert.equal(Object.keys(validateAnswers(def,mid)).length,6)
      for(const extreme of [0,2,4]){
        const score=scoreAssessment(def,Object.fromEntries(def.questions.map(q=>[q.id,extreme])))
        assert.equal(score.dimensions.length,2)
        assert.ok(score.dimensions.every(s=>s.value===extreme && s.min===0 && s.max===4))
        for(const lang of ['en','ru']){
          const report=buildAssessmentResultReport(score,lang)
          assert.equal(report.sections.length,2)
          for(const section of report.sections){
            const plan=interpretationDimensionPlan(score,section.key)
            assert.equal(plan.explicit,true)
            assert.ok(section.steps.length>=2)
            assert.ok(section.construct.length>4)
            assert.ok(section.meaning.length>45)
            assert.ok(section.followUp.length>25)
            assert.equal(section.bandBasis,'descriptive')
          }
        }
      }
    }
    const enGuide=getTestScaleGuide(key,'en'),ruGuide=getTestScaleGuide(key,'ru')
    assert.equal(enGuide.scales.length,2)
    assert.equal(ruGuide.scales.length,2)
    assert.ok(enGuide.scales.every(s=>s.action && s.axis))
    assert.ok(ruGuide.scales.every(s=>s.action && s.axis))
    assert.ok(interpretationPlan(key,'v1'))
  }
})
test('catalog selection, privacy and recommended focus discover intimacy and sexuality without any diagnosis',()=>{
  const count=MONITORING_CATALOG.filter(item=>item.startable).length
  assert.ok(count>=84)
  const coverage=interpretationRegistryCoverage(MONITORING_CATALOG)
  assert.deepEqual(coverage.uncovered,[])
  assert.equal(coverage.registered,coverage.total)
  for(const lang of ['en','ru']){
    const entries=buildExplorerEntries({locale:lang,audience:'guest'})
    for(const key of RELATIONSHIPS_INTIMACY_KEYS){
      const entry=entries.find(row=>row.key===key)
      assert.equal(entry?.selectable,true,key)
      assert.equal(entry.measurementAxes.length,2)
      assert.deepEqual(validTestKeys([key]),[key])
    }
    const sexuality=filterExplorerEntries(entries,{focus:['sexuality']})
    assert.ok(sexuality.some(row=>row.key==='hh-desire-dialogue'))
    assert.ok(sexuality.some(row=>row.key==='hh-intimacy-consent'))
    const tantra=filterExplorerEntries(entries,{focus:['tantra']})
    assert.ok(tantra.some(row=>row.key==='hh-tantra-presence'))
  }
})
