import test from 'node:test'
import assert from 'node:assert/strict'
import { TRAUMA_SCREENING_DEFINITIONS as definitions } from '../data/assessments/trauma-screening-2026.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { buildTraumaResultReport, traumaClassification } from '../lib/assessments/trauma-report.js'
import { interpretationForDimension } from '../lib/assessments/interpretation-registry.js'
import { traumaScaleGuidance } from '../lib/assessments/trauma-scale-guidance.js'
const contexts = {
  'pcl-5': {event_timing:'About one year ago',criterion_a:'Yes',exposure_modes:JSON.stringify(['It happened to me directly']),death_type:'Not applicable (the event did not involve the death of a close family member or close friend)',adult_confirmed:'Yes',event_anchored:'Yes'},
  'itq-adult': {event_timing:'1 to 5 years ago',adult_confirmed:'Yes',event_anchored:'Yes'},
}
for (const locale of ['en','ru']) test(`${locale}: all 13 trauma scales have distinct meanings, preserved raw ranges and optional support`, () => {
  const meanings = new Set(), names = new Set()
  for (const definition of definitions) for (const value of [0,2,4]) {
    const result = scoreAssessment(definition, Object.fromEntries(definition.questions.map(q => [q.id,value])), contexts[definition.key])
    const before = JSON.stringify(result)
    const report = buildTraumaResultReport(result,locale)
    for (const dimension of result.dimensions) {
      const section = report.sections.find(s => s.key === dimension.key)
      const classification = traumaClassification(result,dimension,locale)
      const interpretation = interpretationForDimension(result,dimension,locale)
      const guide = traumaScaleGuidance(dimension,locale)
      assert.ok(guide)
      meanings.add(guide.summary); names.add(guide.construct)
      assert.equal(section.construct,guide.construct)
      assert.equal(interpretation.construct,guide.construct)
      assert.equal(interpretation.summary,guide.summary)
      assert.ok(section.meaning.includes(guide.summary))
      assert.ok(section.followUp.includes(guide.observation))
      assert.deepEqual(section.steps,[])
      assert.equal(classification.basis,'descriptive')
      assert.equal(classification.code,'continuous')
      assert.equal(classification.recommendedReview,false)
      assert.equal(section.min,dimension.min);assert.equal(section.max,dimension.max);assert.equal(section.value,dimension.value)
      assert.match(section.meaning,locale==='ru'?/Бал[л] не устанавливает диагноз/:/does not establish a diagnosis/)
      assert.match(section.meaning,locale==='ru'?/не является валидированной адаптацией/:/not a validated questionnaire adaptation/)
      if (locale==='ru') assert.match(section.construct,/[А-Яа-яЁё]/)
      if (dimension.timeframe==='typical-patterns') assert.match(section.meaning,locale==='ru'?/привычных переживаний/:/typical experiences/)
      else assert.match(section.meaning,locale==='ru'?/за последний месяц/:/past month/)
    }
    assert.equal(JSON.stringify(result),before,'no mutation of scores/provenance/answers')
    const altered={...result,contentHash:'changed'}
    for (const dimension of altered.dimensions) assert.equal(traumaClassification(altered,dimension,locale).basis,'unavailable')
  }
  assert.equal(meanings.size,13);assert.equal(names.size,13)
})
test('unknown scale has no fabricated meaning; guidance distinguishes inference from observation',()=>{
  assert.equal(traumaScaleGuidance({key:'symptoms.itq.future'},'ru'),null)
  assert.match(traumaScaleGuidance({key:'symptoms.itq.negative_self_concept'},'ru').meaning,/не подтверждает их истинность/)
  assert.match(traumaScaleGuidance({key:'symptoms.itq.current_threat'},'ru').meaning,/не определяет безопасность/)
  assert.match(traumaScaleGuidance({key:'symptoms.itq.affective_dysregulation'},'en').meaning,/different experiences can produce the same sum/)
})
