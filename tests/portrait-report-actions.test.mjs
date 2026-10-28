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

test('Reports gives axes and source-backed tests their own mini tabs, with Goals linked to the saved programme', () => {
  const workspace=source('components/app/app-workspace.jsx')
  const visual=source('components/app/test-explorer-visual.jsx')
  const actions=source('components/app/portrait-test-quick-actions.jsx')
  const helper=source('lib/profile/portrait-test-suggestions.js')
  const css=source('components/app/portrait-test-quick-actions.module.css')
  const inline=source('app/[locale]/app/[[...path]]/insights-compact.css')
  const programme=source('components/app/development-program.jsx')
  const reports=workspace.slice(workspace.indexOf('function PortfolioPage('),workspace.indexOf('function ProfileOverview('))
  assert.match(reports,/const \[portraitTab, setPortraitTab\] = useState\('goals'\)/)
  assert.match(reports,/portraitTests=\{\(\{ selectedSector, selectedAxes \}\) =>/)
  assert.match(reports,/<PortraitTestList locale=\{locale\} sector=\{selectedSector\}/)
  assert.match(reports,/selectedAxes=\{selectedAxes\} entriesByKey=\{entriesByKey\}/)
  assert.match(reports,/<PortraitTestQuickActions locale=\{locale\}/)
  assert.match(reports,/activeTab=\{portraitTab\} onTabChange=\{setPortraitTab\}/)
  assert.match(reports,/id="hh-portrait-panel-analyses" role="tabpanel"/)
  assert.match(reports,/id="hh-portrait-panel-recommendations" role="tabpanel"/)
  assert.match(reports,/hidden=\{portraitTab !== 'analyses'\}/)
  assert.match(reports,/hidden=\{portraitTab !== 'recommendations'\}/)
  assert.equal((reports.match(/<PortraitAnalyses /g)||[]).length,1)
  assert.equal((reports.match(/<PortraitRecommendations /g)||[]).length,1)
  assert.match(visual,/data-testid="portrait-view-switch"/)
  assert.match(visual,/portraitView === 'axes' && selectedSector !== 'goal' && <section/)
  assert.match(visual,/portraitView === 'tests' && selectedSector !== 'goal' && <section/)
  assert.match(visual,/data-testid="portrait-chart-options"/)
  assert.match(visual,/data-chart-mode=\{key\}/)
  assert.match(visual,/portraitTests\(\{ selectedSector, selectedAxes: chosenForProfile, portrait \}\)/)
  assert.match(visual,/portraitSectorReadouts\(portrait, checkedRays\)/)
  assert.match(visual,/data-portrait-raw-score=\{ray\.axis\}/)
  assert.match(actions,/role="group"/)
  assert.match(actions,/data-testid="portrait-goals-action"/)
  assert.doesNotMatch(actions,/data-testid="portrait-completion-action"/)
  assert.match(actions,/href="#hh-development-program"/)
  assert.match(actions,/data-testid="portrait-analyses-action"/)
  assert.match(actions,/data-testid="portrait-recommendations-action"/)
  assert.match(actions,/data-testid="portrait-profile-test-catalogue"/)
  assert.match(actions,/data-portrait-test-kind=\{value\}/)
  assert.match(actions,/aria-pressed=\{kind === value\}/)
  assert.match(actions,/data-completed=\{item\.completed\}/)
  assert.match(actions,/listPortraitProfileTests\(/)
  assert.match(helper,/entry\.rightsStatus === 'cleared'/)
  assert.match(actions,/data-testid=\{'portrait-take-test-' \+ item\.key\}/)
  assert.match(actions,/const draft = runs\.find/)
  assert.match(actions,/await appFetch\('runs'/)
  assert.match(actions,/router\.push\('\/' \+ locale \+ '\/app\/runs\/'/)
  assert.match(programme,/appFetch\('development-goals'/)
  assert.match(programme,/hh:open-development-goals/)
  assert.match(css,/\.kindTabs/)
  assert.match(css,/\.completed/)
  assert.match(css,/prefers-reduced-motion:reduce/)
  assert.match(inline,/\.hh-portrait-inline-panel\[hidden\]\{display:none!important\}/)
  assert.match(inline,/\.hh-portrait-quick-actions\[role="group"\]/)
  assert.match(source('components/app/portrait-recommendations.jsx'),/id="hh-portrait-recommendations"/)
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
