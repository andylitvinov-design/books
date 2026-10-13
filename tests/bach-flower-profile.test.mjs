import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { BACH_PROFILE_EN_V1, BACH_PROFILE_RU_V1, BACH_ESSENCE_NAMES } from '../data/assessments/bach-flower-v1.js'
import { evaluateBachAnswers, rankBachDimensions } from '../lib/assessments/bach-profile.js'
import { BACH_GUIDANCE } from '../lib/assessments/bach-guidance.js'
import { ASSESSMENT_DEFINITIONS, getAssessmentDefinition, validateAnswers } from '../lib/assessments/definitions.js'
import { canonicalJSON } from '../lib/assessments/contracts.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { validateResult, compareResults } from '../lib/profile/history.js'
import { buildFixtureReport as buildAssessmentResultReport } from './helpers/interpretation-fixture.mjs'
import { buildExplorerEntries } from '../lib/assessments/test-explorer.js'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { readFileSync } from 'node:fs'

const definitions = [BACH_PROFILE_EN_V1, BACH_PROFILE_RU_V1]
const answersFor = (definition, value = 0) =>
  Object.fromEntries(definition.questions.map(q => [q.id, value]))
const resultFor = (definition, answers) => ({
  id: randomUUID(), runId: randomUUID(), accountId: '10000000-0000-4000-8000-000000000001',
  measurementAt: '2026-10-11T20:00:00.000Z', ...scoreAssessment(definition, answers),
})
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('115 original positions are preserved in RU/EN, covering all three sections and 38 Bach essences', () => {
  for (const def of definitions) {
    assert.equal(def.questions.length, 115)
    assert.deepEqual(['situation', 'character', 'control'].map(section => def.questions.filter(q => q.section === section).length), [38, 39, 38])
    assert.equal(new Set(def.questions.map(q => q.remedy)).size, 38)
    assert.equal(new Set(def.questions.map(q => q.id)).size, 115)
    assert.ok(def.questions.every(q => q.text.length > 8 && q.remedy && q.theme))
    assert.equal(def.answerScale.max, 5)
    assert.equal(def.questions[0].remedy, 'Pine')
    assert.equal(def.questions[20].remedy, 'Olive')
    assert.equal(def.questions[22].remedy, 'White Chestnut')
  }
  assert.equal(BACH_PROFILE_RU_V1.questions[0].text, 'Я чувствую себя виноватой(ым). Меня терзают угрызения совести.')
  assert.match(BACH_PROFILE_EN_V1.questions[0].text, /guilty/)
  assert.notEqual(BACH_PROFILE_EN_V1.contentHash, BACH_PROFILE_RU_V1.contentHash)
  assert.equal(BACH_ESSENCE_NAMES.length, 38)
  assert.deepEqual(Object.keys(BACH_GUIDANCE).sort(), [...BACH_ESSENCE_NAMES])
})

test('new definitions have genuine SHA256 identity hashes and are registered for the canonical runner', () => {
  for (const def of definitions) {
    const { contentHash, ...body } = def
    assert.equal(contentHash, 'sha256:' + createHash('sha256').update(canonicalJSON(body)).digest('hex'))
    assert.equal(getAssessmentDefinition(def.key, def.version, def.instrumentLocale), def)
    assert.ok(ASSESSMENT_DEFINITIONS.some(candidate => candidate.id === def.id))
  }
  const entry = MONITORING_CATALOG.find(item => item.key === BACH_PROFILE_EN_V1.key)
  assert.equal(entry.questionCount, 115)
  assert.equal(entry.startable, true)
  assert.equal(entry.guestEligible, true)
  assert.equal(entry.starterEligible, false)
  for (const locale of ['en','ru']) {
    const row = buildExplorerEntries({ locale }).find(item => item.key === entry.key)
    assert.equal(row.selectable, true)
    assert.equal(row.questionCount, 115)
  }
  const sql = read('supabase/migrations/20261011155000_bach_flower_profile_v1.sql')
  const dbDefinitions = JSON.parse(sql.match(/\$defs\$([\s\S]*?)\$defs\$::jsonb/)[1])
  assert.deepEqual(dbDefinitions, definitions)
})

test('legacy weighted scoring preserves 1x/1x/1.5x, cross-section bonuses, peaks and control signal', () => {
  const def = BACH_PROFILE_EN_V1, answers = answersFor(def)
  answers['bach.situation.21'] = 4 // Olive: +4 +1 peak
  answers['bach.character.04'] = 3 // Olive: +3
  answers['bach.control.04'] = 5 // Olive: +7.5 +2 peak +1.5 control
  answers['bach.situation.23'] = 5 // White Chestnut: +5 +2 peak
  const scores = evaluateBachAnswers(def.questions, answers)
  const olive = scores.find(item => item.remedy === 'Olive')
  assert.equal(olive.total, 23)
  assert.equal(olive.sections.length, 3)
  assert.equal(olive.evidenceCount, 3)
  assert.equal(scores.find(item => item.remedy === 'White Chestnut').total, 7)
  const dimensions = scoreAssessment(def, answers).dimensions
  assert.equal(dimensions.find(item => item.sourceConstruct === 'Olive').value, 23)
  assert.equal(dimensions.length, 38)
  assert.ok(dimensions.every(item => item.max >= item.value))
  assert.equal(rankBachDimensions(dimensions)[0].sourceConstruct, 'Olive')
})

test('fractional control weighting persists as valid safe score, and every result has a stable 38-dimension shape', () => {
  const def = BACH_PROFILE_RU_V1, low = answersFor(def), high = answersFor(def)
  high['bach.control.04'] = 1 // Olive: 1.5 control + 1.5 bonus
  const a = resultFor(def, low), b = resultFor(def, high)
  assert.equal(validateResult(a), a)
  assert.equal(validateResult(b), b)
  assert.equal(b.dimensions.find(item => item.sourceConstruct === 'Olive').value, 3)
  assert.deepEqual(a.dimensions.map(item => item.key), b.dimensions.map(item => item.key))
  assert.ok(compareResults(b, a).some(item => item.key === 'bach.olive' && item.delta === 3))
  const one = answersFor(def)
  one['bach.control.04'] = 3 // Olive: 4.5 weighted + 1.5 presence = 6
  const control = resultFor(def, one)
  assert.equal(control.dimensions.find(item => item.sourceConstruct === 'Olive').value, 6)
  assert.equal(validateResult(control), control)
  assert.throws(() => validateAnswers(def, { ...one, 'bach.control.04': 6 }), error => error.code === 'INVALID_ANSWER')
  assert.throws(() => validateAnswers(def, { ...one, 'bach.control.04': '5' }), error => error.code === 'INVALID_ANSWER')
})

test('every Bach result has human-readable bilingual guidance and all-zero answers do not force a match', () => {
  for (const def of definitions) {
    for (const value of [0, 1, 3, 5]) {
      const scored = scoreAssessment(def, answersFor(def, value))
      assert.equal(scored.dimensions.length, 38)
      for (const lang of ['en','ru']) {
        const report = buildAssessmentResultReport({ ...scored }, lang)
        assert.equal(report.sections.length, 38)
        assert.equal(report.highlightedCount, value === 0 ? 0 : 7)
        assert.ok(report.title.length > 15)
        assert.ok(report.purpose.includes('115'))
        assert.ok(report.note.includes(lang === 'ru' ? 'не является' : 'not a'))
        for (const section of report.sections) {
          assert.ok(section.title.length > 10)
          assert.ok(section.meaning.length > 40)
          assert.ok(section.steps.length >= 2)
          assert.ok(section.steps.every(step => step.length > 40))
          assert.ok(section.followUp.length > 30)
        }
      }
    }
  }
  const ui = read('components/app/compact-assessment-report.jsx')
  assert.match(ui, /report\.highlightedCount/)
  assert.match(ui, /<details className=\{styles\.details\}>/)
  assert.match(ui, /data-bach-profile/)
})
