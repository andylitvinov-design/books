import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { BACH_QUESTION_BANK, BACH_REMEDY_NAMES } from '../data/assessments/bach-flower-v1.js'
import { getAssessmentDefinition, validateAnswers } from '../lib/assessments/definitions.js'
import { canonicalJSON } from '../lib/assessments/contracts.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { buildAssessmentResultReport } from '../lib/assessments/result-report.js'
import { compareResults, createProfileSnapshot } from '../lib/profile/history.js'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'

const EN = getAssessmentDefinition('hh-bach-flower', 'v1', 'en')
const RU = getAssessmentDefinition('hh-bach-flower', 'v1', 'ru')
const emptyAnswers = (definition) => Object.fromEntries(definition.questions.map((q) => [q.id, 0]))
const scored = (definition, answers) => scoreAssessment(definition, answers)

test('author source is preserved: 115 translated questions, 38 remedies, no example client answers', () => {
  assert.equal(BACH_QUESTION_BANK.length, 115)
  assert.equal(BACH_REMEDY_NAMES.length, 38)
  assert.equal(new Set(BACH_QUESTION_BANK.map((q) => q.id)).size, 115)
  assert.deepEqual(
    ['situation', 'character', 'control'].map((section) => BACH_QUESTION_BANK.filter((q) => q.section === section).length),
    [38, 39, 38],
  )
  assert.deepEqual(
    [...new Set(BACH_QUESTION_BANK.map((q) => q.remedy))].sort((a,b) => a.localeCompare(b, 'en')),
    [...BACH_REMEDY_NAMES],
  )
  for (const [index, question] of BACH_QUESTION_BANK.entries()) {
    assert.ok(question.ru?.length > 5 && question.en?.length > 5, String(index))
    assert.ok(question.theme && BACH_REMEDY_NAMES.includes(question.remedy))
    assert.equal(Object.hasOwn(question, 'score'), false, 'mock client scores must never carry into the new questionnaire')
    assert.equal(EN.questions[index].text, question.en)
    assert.equal(RU.questions[index].text, question.ru)
    assert.equal(EN.questions[index].id, RU.questions[index].id)
  }
  for (const def of [EN, RU]) {
    const {contentHash, ...body} = def
    assert.equal(contentHash, 'sha256:' + createHash('sha256').update(canonicalJSON(body)).digest('hex'))
    assert.equal(def.questions.length, 115)
    assert.equal(def.answerScale.min, 0)
    assert.equal(def.answerScale.max, 5)
  }
  assert.notEqual(EN.contentHash, RU.contentHash)
})

test('registered Bach questionnaire appears in shared guest/account test catalogue', () => {
  const catalog = MONITORING_CATALOG.find((item) => item.key === 'hh-bach-flower')
  assert.ok(catalog)
  assert.equal(catalog.version, 'v1')
  assert.equal(catalog.instrumentLocale, 'dynamic')
  assert.equal(catalog.startable, true)
  assert.equal(catalog.guestEligible, true)
  assert.equal(catalog.questionCount, 115)
  assert.equal(catalog.rightsStatus, 'cleared')
  assert.match(catalog.description.en, /not a validated diagnostic/i)
})

test('score reproduces the author algorithm, including cross-section, control and peaks', () => {
  const answers = emptyAnswers(EN)
  answers['situation-1'] = 3  // Pine: situation
  answers['character-13'] = 4 // Pine: character, +1 peak
  answers['control-13'] = 5   // Pine: control x1.5, +2 peak, +1.5 control
  const dimension = scored(EN, answers).dimensions.find((d) => d.remedy === 'Pine')
  assert.equal(dimension.value, 23) // 3 + 4 + 7.5 + 1 + 2 + 1.5 + 4
  assert.equal(dimension.evidenceCount, 3)
  assert.deepEqual(dimension.sections, ['situation', 'character', 'control'])
  assert.equal(dimension.max, 29)
  assert.equal(dimension.theme, 'вина')
})

test('0–5 responses allow formerly unreachable author peak bonuses and reject out-of-range inputs', () => {
  const answers = emptyAnswers(EN)
  for (const value of [0, 1, 2, 3, 4, 5]) {
    const current = {...answers, 'control-13': value}
    assert.equal(validateAnswers(EN, current)['control-13'], value)
  }
  const low = scored(EN, {...answers, 'control-13': 3}).dimensions.find((d) => d.remedy === 'Pine')
  const peak4 = scored(EN, {...answers, 'control-13': 4}).dimensions.find((d) => d.remedy === 'Pine')
  const peak5 = scored(EN, {...answers, 'control-13': 5}).dimensions.find((d) => d.remedy === 'Pine')
  assert.equal(low.value, 6)
  assert.equal(peak4.value, 8.5)
  assert.equal(peak5.value, 11)
  assert.throws(() => scored(EN, {...answers, 'control-13': 6}), (err) => err.code === 'INVALID_ANSWER')
})

test('zero scores produce a neutral, non-prescriptive report in both languages', () => {
  const value = scored(EN, emptyAnswers(EN))
  assert.equal(value.dimensions.length, 38)
  assert.ok(value.dimensions.every((d) => d.value === 0))
  const en = buildAssessmentResultReport(value, 'en')
  const ru = buildAssessmentResultReport(value, 'ru')
  assert.equal(en.sections.length, 1)
  assert.equal(ru.sections.length, 1)
  assert.match(en.sections[0].title, /No prominent matches/)
  assert.match(ru.sections[0].title, /не найдено/)
  assert.match(en.note, /not a clinical cutoff/)
  assert.match(ru.note, /не клинический порог/)
  assert.match(en.intro, /not prescriptions/i)
})

test('ranked interpretation shows primary/additional/verification themes, not a medical prescription', () => {
  const data = scored(EN, Object.fromEntries(EN.questions.map((q) => [q.id, 5])))
  assert.equal(data.dimensions.length, 38)
  assert.ok(data.dimensions.every((d) => d.value > 0 && d.value <= d.max))
  const report = buildAssessmentResultReport(data, 'en')
  assert.equal(report.sections.length, 13)
  assert.match(report.sections[0].title, /Primary match/)
  assert.match(report.sections[3].title, /Additional theme/)
  assert.match(report.sections[7].title, /For further review/)
  assert.ok(report.sections.every((s) => s.steps.length === 2 && s.followUp.length > 40))
  assert.match(report.note, /not a clinical cutoff/)
  assert.doesNotMatch(report.intro + ' ' + report.sections.map((s) => s.steps.join(' ')).join(' '), /take [0-9]+|prescribed dose|cure you/i)
})

test('38 stable remedy dimensions survive repeated comparison and profile snapshot', () => {
  const answers = emptyAnswers(EN)
  const prior = {id:randomUUID(),accountId:'10000000-0000-4000-8000-000000000001',measurementAt:'2026-10-10T12:00:00.000Z',...scored(EN, answers)}
  const nextAnswers = {...answers, 'control-13':2}
  const next = {id:randomUUID(),accountId:prior.accountId,measurementAt:'2026-10-11T12:00:00.000Z',...scored(EN,nextAnswers)}
  const difference = compareResults(next, prior)
  assert.equal(difference.length, 38)
  assert.equal(difference.find((d) => d.key === 'bach.pine').delta, 4.5)
  const snapshot = createProfileSnapshot({id:randomUUID(),accountId:next.accountId,generatedResult:next,carriedResults:[],createdAt:next.measurementAt})
  assert.equal(snapshot.dimensions.length, 38)
})
