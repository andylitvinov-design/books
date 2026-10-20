import { syntheticTraumaContext } from './helpers/trauma-context-fixtures.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { buildClientReport } from '../lib/profile/client-report.js'
import { RELATIONSHIPS_INTIMACY_KEYS, RELATIONSHIPS_INTIMACY_DEFINITIONS, RELATIONSHIP_DIMENSION_ROWS } from '../data/assessments/relationships-intimacy-v1.js'
import { getAssessmentDefinition, validateAnswers } from '../lib/assessments/definitions.js'
import { canonicalJSON } from '../lib/assessments/contracts.js'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { buildAssessmentResultReport } from '../lib/assessments/result-report.js'
import { getTestScaleGuide } from '../lib/assessments/scale-guides.js'
import { interpretationPlan, interpretationRegistryCoverage, interpretationDimensionPlan, interpretationBandModel } from '../lib/assessments/interpretation-registry.js'
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
        const score=scoreAssessment(def,Object.fromEntries(def.questions.map(q=>[q.id,extreme])), syntheticTraumaContext(def))
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
  assert.equal(count,150)
  const coverage=interpretationRegistryCoverage(MONITORING_CATALOG)
  assert.deepEqual(coverage.uncovered,[])
  assert.equal(coverage.registered,coverage.total)
  for(const lang of ['en','ru']){
    const entries=buildExplorerEntries({locale:lang,audience:'guest'})
    for(const key of RELATIONSHIPS_INTIMACY_KEYS){
      const entry=entries.find(row=>row.key===key)
      assert.equal(entry?.selectable,true,key)
      assert.ok(entry.measurementAxes.length >= 1 && entry.measurementAxes.length <= 2,key)
      assert.deepEqual(validTestKeys([key]),[key])
    }
    const sexuality=filterExplorerEntries(entries,{focus:['sexuality']})
    assert.ok(sexuality.some(row=>row.key==='hh-desire-dialogue'))
    assert.ok(sexuality.some(row=>row.key==='hh-intimacy-consent'))
    const tantra=filterExplorerEntries(entries,{focus:['tantra']})
    assert.ok(tantra.some(row=>row.key==='hh-tantra-presence'))
  }
})


test('independent identity, item-group and numeric fixtures preserve zero and reject missing answers', async () => {
  const expected=JSON.parse(await readFile('tests/fixtures/relationships-intimacy-identities.json','utf8'))
  assert.deepEqual(RELATIONSHIPS_INTIMACY_DEFINITIONS.map(d=>({id:d.id,key:d.key,locale:d.instrumentLocale,hash:d.contentHash})),expected)
  const sql=await readFile('supabase/migrations/20261011211746_hh_love_intimacy_assessments.sql','utf8')
  const tag=sql.match(/jsonb_array_elements\((\$[^$]+\$)/)[1]
  assert.deepEqual(JSON.parse(sql.split(tag)[1]),RELATIONSHIPS_INTIMACY_DEFINITIONS)
  for(const d of RELATIONSHIPS_INTIMACY_DEFINITIONS){
    assert.equal(MONITORING_CATALOG.find(x=>x.key===d.key).testStyle,'engaging')
    const ids=Array.from({length:6},(_,i)=>d.key+'.'+String(i+1).padStart(2,'0'))
    assert.deepEqual(d.questions.map(q=>q.id),ids)
    assert.deepEqual(d.scoring.dimensions.map(s=>s.items),[ids.slice(0,3),ids.slice(3)])
    for(const [values,wanted] of [
      [[0,0,0,4,4,4],[0,4]],[[4,4,4,0,0,0],[4,0]],
      [[0,1,4,4,2,0],[1.67,2]],[[0,0,4,0,4,4],[1.33,2.67]],
    ]){
      const answers=Object.fromEntries(ids.map((id,i)=>[id,values[i]]))
      assert.deepEqual(scoreAssessment(d,answers, syntheticTraumaContext(d)).dimensions.map(s=>s.value),wanted)
    }
    for(const invalid of [undefined,null,-1,5,1.5,'2',NaN]){
      const answers=Object.fromEntries(ids.map(id=>[id,0]))
      if(invalid===undefined)delete answers[ids[0]];else answers[ids[0]]=invalid
      assert.throws(()=>scoreAssessment(d,answers, syntheticTraumaContext(d)),d.key+': '+invalid)
    }
  }
})

test('bilingual saved report and PDF models retain experimental status and consent limits', () => {
  for(const d of RELATIONSHIPS_INTIMACY_DEFINITIONS){
    const result={...scoreAssessment(d,Object.fromEntries(d.questions.map(q=>[q.id,0])), syntheticTraumaContext(d)),id:d.id,measurementAt:'2026-10-12T06:00:00.000Z'}
    for(const locale of ['en','ru']){
      const report=buildAssessmentResultReport(result,locale)
      assert.match(report.contextNote,locale==='ru'?/Экспериментальные.*Holistic House/:/experimental Holistic House/)
      assert.match(report.contextNote,locale==='ru'?/без клинической валидации/:/not clinically validated/)
      assert.match(report.contextNote,locale==='ru'?/согласие/:/consent/)
      assert.ok(report.sections.every(s=>s.bandBasis==='descriptive'&&!s.recommendedReview))
      const pdf=buildClientReport({results:[result],locale})
      assert.equal(pdf.tests[0].interpretation.contextNote,report.contextNote)
      assert.deepEqual(pdf.tests[0].dimensions.map(s=>s.value),[0,0])
    }
    assert.equal(buildAssessmentResultReport({...result,definitionVersion:'v999'},'en').contextNote,null)
  }
})


test('relationship scores retain exact two-decimal means without invented categories or rescoring history', () => {
  for(const d of RELATIONSHIPS_INTIMACY_DEFINITIONS) {
    const result=scoreAssessment(d,Object.fromEntries(d.questions.map((q,i)=>[q.id,[0,0,4,0,4,4][i]])), syntheticTraumaContext(d))
    assert.deepEqual(result.dimensions.map(x=>x.value),[1.33,2.67])
    const unchanged = JSON.stringify(result)
    for(const locale of ['en','ru']) {
      for (const dimension of result.dimensions) {
        const model = interpretationBandModel(result,dimension,locale)
        assert.equal(model.code,'continuous')
        assert.equal(model.continuous,true)
        assert.deepEqual(model.bands,[])
        assert.equal(model.currentBand,null)
        assert.equal(model.presentationDirection,'resource')
        assert.ok(model.meaning.includes(String(dimension.value)))
        assert.ok(model.actions.length>=2)
      }
      const report = buildAssessmentResultReport(result,locale)
      assert.ok(report.sections.every(x=>x.bandBasis==='descriptive'&&!x.recommendedReview))
      assert.deepEqual(report.sections.map(x=>x.value),[1.33,2.67])
      assert.equal(JSON.stringify(result),unchanged,'Reporting never rescores or mutates saved history')
    }
  }
})
