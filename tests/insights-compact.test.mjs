import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildInsightsSummary } from '../lib/assessments/insights-summary.js'

test('summary counts all attempts, unique tests and numeric scales, without mixing test scores', () => {
  const a = { key: 'stress', history: [{ id: 'old' }, { id: 'new' }], latest: {
    measurementAt: '2026-10-11T12:00:00Z', dimensions: [
      { key: 'scale', value: 45 }, { key: 'scale', value: 45 }, { key: 'resources', value: 8 },
      { key: 'missing', value: null },
    ] } }
  const b = { key: 'mood', history: [{ id: 'third' }], latest: {
    measurementAt: '2026-10-13T12:00:00Z', dimensions: [{ key: 'scale', value: 4 }] } }
  assert.deepEqual(buildInsightsSummary([a, b, { latest: null }]), {
    tests: 2, attempts: 3, scales: 3, latestAt: '2026-10-13T12:00:00Z',
  })
  assert.deepEqual(buildInsightsSummary([]), { tests: 0, attempts: 0, scales: 0, latestAt: null })
})
test('filter is native closed disclosure after summary, all report and picker links remain', () => {
  const src = readFileSync(new URL('../components/app/app-workspace.jsx', import.meta.url), 'utf8')
  const part = src.slice(src.indexOf('function PortfolioPage('), src.indexOf('function ProfileOverview('))
  assert.match(part, /buildInsightsSummary\(allGroups\)/)
  assert.ok(part.indexOf('data-testid="insights-summary"') < part.indexOf('data-testid="insights-filters"'))
  assert.match(part, /<details className="hh-insights-filter-disclosure" data-testid="insights-filters">/)
  assert.match(part, /aria-pressed=\{selectedCategories\.includes\(category\.key\)\}/)
  assert.match(part, /explore=1&filters=topics&category=/)
  assert.match(part, /<ScoreGauge dimension=\{main\}/)
  assert.match(part, /<ScoreTrend current=\{latest\} previous=\{group\.periodPrior\}/)
  assert.match(part, /<ClientReportActions data=\{data\}/)
  assert.doesNotMatch(part, /hh-insights-add-mark/)
  const route = readFileSync(new URL('../app/[locale]/app/[[...path]]/page.jsx', import.meta.url), 'utf8')
  assert.match(route, /import '\.\/insights-compact\.css'/)
})

test('psychological portrait is the expanded first Insights block and no longer appears in My tests', () => {
  const workspace = readFileSync(new URL('../components/app/app-workspace.jsx', import.meta.url), 'utf8')
  const portfolio = workspace.slice(workspace.indexOf('function PortfolioPage('), workspace.indexOf('function ProfileOverview('))
  const tests = readFileSync(new URL('../components/app/account-test-battery.jsx', import.meta.url), 'utf8')
  const styles = readFileSync(new URL('../app/[locale]/app/[[...path]]/insights-compact.css', import.meta.url), 'utf8')
  const portrait = portfolio.indexOf('data-testid="insights-psychological-portrait"')
  const tabs = portfolio.indexOf('className="hh-insights-view-tabs"')
  assert.ok(portrait >= 0 && portrait < tabs, 'The portrait must come before the Insights tabs')
  assert.match(portfolio, /<details className="hh-insights-portrait" open/)
  assert.match(portfolio, /portrait=\{buildPsychPortrait\(data\.results \|\| \[\]\)\}/)
  assert.match(portfolio, /coverage=\{coverageForFocus\(\[\]\)\}/)
  assert.doesNotMatch(tests, /portraitDetails|buildPsychPortrait|<TestExplorerVisual/)
  assert.match(styles, /\.hh-insights-portrait>section\{/)
  const portraitStyles = readFileSync(new URL('../components/app/test-explorer.module.css', import.meta.url), 'utf8')
  assert.match(portraitStyles, /@media\(max-width:440px\)\{[\s\S]*?\.portraitRayOptions\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/)
  assert.match(portraitStyles, /\.portraitControls \.portraitShowMore\{display:flex/)
})
