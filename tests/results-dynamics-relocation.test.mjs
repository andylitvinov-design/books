import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('the Values/Dynamics tablist lives in Results, not My Tests', () => {
  const workspace = read('components/app/app-workspace.jsx')
  const battery = read('components/app/account-test-battery.jsx')
  const css = read('app/[locale]/app/[[...path]]/assessment-dashboard.css')
  assert.match(workspace, /data-results-view-tabs/)
  assert.match(workspace, /hh-results-tab-values/)
  assert.match(workspace, /hh-results-tab-dynamics/)
  assert.match(workspace, /hh-results-panel-values/)
  assert.match(workspace, /hh-results-panel-dynamics/)
  assert.match(workspace, /<TestDynamics results=\{data\.results \|\| \[\]\}/)
  assert.match(workspace, /app\/portfolio\?tab=dynamics/)
  assert.match(css, /hh-insights-view-tabs/)
  assert.doesNotMatch(battery, /data-my-tests-tabs|<TestDynamics|activeTab === 'dynamics'/)
  assert.match(battery, /legacyDynamics/)
  assert.match(battery, /app\/portfolio\?tab=dynamics/)
  assert.match(battery, /<MyTestsDashboard/)
})

test('Dynamics shows a question mark until a retake and has range-aware gauges', () => {
  const view = read('components/app/test-dynamics.jsx')
  const model = read('lib/assessments/test-dynamics.js')
  const css = read('components/app/test-dynamics.module.css')
  assert.match(model, /history\.length > 1 \? Number\(dimension\.value\) : null/)
  assert.match(model, /gaugeDimension: dimension/)
  assert.match(view, /hasRepeat \? number\(item\.lastValue\) : '\?'/)
  assert.match(view, /<ScoreGauge dimension=\{item\.gaugeDimension\} locale=\{locale\} compact/)
  assert.match(view, /aria-label=\{!hasRepeat \? c\.awaiting : undefined\}/)
  assert.match(view, /labelFor\(item\.key, locale\)/)
  assert.match(css, /\.scaleDial/)
  assert.match(css, /@media\(max-width:480px\)/)
})

test('a retake still opens the saved run or a real new run', () => {
  const workspace = read('components/app/app-workspace.jsx')
  assert.match(workspace, /const draft = \(data\.runs \|\| \[\]\)\.find/)
  assert.match(workspace, /const run = draft \|\| await appFetch\('runs'/)
  assert.match(workspace, /router\.push\('\/' \+ locale \+ '\/app\/runs\/'/)
  assert.match(workspace, /retakeDefinitions\.has\(id\)/)
})
