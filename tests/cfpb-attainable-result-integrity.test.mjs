import test from 'node:test'
import assert from 'node:assert/strict'
import { CFPB_SHORT_2017_LOOKUP, scoreCfpbShort2017 } from '../lib/assessments/cfpb-short-scoring.js'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { exactInterpretationDefinition } from '../lib/assessments/interpretation-context.js'
import { verifiedHistoryResult } from '../lib/assessments/verified-history.js'
import { interpretationBandModel } from '../lib/assessments/interpretation-registry.js'
import { gaugeModel } from '../lib/assessments/dashboard-gauges.js'
import { buildAssessmentResultReport } from '../lib/assessments/result-report.js'

// Synthetic complete five response values yielding a specific reverse-scored
// total, never actual financial or client data. q4 is the reversed frequency
// item; q6 is the official age group; q7 is administration mode.
const answersForTotal = (total, age, mode) => {
  const parts = []
  let remaining = total
  for (let index = 0; index < 5; index++) {
    parts.push(Math.min(4, remaining))
    remaining -= parts[index]
  }
  assert.equal(remaining, 0)
  return {
    'cfpb5.01': parts[0],
    'cfpb5.02': parts[1],
    'cfpb5.03': parts[2],
    'cfpb5.04': 4 - parts[3],
    'cfpb5.05': parts[4],
    'cfpb5.06': age,
    'cfpb5.07': mode,
  }
}
const definition = getAssessmentDefinition('cfpb-financial-wellbeing-5', 'v1', 'en')
const allowed = new Set(CFPB_SHORT_2017_LOOKUP.flat())

test('complete official CFPB short form: all 84 age/mode/source table cells score exactly', () => {
  assert.equal(CFPB_SHORT_2017_LOOKUP.length, 21)
  assert.equal(allowed.size, 56, '56 distinct published lookup scores, not all integers 0–100')
  for (let total = 0; total <= 20; total++) for (const age of [0, 1]) for (const mode of [0, 1]) {
    const input = answersForTotal(total, age, mode)
    const raw = scoreCfpbShort2017(input)
    const saved = scoreAssessment(definition, input)
    const cell = CFPB_SHORT_2017_LOOKUP[total][mode * 2 + age]
    assert.equal(raw.responseTotal, total)
    assert.equal(raw.score, cell)
    assert.equal(saved.dimensions[0].value, cell)
    assert.equal(verifiedHistoryResult(saved), true, 'Genuine registered CFPB score must remain trusted')
    assert.equal(exactInterpretationDefinition(saved, saved.dimensions[0]), definition)
    for (const locale of ['en','ru']) {
      const interpretation = interpretationBandModel(saved, saved.dimensions[0], locale)
      assert.equal(interpretation.verified, true)
      const reading = gaugeModel(saved.dimensions[0], saved, locale)?.rangeReading
      assert.ok(reading?.verified)
      assert.equal(reading.rows.length,1,'CFPB does not have validated individual severity bands')
      assert.match(reading.current.note,locale==='ru'?/56.*19 до 90/:/56 distinct scores within 19–90/)
      assert.match(reading.current.note,locale==='ru'?/не процентиль/:/not a percentile/)
    }
  }
})

test('CFPB impossible integers cannot masquerade as a legitimate saved client score', () => {
  const genuine = scoreAssessment(definition, answersForTotal(10, 0, 0))
  const invalid = Array.from({length:101}, (_, i)=>i).filter(n=>!allowed.has(n))
  assert.equal(invalid.length,45)
  assert.ok(invalid.includes(0)&&invalid.includes(1)&&invalid.includes(18))
  assert.ok(invalid.includes(99)&&invalid.includes(100))
  for (const value of invalid) {
    const forged = {
      ...genuine,
      dimensions: [{...genuine.dimensions[0],value}],
    }
    assert.equal(exactInterpretationDefinition(forged),null,'Off-table score '+value+' cannot verify')
    assert.equal(verifiedHistoryResult(forged),false,'Off-table score '+value+' cannot enter trends')
    assert.equal(gaugeModel(forged.dimensions[0],forged,'en'),null,
      'Off-table score '+value+' cannot get a reassuring gauge')
    assert.equal(interpretationBandModel(forged,forged.dimensions[0],'en').verified,false)
    const report = buildAssessmentResultReport(forged,'en')
    assert.equal(report.verified,false,'Off-table score '+value+' cannot acquire interpretation')
  }
})

test('CFPB outside the official lattice remains rejected even with copied source identity',()=>{
  const saved=scoreAssessment(definition,answersForTotal(13,1,1))
  const userFacingCopy=JSON.stringify(saved)
  const mutated={...saved,dimensions:[{...saved.dimensions[0],value:91}]}
  assert.equal(verifiedHistoryResult(mutated),false)
  assert.equal(verifiedHistoryResult(saved),true)
  assert.equal(JSON.stringify(saved),userFacingCopy,'Read-only report work must not mutate results')
})
