import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { isMixedDirectionResultDimension } from '../lib/assessments/interpretation-context.js'
import { courseMeasuredProfile, courseSuggestedFocus, goalForChosenScale, coursePracticeFocus, courseContinuationGoals, courseNextCycleScaleKeys } from '../lib/inner-growth/course-strategy.js'
import { deterministicPatterns } from '../lib/assessments/monitoring.js'
import { COURSE_CONTENT_V3 } from '../lib/inner-growth/course-v3.js'
import { mount, nodes, textOf } from './helpers/course-ui-harness.mjs'

const now = Date.parse('2026-10-16T13:00:00Z')
const accountId = randomUUID()
const affected = [
  ['hh-money-pressure', 3, 'calm_regulation'],
  ['hh-overthinking-loop', 5, 'calm_regulation'],
  ['hh-screen-saturation', 5, 'attention_clarity'],
]
function fixture(key, locale, difficultyCount, context, day = 12) {
  const definition = getAssessmentDefinition(key, 'v1', locale)
  return { ...scoreAssessment(definition, Object.fromEntries(definition.questions.map((q, i) =>
    [q.id, i < difficultyCount ? 2 : context]))), id: randomUUID(), accountId,
    measurementAt: `2026-10-${day}T12:00:00Z` }
}
for (const [key, count, goal] of affected) for (const locale of ['en', 'ru']) {
  test(`${key} ${locale}: coping/context-only increases never raise new course priority`, () => {
    const before = fixture(key, locale, count, 0), after = fixture(key, locale, count, 4)
    const original = JSON.stringify([before, after])
    assert.ok(after.dimensions[0].value > before.dimensions[0].value)
    for (const result of [before, after]) {
      assert.equal(isMixedDirectionResultDimension(result, result.dimensions[0]), true)
      const profile = courseMeasuredProfile({results: [result], testKeys: [key], locale, now})
      assert.equal(profile.scales.length, 1, 'Raw historical measure remains visible')
      const row = profile.scales[0]
      assert.equal(row.score, result.dimensions[0].value)
      assert.equal(row.eligible, false)
      assert.equal(row.priorityPercent, null)
      assert.equal(row.ineligibilityCode, 'mixed-direction-v1-total')
      assert.match(row.ineligibilityReason, locale === 'ru' ? /не используется/ : /not used/)
      assert.deepEqual(profile.priority, [])
      assert.deepEqual(courseSuggestedFocus(profile), [])
      // Saved choices are a separate contract: do not remove or reinterpret them.
      assert.equal(goalForChosenScale(row.id, locale), null, 'No new automatic goal from a historical mixed total')
      assert.deepEqual(courseContinuationGoals([row.id]), [goal])
      assert.deepEqual(courseNextCycleScaleKeys([row.id], goal), [row.id])
      const historical = coursePracticeFocus([row.id], 'inner_support', 1, locale)
      const current = coursePracticeFocus([row.id], 'inner_support', 1, locale, COURSE_CONTENT_V3)
      assert.equal(historical.scaleId, row.id)
      assert.equal(historical.goal, goal)
      assert.equal(current.scaleId, row.id)
      assert.equal(current.goal, goal)
    }
    assert.equal(JSON.stringify([before, after]), original, 'Saved results are never mutated')
  })
  test(`${key} ${locale}: monitoring retains numeric deltas without valenced claims`, () => {
    for (const [contexts, expected] of [[[0,2,4], 'higher'], [[4,2,0], 'lower'], [[2,4,2], 'stable']]) {
      const results = contexts.map((context, i) => fixture(key, locale, count, context, 12 + i))
      const patterns = deterministicPatterns({results, locale})
      assert.equal(patterns.length, 1)
      assert.equal(patterns[0].state, expected)
      assert.equal(patterns[0].delta, results[2].dimensions[0].value - results[0].dimensions[0].value)
      assert.ok(!['improving','declining'].includes(patterns[0].state))
    }
  })
}

test('the mixed-direction guard is identity-bound, and ordinary difficulty remains eligible', () => {
  const affected = fixture('hh-money-pressure','en',3,4)
  for (const altered of [
    {...affected, contentHash:'unknown'}, {...affected, definitionVersion:'v2'},
    {...affected, translationVersion:'another-translation'},
    {...affected, dimensions:[{...affected.dimensions[0], direction:'non-normative'}]},
  ]) assert.equal(isMixedDirectionResultDimension(altered, altered.dimensions[0]), false)
  const ordinary = fixture('hh-stress-weather','en',6,4)
  const profile = courseMeasuredProfile({results:[ordinary],testKeys:['hh-stress-weather'],now})
  assert.equal(isMixedDirectionResultDimension(ordinary, ordinary.dimensions[0]),false)
  assert.equal(profile.scales[0].eligible,true)
  assert.equal(profile.scales[0].priorityPercent,50)
  assert.equal(profile.scales[0].ineligibilityReason,null)
})

test('course completion explains the exclusion beside the retained raw measure in both languages', () => {
  for (const locale of ['en','ru']) for (const compactResults of [false,true]) {
    const result=fixture('hh-money-pressure',locale,3,4)
    const profile=courseMeasuredProfile({results:[result],testKeys:['hh-money-pressure'],locale,now})
    const t=new Proxy({}, {get:(_object,key)=>String(key)})
    const h=mount('course-completion-review',{props:{t,root:`/${locale}/app`,locale,compactResults,
      confirmedStatuses:[{key:'hh-money-pressure',resultId:result.id}],optionByKey:new Map(),profile,suggested:[]}})
    const note=nodes(h.tree).find(node=>node.props?.['data-course-ineligibility']==='mixed-direction-v1-total')
    assert.ok(note)
    assert.equal(textOf(note),profile.scales[0].ineligibilityReason)
    assert.ok(nodes(h.tree).some(node=>node.type==='meter'&&node.props.value===3))
    assert.equal(nodes(h.tree).filter(node=>node.props?.['data-course-suggested-scale']).length,0)
    h.unmount()
  }
})
