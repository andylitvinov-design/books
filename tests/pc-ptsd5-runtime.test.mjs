import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { PC_PTSD5_DISABLED_V1 as pc } from '../data/assessments/pc-ptsd5-disabled-v1.js'
import { canonicalJSON } from '../lib/assessments/contracts.js'
import { ASSESSMENT_DEFINITIONS, getDefinitionById, validateAnswers, validateContext, provenance } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import {
  PC_PTSD5_RELEASED, PC_PTSD5_ADMINISTRATION_POLICY, assertExactPcPtsd5Definition,
  validatePcPtsd5Answers, mergeAssessmentAnswers, applicableAssessmentQuestions,
  assessmentAnswerProgress, assessmentSaveProgress, scorePcPtsd5Dimensions, exactPcPtsd5ResultDefinition,
} from '../lib/assessments/pc-ptsd5-runtime.js'
import { assertTraumaSave, traumaAdministrationPolicy, traumaContextReady, traumaDimensionShape } from '../lib/assessments/trauma-administration.js'
import { buildPcPtsd5ResultReport } from '../lib/assessments/pc-ptsd5-report.js'
import { buildAssessmentResultReport } from '../lib/assessments/result-report.js'
import { interpretationForDimension } from '../lib/assessments/interpretation-registry.js'
import { gaugeModel, gaugeChange } from '../lib/assessments/dashboard-gauges.js'
import { verifiedHistoryResult, verifiedSnapshotRows } from '../lib/assessments/verified-history.js'

const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const yes = values => ({ exposure: 1, ...Object.fromEntries(values.map((value, index) => [`PC${index + 1}`, value])) })
const context = Object.fromEntries(PC_PTSD5_ADMINISTRATION_POLICY.acknowledgements.map(field => [field.id, 'Yes']))
const syntheticResult = answers => ({ ...provenance(pc), dimensions: scorePcPtsd5Dimensions(pc, answers) })

test('pinned definition retains exact semantic hash and source text without changing registration payload', () => {
  const { contentHash, ...body } = pc
  assert.equal(pc.id, '24a5a88c-3d1a-5e8a-8f10-ee39a3110a49')
  assert.equal(contentHash, 'sha256:599d94b7d3f4d1ef7d3a93737c16d335d76a08ed4488dd24aa400de080197b85')
  assert.equal(contentHash, 'sha256:' + createHash('sha256').update(canonicalJSON(body)).digest('hex'))
  const original = JSON.parse(source('docs/assessments/trauma-screening/pc-ptsd5-en.json'))
  assert.equal(pc.instructions, original.exposure_intro)
  assert.deepEqual(pc.exposureExamples, original.exposure_examples)
  assert.equal(pc.questions[0].text, original.gate.text)
  assert.deepEqual(pc.questions.slice(1).map(({ id, text }) => ({ id, text })), original.items)
  assert.ok(pc.questions.slice(1).every(question => question.sectionInstructions === original.stem))
  const payload = JSON.parse(source('docs/assessments/trauma-screening/registration-payload.json'))
  assert.ok(!payload.rows.some(row => row.id === pc.id))
  assert.ok(payload.excluded.includes(pc.key))
  assert.ok(Object.isFrozen(pc) && Object.isFrozen(pc.questions[0]))
  assert.equal(pc.translationVersion, 'original-en-2022')
  assert.equal(pc.suggestedRepeatDays, null)
  assert.equal(pc.administration, undefined)
})

test('runtime support cannot register, start or activate the instrument', () => {
  assert.equal(PC_PTSD5_RELEASED, false)
  assert.equal(PC_PTSD5_ADMINISTRATION_POLICY.releaseEnabled, false)
  assert.ok(PC_PTSD5_ADMINISTRATION_POLICY.releaseBlockers.includes('qualified-professional-follow-up-not-verified'))
  assert.ok(!ASSESSMENT_DEFINITIONS.some(definition => definition.id === pc.id || definition.key === pc.key))
  assert.throws(() => getDefinitionById(pc.id), /UNKNOWN_INSTRUMENT/)
  assert.throws(() => scoreAssessment(pc, { exposure: 0 }, context), /UNKNOWN_INSTRUMENT/)
  for (const path of ['data/assessments/catalog.js', 'data/assessments/trauma-screening-2026.js', 'data/assessments/trauma-screening-catalog-2026.js'])
    assert.doesNotMatch(source(path), /pc-ptsd5-disabled-v1|PC_PTSD5_DISABLED_V1/)
  for (const path of ['lib/app/repository.js', 'lib/app/guest-repository.js'])
    assert.match(source(path), /isPcPtsd5Definition\(definition\) && !PC_PTSD5_RELEASED/)
})

test('every runtime exception is scoped to the full immutable definition, not only a key or flag', () => {
  for (const change of [
    { id: '00000000-0000-5000-8000-000000000001' }, { version: 'v2' }, { instrumentLocale: 'ru' },
    { contentHash: 'sha256:wrong' }, { translationVersion: 'invented' }, { title: 'Changed' },
    { branching: { ...pc.branching, negativeResult: 4 } },
    { questions: pc.questions.map((question, index) => index ? question : { ...question, text: 'Changed' }) },
  ]) {
    const altered = { ...pc, ...change }
    assert.throws(() => assertExactPcPtsd5Definition(altered), /INVALID_PROVENANCE/)
    assert.throws(() => validateAnswers(altered, { exposure: 0 }), /INVALID_PROVENANCE/)
    assert.throws(() => applicableAssessmentQuestions(altered, {}), /INVALID_PROVENANCE/)
    assert.throws(() => traumaAdministrationPolicy(altered), /INVALID_PROVENANCE/)
  }
})

test('unanswered exposure is incomplete, never a zero or a negative screen', () => {
  assert.deepEqual(validateAnswers(pc, {}, { requireComplete: false }), {})
  assert.deepEqual(validateAnswers(pc, { exposure: null }, { requireComplete: false }), {})
  for (const answers of [{}, { exposure: null }])
    assert.throws(() => scorePcPtsd5Dimensions(pc, answers), /REQUIRED_ANSWER/)
  assert.equal(assessmentAnswerProgress(pc, {}).allAnswered, false)
  assert.equal(assessmentAnswerProgress(pc, { exposure: null }).answeredCount, 0)
})

test('NO is a complete one-question structural skip; no symptom response is fabricated', () => {
  const answers = { exposure: 0 }
  assert.deepEqual(validateAnswers(pc, answers), answers)
  assert.equal(scorePcPtsd5Dimensions(pc, answers)[0].value, 0)
  assert.equal(scorePcPtsd5Dimensions(pc, answers)[0].responseState, 'structurally-skipped')
  assert.deepEqual(assessmentAnswerProgress(pc, answers), {
    questions: [pc.questions[0]], total: 1, answeredCount: 1, allAnswered: true, nextIndex: 1,
  })
  assert.deepEqual(answers, { exposure: 0 })
})

test('all 32 complete YES combinations produce exact 0..5 counts, never exposure+symptoms', () => {
  for (let bits = 0; bits < 32; bits++) {
    const values = Array.from({ length: 5 }, (_, index) => (bits >> index) & 1)
    const answers = yes(values), dimension = scorePcPtsd5Dimensions(pc, answers)[0]
    assert.equal(dimension.value, values.reduce((a, b) => a + b, 0))
    assert.equal(dimension.responseState, 'answered')
    assert.equal(dimension.direction, 'non-normative')
    assert.equal(assessmentAnswerProgress(pc, answers).allAnswered, true)
  }
})

test('every missing/null symptom prevents a YES result, with no imputation or prorating', () => {
  for (let index = 1; index <= 5; index++) {
    for (const mode of ['missing', 'null']) {
      const answers = yes([0, 0, 0, 0, 0])
      if (mode === 'missing') delete answers[`PC${index}`]
      else answers[`PC${index}`] = null
      assert.throws(() => scorePcPtsd5Dimensions(pc, answers), /REQUIRED_ANSWER/)
      assert.equal(assessmentAnswerProgress(pc, answers).allAnswered, false)
      assert.equal(Object.keys(validateAnswers(pc, answers, { requireComplete: false })).length, 5)
    }
  }
})

test('coercion, unknown keys and out-of-range responses are rejected', () => {
  for (const value of [-1, 2, 0.5, '', '0', false, true, NaN, Infinity, [], {}]) {
    assert.throws(() => validateAnswers(pc, { exposure: value }), /INVALID_ANSWER/)
    assert.throws(() => validateAnswers(pc, { ...yes([0, 0, 0, 0, 0]), PC3: value }), /INVALID_ANSWER/)
  }
  for (const answers of [null, [], '0']) assert.throws(() => validatePcPtsd5Answers(pc, answers), /INVALID_OBJECT/)
  assert.throws(() => validateAnswers(pc, { exposure: 0, invented: 1 }), /UNKNOWN_FIELD/)
})

test('stale symptoms are rejected at final validation, including zero and null values', () => {
  for (const exposure of [0, null, undefined]) for (const value of [0, 1, null]) {
    const answers = { PC1: value, ...(exposure === undefined ? {} : { exposure }) }
    assert.throws(() => validateAnswers(pc, answers), /INAPPLICABLE_RESPONSES/)
    assert.throws(() => validateAnswers(pc, answers, { requireComplete: false }), /INAPPLICABLE_RESPONSES/)
  }
})

test('YES to NO/reset atomically removes all stale symptoms and is idempotent', () => {
  const previous = Object.freeze(yes([1, 0, 1, 0, 1]))
  const cleared = mergeAssessmentAnswers(pc, previous, { exposure: 0 })
  assert.deepEqual(cleared, { exposure: 0 })
  assert.deepEqual(mergeAssessmentAnswers(pc, cleared, { exposure: 0 }), cleared)
  assert.deepEqual(mergeAssessmentAnswers(pc, previous, { exposure: null }), {})
  assert.deepEqual(previous, yes([1, 0, 1, 0, 1]))
  assert.throws(() => mergeAssessmentAnswers(pc, previous, { exposure: 0, PC1: 1 }), /INAPPLICABLE_RESPONSES/)
  assert.throws(() => mergeAssessmentAnswers(pc, previous, { exposure: 0, PC1: false }), /INAPPLICABLE_RESPONSES/)
  assert.deepEqual(mergeAssessmentAnswers(pc, previous, { exposure: 0, PC1: null }), { exposure: 0 })
  assert.deepEqual(mergeAssessmentAnswers(pc, cleared, { exposure: 1 }), { exposure: 1 })
  assert.throws(() => scorePcPtsd5Dimensions(pc, { exposure: 1 }), /REQUIRED_ANSWER/)
})

for (const audience of ['guest', 'account']) for (const mode of ['quick', 'guided']) {
  test(`${audience}/${mode}: shared selector, progress, reload and backtracked gate transitions`, () => {
    let answers = {}, progress = 0
    assert.equal(assessmentAnswerProgress(pc, answers).total, 1)
    answers = mergeAssessmentAnswers(pc, answers, { exposure: 1 })
    let state = assessmentAnswerProgress(pc, answers)
    progress = mode === 'quick' ? state.nextIndex : assessmentSaveProgress(pc, answers, progress)
    assert.equal(state.total, 6)
    assert.equal(state.answeredCount, 1)
    for (let index = 1; index <= 5; index++) answers = mergeAssessmentAnswers(pc, answers, { [`PC${index}`]: index % 2 })
    assert.equal(assessmentAnswerProgress(pc, answers).allAnswered, true)
    progress = 6
    // One server save transaction reduces both answers and progress.
    answers = mergeAssessmentAnswers(pc, answers, { exposure: 0 })
    progress = assessmentSaveProgress(pc, answers, progress)
    assert.equal(progress, 1)
    const reloaded = JSON.parse(JSON.stringify({ answers, progress }))
    state = assessmentAnswerProgress(pc, reloaded.answers)
    assert.equal(state.total, 1)
    assert.equal(state.allAnswered, true)
    answers = mergeAssessmentAnswers(pc, reloaded.answers, { exposure: 1 })
    assert.equal(assessmentAnswerProgress(pc, answers).nextIndex, 1)
    assert.equal(assessmentAnswerProgress(pc, answers).allAnswered, false)
    assert.equal(Object.keys(answers).length, 1)
  })
}

test('progress validation still rejects malformed/out-of-bounds values', () => {
  for (const value of [-1, 7, 0.5, '1', null, NaN])
    assert.throws(() => assessmentSaveProgress(pc, { exposure: 0 }, value), /INVALID_PROGRESS/)
  assert.equal(assessmentSaveProgress(pc, { exposure: 0 }, 6), 1)
  assert.equal(assessmentSaveProgress(pc, { exposure: 1 }, 6), 6)
})

test('administration safeguards are separate, version-bound and cannot fabricate follow-up', () => {
  assert.equal(traumaAdministrationPolicy(pc), PC_PTSD5_ADMINISTRATION_POLICY)
  assert.equal(PC_PTSD5_ADMINISTRATION_POLICY.definitionId, pc.id)
  assert.equal(PC_PTSD5_ADMINISTRATION_POLICY.contentHash, pc.contentHash)
  assert.equal(traumaContextReady(pc, {}), false)
  assert.equal(traumaContextReady(pc, context), true)
  assert.throws(() => validateContext(pc, { ...context, adult_confirmed: 'No' }, { requireComplete: true }), /INVALID_CONTEXT/)
  assert.throws(() => validateContext(pc, { ...context, invented_professional: 'Yes' }), /UNKNOWN_FIELD/)
  assert.throws(() => assertTraumaSave(pc, {}, {}, context, { exposure: 1 }), /REQUIRED_CONTEXT/)
  assert.doesNotThrow(() => assertTraumaSave(pc, {}, {}, context, {}))
  assert.doesNotThrow(() => assertTraumaSave(pc, {}, context, context, { exposure: 1 }))
  assert.throws(() => assertTraumaSave(pc, { exposure: 1 }, context, {}, {}), /TRAUMA_CONTEXT_LOCKED/)
})

test('neutral reports preserve skip versus answered-zero and expose no cutoff, diagnosis or treatment action', () => {
  for (const answers of [{ exposure: 0 }, yes([0, 0, 0, 0, 0]), yes([1, 1, 1, 1, 1])]) {
    const result = syntheticResult(answers)
    assert.equal(exactPcPtsd5ResultDefinition(result), pc)
    assert.equal(verifiedHistoryResult(result), true)
    for (const locale of ['en', 'ru', 'es']) {
      const report = buildAssessmentResultReport(result, locale)
      assert.equal(report.verified, true)
      assert.equal(report.rulesVersion, 'pc-ptsd5-descriptive-v1')
      assert.equal(report.personalityType, null)
      assert.equal(report.sections.length, 1)
      assert.equal(report.sections[0].responseState, result.dimensions[0].responseState)
      assert.deepEqual(report.sections[0].steps, [])
      assert.equal(report.sections[0].recommendedReview, false)
      assert.equal(report.sections[0].bandBasis, 'descriptive')
      const classification = interpretationForDimension(result, result.dimensions[0], locale)
      assert.equal(classification.basis, 'descriptive')
      assert.deepEqual(classification.actions, [])
      const model = gaugeModel(result.dimensions[0], result, locale)
      assert.equal(model.displayKind, 'response-count')
      assert.equal(model.fraction, null)
      assert.deepEqual(model.bands, [])
      assert.deepEqual(model.answerBands, [])
      assert.doesNotMatch(JSON.stringify(report), /probable PTSD|severe PTSD|lower third|upper third|screenPositive/)
    }
  }
  assert.match(buildPcPtsd5ResultReport(syntheticResult({ exposure: 0 })).sections[0].meaning, /not five NO responses/)
  assert.match(buildPcPtsd5ResultReport(syntheticResult(yes([0, 0, 0, 0, 0]))).sections[0].meaning, /0 of the five/)
})

test('tampered provenance, response state and dimensions fail closed in every report path', () => {
  const good = syntheticResult({ exposure: 0 })
  const invalid = [
    { ...good, contentHash: 'wrong' }, { ...good, translationVersion: 'wrong' }, { ...good, instrumentLocale: 'ru' },
    { ...good, dimensions: [] }, { ...good, dimensions: Array(1) },
    { ...good, dimensions: [{ ...good.dimensions[0], responseState: undefined }] },
    { ...good, dimensions: [{ ...good.dimensions[0], responseState: 'negative-screen' }] },
    { ...good, dimensions: [{ ...good.dimensions[0], value: 1 }] },
    ...[-1, 6, 0.5, '0', NaN].map(value => ({ ...good, dimensions: [{ ...good.dimensions[0], value }] })),
  ]
  for (const result of invalid) {
    assert.equal(exactPcPtsd5ResultDefinition(result), null)
    assert.equal(verifiedHistoryResult(result), false)
    assert.equal(buildAssessmentResultReport(result).verified, false)
    assert.deepEqual(buildAssessmentResultReport(result).sections, [])
    if (result.dimensions[0]) assert.equal(gaugeModel(result.dimensions[0], result), null)
  }
})

test('structural skip is not treated as a comparable symptom-count change or replaceable snapshot state', () => {
  const before = { ...syntheticResult(yes([1, 1, 1, 1, 1])), id: 'before', accountId: 'synthetic', measurementAt: '2026-10-01T00:00:00Z' }
  const after = { ...syntheticResult({ exposure: 0 }), id: 'after', accountId: 'synthetic', measurementAt: '2026-10-02T00:00:00Z' }
  assert.equal(gaugeChange(after, before, 'symptoms.pcptsd5.total').state, 'baseline')
  const row = { ...after.dimensions[0], sourceResultId: after.id, sourceDefinitionId: after.definitionId,
    measurementAt: after.measurementAt, instrumentLocale: after.instrumentLocale, responseState: 'answered' }
  assert.deepEqual(verifiedSnapshotRows({ dimensions: [row] }, [after]), [])
})

test('all existing instruments retain their questions, answer merge and progress behavior', () => {
  for (const definition of ASSESSMENT_DEFINITIONS) {
    const first = definition.questions[0], value = first.min ?? definition.answerScale.min
    assert.equal(applicableAssessmentQuestions(definition, {}), definition.questions)
    assert.deepEqual(mergeAssessmentAnswers(definition, {}, { [first.id]: value }), { [first.id]: value })
    assert.deepEqual(mergeAssessmentAnswers(definition, { [first.id]: value }, { [first.id]: null }), {})
    assert.equal(assessmentSaveProgress(definition, {}, definition.questions.length), definition.questions.length)
    assert.equal(assessmentAnswerProgress(definition, { [first.id]: value }).total, definition.questions.length)
  }
})

test('both persistence paths share the atomic reducer without changing transaction/revision/idempotency guards', () => {
  for (const path of ['lib/app/repository.js', 'lib/app/guest-repository.js']) {
    const code = source(path)
    assert.match(code, /mergeAssessmentAnswers\(definition, row.answers, input.answers\)/)
    assert.match(code, /assessmentSaveProgress\(definition, answers, input.progress\)/)
    assert.match(code, /row.revision !== input.expectedRevision/)
    assert.match(code, /row.last_operation_id === input.operationId/)
    assert.match(code, /answers=\$3,context_ciphertext=\$4,progress=\$5/)
  }
})

test('both quick/guided UIs consume the shared question/progress model and render exact exposure examples', () => {
  for (const path of ['components/app/app-workspace.jsx', 'components/app/cabinet-landing.jsx']) {
    const code = source(path)
    assert.match(code, /assessmentAnswerProgress\(/)
    assert.match(code, /mergeAssessmentAnswers\(/)
    assert.match(code, /questions\.map\(\(item, step\)/)
    assert.match(code, /aria-valuemax=\{questions.length\}/)
    assert.match(code, /TraumaExposureExamples definition=/)
    assert.match(code, /TraumaSectionInstructions question=\{question\}/)
    assert.match(code, /TraumaSectionInstructions question=\{item\}/)
  }
  assert.match(source('components/app/trauma-administration.jsx'), /definition.exposureExamples.map/)
  assert.equal(pc.exposureExamples.length, 6)
  assert.equal(traumaDimensionShape(pc).length, 1)
})
