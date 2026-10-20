import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { buildPortraitRecommendations } from '../lib/profile/portrait-recommendations.js'
import { profileCompletionRecommendations } from '../lib/profile/summary.js'

const source = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

function completedState(id = 'test-result', date = '2026-10-16T14:00:00.000Z') {
  const definition = getAssessmentDefinition('hh-current-state', 'v2', 'en')
  const answers = Object.fromEntries(definition.questions.map(q => [q.id, 5]))
  return { id, measurementAt: date, ...scoreAssessment(definition, answers) }
}

test('portrait suggestions only use verified saved measurements, never missing or invented rays', () => {
  const empty = buildPortraitRecommendations([], 'en')
  assert.equal(empty.measuredCount, 0)
  assert.deepEqual(empty.measurements, [])
  assert.deepEqual(empty.strengths, [])
  assert.deepEqual(empty.growth, [])

  const measured = buildPortraitRecommendations([completedState()], 'ru')
  assert.ok(measured.measuredCount > 0)
  for (const row of measured.measurements) {
    assert.equal(row.resultId, 'test-result')
    assert.ok(row.rawValue >= row.min && row.rawValue <= row.max)
    assert.ok(typeof row.label === 'string' && row.label)
    assert.ok(row.sourceTitle && row.dimensionKey)
    assert.ok(row.reflection.length > 8)
  }
  // 60/45 thresholds were editorial display rules, not psychometric standards.
  assert.deepEqual(measured.strengths, [])
  assert.deepEqual(measured.growth, [])
})

test('unverified later results cannot be used as current portrait strengths or weaknesses', () => {
  const old = completedState('old', '2026-10-14T14:00:00.000Z')
  const tampered = {
    ...completedState('invalid-latest', '2026-10-17T14:00:00.000Z'),
    contentHash: 'invalid-identity',
  }
  const model = buildPortraitRecommendations([old, tampered], 'en')
  assert.equal(model.measuredCount, 0)
  assert.deepEqual(model.strengths, [])
  assert.deepEqual(model.growth, [])
  assert.equal(model.rejectedCount, 1)
})

test('already completed questionnaire is not recommended to fill a different profile layer', () => {
  const baseline = profileCompletionRecommendations({ results: [], locale: 'en', limit: 6 })
  const fresh = completedState()
  const after = profileCompletionRecommendations({ results: [fresh], locale: 'en', limit: 6 })
  // When a completed test is a candidate, it must not be suggested again.
  if (baseline.recommendations.some(row => row.key === fresh.definitionKey)) {
    assert.ok(!after.recommendations.some(row => row.key === fresh.definitionKey))
  }
})

test('Reports portrait places all three actions after photo and before ray chooser; targets are reachable', () => {
  const workspace = source('components/app/app-workspace.jsx')
  const visual = source('components/app/test-explorer-visual.jsx')
  const reports = workspace.slice(workspace.indexOf('function PortfolioPage('), workspace.indexOf('function ProfileOverview('))
  assert.match(visual, /portraitActions = null/)
  assert.match(visual, /\{portrait && !compact && portraitActions\}/)
  assert.ok(visual.indexOf('{portrait && !compact && portraitActions}') < visual.indexOf('className={styles.portraitControls}'))
  assert.match(reports, /data-testid="portrait-completion-action"/)
  assert.match(reports, /data-testid="portrait-analyses-action"/)
  assert.match(reports, /setAnalysisScrollRequest/)
  assert.match(reports, /hh-insights-title/)
  assert.match(reports, /data-testid="portrait-recommendations-action"/)
  assert.match(reports, /profile=missing/)
  assert.match(reports, /setRecommendationScrollRequest/)
  assert.match(reports, /scrollIntoView/)
  assert.match(reports, /<PortraitRecommendations results=\{data.results \|\| \[\]\} locale=\{locale\} \/>/)
  const guidance = source('components/app/portrait-recommendations.jsx')
  assert.match(guidance, /id="hh-portrait-recommendations"/)
  assert.match(guidance, /What your questionnaires report/)
  assert.match(guidance, /Choose your own focus/)
  assert.match(guidance, /app\/results\//)
})

test('profile completion route is an in-account prioritized list, not a public generic explorer', () => {
  const tests = source('components/app/account-test-battery.jsx')
  const excerpt = tests.slice(tests.indexOf('export function AccountTestBattery('))
  assert.match(excerpt, /searchParams.get\('profile'\) === 'missing'/)
  assert.match(excerpt, /profileCompletionRecommendations\(/)
  assert.match(excerpt, /data-testid="profile-missing-tests"/)
  assert.match(excerpt, /profileCompletion.recommendations.map/)
  assert.match(excerpt, /app\/monitoring\//)
  assert.match(source('lib/profile/summary.js'), /!completed.has\(item.key\)/)
})
